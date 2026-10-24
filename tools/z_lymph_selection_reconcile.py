#!/usr/bin/env python3
"""Reconcile Z-Anatomy source selection against the GLB Blender actually exported.

Pure stdlib: can run under Blender's Python or the project's venv. Never alters GLBs.
"""
import argparse
import json
import os
import re
import struct
from pathlib import Path

_ANCHORS = ('ZAANCHOR_SPLEEN', 'ZAANCHOR_THYMUS_LEFT', 'ZAANCHOR_THYMUS_RIGHT')
_SOURCE_ID = re.compile(r'^ZA[0-9A-F]{16}$')


def glb_mesh_nodes(path):
    data = Path(path).read_bytes()
    if len(data) < 20:
        raise ValueError('Source GLB truncated')
    magic, version, length = struct.unpack_from('<4sII', data)
    if magic != b'glTF' or version != 2 or length != len(data):
        raise ValueError('Source GLB has invalid header or length')
    offset = 12
    doc = None
    while offset < length:
        if offset + 8 > length:
            raise ValueError('Source GLB has truncated chunk header')
        chunk_length, chunk_type = struct.unpack_from('<I4s', data, offset)
        offset += 8
        if offset + chunk_length > length:
            raise ValueError('Source GLB has truncated chunk')
        if chunk_type == b'JSON':
            if doc is not None:
                raise ValueError('Source GLB has duplicate JSON chunks')
            doc = json.loads(data[offset:offset + chunk_length].decode('utf-8').rstrip(' \x00'))
        offset += chunk_length
    if doc is None:
        raise ValueError('Source GLB contains no JSON scene')
    meshes = doc.get('meshes', [])
    names = set()
    for node in doc.get('nodes', []):
        mesh_i = node.get('mesh')
        if not isinstance(mesh_i, int) or not 0 <= mesh_i < len(meshes):
            continue
        primitives = meshes[mesh_i].get('primitives', [])
        if not any(isinstance(p, dict) and 'POSITION' in p.get('attributes', {}) for p in primitives):
            continue
        name = node.get('name')
        if not isinstance(name, str) or not name:
            raise ValueError('Unnamed mesh node in source GLB')
        if name in names:
            raise ValueError('Duplicate GLB mesh-node name: ' + name)
        names.add(name)
    return names


def reconcile(source_glb, selection_path, *, max_missing_fraction=.25):
    source_glb, selection_path = Path(source_glb), Path(selection_path)
    names = glb_mesh_nodes(source_glb)
    missing_anchors = sorted(set(_ANCHORS) - names)
    if missing_anchors:
        raise ValueError('Registration anchors absent from actual exported GLB: ' + ', '.join(missing_anchors))
    data = json.loads(selection_path.read_text())
    if data.get('status') not in ('exported_unregistered', 'exported_unregistered_reconciled'):
        raise ValueError('Selection audit has not completed Blender export')
    source_candidates = data.get('candidates')
    if not isinstance(source_candidates, list) or not source_candidates:
        raise ValueError('No candidates in original selection audit')
    selected_ids = set()
    kept, excluded = [], []
    for entry in source_candidates:
        node = entry.get('id', '')
        if not _SOURCE_ID.fullmatch(node):
            raise ValueError('Invalid candidate ID: '+repr(node))
        if node in selected_ids:
            raise ValueError('Duplicate candidate ID: '+node)
        selected_ids.add(node)
        name = entry.get('name', '')
        if re.search(r'\btonsil\s+of\s+cerebellum\b', name, re.I):
            excluded.append({'id':node, 'name':name, 'reason':'Cerebellar tonsil is neural, not lymphatic tissue'})
        elif node not in names:
            excluded.append({'id':node, 'name':name, 'reason':'No exportable mesh node/primitives in Blender GLB'})
        else:
            kept.append(entry)
    if not kept:
        raise ValueError('No lymphatic candidate meshes survived GLB export; refusing empty preview')
    missing_geometry = [e for e in excluded if e['reason'].startswith('No exportable')]
    if len(missing_geometry) > max(5, int(len(source_candidates)*max_missing_fraction)):
        raise ValueError(f'{len(missing_geometry)}/{len(source_candidates)} candidates absent from source GLB; too many to prune safely. Inspect Blender export.')
    previous = data.get('reconciliation', {})
    prior_excluded = {e['id']:e for e in previous.get('excluded', [])}
    for entry in excluded:
        prior_excluded[entry['id']]=entry
    cumulative_excluded=list(prior_excluded.values())
    data['candidates'] = kept
    data['candidate_count'] = len(kept)
    data['categories'] = {category:sum(e.get('category')==category for e in kept) for category in sorted({e.get('category') for e in kept})}
    data['status'] = 'exported_unregistered'
    data['export_reconciled'] = True
    data['reconciliation'] = {'candidates_before':previous.get('candidates_before',len(source_candidates)), 'candidates_exported':len(kept), 'excluded':cumulative_excluded, 'glb_mesh_node_count':len(names)}
    before_path = selection_path.with_suffix('.before-reconcile.json')
    if not before_path.exists():
        before_path.write_text(selection_path.read_text())
    tmp = selection_path.with_name(selection_path.name+'.tmp')
    tmp.write_text(json.dumps(data, indent=2)+'\n')
    os.replace(tmp, selection_path)
    output = selection_path.with_name('export-reconciliation.json')
    output.write_text(json.dumps(data['reconciliation'], indent=2)+'\n')
    print(f'PASS: {len(kept)} exported candidate meshes retained; {len(cumulative_excluded)} total candidates excluded after GLB verification.')
    for e in cumulative_excluded:
        print('  EXCLUDED:',e['name'], '—', e['reason'])
    print('Reconciliation report:', output)
    return data

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source', required=True, type=Path)
    p.add_argument('--selection', required=True, type=Path)
    args = p.parse_args()
    reconcile(args.source, args.selection)
