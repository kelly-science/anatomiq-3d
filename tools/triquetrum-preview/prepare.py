#!/usr/bin/env python3
"""Download only BodyParts3D 4.3 wrist source meshes; create browser index.

No core AnatomIQ files modified. Python stdlib except whatever the published
upstream BodyParts3D subset downloader itself requires.
"""
from __future__ import annotations
import argparse, csv, hashlib, json, pathlib, re, subprocess, sys, urllib.request

ROOT=pathlib.Path(__file__).resolve().parent
DATA=ROOT/'assets'
UPSTREAM=ROOT/'_upstream'
SOURCE='https://raw.githubusercontent.com/olivercase/body_parts_3d_api/main/'
FILES=('MANIFEST.csv','bp3d_subset.py','download_bodyparts3d_4.3.py')
PATTERN=r'(?i)^(?:left|right)\s+(?:triquetral|triquetrum|lunate|pisiform|hamate)(?:\s+bone)?$'
ALIASES={'triquetrum':'triquetral'}


def download(url,dest):
    req=urllib.request.Request(url,headers={'User-Agent':'AnatomIQ-classroom-geometry-preview/1.0'})
    with urllib.request.urlopen(req,timeout=45) as f: content=f.read()
    if len(content)<400: raise ValueError(f'Unexpectedly small source: {url}')
    dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(content)


def parse_obj(path):
    vertices=faces=0
    for line in path.read_text(errors='replace').splitlines():
        if line.startswith('v '): vertices+=1
        elif line.startswith('f '):faces+=1
    if vertices<4 or faces<4: raise ValueError(f'Invalid OBJ mesh: {path}')
    return vertices,faces


def indexed_assets(source_dir=DATA):
    manifest=source_dir/'MANIFEST.csv'
    if not manifest.exists(): raise ValueError('BodyParts3D subset MANIFEST.csv not found')
    results=[]
    with manifest.open(newline='') as f:
        for r in csv.DictReader(f):
            name=r.get('name','').strip(); match=re.fullmatch(PATTERN,name)
            if not match:continue
            side,kind=name.lower().split(' ',1)
            kind=ALIASES.get(kind.removesuffix(' bone'),kind.removesuffix(' bone'))
            obj=source_dir/pathlib.Path(r['obj'])
            if not obj.resolve().is_relative_to(source_dir.resolve()):raise ValueError('OBJ path outside asset folder')
            if not obj.is_file():raise ValueError('Missing expected OBJ: '+str(obj))
            verts,faces=parse_obj(obj)
            results.append({'id':r['fj_id'],'name':name,'side':side,'kind':kind,
                           'fma':r.get('fma_id',''),'vertices':verts,'faces':faces,
                           'sha256':hashlib.sha256(obj.read_bytes()).hexdigest(),
                           'url':'assets/'+obj.relative_to(source_dir).as_posix()})
    for side in ('left','right'):
        kinds={r['kind'] for r in results if r['side']==side}
        needed={'triquetral','lunate','pisiform','hamate'}
        if not needed.issubset(kinds):
            raise ValueError(f'Missing {side} verified carpal entries: {sorted(needed-kinds)}')
    results.sort(key=lambda r:(r['side'],r['kind'],-r['faces'],r['id']))
    return results


def main():
    p=argparse.ArgumentParser();p.add_argument('--reuse',action='store_true',help='Index assets already present without downloading');p.add_argument('--local-source',type=pathlib.Path,help='Use an existing BodyParts3D subset folder containing MANIFEST.csv');a=p.parse_args()
    if a.local_source:
        source=a.local_source.resolve()
        entries=indexed_assets(source)
        # For external assets, copy the verified subset to our isolated asset path.
        import shutil
        DATA.mkdir(parents=True,exist_ok=True)
        (DATA/'MANIFEST.csv').write_bytes((source/'MANIFEST.csv').read_bytes())
        for r in entries:
            source_obj=source/r['url'].removeprefix('assets/')
            dest=DATA/r['url'].removeprefix('assets/')
            dest.parent.mkdir(parents=True,exist_ok=True)
            if source_obj.resolve()!=dest.resolve():shutil.copy2(source_obj,dest)
    elif not a.reuse:
        UPSTREAM.mkdir(parents=True,exist_ok=True)
        for filename in FILES:
            target=UPSTREAM/filename
            if not target.exists():
                print('Fetching upstream metadata/tool:',filename,flush=True)
                download(SOURCE+filename,target)
        print('Downloading only triquetral and matching wrist landmark meshes...',flush=True)
        subprocess.run([sys.executable,str(UPSTREAM/'bp3d_subset.py'),'--manifest',str(UPSTREAM/'MANIFEST.csv'),
                        '--pattern',PATTERN,'--name','carpals','--download','--out',str(DATA),'--chunk-size','20'],check=True)
    entries=indexed_assets(DATA)
    payload={'schema':1,'status':'UNREGISTERED: alignment is a preview, not a verified anatomical placement',
             'source':'BodyParts3D 4.3 (DBCLS); subset download via olivercase/body_parts_3d_api',
             'entries':entries}
    (DATA/'index.json').write_text(json.dumps(payload,indent=2))
    print('VERIFIED',len(entries),'source objects, both triquetra and matching reference carpals')
    print('READY: serve AnatomIQ repo and open /tools/triquetrum-preview/preview.html')
    print('WARNING: placement must be visually verified before publication.')

if __name__=='__main__':
    try:main()
    except Exception as e:print('FAILED:',e,file=sys.stderr);sys.exit(1)
