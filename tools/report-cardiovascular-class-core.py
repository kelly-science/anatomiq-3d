#!/usr/bin/env python3
"""Audit a generated GLB's manifest against the teacher's curriculum.
Status shows literal source-name evidence, not assumptions of anatomical continuity.
"""
import argparse
import json
import re
from pathlib import Path

def report(curriculum,metadata):
    structures=metadata.get('structures',[])
    rows=[]
    for target in curriculum['targets']:
        rx=re.compile(target['pattern'],re.I)
        matches=[{'id':s['id'],'name':s['name']} for s in structures if rx.search(s['name'])]
        sides={side for side in ('left','right') if any(re.search(r'\b'+side+r'\b',s['name'],re.I) for s in matches)}
        partial=target.get('quality')!='full' or target.get('bilateral') and sides!={'left','right'}
        status='missing' if not matches else 'partial' if partial else 'represented'
        rows.append({'id':target['id'],'name':target['name'],'group':target['group'],'status':status,'source_meshes':matches})
    return {'title':curriculum['title'],'source_version':metadata.get('source'),'mesh_count':len(structures),'required_count':len(rows),
        'represented':sum(t['status']=='represented' for t in rows),'partial':sum(t['status']=='partial' for t in rows),'missing':sum(t['status']=='missing' for t in rows),
        'warning':'Model presence does not prove vessel continuity or realistic internal heart structures. Labels with partial coverage need visual validation.', 'targets':rows}

def main():
    p=argparse.ArgumentParser();p.add_argument('--curriculum',type=Path,required=True);p.add_argument('--manifest',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args()
    r=report(json.loads(a.curriculum.read_text()),json.loads(a.manifest.read_text()))
    a.out.parent.mkdir(exist_ok=True,parents=True);a.out.write_text(json.dumps(r,indent=2)+'\n')
    print(f'Curriculum coverage: {r["represented"]} represented, {r["partial"]} partial, {r["missing"]} absent, out of {r["required_count"]} targets.')
    if r['missing']:
      print('Targets missing from installed model:')
      for t in r['targets']:
        if t['status']=='missing':print(' - '+t['name'])
if __name__=='__main__':main()
