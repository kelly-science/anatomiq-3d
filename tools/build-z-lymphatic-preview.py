#!/usr/bin/env python3
"""Align selected Z-Anatomy lymphatic meshes to existing BP3D lymphatic models.

Outputs only new, unreferenced preview files. NEVER rewrites existing
models/lymphatic-standard.glb / lymphatic-detailed.glb or their JSON.
"""
import argparse,hashlib,json,math
from pathlib import Path
import numpy as np
import trimesh

ANCHORS={'spleen':('ZAANCHOR_SPLEEN','FJ2561'),
         'thymus_left':('ZAANCHOR_THYMUS_LEFT','FJ3150'),
         'thymus_right':('ZAANCHOR_THYMUS_RIGHT','FJ3151')}

def extract_nodes(path):
    s=trimesh.load(path,force='scene',process=False)
    if not isinstance(s,trimesh.Scene):raise ValueError('Source must load as a GLB scene')
    result={}
    for node in s.graph.nodes_geometry:
        if node in result:raise ValueError(f'duplicate scene node {node}')
        transform, geometry_name=s.graph[node]
        mesh=s.geometry[geometry_name].copy()
        mesh.apply_transform(transform)
        if len(mesh.vertices)==0 or len(mesh.faces)==0 or not np.isfinite(mesh.vertices).all():
            raise ValueError(f'empty/bad mesh: {node}')
        result[node]=mesh
    return result

def similarity(source, target):
    """World-space rotation+uniform scale+translation, no reflection."""
    a=np.asarray(source,dtype=float);b=np.asarray(target,dtype=float)
    if a.shape!=(3,3) or b.shape!=(3,3):raise ValueError('Need three source and target 3D anchors')
    ac=a.mean(axis=0);bc=b.mean(axis=0)
    x=a-ac;y=b-bc
    if np.linalg.norm(x)<1e-9 or np.linalg.norm(np.cross(x[1]-x[0],x[2]-x[0]))<1e-10:
        raise ValueError('Source anchors degenerate')
    u,sv,vt=np.linalg.svd(x.T@y)
    r=vt.T@np.diag([1.,1.,np.linalg.det(vt.T@u.T)])@u.T
    scale=float(np.trace((x@r.T).T@y)/np.sum(x*x))
    if not math.isfinite(scale) or scale<=0:raise ValueError('Invalid source-to-target scale')
    t=bc-scale*(r@ac)
    tx=np.eye(4);tx[:3,:3]=scale*r;tx[:3,3]=t
    fitted=(scale*(r@a.T)).T+t
    residuals=np.linalg.norm(fitted-b,axis=1)
    return tx,{'scale':scale,'rotation_determinant':float(np.linalg.det(r)),
               'anchor_residuals':residuals.tolist(),'rms':float(np.sqrt(np.mean(residuals**2))),
               'max_residual':float(max(residuals)),'matrix':tx.tolist()}

def simplify(mesh,goal):
    if len(mesh.faces)<=goal:return mesh.copy()
    try:
        lower=mesh.simplify_quadric_decimation(face_count=goal)
        if 0<len(lower.faces)<=len(mesh.faces):return lower
    except Exception as e:
        print('Simplification unavailable; retaining original geometry:',str(e)[:200])
    return mesh.copy()

def build(source_glb,base_glb,selection_json,outdir,threshold=0.08):
    selected=json.loads(selection_json.read_text())
    if selected.get('status')!='exported_unregistered':raise ValueError('Source selection was not exported by Blender')
    source=extract_nodes(source_glb);target=extract_nodes(base_glb)
    missing=[key for key, pair in ANCHORS.items() if pair[0] not in source or pair[1] not in target]
    if missing:raise ValueError('Registration anchor nodes missing: '+', '.join(missing))
    A=np.array([source[za].centroid for za,bp in ANCHORS.values()]);B=np.array([target[bp].centroid for za,bp in ANCHORS.values()])
    matrix,fit=similarity(A,B)
    if fit['max_residual']>threshold:
        raise ValueError(f'Alignment error {fit["max_residual"]:.4f} > {threshold:.4f} body-frame units; model NOT staged. Inspect source registration.')
    entries=selected['candidates']
    if not entries or len(entries)>1000:raise ValueError('Unexpected candidate count')
    ids=[s['id'] for s in entries]
    if len(ids)!=len(set(ids)):raise ValueError('Duplicate source structure IDs')
    result={'version':1,'system':'lymphatic-z-preview','source':'Z-Anatomy','source_url':'https://github.com/Z-Anatomy/Models-of-human-anatomy',
            'license':'CC BY-SA 4.0','coordinate_frame':'Registered to existing BodyParts3D lymphatic GLB using spleen and bilateral thymus landmark centroids',
            'registration':fit,'structures':[],'warning':'Experimental staging only: visual registration, object names, coverage and individual provenance require review before public deployment.'}
    standard=trimesh.Scene();detailed=trimesh.Scene()
    stats={'node':0,'vessel':0,'immune':0,'unclassified_lymphatic':0}
    for entry in entries:
        node=entry['id'];cat=entry['category'];name=entry['name']
        if node not in source:raise ValueError('GLB node absent: '+node)
        mesh=source[node].copy();mesh.apply_transform(matrix)
        if len(mesh.faces)>250000:raise ValueError('An unexpectedly huge candidate mesh: '+name)
        sm=simplify(mesh,2600)
        dm=simplify(mesh,13000)
        sm.remove_unreferenced_vertices();dm.remove_unreferenced_vertices()
        standard.add_geometry(sm,geom_name=node,node_name=node)
        detailed.add_geometry(dm,geom_name=node,node_name=node)
        result['structures'].append({'id':node,'name':name,'category':cat,'source_path':entry['path'],
                                     'standard_triangles':len(sm.faces),'detailed_triangles':len(dm.faces)})
        stats[cat]=stats.get(cat,0)+1
    outdir.mkdir(parents=True,exist_ok=True)
    result['category_counts']=stats
    (outdir/'lymphatic-z-structures.json').write_text(json.dumps(result,indent=2)+'\n')
    for label,scene in [('standard',standard),('detailed',detailed)]:
        (outdir/f'lymphatic-z-{label}.glb').write_bytes(scene.export(file_type='glb'))
        verified=extract_nodes(outdir/f'lymphatic-z-{label}.glb')
        if set(verified)!=set(ids):raise ValueError(label+' GLB node ids did not match manifest')
        for e in result['structures']:
            if len(verified[e['id']].faces)!=e[f'{label}_triangles']:raise ValueError(label+': triangle count mismatch for '+e['id'])
    proof={'source_sha256':hashlib.sha256(source_glb.read_bytes()).hexdigest(),'candidate_count':len(entries),
           'category_counts':stats,'source_registration':fit,'status':'PREVIEW_ONLY_NO_DEPLOYMENT'}
    (outdir/'lymphatic-z-audit.json').write_text(json.dumps(proof,indent=2)+'\n')
    print('PASS:',len(entries),'Z-Anatomy lymphatic candidate meshes staged; alignment maximum error',round(fit['max_residual'],5))
    print('These files are PREVIEW ONLY and are not loaded by the production AnatomIQ app.')
    return result

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--source',type=Path,required=True)
    p.add_argument('--baseline',type=Path,required=True)
    p.add_argument('--selection',type=Path,required=True)
    p.add_argument('--out',type=Path,required=True)
    p.add_argument('--max-error',type=float,default=.08)
    a=p.parse_args()
    build(a.source,a.baseline,a.selection,a.out,a.max_error)
