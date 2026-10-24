#!/usr/bin/env python3
"""Verify local urinary GLB/JSON consistency and optional live public deployment."""
import argparse,json,struct,hashlib,urllib.request
from pathlib import Path
NAMES=('urinary-structures.json','urinary-standard.glb','urinary-detailed.glb')

def mesh_ids(data):
    if data[:4]!=b'glTF':raise ValueError('Not GLB')
    magic,version,total=struct.unpack_from('<4sII',data,0)
    if version!=2 or total!=len(data):raise ValueError('Malformed GLB length')
    count,typ=struct.unpack_from('<II',data,12)
    if typ!=0x4E4F534A:raise ValueError('Malformed GLB JSON chunk')
    root=json.loads(data[20:20+count])
    return [n['name'] for n in root.get('nodes',[]) if 'mesh' in n]

def check(blobs,title):
    meta=json.loads(blobs[NAMES[0]])
    names=[s['id'] for s in meta['structures']]
    if len(names)!=6 or len(set(names))!=6:raise ValueError('Expected exactly six source IDs')
    print(title)
    for f in NAMES:
        blob=blobs[f]
        print(f'  {f}: {len(blob):,} bytes SHA256 {hashlib.sha256(blob).hexdigest()[:16]}')
        if f.endswith('.glb'):
            found=mesh_ids(blob)
            if set(names)!=set(found) or len(found)!=6:raise ValueError(f'{f}: {len(found)} GLB nodes do not match six JSON IDs')
            print('    6/6 nodes match JSON — PASS')

def main():
    p=argparse.ArgumentParser();p.add_argument('--local',type=Path,default=Path('models'));p.add_argument('--remote')
    args=p.parse_args();local={f:(args.local/f).read_bytes() for f in NAMES};check(local,'Local')
    if args.remote:
        base=args.remote.rstrip('/')+'/models/'
        remote={}
        for f in NAMES:
            with urllib.request.urlopen(urllib.request.Request(base+f,headers={'Cache-Control':'no-cache'}),timeout=45) as response:
                remote[f]=response.read()
        check(remote,'Published')
        if any(local[f]!=remote[f] for f in NAMES):raise SystemExit('FAIL: published urinary model set differs from local. Push all three files together.')
        print('PASS: published model files match local exactly.')
    else: print('PASS: local urinary model set is consistent.')
if __name__=='__main__':main()
