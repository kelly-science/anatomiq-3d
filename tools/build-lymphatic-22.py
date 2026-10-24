#!/usr/bin/env python3
"""Build two quality levels for only the genuine BodyParts3D 4.3 spleen/thymus meshes."""
import argparse,csv,hashlib,importlib.util,json,re
from pathlib import Path
import numpy as np
import trimesh

EXPECTED={'FJ2561':'Spleen','FJ3150':'Left lobe of thymus','FJ3151':'Right lobe of thymus'}
HERE=Path(__file__).resolve().parent

def import_local(name,filename):
    spec=importlib.util.spec_from_file_location(name,HERE/filename)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
legacy=import_local('lymphatic_digestive_legacy','build-digestive-detail.py')
refine=import_local('lymphatic_refine','refine-upper-airway-191.py')

def verify(folder):
    data=json.loads((folder/'lymphatic-structures.json').read_text())
    ids=[s['id'] for s in data['structures']]
    if len(ids)!=3 or set(ids)!=set(EXPECTED):raise ValueError('Invalid source ID set in lymphatic JSON')
    for q in ('standard','detailed'):
        glb=folder/f'lymphatic-{q}.glb'
        scene=trimesh.load(glb,force='scene')
        nodes=list(scene.graph.nodes_geometry)
        if len(nodes)!=3 or set(nodes)!=set(ids):raise ValueError(f'{glb}: GLB node identity mismatch')
        for item in data['structures']:
            mesh=scene.geometry[scene.graph[item['id']][1]]
            if len(mesh.faces)!=item[f'{q}_triangles']:raise ValueError(f'{glb}: {item["id"]} triangle mismatch')
        print(f'PASS {glb.name}: 3 mesh nodes match JSON and triangle counts')
    return data

def build(subset,skin,reference,out):
    rows=list(csv.DictReader((subset/'MANIFEST.csv').open(newline='',encoding='utf-8-sig')))
    if len(rows)!=3 or {r['fj_id'] for r in rows}!=set(EXPECTED):raise ValueError('Lymphatic subset must contain three verified source IDs')
    for r in rows:
        if r['name']!=EXPECTED[r['fj_id']]:raise ValueError('Misidentified source mesh')
        rel=Path(r['obj'])
        if rel.is_absolute() or '..' in rel.parts or rel.suffix.lower()!='.obj':raise ValueError('Unsafe OBJ path')
        if not (subset/rel).is_file() or (subset/rel).stat().st_size<300:raise ValueError('Missing OBJ source')
    original_skin=legacy.load_mesh(skin)
    transform,reg=legacy.normalizer(original_skin,axis='auto',invert=False)
    prev=json.loads(reference.read_text()).get('registration',{})
    if (reg['vertical_axis']!=prev.get('vertical_axis') or reg['inverted']!=prev.get('inverted') or abs(float(reg['scale'])-float(prev.get('scale',0)))>1e-6):
        raise ValueError('Skin registration disagrees with respiratory source; will not publish misaligned GLBs')
    scenes={'standard':trimesh.Scene(),'detailed':trimesh.Scene()}
    structures=[]; audit=[]
    for r in sorted(rows,key=lambda i:i['fj_id']):
        fj=r['fj_id']; name=r['name']; path=subset/r['obj']
        source=refine.read_source_mesh(path);source.vertices=transform(np.asarray(source.vertices));refine.safe_mesh(source,fj)
        # Subdivision smooths low-resolution sources; detail never invents missing lymph anatomy.
        standard_mesh,_=refine.refine(source,target_faces=2900,max_rounds=1)
        standard=legacy.reduce(standard_mesh,3200)
        detailed,metrics=refine.refine(source,target_faces=11000,max_rounds=2)
        detailed=legacy.reduce(detailed,16000)
        if len(detailed.faces)<len(standard.faces):raise ValueError('Detailed mesh unexpectedly lower polygon count')
        for quality,mesh in [('standard',standard),('detailed',detailed)]:
            mesh.remove_unreferenced_vertices();_=mesh.vertex_normals
            scenes[quality].add_geometry(mesh,geom_name=fj,node_name=fj)
        structures.append({'id':fj,'fma_id':r.get('fma_id',''),'name':name,'category':'spleen' if fj=='FJ2561' else 'thymus','standard_triangles':len(standard.faces),'detailed_triangles':len(detailed.faces)})
        audit.append({'id':fj,'name':name,'source_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'source_triangles':len(source.faces),'standard_triangles':len(standard.faces),'detailed_triangles':len(detailed.faces),'refinement':metrics})
        print(f'{fj} {name}: {len(source.faces)} source triangles -> {len(standard.faces)} standard / {len(detailed.faces)} detailed')
    out.mkdir(parents=True,exist_ok=True)
    output={'version':1,'source':'BodyParts3D / DBCLS 4.3','license':'CC BY-SA 2.1 Japan','system':'lymphatic','coordinate_frame':'BodyParts3D skin-normalized to Anatomy Studio body frame','registration':reg,'structures':structures,'coverage_note':'Only spleen and thymus lobes. Lymph nodes, ducts and vessels unavailable in this provider source.'}
    (out/'lymphatic-structures.json').write_text(json.dumps(output,indent=2)+'\n')
    for q,sc in scenes.items():(out/f'lymphatic-{q}.glb').write_bytes(sc.export(file_type='glb'))
    (out/'lymphatic-source-audit.json').write_text(json.dumps({'source':'BodyParts3D 4.3','meshes':audit,'missing':['lymph nodes','thoracic duct','right lymphatic duct','lymph vessels','tonsils']},indent=2)+'\n')
    verify(out)

def main():
    p=argparse.ArgumentParser();p.add_argument('--subset',type=Path);p.add_argument('--skin',type=Path);p.add_argument('--respiratory-manifest',type=Path);p.add_argument('--out',required=True,type=Path);p.add_argument('--verify-only',action='store_true')
    a=p.parse_args()
    if a.verify_only:verify(a.out)
    else:
        if not all([a.subset,a.skin,a.respiratory_manifest]):p.error('Build requires --subset, --skin and --respiratory-manifest')
        build(a.subset,a.skin,a.respiratory_manifest,a.out)
if __name__=='__main__':main()
