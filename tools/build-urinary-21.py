#!/usr/bin/env python3
"""AnatomIQ urinary source mesh conversion — no invented internal anatomy.

Uses six exact BodyParts3D v4.3 source OBJ meshes, registered by the identical
skin transform as the 1.9.1 respiratory model. A lightly refined Detailed
variant smooths surfaces, never adds anatomical structures or changes mesh IDs.
"""
import argparse,csv,hashlib,importlib.util,json,re,sys
from pathlib import Path
import numpy as np
import trimesh

EXPECTED={'FJ3145':'Left kidney','FJ3147':'Right kidney','FJ3144':'Left ureter','FJ3146':'Right ureter','FJ3149':'Urinary bladder','FJ3148':'Urethra'}
HERE=Path(__file__).resolve().parent

def load_module(file,name):
    spec=importlib.util.spec_from_file_location(name,file); mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);return mod
legacy=load_module(HERE/'build-digestive-detail.py','digestive_converter')
refine=load_module(HERE/'refine-upper-airway-191.py','upper_refinement')

def source_check(root):
    manifest=root/'MANIFEST.csv'
    with manifest.open(newline='',encoding='utf-8-sig') as f:rows=list(csv.DictReader(f))
    if len(rows)!=6 or {r['fj_id'] for r in rows}!=set(EXPECTED):raise ValueError('Urinary subset does not contain exactly six expected source meshes')
    for row in rows:
        if row['name']!=EXPECTED[row['fj_id']]:raise ValueError('Wrong BodyParts3D source mesh '+row['fj_id'])
        rel=Path(row['obj'])
        if rel.is_absolute() or '..' in rel.parts or rel.suffix.lower()!='.obj':raise ValueError('Unsafe source OBJ path')
        file=root/rel
        if not file.is_file() or file.stat().st_size<300:raise ValueError('Missing real source mesh '+str(file))
    return sorted(rows,key=lambda r:int(re.search(r'\d+',r['fj_id']).group()))

def verify(models):
    data=json.loads((models/'urinary-structures.json').read_text())
    ids=[s['id'] for s in data['structures']]
    if len(ids)!=6 or set(ids)!=set(EXPECTED) or len(set(ids))!=6:raise ValueError('Urinary manifest must contain the six verified source IDs')
    for resolution in ('standard','detailed'):
        glb=models/f'urinary-{resolution}.glb'
        scene=trimesh.load(glb,force='scene')
        nodes=list(scene.graph.nodes_geometry)
        if len(nodes)!=6 or set(nodes)!=set(ids):raise ValueError(f'{glb.name}: actual nodes do not match JSON')
        expected={s['id']:s[f'{resolution}_triangles'] for s in data['structures']}
        for node in nodes:
            mesh=scene.geometry[scene.graph[node][1]]
            if len(mesh.faces)!=expected[node]:raise ValueError(f'{glb.name}: {node} triangle mismatch')
        print(f'PASS {glb.name}: six verified meshes')
    return data

def build(root,skin,out,reference):
    rows=source_check(root)
    original_skin=legacy.load_mesh(skin)
    transform,reg=legacy.normalizer(original_skin,axis='auto',invert=False)
    ref=json.loads(reference.read_text()).get('registration',{})
    if ref.get('vertical_axis')!=reg['vertical_axis'] or ref.get('inverted')!=reg['inverted'] or abs(float(ref.get('scale',0))-float(reg['scale']))>1e-6:
        raise ValueError('BodyParts3D coordinate registration does not match respiratory source; refusing to publish')
    scenes={'standard':trimesh.Scene(),'detailed':trimesh.Scene()}
    structures=[];audit=[]
    for row in rows:
        fj=row['fj_id']; file=root/row['obj']
        source=refine.read_source_mesh(file)
        source.vertices=transform(np.asarray(source.vertices))
        refine.safe_mesh(source,fj)
        standard_source=source
        if len(source.faces)<1000:
            # One conservative subdivision pass improves very low-poly bladder/urethra.
            standard_source,_=refine.refine(source,target_faces=1000,max_rounds=1)
        standard=legacy.reduce(standard_source,3200)
        target=8000 if 'kidney' in row['name'].lower() else 4200
        detailed,metrics=refine.refine(source,target_faces=target,max_rounds=2)
        detailed=legacy.reduce(detailed,16000)
        if len(detailed.faces)<len(standard.faces):raise ValueError('Detailed quality lower than standard for '+fj)
        for quality,mesh in [('standard',standard),('detailed',detailed)]:
            mesh.remove_unreferenced_vertices()
            _=mesh.vertex_normals
            scenes[quality].add_geometry(mesh,geom_name=fj,node_name=fj)
        name=row['name']
        cat='kidney' if 'kidney' in name.lower() else 'ureter' if 'ureter' in name.lower() else 'bladder' if 'bladder' in name.lower() else 'urethra'
        structures.append({'id':fj,'fma_id':row.get('fma_id',''),'name':name,'category':cat,'standard_triangles':len(standard.faces),'detailed_triangles':len(detailed.faces)})
        audit.append({'id':fj,'name':name,'source_obj':str(file),'source_sha256':hashlib.sha256(file.read_bytes()).hexdigest(),**metrics})
        print(f'{fj}: {name} {len(source.faces):,} original -> {len(standard.faces):,} standard / {len(detailed.faces):,} detailed triangles')
    out.mkdir(parents=True,exist_ok=True)
    data={'version':1,'source':'BodyParts3D / DBCLS 4.3','license':'CC BY-SA 2.1 Japan','system':'urinary','coordinate_frame':'BodyParts3D skin-normalized to Anatomy Studio 1.2 body frame','registration':reg,'structures':structures}
    (out/'urinary-structures.json').write_text(json.dumps(data,indent=2)+'\n')
    for quality,scene in scenes.items():(out/f'urinary-{quality}.glb').write_bytes(scene.export(file_type='glb'))
    (out/'urinary-source-audit.json').write_text(json.dumps({'source':'BodyParts3D 4.3','source_backed':True,'meshes':audit,'missing_internal_geometry':['renal cortex','renal medulla','renal pyramids','renal calyces','renal pelvis','nephrons']},indent=2)+'\n')
    verify(out)

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--subset',type=Path)
    p.add_argument('--skin',type=Path)
    p.add_argument('--out',required=True,type=Path)
    p.add_argument('--respiratory-manifest',type=Path)
    p.add_argument('--verify-only',action='store_true')
    a=p.parse_args()
    if a.verify_only:verify(a.out)
    else:
        if not a.subset or not a.skin or not a.respiratory_manifest:p.error('Build requires --subset, --skin and --respiratory-manifest')
        build(a.subset,a.skin,a.out,a.respiratory_manifest)

if __name__=='__main__':main()
