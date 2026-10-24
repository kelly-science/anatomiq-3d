#!/usr/bin/env python3
"""Append catalog-backed nervous anatomy to a verified 2.0 model without reordering old IDs.

Synthetic lower limb overlays (opt-in flag) are transparently marked as illustrative;
they are NOT part of the BodyParts3D 4.3 nerve source. Never writes to models/
except through the shell installer, which stages, validates and backs up first.
"""
from __future__ import annotations
import argparse, csv, hashlib, json, math, re
from pathlib import Path
import numpy as np
import trimesh
from importlib import util

SOURCE_ID=re.compile(r'^FJ\d+[A-Z]?$',re.I)
PNS=re.compile(r'\bnerve\b|\bbrachial nerve plexus\b|\bciliary ganglion\b',re.I)
DEEP=re.compile(r'\b(?:lateral ventricle|third ventricle|fourth ventricle|interventricular foramen|cerebral aqueduct|hypothalamus|pineal body|caudate nucleus|putamen|globus pallidus|amygdala|fornix|subthalamic nucleus|thalamic nucleus|corpus callosum|internal capsule|optic chiasm|optic tract|superior colliculus|inferior colliculus|habenula|geniculate body|mammillary body|mammillothalamic tract|hippocampus|substantia nigra|septum of telencephalon|choroid plexus|cerebral peduncle|stria terminalis|stria medullaris|lamina terminalis|anterior commissure|posterior commissure|basal ganglia|nucleus accumbens|claustrum|red nucleus|hypothalamic nucleus)\b',re.I)
BAD_DEEP=re.compile(r'\b(?:artery|arteries|vein\w*|muscle|ligament|hepatic|biliary|lymph\w*|venous|nerves?)\b',re.I)
EXPECTED_NERVE_IDS=('FJ4264','FJ4265','FJ4266','FJ4267','FJ4273','FJ4274','FJ4275','FJ4276','FJ4280','FJ4290')
EXPECTED_BRAIN_IDS=('FJ1730','FJ1731','FJ1767','FJ1814','FJ1760','FJ1808','FJ1742','FJ1754','FJ1802','FJ1776','FJ1823')


def sha(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for part in iter(lambda:f.read(1024*1024),b''):h.update(part)
    return h.hexdigest()


def selected(catalog, old_ids):
    with catalog.open(newline='',encoding='utf-8-sig') as f:rows=list(csv.DictReader(f))
    ids={r['fj_id'] for r in rows}
    if len(rows)<3000 or len(ids)!=len(rows):raise ValueError('Expected unique, complete version-pinned BodyParts3D 4.3 3,210-mesh catalog')
    if not set(EXPECTED_NERVE_IDS+EXPECTED_BRAIN_IDS).issubset(ids):raise ValueError('Catalog lacks required anatomical source IDs')
    candidates=[]
    for r in rows:
        n=r['name']; sid=r['fj_id']
        if (PNS.search(n) or (DEEP.search(n) and not BAD_DEEP.search(n))) and sid not in old_ids:
            candidates.append(dict(id=sid,name=n,category='peripheral' if PNS.search(n) else 'brain',fma_id=r['fma_id']))
    candidates.sort(key=lambda s:(int(re.search(r'\d+',s['id']).group()),s['id']))
    return candidates


def name_pattern(candidates):
    if not candidates:return r'(?!)'
    return r'^(?:'+'|'.join(re.escape(s) for s in sorted({r['name'] for r in candidates}))+r')$'


def load_sources(subset):
    with (subset/'MANIFEST.csv').open(newline='',encoding='utf-8-sig') as f:rows=list(csv.DictReader(f))
    out={}
    for row in rows:
        path=subset/row['obj']
        if not path.is_file() or path.stat().st_size<300:raise ValueError('Incomplete OBJ: '+str(path))
        if row['fj_id'] in out:raise ValueError('Duplicate OBJ: '+row['fj_id'])
        out[row['fj_id']]=(row,path)
    return out


def normalizer(skin):
    obj=trimesh.load(skin,force='scene',process=False)
    meshes=[m for m in obj.geometry.values() if isinstance(m,trimesh.Trimesh)]
    if not meshes:raise ValueError('Reference skin is empty')
    bounds=trimesh.util.concatenate(meshes).bounds
    lo,hi=bounds; axis=2; horizontal=[0,1];scale=(3.183290+3.534865)/(hi[axis]-lo[axis]); middle=(lo+hi)*.5
    def apply(verts):
        return np.column_stack(((verts[:,horizontal[0]]-middle[horizontal[0]])*scale,
                     (verts[:,axis]-lo[axis])*scale-3.534865,
                     (verts[:,horizontal[1]]-middle[horizontal[1]])*scale+0.4))
    return apply,scale


def catmull(points,per_segment=10):
    pts=np.asarray(points,dtype=float); samples=[]
    for i in range(len(pts)-1):
        a,b,c,d=pts[max(0,i-1)],pts[i],pts[i+1],pts[min(len(pts)-1,i+2)]
        for s in np.linspace(0,1,per_segment,endpoint=False):
            samples.append(.5*((2*b)+(-a+c)*s+(2*a-5*b+4*c-d)*s*s+(-a+3*b-3*c+d)*s*s*s))
    samples.append(pts[-1]);return np.array(samples)


def tube(points,radius=0.012, sides=9):
    pts=catmull(points);verts=[];faces=[]
    for i,p in enumerate(pts):
        tangent=pts[min(i+1,len(pts)-1)]-pts[max(0,i-1)];tangent=tangent/(np.linalg.norm(tangent)+1e-12)
        guide=np.array([0,0,1.]) if abs(tangent[2])<.94 else np.array([1.,0,0]);u=np.cross(tangent,guide);u=u/(np.linalg.norm(u)+1e-12);v=np.cross(tangent,u)
        for j in range(sides):
            phi=2*math.pi*j/sides;verts.append(p+radius*(math.cos(phi)*u+math.sin(phi)*v))
        if i:
            for j in range(sides):
                k=(j+1)%sides;prior=(i-1)*sides;now=i*sides
                faces.extend([(prior+j,now+j,prior+k),(prior+k,now+j,now+k)])
    faces.extend([(0,(j+1)%sides,j) for j in range(1,sides-1)])
    tail=(len(pts)-1)*sides
    faces.extend([(tail,tail+j,tail+(j+1)%sides) for j in range(1,sides-1)])
    return trimesh.Trimesh(vertices=np.asarray(verts),faces=np.asarray(faces),process=False)


def illustrative_paths():
    # Anatomically guided teaching SCHEMATICS, not extracted or registered patient/DBCLS nerve paths.
    # Frontal = lower Z in original reference pose. Spine/cord are at X~0, Z~0.58.
    routes=[]
    for side,sign in (('Left',1),('Right',-1)):
        def xyz(points):return [[sign*x,y,z] for x,y,z in points]
        routes.extend([
          (f'{side} lumbosacral roots — schematic reconstruction',xyz([(.02,.82,.60),(.07,.55,.61),(.12,.14,.68),(.21,-.16,.72),(.38,-.56,.76)]),.010),
          (f'{side} sciatic nerve — schematic reconstruction',xyz([(.38,-.56,.76),(.42,-.85,.77),(.43,-1.12,.77),(.45,-1.74,.77)]),.018),
          (f'{side} tibial nerve — schematic reconstruction',xyz([(.45,-1.72,.77),(.45,-2.0,.78),(.43,-2.5,.77),(.42,-2.96,.75),(.49,-3.19,.71)]),.012),
          (f'{side} common fibular nerve — schematic reconstruction',xyz([(.45,-1.72,.77),(.51,-1.84,.66),(.62,-2.0,.59),(.60,-2.4,.53)]),.011),
          (f'{side} femoral nerve — schematic reconstruction',xyz([(.07,.72,.51),(.20,.22,.41),(.30,-.35,.31),(.43,-.65,.28),(.45,-1.10,.26),(.43,-1.46,.29)]),.013),
          (f'{side} obturator nerve — schematic reconstruction',xyz([(.07,.58,.50),(.17,.05,.42),(.25,-.45,.35),(.32,-.86,.32)]),.010),
        ])
    return routes


def scene_mesh(scene,sid):
    return scene.geometry[scene.graph[sid][1]]


def run(args):
    prior=json.loads((args.models/'nervous-structures.json').read_text())
    old=[r['id'] for r in prior['structures']]
    if len(old)!=len(set(old)) or len(old)<125:raise ValueError('Expected valid complete AnatomIQ 2.0 nervous catalog')
    if any(s.startswith('ANR') for s in old):raise ValueError('2.0.1 illustrative reconstructions already installed; do not append duplicate structures')
    additions=selected(args.catalog,set(old))
    report={'version':'2.0.1','existing_meshes':len(old),'source_additions':len(additions),'peripheral_additions':sum(s['category']=='peripheral' for s in additions),'brain_additions':sum(s['category']=='brain' for s in additions),'brachial_connection_ids':list(EXPECTED_NERVE_IDS),'ventricle_and_deep_brain_ids':list(EXPECTED_BRAIN_IDS),'lower_limb_source_coverage':'No sciatic, femoral, tibial, common fibular source meshes in canonical 4.3 MANIFEST.csv','candidates':additions}
    args.report.parent.mkdir(parents=True,exist_ok=True)
    args.report.write_text(json.dumps(report,indent=2)+'\n')
    if args.selection_only:
        if args.pattern_file:args.pattern_file.write_text(name_pattern(additions)+'\n')
        print('SELECTED',len(additions),'source meshes. Brachioplexus and deep brain verified in catalog.');return
    if not args.subset or not args.skin or not args.out:raise ValueError('Build requires --subset, --skin, --out')
    downloaded=load_sources(args.subset)
    absent={s['id'] for s in additions}-downloaded.keys()
    if absent:raise ValueError('Source download incomplete: '+repr(sorted(absent)[:20]))
    transform,scale=normalizer(args.skin)
    if abs(scale-float(prior['registration']['scale']))>1e-6:raise ValueError('Skin registration changed: refuse to mix misaligned meshes')
    existing={quality:trimesh.load(args.models/f'nervous-{quality}.glb',force='scene') for quality in ('standard','detailed')}
    for quality,scene in existing.items():
        nodes=list(scene.graph.nodes_geometry)
        if len(nodes)!=len(old) or set(nodes)!=set(old):raise ValueError('Prior '+quality+' GLB does not match manifest')
    structured=[dict(x) for x in prior['structures']]
    audit=[]
    for q in ('standard','detailed'):
        if len(existing[q].graph.nodes_geometry)!=len(old):raise ValueError('GLB prior mismatch')
    # Always add each source in exact same iteration order to both quality variants.
    for item in additions:
        row,obj=downloaded[item['id']]
        if row['name']!=item['name']:raise ValueError('Source name mismatch: '+item['id'])
        raw=trimesh.load(obj,force='scene',process=False)
        meshes=[g for g in raw.geometry.values() if isinstance(g,trimesh.Trimesh) and len(g.faces)]
        if not meshes:raise ValueError('Source mesh empty: '+str(obj))
        original=trimesh.util.concatenate(meshes) if len(meshes)>1 else meshes[0].copy()
        if len(original.faces)<5:raise ValueError('Source mesh degenerate: '+str(obj))
        original.vertices=transform(np.asarray(original.vertices))
        faces={}
        for quality,limit in (('standard',3200),('detailed',16000)):
            mesh=original.copy()
            if len(mesh.faces)>limit:mesh=mesh.simplify_quadric_decimation(face_count=limit)
            mesh.remove_unreferenced_vertices();_=mesh.vertex_normals
            existing[quality].add_geometry(mesh,geom_name=item['id'],node_name=item['id'])
            faces[quality]=len(mesh.faces)
        structured.append(dict(id=item['id'],fma_id=row['fma_id'],name=row['name'],category=item['category'],provenance='BodyParts3D 4.3',standard_triangles=faces['standard'],detailed_triangles=faces['detailed']))
        audit.append({'id':item['id'],'name':row['name'],'provenance':'BodyParts3D 4.3','source_sha256':sha(obj),'source_triangles':len(original.faces),**{q+'_triangles':v for q,v in faces.items()}})
        if len(audit)%40==0:print('Added',len(audit),'of',len(additions))
    if not args.no_illustrative_legs:
        for i,(name,points,radius) in enumerate(illustrative_paths(),1):
            sid=f'ANR{i:03}';base=tube(points,radius)
            for quality,mesh in (('standard',base),('detailed',base.copy())):
                _=mesh.vertex_normals
                existing[quality].add_geometry(mesh,geom_name=sid,node_name=sid)
            structured.append({'id':sid,'fma_id':'','name':name,'category':'peripheral','provenance':'illustrative-reconstruction','standard_triangles':len(base.faces),'detailed_triangles':len(base.faces)})
            audit.append({'id':sid,'name':name,'provenance':'illustrative-reconstruction','purpose':'Schematic teaching pathway only. NOT source-registered BodyParts3D anatomy; paths may not anatomically align in detail.','standard_triangles':len(base.faces),'detailed_triangles':len(base.faces)})
    metadata={**prior,'structures':structured,'source':'BodyParts3D / DBCLS 4.3 plus clearly identified teaching reconstructions','coverage_note':'Leg pathways are schematic because canonical 4.3 catalog has no corresponding lower-limb nerve meshes.'}
    args.out.mkdir(parents=True,exist_ok=True)
    (args.out/'nervous-structures.json').write_text(json.dumps(metadata,indent=2)+'\n')
    for quality,scene in existing.items():
        p=args.out/f'nervous-{quality}.glb';p.write_bytes(scene.export(file_type='glb'))
        result=trimesh.load(p,force='scene'); nodes=set(result.graph.nodes_geometry);target={s['id'] for s in structured}
        if nodes!=target or len(result.graph.nodes_geometry)!=len(structured):raise ValueError('Final model/metadata mismatch for '+quality)
        for s in structured:
            face_count=len(scene_mesh(result,s['id']).faces)
            if face_count!=s[quality+'_triangles']:raise ValueError('Triangle mismatch '+quality+': '+s['id'])
        if p.stat().st_size>95_000_000:raise ValueError('GLB file exceeds hosting budget')
        print(f'PASS {quality} {len(structured)} meshes, {p.stat().st_size/1e6:.1f} MB')
    (args.out/'nervous-source-audit.json').write_text(json.dumps({'version':'2.0.1','sources':['BodyParts3D/DBCLS CC BY-SA 2.1 JP','AnatomIQ clearly labeled illustrative lower-limb reconstructions'],'meshes':audit},indent=2)+'\n')
    # Old IDs must retain order AND exact geometry triangle counts.
    final=json.loads((args.out/'nervous-structures.json').read_text())
    if final['structures'][:len(old)]!=prior['structures']:raise ValueError('Old structure prefix changed')
    print('PASS old model index prefix preserved:',len(old),'structure IDs')


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--catalog',type=Path,required=True);p.add_argument('--models',type=Path,required=True)
    p.add_argument('--report',type=Path,required=True);p.add_argument('--selection-only',action='store_true')
    p.add_argument('--pattern-file',type=Path)
    p.add_argument('--subset',type=Path);p.add_argument('--skin',type=Path);p.add_argument('--out',type=Path)
    p.add_argument('--no-illustrative-legs',action='store_true')
    args=p.parse_args();run(args)
if __name__=='__main__':main()
