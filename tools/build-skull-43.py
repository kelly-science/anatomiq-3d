#!/usr/bin/env python3
"""Convert verified BodyParts3D 4.3 skull bones to one self-hosted GLB.

The coordinates match the existing digestive/cardiovascular GLB pipeline:
BodyParts3D normalized against a common skin reference, with final depth
reflection performed by the Anatomy Studio viewer (not baked into this GLB).
"""
import argparse,csv,hashlib,json,re
from pathlib import Path
import numpy as np
import trimesh
SOURCE_Y_MIN=-3.534865
SOURCE_HEIGHT=3.183290-SOURCE_Y_MIN
SOURCE_Z_CENTER=0.4

def load_mesh(path):
    raw=trimesh.load(path,force='scene',process=False)
    meshes=[g for g in raw.geometry.values() if isinstance(g,trimesh.Trimesh) and len(g.faces)>4]
    if not meshes:raise ValueError('Empty OBJ mesh: '+str(path))
    return trimesh.util.concatenate(meshes) if len(meshes)>1 else meshes[0]

def normalizer(skin,axis='auto',invert=False):
    lo,hi=skin.bounds
    axis_i=int(np.argmax(hi-lo)) if axis=='auto' else 'xyz'.index(axis)
    horizontal=[i for i in range(3) if i!=axis_i]
    scale=SOURCE_HEIGHT/float(hi[axis_i]-lo[axis_i]);midpoint=(hi+lo)*0.5
    def transform(v):
        result=np.empty_like(v,dtype=np.float64)
        result[:,0]=(v[:,horizontal[0]]-midpoint[horizontal[0]])*scale
        upward=hi[axis_i]-v[:,axis_i] if invert else v[:,axis_i]-lo[axis_i]
        result[:,1]=upward*scale+SOURCE_Y_MIN
        result[:,2]=(v[:,horizontal[1]]-midpoint[horizontal[1]])*scale+SOURCE_Z_CENTER
        return result
    return transform,{'vertical_axis':'xyz'[axis_i],'inverted':bool(invert),'scale':scale}

def build(subset,skin_path,out,max_faces=50000,axis='auto',invert=False):
    skin=load_mesh(skin_path);transform,registration=normalizer(skin,axis,invert)
    with (subset/'MANIFEST.csv').open(newline='') as f:rows=list(csv.DictReader(f))
    if len(rows)<15 or len(rows)>70:raise SystemExit('Expected 15–70 independently identified skull structures')
    required={'fj_id','name','target','fma_id','obj'}
    if not required<=set(rows[0]):raise SystemExit('Invalid skull subset manifest')
    scene=trimesh.Scene();metadata=[];used=set();total=0
    for row in rows:
        id=row['fj_id'];target=row['target'];path=subset/row['obj']
        if not re.fullmatch(r'FJ\d+[A-Z]?',id) or id in used:raise SystemExit('Invalid or duplicate FJ skull ID '+id)
        used.add(id)
        if not path.is_file() or path.stat().st_size<300:raise SystemExit('Missing validated skull OBJ '+str(path))
        mesh=load_mesh(path)
        mesh.vertices=transform(np.asarray(mesh.vertices))
        if not np.isfinite(mesh.vertices).all() or len(mesh.faces)<5:raise SystemExit('Invalid skull geometry '+id)
        if len(mesh.faces)>max_faces:
            mesh=mesh.simplify_quadric_decimation(face_count=max_faces)
        mesh.remove_unreferenced_vertices();mesh.fix_normals()
        scene.add_geometry(mesh,geom_name=id,node_name=id)
        total+=len(mesh.faces)
        metadata.append({'id':id,'name':row['name'],'target':target,'fma_id':row['fma_id'],
                         'triangles':len(mesh.faces)})
        print(f'{id:9} {target:30} {len(mesh.faces):>7,} triangles')
    out.mkdir(parents=True,exist_ok=True)
    model=out/'skull-detailed.glb';tmp=model.with_suffix('.glb.part')
    tmp.write_bytes(scene.export(file_type='glb'))
    if tmp.read_bytes()[:4]!=b'glTF':raise SystemExit('GLB export failed')
    tmp.replace(model)
    raw={'version':1,'source':'BodyParts3D / DBCLS 4.3','license':'CC BY-SA 2.1 Japan',
         'coordinate_frame':'BodyParts3D skin-normalized to Anatomy Studio body frame; depth flipped by viewer',
         'registration':registration,'structures':metadata}
    info=out/'skull-structures.json';info.write_text(json.dumps(raw,indent=2)+'\n')
    verified=trimesh.load(model,force='scene')
    if len(verified.graph.nodes_geometry)!=len(metadata):raise SystemExit('Skull GLB verification count mismatch')
    if model.stat().st_size>95_000_000:raise SystemExit('Skull GLB exceeds 95 MB. Reduce --max-faces.')
    print(f'Validated {len(metadata)} skull meshes, {total:,} triangles.')
    for p in [model,info]:print(f'{p}: {p.stat().st_size/1024/1024:.2f} MB SHA256 {hashlib.sha256(p.read_bytes()).hexdigest()}')

if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--subset',type=Path,required=True);ap.add_argument('--skin',type=Path,required=True)
    ap.add_argument('--out',type=Path,default=Path('models'));ap.add_argument('--max-faces',type=int,default=50000)
    ap.add_argument('--vertical-axis',choices=['auto','x','y','z'],default='auto');ap.add_argument('--invert-vertical',action='store_true')
    a=ap.parse_args()
    if a.max_faces<500:ap.error('Max faces must be >=500')
    build(a.subset,a.skin,a.out,a.max_faces,a.vertical_axis,a.invert_vertical)
