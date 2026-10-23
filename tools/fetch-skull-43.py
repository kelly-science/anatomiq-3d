#!/usr/bin/env python3
"""Select individually identifiable skull bones from the verified 4.3 manifest.

Each target has exactly one component. Prefer the newest FJ6000+ member of
otherwise duplicate bone versions. No guesswork from filenames or external APIs.
"""
import argparse,csv,hashlib,importlib.util,re
from pathlib import Path

SINGLES=['frontal bone','occipital bone','ethmoid','sphenoid bone','mandible','vomer']
PAIRED=['parietal bone','temporal bone','nasal bone','palatine bone','maxilla',
        'zygomatic bone','lacrimal bone','inferior nasal concha']
TARGETS=SINGLES+[f'{side} {name}' for name in PAIRED for side in ('left','right')]

def norm(n):return re.sub(r'\s+bone$','',str(n).strip().lower())
def choose(manifest):
    with Path(manifest).open(newline='') as f:rows=list(csv.DictReader(f))
    if not rows or not {'fj_id','bp_id','fma_id','name','faces'}<=set(rows[0]):
        raise SystemExit('Invalid upstream version-4.3 manifest')
    selected=[]
    for name in TARGETS:
        found=[r for r in rows if norm(r['name'])==norm(name) and re.fullmatch('FJ[0-9]+[A-Z]?',r['fj_id'])]
        if found:
            # Prefer the FJ6000+ source anatomy set, which offers coherent
            # neighbouring meshes in the same BodyParts3D revision.
            found.sort(key=lambda r:(int(re.match(r'FJ(\d+)',r['fj_id']).group(1))>=6000,
                                      int(r['faces']),int(re.match(r'FJ(\d+)',r['fj_id']).group(1))))
            selected.append({**found[-1],'target':name,'category':'skull-bone'})
        else:print('No source mesh for:',name)
    required={'frontal bone','mandible','left parietal bone','right parietal bone'}
    got={r['target'] for r in selected}
    if not required<=got or len(selected)<15:
        raise SystemExit(f'Insufficient independently selectable skull bones ({len(selected)}). Missing {required-got}')
    ids=[r['fj_id'] for r in selected]
    if len(set(ids))!=len(ids):raise SystemExit('Multiple skull targets resolve to the same FJ source component')
    return selected

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--upstream',required=True,type=Path)
    ap.add_argument('--out',required=True,type=Path);ap.add_argument('--list-only',action='store_true')
    a=ap.parse_args();selected=choose(a.upstream/'MANIFEST.csv')
    print(f'Curated {len(selected)} skull bones:')
    for r in selected:print(f"  {r['fj_id']:9} {r['target']:30} {int(r['faces']):,} triangles")
    if a.list_only:return
    a.out.mkdir(parents=True,exist_ok=True)
    spec=importlib.util.spec_from_file_location('bp3d_subset',str((a.upstream/'bp3d_subset.py').resolve()))
    mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
    digest=hashlib.sha256('\n'.join(r['fj_id'] for r in selected).encode()).hexdigest()[:12]
    pairs=mod.download_picked(a.upstream,selected,a.out/'skull',a.out/'_chunks'/digest,chunk_size=18)
    got=dict((r['fj_id'],p) for r,p in pairs)
    if set(got)!={r['fj_id'] for r in selected}:raise SystemExit('Skull OBJ download incomplete')
    with (a.out/'MANIFEST.csv').open('w',newline='') as f:
        keys=['group','fj_id','bp_id','fma_id','name','target','obj','bytes']
        w=csv.DictWriter(f,fieldnames=keys);w.writeheader()
        for r in selected:
            path=got[r['fj_id']]
            if not path.is_file() or path.stat().st_size<300:raise SystemExit('Incomplete skull OBJ: '+str(path))
            w.writerow({'group':'skull','fj_id':r['fj_id'],'bp_id':r['bp_id'],'fma_id':r['fma_id'],
                        'name':r['name'],'target':r['target'],'obj':path.relative_to(a.out).as_posix(),'bytes':path.stat().st_size})
    print('Validated skull anatomy ->',a.out/'MANIFEST.csv')
if __name__=='__main__':main()
