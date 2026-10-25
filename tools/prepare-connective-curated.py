#!/usr/bin/env python3
"""Assemble 14 verified connective source OBJs from existing cache + six costal meshes.
Never edit the 33-source cache or the previous source OBJ files.
"""
import argparse,csv,json,os,sys
from pathlib import Path

FIELDS=['group','fj_id','bp_id','fma_id','name','obj','bytes']
COSTAL={'FJ3668','FJ3669','FJ3667','FJ3668M','FJ3669M','FJ3667M'}

def selection(root):
    specs=json.loads((root/'tools/connective-selection.json').read_text())['structures']
    expected={s['fj_id']:s['name'] for s in specs}
    assert len(specs)==len(expected)==14, 'Invalid curated selection'
    assert set(expected)&COSTAL==COSTAL, 'Six missing costal FJ IDs'
    return specs,expected

def read_valid_rows(base):
    manifest=base/'MANIFEST.csv'
    if not manifest.is_file():return {}
    with manifest.open(newline='',encoding='utf8') as f:rows=list(csv.DictReader(f))
    result={}
    for row in rows:
        try:
            obj=(base/row['obj']).resolve()
            if obj.is_file() and obj.suffix.lower()=='.obj' and obj.stat().st_size>300:
                fid=row['fj_id']
                if fid in result:raise ValueError('Repeated FJ ID in manifest: '+fid)
                result[fid]=(row,obj)
        except (OSError,KeyError):continue
    return result

def assemble(root,do_write):
    root=root.resolve();work=root/'.connective-43-work/subsets'
    specs,expected=selection(root)
    original=read_valid_rows(work/'joints')
    new=read_valid_rows(work/'costal-8to10')
    entries={**original,**new}
    missing=[fid for fid,n in expected.items() if fid not in entries or entries[fid][0]['name']!=n]
    if not do_write:
        missing_costal=[fid for fid in missing if fid in COSTAL]
        missing_previous=[fid for fid in missing if fid not in COSTAL]
        if missing_previous:raise ValueError('Previously downloaded native meshes missing: '+','.join(missing_previous))
        if missing_costal:
            print('MISSING_COSTAL '+','.join(sorted(missing_costal)))
            return 1
        print('READY: all 14 curated connective meshes verified')
        return 0
    if missing:raise ValueError('Missing or incorrectly named source FJ meshes: '+','.join(missing))
    curated=work/'curated';curated.mkdir(exist_ok=True)
    rows=[]
    for s in specs:
        fj=s['fj_id'];r,obj=entries[fj]
        if not obj.is_relative_to(work.resolve()):raise ValueError('Source outside private cache: '+str(obj))
        out={k:r.get(k,'') for k in FIELDS}
        out.update(group='curated-connective-14',obj=Path(os.path.relpath(obj,curated)).as_posix(),bytes=str(obj.stat().st_size))
        rows.append(out)
    temp=curated/'MANIFEST.csv.tmp'
    with temp.open('w',newline='',encoding='utf8') as f:
        w=csv.DictWriter(f,fieldnames=FIELDS);w.writeheader();w.writerows(rows)
    temp.replace(curated/'MANIFEST.csv')
    if len(read_valid_rows(curated))!=14:raise ValueError('Curated manifest failed post-write validation')
    print('Ready: 14 native meshes (6 rib cartilage, 4 interosseous membranes, 2 plantar ligaments, 2 wrist retinacula); original caches preserved.')
    return 0

def resolve_skin(root):
    """Find the exact FJ2810 skin OBJ from verified cached manifests.

    Deliberately independent of the old 33-FJ helper and curated joint list.
    Never fetches another skin model or guesses filenames.
    """
    root=root.resolve()
    folders=[root/'.connective-43-work/subsets/skin',
             root/'.digestive-43-work/subsets/skin',
             root/'.respiratory-43-work/subsets/skin']
    for folder in folders:
        row_obj=read_valid_rows(folder).get('FJ2810')
        if row_obj and row_obj[0].get('name','').strip().lower()=='skin':
            obj=row_obj[1]
            if not obj.is_relative_to(root):
                raise ValueError('Skin reference must reside inside local repository source cache')
            print(obj)
            return 0
    raise ValueError('Verified BodyParts3D FJ2810 skin OBJ not present in cached MANIFEST.csv; do not rebuild')

def main():
    p=argparse.ArgumentParser();p.add_argument('action',choices=['check','assemble','skin']);p.add_argument('--repo',type=Path,required=True)
    a=p.parse_args()
    try:
        if a.action=='skin':return resolve_skin(a.repo)
        return assemble(a.repo,a.action=='assemble')
    except (ValueError,KeyError,AssertionError,OSError) as e:
        print('ERROR:',e,file=sys.stderr);return 2
if __name__=='__main__':sys.exit(main())
