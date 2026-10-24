#!/usr/bin/env python3
"""Create separate Standard/Detailed respiratory models from real BodyParts3D 4.3 OBJs.

Only respiratory parenchyma and airways are included. The pulmonary vascular
network remains exclusively in cardiovascular-{standard,detailed}.glb.
This tool never invents branches or changes the cardiovascular model.
"""
import argparse
import csv
import hashlib
import importlib.util
import json
import re
from pathlib import Path

import numpy as np
import trimesh

BASE = Path(__file__).parent
spec = importlib.util.spec_from_file_location('bp_digestive_converter', BASE / 'build-digestive-detail.py')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def collect(subsets, previous=None):
    rows = {}
    for directory in subsets:
        manifest = directory / 'MANIFEST.csv'
        if not manifest.is_file():
            raise ValueError(f'Missing verified BodyParts3D subset manifest: {manifest}')
        for row in csv.DictReader(manifest.open(newline='')):
            fj = row['fj_id']
            if not re.fullmatch(r'FJ\d+[A-Z]?', fj):
                raise ValueError(f'Invalid source FJ ID {fj}')
            obj = directory / row['obj']
            if not obj.is_file() or obj.stat().st_size < 300:
                raise ValueError(f'Missing source mesh {obj}')
            if fj in rows:
                raise ValueError(f'Duplicate source FJ ID {fj}')
            category = 'lung' if directory.name == 'lungs' else 'airway'
            # Discard unrelated cardiovascular anatomy if the provider taxonomy
            # happened to match an airway name (e.g. bronchial arteries).
            if category != 'lung' and re.search(r'\b(?:artery|arteries|vein|veins|nerve|lymph)\b',row['name'],re.I):
                continue
            rows[fj] = (row, obj, category)
    if not any(v[2] == 'lung' for v in rows.values()):
        raise ValueError('No source-backed lung segment meshes in downloaded subset')
    def key(fj):
        m = re.fullmatch(r'FJ(\d+)([A-Z]?)', fj)
        return int(m.group(1)), m.group(2)
    old = []
    if previous and previous.is_file():
        prior = json.loads(previous.read_text())
        old = [s['id'] for s in prior['structures']]
        if len(old) != len(set(old)) or not all(fj in rows for fj in old):
            raise ValueError('Previous respiratory manifest contains unavailable source meshes; refusing to reorder or remove saved structure IDs')
    return [rows[fj] for fj in old + sorted((fj for fj in rows if fj not in old), key=key)]


def build(subsets, skin_file, out, standard_faces, detailed_faces, previous=None):
    rows = collect(subsets, previous)
    source_skin = mod.load_mesh(skin_file)
    # Same source orientation/registration as existing digestive and cardiac GLBs.
    normal, registration = mod.normalizer(source_skin, axis='auto', invert=False)
    standard_scene = trimesh.Scene()
    detailed_scene = trimesh.Scene()
    entries = []
    for row, obj, category in rows:
        source = mod.load_mesh(obj)
        source.vertices = normal(np.asarray(source.vertices))
        if not np.isfinite(source.vertices).all() or len(source.faces) < 5:
            raise ValueError('Invalid source geometry: ' + str(obj))
        standard = mod.reduce(source, standard_faces)
        detailed = mod.reduce(source, detailed_faces)
        for mesh in (standard, detailed):
            mesh.remove_unreferenced_vertices()
            _ = mesh.vertex_normals
        fj = row['fj_id']
        standard_scene.add_geometry(standard, geom_name=fj, node_name=fj)
        detailed_scene.add_geometry(detailed, geom_name=fj, node_name=fj)
        entries.append({'id': fj, 'fma_id': row.get('fma_id',''), 'name': row['name'], 'category': category,
                        'standard_triangles':len(standard.faces),'detailed_triangles':len(detailed.faces)})
        print(f'{fj}: {row["name"][:66]} [{category}]')
    out.mkdir(parents=True,exist_ok=True)
    metadata={'version':1,'source':'BodyParts3D / DBCLS 4.3', 'license':'CC BY-SA 2.1 Japan',
        'coordinate_frame':'BodyParts3D skin-normalized to Anatomy Studio 1.2 body frame',
        'registration':registration,'structures':entries}
    # Write temporary assets, validate all THREE together, then replace live
    # models. A failure must not leave a new manifest paired with old GLBs.
    tmp=out/'.respiratory-stage'
    tmp.mkdir(parents=True,exist_ok=True)
    mod.glb(standard_scene,tmp/'respiratory-standard.glb')
    mod.glb(detailed_scene,tmp/'respiratory-detailed.glb')
    (tmp/'respiratory-structures.json').write_text(json.dumps(metadata,indent=2)+'\n')
    for variant in ('standard','detailed'):
        file=tmp/f'respiratory-{variant}.glb'
        if file.stat().st_size>=95_000_000:
            raise ValueError(f'{file.name} exceeds practical Git hosting limit')
        loaded=trimesh.load(file,force='scene')
        if set(loaded.graph.nodes_geometry)!={s['id'] for s in entries}:
            raise ValueError(f'{file.name} does not match respiratory manifest IDs')
    for path in tmp.iterdir():
        destination=out/path.name
        path.replace(destination)
        print(f'{destination}: {destination.stat().st_size/1024/1024:.2f}MB SHA256 {hashlib.sha256(destination.read_bytes()).hexdigest()}')
    tmp.rmdir()
    print(f'SUCCESS: {len(entries)} verified respiratory structures, {sum(s["category"]=="lung" for s in entries)} lung segments. Existing cardiovascular files untouched.')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--subset',type=Path,action='append',required=True)
    parser.add_argument('--skin',type=Path,required=True)
    parser.add_argument('--out',type=Path,default=Path('models'))
    parser.add_argument('--previous',type=Path)
    parser.add_argument('--standard-faces',type=int,default=3200)
    parser.add_argument('--detailed-faces',type=int,default=16000)
    a=parser.parse_args()
    if a.standard_faces<200 or a.detailed_faces<a.standard_faces:parser.error('Invalid face limits')
    build(a.subset,a.skin,a.out,a.standard_faces,a.detailed_faces,a.previous)

if __name__=='__main__':main()
