#!/usr/bin/env python3
"""Validate local and optionally deployed lymphatic GLB/manifest identity without NumPy."""
import argparse,hashlib,json,struct,urllib.request
from pathlib import Path
EXPECTED={'FJ2561','FJ3150','FJ3151'}
FILES=['lymphatic-structures.json','lymphatic-standard.glb','lymphatic-detailed.glb']

def read_glb(data):
    if data[:4]!=b'glTF' or len(data)<28 or struct.unpack_from('<I',data,4)[0]!=2 or struct.unpack_from('<I',data,8)[0]!=len(data):raise ValueError('Malformed GLB header')
    length,kind=struct.unpack_from('<II',data,12)
    if kind!=0x4e4f534a or length<2 or length>len(data)-20:raise ValueError('GLB JSON chunk missing')
    return json.loads(data[20:20+length])

def validate(label,fetch):
    files={name:fetch(name) for name in FILES}
    meta=json.loads(files[FILES[0]]); catalog=meta.get('structures',[])
    ids=[s['id'] for s in catalog]
    if len(ids)!=3 or set(ids)!=EXPECTED:raise ValueError(label+': invalid source structure IDs')
    print(label)
    for name,data in files.items():print(f'  {name}: {len(data):,} bytes SHA256 {hashlib.sha256(data).hexdigest()[:16]}')
    for quality in ('standard','detailed'):
        data=read_glb(files[f'lymphatic-{quality}.glb']);nodes=[n for n in data.get('nodes',[]) if 'mesh' in n]
        if len(nodes)!=3 or {n.get('name') for n in nodes}!=EXPECTED:raise ValueError(label+': GLB structures do not match manifest')
        byname={n['name']:n for n in nodes}
        for item in catalog:
            m=data['meshes'][byname[item['id']]['mesh']]
            tris=sum(data['accessors'][p['indices']]['count']//3 for p in m['primitives'])
            if tris!=item[f'{quality}_triangles']:raise ValueError(f'{label}: {item["id"]} {quality} triangle mismatch ({tris})')
        print(f'  {quality}: 3 mesh nodes / 3 JSON entries — PASS')
    return {n:hashlib.sha256(d).hexdigest() for n,d in files.items()}

def main():
    p=argparse.ArgumentParser();p.add_argument('--local',default='models');p.add_argument('--remote');a=p.parse_args()
    local=validate('Local',lambda n:(Path(a.local)/n).read_bytes())
    if a.remote:
        root=a.remote.rstrip('/')+'/models/'
        def get(n):
            with urllib.request.urlopen(urllib.request.Request(root+n,headers={'Cache-Control':'no-cache','User-Agent':'AnatomIQ-Atlas-Checker'}),timeout=45) as r:return r.read()
        remote=validate('Published',get)
        for name in FILES:
            if local[name]!=remote[name]:raise ValueError(f'PUBLISHED FILES DIFFER: {name} — push the matching GLBs and JSON together')
    print('PASS: Lymphatic models and metadata match')
if __name__=='__main__':main()
