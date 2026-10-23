#!/usr/bin/env python3
"""Select a *curated* larger 4.3 cardiovascular cast and download verified OBJ geometry.

Names/IDs come only from the downloaded, version-pinned upstream MANIFEST.csv.
The upstream source selector handles network session/cookies and verifies the ZIPs.
The first 15 original mesh IDs are always preserved in the final GLB by the builder.
"""
import argparse
import csv
import hashlib
import importlib.util
import json
import re
from pathlib import Path

# Keep this bounded and intentional. Avoid the thousands of tiny terminal vessel
# fragments; include heart cavities, individual valves, papillary muscles and
# recognizable central and peripheral vessels appropriate for A&P instruction.
HEART = [
 r'^cavity of (left|right) (ventricle|atrium)$',
 r'^(?:left|right|anterior|posterior|septal|anterolateral).* (?:cusp of (?:aortic|pulmonary) valve|leaflet of (?:mitral|tricuspid) valve|papillary muscle of (?:left|right) ventricle)$',
 r'^(?:anterior|posterior|septal) (?:cusp of (?:aortic|pulmonary) valve|leaflet of (?:mitral|tricuspid) valve)$',
 r'^(?:chordae tendineae|interventricular septum|interatrial septum|coronary sinus)$',
]
PULMONARY = [
 r'^trunk of (?:left|right) (?:pulmonary artery|(?:superior|inferior) pulmonary vein)$',
 r'^(?:left|right) (?:pulmonary artery|(?:superior|inferior) pulmonary vein)$',
]
CORONARY = [
 r'^(?:left|right) coronary artery$',
 r'^(?:anterior|posterior) interventricular (?:artery|branch of .*coronary artery)$',
 r'^circumflex (?:branch|artery) of left coronary artery$',
 r'^great cardiac vein$',
 r'^middle cardiac vein$',
]
SYSTEMIC = [
 r'^(?:trunk of )?(?:left|right) (?:subclavian|axillary|brachial|radial|ulnar|common iliac|external iliac|internal iliac|femoral|popliteal|renal|vertebral) (?:artery|vein)$',
 r'^trunk of (?:left|right) (?:common|internal|external) carotid artery$',
 r'^(?:left|right) (?:common|internal|external) carotid artery$',
 r'^trunk of (?:left|right) brachiocephalic vein$',
 r'^trunk of brachiocephalic artery$',
 r'^(?:celiac trunk|splenic artery|azygos vein|hemiazygos vein|hepatic portal vein)$',
 r'^trunk of (?:superior|inferior) mesenteric artery$',
 r'^(?:left|right) renal vein$',
]
RULES = [('heart-internal', HEART), ('pulmonary',PULMONARY), ('coronary',CORONARY), ('systemic',SYSTEMIC)]

def choose(manifest, max_structures=195):
    with Path(manifest).open(newline='') as f:
        rows = list(csv.DictReader(f))
    for col in ('fj_id','bp_id','fma_id','name','faces'):
        if not rows or col not in rows[0]: raise SystemExit('Missing upstream manifest field: '+col)
    selected={}
    for category,patterns in RULES:
        matchers=[re.compile(x,re.I) for x in patterns]
        matches=[row for row in rows if any(rx.fullmatch(row['name']) for rx in matchers)]
        for row in matches:
            if row['fj_id'] not in selected: selected[row['fj_id']]={**row,'category':category}
    # The original 15 rows are already stored separately; avoid needlessly
    # re-fetching/re-exporting them as an "extra" subset.
    legacy={x.strip() for x in (Path(__file__).parent/'cardio-original-ids.txt').read_text().splitlines() if x.strip() and not x.startswith('#')}
    selected={id:row for id,row in selected.items() if id not in legacy}
    if not 20<=len(selected)<=max_structures:
        raise SystemExit(f'Found {len(selected)} additional meshes; expected 20–{max_structures}. Refine the curated list before downloading.')
    def key(id):
        m=re.fullmatch(r'FJ(\d+)([A-Z]?)',id)
        if not m: raise SystemExit('Unknown source ID: '+id)
        return int(m.group(1)),m.group(2)
    return [selected[k] for k in sorted(selected,key=key)]

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--upstream',type=Path,required=True)
    ap.add_argument('--out',type=Path,required=True)
    ap.add_argument('--list-only',action='store_true')
    args=ap.parse_args()
    selected=choose(args.upstream/'MANIFEST.csv')
    print(f'Curated additional cardiovascular structures: {len(selected)}')
    from collections import Counter
    print('By category:',dict(Counter(r['category'] for r in selected)))
    if args.list_only:
        for r in selected: print(r['fj_id'],r['category'],r['name'])
        return
    args.out.mkdir(parents=True,exist_ok=True)
    digest=hashlib.sha256('\n'.join(r['fj_id'] for r in selected).encode()).hexdigest()[:12]
    spec=importlib.util.spec_from_file_location('bp3d_subset',str((args.upstream/'bp3d_subset.py').resolve()))
    mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
    dest=args.out/'expanded'
    pairs=mod.download_picked(args.upstream,selected,dest,args.out/'_chunks'/digest,chunk_size=20)
    got={r['fj_id']:path for r,path in pairs}
    if set(got)!={r['fj_id'] for r in selected}:
        raise SystemExit('Source did not return all selected meshes; conversion cancelled.')
    target=args.out/'MANIFEST.csv'
    with target.open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=['group','fj_id','bp_id','fma_id','name','obj','bytes','category'])
        w.writeheader()
        for r in selected:
            path=got[r['fj_id']]
            if not path.is_file() or path.stat().st_size<300:raise SystemExit('Invalid mesh: '+str(path))
            w.writerow({**{k:r[k] for k in ['fj_id','bp_id','fma_id','name','category']},'group':'expanded','obj':path.relative_to(args.out).as_posix(),'bytes':path.stat().st_size})
    print(f'Validated {len(selected)} additional anatomy meshes -> {target}')
if __name__=='__main__': main()
