#!/usr/bin/env python3
"""Verify both 1.9.1 GLBs, exact face counts, saved IDs, and refine provenance."""
import argparse
import json
import re
from pathlib import Path


def check(models: Path, expect_extra=17, previous=None, report=None):
    import trimesh
    data = json.loads((models / 'respiratory-structures.json').read_text())
    structures = data['structures']
    ids = [row['id'] for row in structures]
    if len(set(ids)) != len(ids) or len(ids) < 28 + expect_extra:
        raise ValueError('Unexpected final respiratory manifest structure IDs')
    if not all(re.fullmatch(r'FJ\d+[A-Z]?', item) for item in ids):
        raise ValueError('Malformed FJ identifier')
    if previous:
        original = json.loads(Path(previous).read_text())
        old = original['structures']
        if structures[:len(old)] != old:
            raise ValueError('Existing 1.9.0 structure rows or triangle counts changed')
        if data.get('registration') != original.get('registration'):
            raise ValueError('BodyParts3D coordinate registration changed')
        if len(structures) != len(old)+expect_extra:
            raise ValueError('Incorrect number of appended upper-airway structures')
    audit_by_id = None
    if report:
        report_data = json.loads(Path(report).read_text())
        audit = report_data.get('meshes', [])
        audit_by_id = {a['id']:a for a in audit}
        if len(audit) != expect_extra or len(audit_by_id) != expect_extra:
            raise ValueError('Refinement audit did not cover all upper-airway structures')
        added = structures[-expect_extra:]
        if {s['id'] for s in added} != set(audit_by_id):
            raise ValueError('Mismatch between refined meshes and generated manifest')
        for row in added:
            item = audit_by_id[row['id']]
            if item['refined_triangles'] < item['source_triangles']:
                raise ValueError('Refinement unexpectedly decimated source geometry')
            if row['detailed_triangles'] < min(item['refined_triangles'], 16000) - 8:
                raise ValueError('Detailed GLB lost triangles unexpectedly for '+row['id'])
            if row['standard_triangles'] > 3200 or row['detailed_triangles'] > 16000:
                raise ValueError('Respiratory triangle ceiling exceeded: '+row['id'])
            if row['standard_triangles'] > row['detailed_triangles']:
                raise ValueError('Standard resolution exceeds detailed: '+row['id'])
    for variant in ('standard', 'detailed'):
        p = models / f'respiratory-{variant}.glb'
        loaded = trimesh.load(p, force='scene')
        actual = list(loaded.graph.nodes_geometry)
        if len(actual) != len(ids) or set(actual) != set(ids):
            missing = set(ids) - set(actual)
            extra = set(actual) - set(ids)
            raise ValueError(f'{variant}: missing={missing}, unexpected={extra}')
        expected_counts = {row['id']:row[f'{variant}_triangles'] for row in structures}
        for sid in actual:
            mesh = loaded.geometry[loaded.graph[sid][1]]
            if len(mesh.faces) != expected_counts[sid]:
                raise ValueError(f'{variant}: {sid} faces={len(mesh.faces)} not expected={expected_counts[sid]}')
            if len(mesh.faces) < 5 or not mesh.vertices.shape[0]:
                raise ValueError(f'{variant}: empty mesh {sid}')
        print(f'{p.name}: {len(actual)} exactly matched meshes and face counts, PASS')
    print('PASS: both respiratory GLBs and JSON contain identical 1.9.1 structure identifiers and mesh counts')


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--models', type=Path, default=Path('models'))
    p.add_argument('--previous', type=Path)
    p.add_argument('--report', type=Path)
    args=p.parse_args()
    check(args.models, previous=args.previous, report=args.report)


if __name__=='__main__':
    main()
