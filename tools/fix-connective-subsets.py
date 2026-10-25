#!/usr/bin/env python3
"""Prepare verified BodyParts3D connective subsets, reusing previously cached OBJs.

This utility does not download anything and never alters application GLBs. The
wrapper downloads only missing subset groups, then asks this helper to merge
manifests into a single verified 33-structure inventory.
"""
import argparse
import csv
import json
import shutil
import sys
from pathlib import Path

FIELDNAMES = ['group','fj_id','bp_id','fma_id','name','obj','bytes']


def read_manifest(folder):
    src = folder / 'MANIFEST.csv'
    if not src.is_file():
        return []
    with src.open(newline='', encoding='utf-8') as f:
        rows = list(csv.DictReader(f))
    result = []
    for row in rows:
        obj_name = row.get('obj', '')
        obj = (folder / obj_name).resolve() if obj_name else None
        if not obj or not obj.is_file() or obj.suffix.lower() != '.obj' or obj.stat().st_size <= 300:
            continue
        result.append((row, obj))
    return result


def verified(rows, expected):
    by_id = {}
    for row, obj in rows:
        fid = row['fj_id']
        if fid in by_id and by_id[fid][1] != obj:
            raise ValueError('Different cached meshes claim the same FJ ID: ' + fid)
        by_id[fid] = (row, obj)
    return all(fid in by_id and by_id[fid][0]['name'] == name for fid, name in expected.items())


def selection(folder):
    data = json.loads((folder / 'tools' / 'connective-selection.json').read_text(encoding='utf-8'))
    structures = data['structures']
    wanted = {row['fj_id']: row['name'] for row in structures}
    if len(wanted) != 33 or len(structures) != 33:
        raise ValueError('Expected exactly 33 unique pinned FJ IDs')
    core = {fid: name for fid, name in wanted.items() if fid not in {'FJ1405M','FJ1424M','FJ1405','FJ1424'}}
    ankle = {fid: name for fid, name in wanted.items() if fid not in core}
    if len(core) != 29 or len(ankle) != 4:
        raise ValueError('Pinned core/ankle selection differs from expected geometry')
    return structures, wanted, core, ankle


def find_skin(roots):
    for folder in roots:
        for row, obj in read_manifest(folder):
            if row['fj_id'] == 'FJ2810' and row['name'].lower() == 'skin':
                return str(obj)
    return ''


def merge(core_folder, ankle_folder, subset_folder, structures, expected_core, expected_ankle):
    core_rows = read_manifest(core_folder)
    ankle_rows = read_manifest(ankle_folder)
    if not verified(core_rows, expected_core):
        raise ValueError('Core joint cache is not complete. Re-run native downloader.')
    if not verified(ankle_rows, expected_ankle):
        raise ValueError('Ankle supplement cache is not complete. Re-run native downloader.')
    wanted = {s['fj_id']: s['name'] for s in structures}
    by_id = {}
    for row, obj in core_rows:
        if row['fj_id'] in expected_core:
            by_id[row['fj_id']] = (row, obj)
    for row, obj in ankle_rows:
        if row['fj_id'] in expected_ankle:
            by_id[row['fj_id']] = (row, obj)
    if set(by_id) != set(wanted):
        raise ValueError('33-FJ inventory incomplete after merging cached subsets')
    # Mirror just four small ankle source files into the existing joint subset.
    # Existing 29 core OBJ files, chunk ZIPs and download cookies stay untouched.
    addition_dir = subset_folder / 'ankle'
    addition_dir.mkdir(parents=True, exist_ok=True)
    output = []
    for item in structures:
        fid = item['fj_id']; row, obj = by_id[fid]
        if row['name'] != item['name']:
            raise ValueError('Source mesh name mismatch: ' + fid)
        if fid in expected_ankle:
            dest = addition_dir / obj.name
            if not dest.exists() or dest.stat().st_size != obj.stat().st_size:
                shutil.copy2(obj, dest)
            obj = dest
        relative = obj.relative_to(subset_folder.resolve()).as_posix() if obj.is_relative_to(subset_folder.resolve()) else obj.relative_to(subset_folder).as_posix()
        newrow = {key: row.get(key, '') for key in FIELDNAMES}
        newrow['group'] = 'connective-33'
        newrow['obj'] = relative
        newrow['bytes'] = str(obj.stat().st_size)
        output.append(newrow)
    temp = subset_folder / 'MANIFEST.csv.228c.tmp'
    with temp.open('w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader(); writer.writerows(output)
    temp.replace(subset_folder / 'MANIFEST.csv')
    if not verified(read_manifest(subset_folder), wanted):
        raise ValueError('Merged manifest failed its own 33-source verification')
    print('Verified: all 33 source-backed connective OBJs; original 29-mesh download cache reused.')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['check-all','check-core','check-ankle','merge','skin'])
    parser.add_argument('--repo', type=Path, required=True)
    args = parser.parse_args()
    root = args.repo.resolve()
    structures, wanted, core, ankle = selection(root)
    work = root / '.connective-43-work'
    subset = work / 'subsets' / 'joints'
    core_folder = subset / 'connective-joints'
    ankle_folder = work / 'subsets' / 'ankle-patch' / 'connective-ankle'
    if args.action == 'check-all':
        good = verified(read_manifest(subset), wanted)
        print('Full 33-mesh inventory: ' + ('ready' if good else 'incomplete'))
        return 0 if good else 1
    if args.action == 'check-core':
        good = verified(read_manifest(subset), core) or verified(read_manifest(core_folder), core)
        print('Core 29-mesh inventory: ' + ('ready' if good else 'incomplete'))
        return 0 if good else 1
    if args.action == 'check-ankle':
        good = verified(read_manifest(subset), ankle) or verified(read_manifest(ankle_folder.parent), ankle)
        print('Four ankle/foot meshes: ' + ('ready' if good else 'incomplete'))
        return 0 if good else 1
    if args.action == 'merge':
        # If all are already merged, skip copying and rewriting files entirely.
        if verified(read_manifest(subset), wanted):
            print('Verified: all 33 source-backed connective OBJs already merged.')
            return 0
        # Under a previous successful merge, the core cache remains available.
        merge(subset, ankle_folder.parent, subset, structures, core, ankle)
        return 0
    if args.action == 'skin':
        folders = [root / '.digestive-43-work/subsets/skin',
                   root / '.respiratory-43-work/subsets/skin',
                   work / 'subsets/skin']
        skin = find_skin(folders)
        if skin:
            print(skin)
            return 0
        return 1
    return 2

if __name__ == '__main__':
    try:
        sys.exit(main())
    except (OSError, ValueError, KeyError) as err:
        print('ERROR: ' + str(err), file=sys.stderr)
        sys.exit(1)
