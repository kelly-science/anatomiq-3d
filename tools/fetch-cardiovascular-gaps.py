#!/usr/bin/env python3
"""Conservative anatomical-gap pass. Never manufactures missing mesh geometry.

Only exact named high-priority trunk candidates are selected. Source may not
contain a continuous vessel: user visually verifies each target in the app.
"""
import argparse,csv,hashlib,importlib.util,json,re
from pathlib import Path
from collections import OrderedDict

TARGETS=OrderedDict([
 ('right-radial-trunk',r'^(?:trunk (?:proper )?of )?right radial artery$'),
 ('right-ulnar-trunk',r'^(?:trunk (?:proper )?of )?right ulnar artery$'),
 ('left-vertebral-vein',r'^(?:trunk (?:proper )?of )?left vertebral vein$'),
 ('left-external-jugular-vein',r'^(?:trunk (?:proper )?of )?left external jugular vein$'),
 ('left-hepatic-vein',r'^(?:trunk (?:proper )?of )?left hepatic vein$'),
 ('middle-hepatic-vein',r'^(?:trunk (?:proper )?of )?middle hepatic vein$'),
 ('right-hepatic-vein',r'^(?:trunk (?:proper )?of )?right hepatic vein$'),
 ('left-lumbar-vein',r'^(?:trunk (?:proper )?of )?left (?:ascending )?lumbar vein$'),
 ('right-lumbar-vein',r'^(?:trunk (?:proper )?of )?right (?:ascending )?lumbar vein$'),
 ])
FJ=re.compile(r'^FJ\d+[A-Z]?$')
def choose(rows,present,limit=18):
    picked=[];report=[];ids=set(present)
    for target,pattern in TARGETS.items():
        matches=[r for r in rows if re.search(pattern,r.get('name',''),re.I) and FJ.fullmatch(r.get('fj_id','')) and int(r.get('faces') or 0)>=50]
        # Prefer the largest named trunk, not a tiny disconnected branch.
        matches.sort(key=lambda r:(-int(r.get('faces') or 0),r['fj_id']))
        installed=[r for r in matches if r['fj_id'] in ids]
        candidate=next((r for r in matches if r['fj_id'] not in ids),None)
        added=[]
        if not installed and candidate and len(picked)<limit:
            picked.append({**candidate,'category':'systemic'});ids.add(candidate['fj_id']);added=[candidate['fj_id']]
        report.append({'target':target,'source_count':len(matches),'installed_ids':[r['fj_id'] for r in installed],
                       'added_ids':added,'status':'already-present' if installed else 'selected' if added else 'not-found' if not matches else 'not-selected',
                       'caution':'An available named mesh may still be geometrically disconnected.'})
    return picked,report

def main():
    p=argparse.ArgumentParser();p.add_argument('--upstream',type=Path,required=True);p.add_argument('--out',type=Path,required=True)
    p.add_argument('--exclude',type=Path,required=True);p.add_argument('--list-only',action='store_true');a=p.parse_args()
    with (a.upstream/'MANIFEST.csv').open(newline='') as f: rows=list(csv.DictReader(f))
    previous=json.loads(a.exclude.read_text());present={s['id'] for s in previous['structures']}
    selected,report=choose(rows,present)
    print(f'Vascular continuity candidates: {len(selected)} matched provider meshes across {len(report)} priority targets')
    for t in report:print(f"  {t['target']}: {t['status']} {','.join(t['added_ids'])}")
    if a.list_only:return
    a.out.mkdir(parents=True,exist_ok=True)
    if selected:
        spec=importlib.util.spec_from_file_location('bp3d_subset',str((a.upstream/'bp3d_subset.py').resolve()))
        mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
        digest=hashlib.sha256('\n'.join(r['fj_id'] for r in selected).encode()).hexdigest()[:12]
        pairs=mod.download_picked(a.upstream,selected,a.out/'gaps',a.out/'_chunks'/digest,chunk_size=20)
        # download_picked returns (manifest_row_dict, local_obj_path) pairs.
        # A source row is a dictionary (unhashable), so index by stable FJ ID.
        found={row['fj_id']: Path(path) for row,path in pairs}
        requested={row['fj_id'] for row in selected}
        if set(found)!=requested:
            raise SystemExit('Missing requested source meshes: '+', '.join(sorted(requested-set(found))))
    else: found={}
    with (a.out/'MANIFEST.csv').open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=['group','fj_id','bp_id','fma_id','name','obj','bytes','category']);w.writeheader()
        for row in selected:
            obj=found[row['fj_id']]
            if obj.stat().st_size<300:raise SystemExit('Incomplete downloaded mesh: '+str(obj))
            w.writerow({'group':'gaps','fj_id':row['fj_id'],'bp_id':row['bp_id'],'fma_id':row['fma_id'],
                       'name':row['name'],'obj':obj.relative_to(a.out).as_posix(),'bytes':obj.stat().st_size,'category':'systemic'})
    (a.out/'GAP_SELECTION.json').write_text(json.dumps({'source':'BodyParts3D 4.3','targets':report,'added_meshes':len(selected)},indent=2)+'\n')
if __name__=='__main__':main()
