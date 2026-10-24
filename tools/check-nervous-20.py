#!/usr/bin/env python3
"""AnatomIQ 2.0 nervous-system manifest ↔ GLB check (local, optional remote)."""
import argparse, hashlib, json, pathlib, struct, sys, urllib.request

def read(path, remote=None):
    if remote:
        with urllib.request.urlopen(remote.rstrip('/')+'/models/'+path,timeout=45) as r:
            if r.status!=200 or 'html' in r.headers.get('Content-Type','').lower():
                raise ValueError('Unexpected server response for '+path)
            return r.read()
    return (pathlib.Path(args.local)/path).read_bytes()

def glb_mesh_names(data):
    if len(data)<28 or data[:4]!=b'glTF':raise ValueError('Invalid GLB header')
    version,total=struct.unpack_from('<II',data,4)
    size,kind=struct.unpack_from('<II',data,12)
    if version!=2 or total!=len(data) or kind!=0x4E4F534A or size<10 or size>len(data)-20:
        raise ValueError('Malformed GLB JSON chunk')
    info=json.loads(data[20:20+size]);return [n.get('name') for n in info.get('nodes',[]) if 'mesh' in n]

def check(where,remote=None):
    print(where)
    paths=['nervous-structures.json','nervous-standard.glb','nervous-detailed.glb']
    blobs={path:read(path,remote) for path in paths}
    structures=json.loads(blobs[paths[0]])['structures']
    ids=[s['id'] for s in structures]
    if len(set(ids))!=len(ids):raise ValueError('Duplicate source IDs in nervous manifest')
    result={}
    for path,blob in blobs.items():
        print(f'  {path}: {len(blob):,} bytes  SHA256 {hashlib.sha256(blob).hexdigest()[:16]}')
        if path.endswith('.glb'):
            nodes=glb_mesh_names(blob)
            missing=set(ids)-set(nodes);unexpected=set(nodes)-set(ids)
            valid=len(nodes)==len(ids) and len(set(nodes))==len(nodes) and not missing and not unexpected
            print(f'    {len(nodes)} GLB meshes / {len(ids)} JSON entries — {"PASS" if valid else "MISMATCH"}')
            if missing:print('    missing: '+', '.join(sorted(missing)))
            if unexpected:print('    unexpected: '+', '.join(sorted(unexpected)))
            if not valid:raise ValueError('GLB nodes do not match nervous manifest')
    result={path:hashlib.sha256(blob).hexdigest() for path,blob in blobs.items()}
    return result

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--local',default='models')
    p.add_argument('--remote',default=None,help='Optional GitHub Pages site root for comparison')
    args=p.parse_args()
    try:
        local=check('Local')
        if args.remote:
            published=check('Published',args.remote)
            different=[k for k in local if local[k]!=published[k]]
            if different:raise ValueError('Published files differ: '+', '.join(different))
        print('PASS: nervous atlas models and manifest match.')
    except Exception as e:
        print('FAIL:',e,file=sys.stderr);sys.exit(1)
