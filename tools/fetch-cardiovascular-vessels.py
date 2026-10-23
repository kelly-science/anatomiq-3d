#!/usr/bin/env python3
"""Fetch additional *existing* BodyParts3D 4.3 major-vessel meshes.

Reads the pinned upstream MANIFEST.csv; no invented/bridging geometry. Excludes
all structures in the current cardiovascular model and earlier downloaded
subsets. Produces a bounded, reproducible additional dataset and a coverage
report of what names were available; does not imply an uninterrupted vessel.
"""
import argparse
import csv
import hashlib
import importlib.util
import json
import re
from collections import Counter
from pathlib import Path

# Relatively large vessels with useful A&P identities; match family names in
# anatomy labels, not exact suffixes like "trunk of ..." or "segment of ...".
TERRITORIES = {
 'head-neck': r'carotid|jugular|vertebral arter|facial arter|superficial temporal arter|occipital arter',
 'thorax': r'brachiocephalic|subclavian|axillary|thoracic aorta|intercostal|internal thoracic|pulmonary (?:arter|vein)',
 'heart': r'coronary|cardiac vein|coronary sinus|circumflex arter|interventricular arter',
 'abdomen': r'celiac|mesenteric|hepatic (?:arter|vein)|portal vein|splenic (?:arter|vein)|renal (?:arter|vein)|abdominal aorta',
 'pelvis': r'iliac|internal pudendal|sacral arter',
 'upper-limb': r'brachial|radial arter|ulnar arter|cephalic vein|basilic vein',
 'lower-limb': r'femoral|popliteal|tibial arter|fibular arter|peroneal arter|saphenous',
}
TER_PAT={k:re.compile(v,re.I) for k,v in TERRITORIES.items()}
VESSEL_NOUN=re.compile(r'\b(?:artery|arteries|arterial|vein|veins|venous|aorta|sinus|trunk|cava)\b',re.I)
ID=re.compile(r'^FJ\d+[A-Z]?$')

def fj_key(v):
 m=re.fullmatch(r'FJ(\d+)([A-Z]?)',v)
 if not m: raise ValueError('Unsupported FJ id '+v)
 return int(m.group(1)),m.group(2)

def choose(rows,excludes,max_additional=100):
 selected=[]
 for row in rows:
  id=row.get('fj_id','')
  name=row.get('name','')
  if id in excludes or not ID.fullmatch(id) or not VESSEL_NOUN.search(name):continue
  territory=next((k for k,rx in TER_PAT.items() if rx.search(name)),None)
  if not territory: continue
  faces=int(row.get('faces') or 0)
  # Very small capillary fragments add draw calls without recognisable branches.
  if faces<100:continue
  selected.append({**row,'category':'vessel-'+territory})
 # Prefer trunks and substantial vessels, with balanced anatomical territories.
 buckets={k:[] for k in TERRITORIES}
 for s in selected:buckets[s['category'].removeprefix('vessel-')].append(s)
 for b in buckets.values():
  b.sort(key=lambda r: (not bool(re.search(r'\btrunk\b|\b(left|right)\b',r['name'],re.I)), -int(r.get('faces') or 0),fj_key(r['fj_id'])))
 chosen=[]
 while len(chosen)<max_additional and any(buckets.values()):
  for key in TERRITORIES:
   if buckets[key] and len(chosen)<max_additional:chosen.append(buckets[key].pop(0))
 return sorted(chosen,key=lambda r:fj_key(r['fj_id']))

def existing_ids(files):
 found=set()
 for path in files:
  if not path or not path.is_file():continue
  if path.suffix=='.json':
   for r in json.loads(path.read_text()).get('structures',[]):found.add(r['id'])
  else:
   with path.open(newline='') as f:
    found.update(row['fj_id'] for row in csv.DictReader(f))
 return found

def main():
 a=argparse.ArgumentParser(description=__doc__)
 a.add_argument('--upstream',required=True,type=Path)
 a.add_argument('--out',required=True,type=Path)
 a.add_argument('--exclude',action='append',type=Path,default=[])
 a.add_argument('--limit',type=int,default=100)
 a.add_argument('--list-only',action='store_true')
 args=a.parse_args()
 if not 0<=args.limit<=150: a.error('--limit must be 0–150')
 upstream=args.upstream
 with (upstream/'MANIFEST.csv').open(newline='') as f:rows=list(csv.DictReader(f))
 selected=choose(rows,existing_ids(args.exclude),args.limit)
 print(f'New named major-vessel meshes from 4.3: {len(selected)} (maximum {args.limit})')
 print('By territory:',dict(Counter(s['category'] for s in selected)))
 if args.list_only:
  for s in selected:print(s['fj_id'],s['category'],s['name'])
  return
 out=args.out
 out.mkdir(parents=True,exist_ok=True)
 dest=out/'vessels'
 if selected:
  spec=importlib.util.spec_from_file_location('bp3d_subset',str((upstream/'bp3d_subset.py').resolve()))
  module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
  digest=hashlib.sha256('\n'.join(s['fj_id'] for s in selected).encode()).hexdigest()[:12]
  pairs=module.download_picked(upstream,selected,dest,out/'_chunks'/digest,chunk_size=20)
  got={row['fj_id']:path for row,path in pairs}
  if set(got)!={row['fj_id'] for row in selected}:
   raise SystemExit('Not all verified vessel meshes downloaded')
 else:got={}
 target=out/'MANIFEST.csv'
 with target.open('w',newline='') as f:
  writer=csv.DictWriter(f,fieldnames=['group','fj_id','bp_id','fma_id','name','obj','bytes','category'])
  writer.writeheader()
  for s in selected:
   path=got[s['fj_id']]
   if not path.is_file() or path.stat().st_size<300:raise SystemExit('Invalid vessel OBJ '+str(path))
   writer.writerow({**{k:s[k] for k in ('fj_id','bp_id','fma_id','name','category')},'group':'vessels','obj':path.relative_to(out).as_posix(),'bytes':path.stat().st_size})
 report={'source':'BodyParts3D 4.3','note':'Only selected source meshes, not an anatomically continuous vessel network; gaps may remain.',
         'new_meshes':len(selected),'territory_counts':dict(Counter(s['category'] for s in selected)),
         'names':[{'id':s['fj_id'],'name':s['name'],'territory':s['category']} for s in selected]}
 (out/'COVERAGE.json').write_text(json.dumps(report,indent=2)+'\n')
 print(f'New manifest: {target} — note that all source vessel gaps remain real limitations')
if __name__=='__main__':main()
