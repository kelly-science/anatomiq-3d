#!/usr/bin/env python3
"""Select VERIFIED BodyParts3D meshes for teacher's heart/vessel curriculum.

Never creates vessels or inserts fabricated bridging meshes. Never overwrites
existing FJ identifiers. Prioritizes required names over generic small branches.
"""
import argparse
import csv
import hashlib
import importlib.util
import json
import re
from collections import defaultdict
from pathlib import Path

ID=re.compile(r'^FJ\d+[A-Z]?$')

def read_ids(paths):
    found=set()
    for p in paths:
        if p and p.is_file():
            if p.suffix=='.json':
                found.update(s['id'] for s in json.loads(p.read_text()).get('structures',[]))
            else:
                with p.open(newline='') as f: found.update(s['fj_id'] for s in csv.DictReader(f))
    return found

def sort_fj(id):
    m=re.fullmatch(r'FJ(\d+)([A-Z]?)',id)
    if not m:raise ValueError('Invalid mesh ID: '+id)
    return int(m.group(1)),m.group(2)

def choose(rows,targets,existing,limit=120,per_target=3):
    """Prioritize missing curriculum labels and source-backed counterparts."""
    selected=[];selected_ids=set();ledger=[]
    for t in sorted(targets,key=lambda t:(t['priority'], {'heart':0,'great-vessel':1,'artery':2,'vein':3}[t['group']])):
        rx=re.compile(t['pattern'],re.I)
        found=[r for r in rows if rx.search(r.get('name','')) and ID.fullmatch(r.get('fj_id',''))]
        # These are not fictional names: every row must have valid source OBJ info.
        source=[r for r in found if int(r.get('faces') or 0)>=50]
        present=[r for r in source if r['fj_id'] in existing]
        available=[r for r in source if r['fj_id'] not in existing and r['fj_id'] not in selected_ids]
        preferred_sides={side for side in ('left','right') if any(re.search(r'\b'+side+r'\b',r['name'],re.I) for r in present)}
        # Try to fill an absent side before downloading more subdivisions of one side.
        def sort_key(r):
            side='left' if re.search(r'\bleft\b',r['name'],re.I) else 'right' if re.search(r'\bright\b',r['name'],re.I) else 'midline'
            return (side in preferred_sides, not bool(re.search(r'\b(?:trunk|proper|arch)\b',r['name'],re.I)), -int(r.get('faces') or 0),sort_fj(r['fj_id']))
        available.sort(key=sort_key)
        max_for_this=0 if not available else min(per_target,len(available))
        if t.get('bilateral') and {'left','right'}.issubset(preferred_sides):max_for_this=0
        if t.get('bilateral') and preferred_sides and max_for_this: max_for_this=min(max_for_this,2)
        if not t.get('bilateral') and present:max_for_this=0 # no extra duplicates for already covered names
        added=[]
        for r in available[:max_for_this]:
            if len(selected)>=limit:break
            selected.append({**r,'category': 'heart-internal' if t['group']=='heart' and ('valve' in t['name'].lower() or 'muscle' in t['name'].lower()) else 'coronary' if t['group']=='heart' else 'systemic', 'class_target':t['id']})
            selected_ids.add(r['fj_id']);added.append(r['fj_id'])
            side='left' if re.search(r'\bleft\b',r['name'],re.I) else 'right' if re.search(r'\bright\b',r['name'],re.I) else 'midline'
            preferred_sides.add(side)
        ledger.append({'name':t['name'],'group':t['group'],'source_matches':len(source),'previous_meshes':len(present),'new_ids':added,'source_status':'not-in-catalog' if not source else 'already-present' if present and not added else 'selected' if added else 'not-selected'})
    return selected,ledger

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--upstream',type=Path,required=True)
    p.add_argument('--curriculum',type=Path,required=True)
    p.add_argument('--out',type=Path,required=True)
    p.add_argument('--exclude',type=Path,action='append',default=[])
    p.add_argument('--max-additional',type=int,default=120)
    p.add_argument('--list-only',action='store_true')
    a=p.parse_args()
    if not 0<a.max_additional<=180:p.error('--max-additional must be 1–180')
    with (a.upstream/'MANIFEST.csv').open(newline='') as file:rows=list(csv.DictReader(file))
    curriculum=json.loads(a.curriculum.read_text())
    selected,ledger=choose(rows,curriculum['targets'],read_ids(a.exclude),a.max_additional)
    print(f'Class Core missing-source candidates: {len(selected)} verified meshes for {len(curriculum["targets"])} required curriculum targets.')
    for t in ledger:
        if t['new_ids']:print('  ',t['name'],':',', '.join(t['new_ids']))
    if a.list_only:return
    a.out.mkdir(parents=True,exist_ok=True)
    target=a.out/'MANIFEST.csv'
    if selected:
        spec=importlib.util.spec_from_file_location('bp3d_subset',str((a.upstream/'bp3d_subset.py').resolve()))
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        digest=hashlib.sha256('\n'.join(r['fj_id'] for r in selected).encode()).hexdigest()[:12]
        pairs=module.download_picked(a.upstream,selected,a.out/'core',a.out/'_chunks'/digest,chunk_size=20)
        got={r['fj_id']:path for r,path in pairs}
        if set(got)!={r['fj_id'] for r in selected}:raise SystemExit('Class Core provider returned an incomplete mesh subset')
    else:got={}
    with target.open('w',newline='') as file:
        w=csv.DictWriter(file,fieldnames=['group','fj_id','bp_id','fma_id','name','obj','bytes','category'])
        w.writeheader()
        for row in selected:
            path=got[row['fj_id']]
            if not path.is_file() or path.stat().st_size<300:raise SystemExit('Invalid source mesh '+str(path))
            w.writerow({'group':'core','fj_id':row['fj_id'],'bp_id':row['bp_id'],'fma_id':row['fma_id'],'name':row['name'],
                'obj':path.relative_to(a.out).as_posix(),'bytes':path.stat().st_size,'category':row['category']})
    (a.out/'CURRICULUM_SELECTION.json').write_text(json.dumps({'source':'BodyParts3D 4.3','added_meshes':len(selected),
       'warning':'Matching names indicate source meshes, not uninterrupted blood-vessel geometry.', 'targets':ledger},indent=2)+'\n')
    print(f'Selected {len(selected)} original meshes; no artificial connections generated.')

if __name__=='__main__':main()
