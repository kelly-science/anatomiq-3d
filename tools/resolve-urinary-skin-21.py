#!/usr/bin/env python3
"""Find an authentic BodyParts3D 4.3 skin registration OBJ, fetching if absent.

Emits only the absolute validated OBJ path to stdout. Download diagnostics go
through stderr so shell command substitution receives a clean path.
No existing respiratory, digestive, cardiovascular, or nervous mesh is modified.
"""
import argparse
import csv
from pathlib import Path
import subprocess
import sys

SKIN_ID = 'FJ2810'
SKIN_NAME = 'Skin'


def locate(folder: Path):
    manifest = folder / 'MANIFEST.csv'
    if not manifest.is_file():
        return None
    try:
        with manifest.open(newline='', encoding='utf-8-sig') as stream:
            rows = list(csv.DictReader(stream))
        matched = [r for r in rows if r.get('fj_id') == SKIN_ID and r.get('name') == SKIN_NAME]
        if len(matched) != 1:
            return None
        relative = Path(matched[0]['obj'])
        if relative.is_absolute() or '..' in relative.parts or relative.suffix.lower() != '.obj':
            return None
        target = (folder / relative).resolve()
        # The OBJ must live within the intended cache; never accept external links.
        try:
            target.relative_to(folder.resolve())
        except ValueError:
            return None
        if target.is_file() and target.stat().st_size > 300:
            return target
    except (OSError, KeyError, ValueError, csv.Error):
        pass
    return None


def resolve(root: Path, work: Path, upstream: Path, python: Path):
    search = [root / '.respiratory-43-work/subsets/skin',
              root / '.digestive-43-work/subsets/skin',
              work / 'subsets/skin']
    for folder in search:
        found = locate(folder)
        if found is not None:
            print(f'Reusing verified BodyParts3D skin reference: {found}', file=sys.stderr)
            return found

    catalog = upstream / 'MANIFEST.csv'
    downloader = upstream / 'bp3d_subset.py'
    if not catalog.is_file() or not downloader.is_file():
        raise RuntimeError('Pinned BodyParts3D 4.3 downloader/catalog missing; rerun urinary installer preflight.')
    with catalog.open(newline='', encoding='utf-8-sig') as stream:
        rows = list(csv.DictReader(stream))
    matches = [r for r in rows if r.get('fj_id') == SKIN_ID and r.get('name') == SKIN_NAME]
    if len(matches) != 1:
        raise RuntimeError('Pinned BodyParts3D 4.3 catalog does not contain exactly one FJ2810 Skin reference.')

    destination = search[-1]
    if destination.exists() and any(destination.iterdir()):
        # An incomplete previous attempt should never be mistaken for a valid reference.
        import datetime
        stamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
        archived = destination.with_name(f'skin-incomplete-{stamp}')
        suffix = 1
        while archived.exists():
            archived = destination.with_name(f'skin-incomplete-{stamp}-{suffix}')
            suffix += 1
        destination.rename(archived)
        print(f'Preserving incomplete cached skin download: {archived}', file=sys.stderr)
    destination.parent.mkdir(parents=True, exist_ok=True)
    print('Downloading the authentic BodyParts3D 4.3 FJ2810 skin alignment reference...', file=sys.stderr)
    result = subprocess.run([str(python), str(downloader), '--group', 'skin', '--download',
                             '--out', str(destination)], capture_output=True, text=True)
    if result.stdout:
        print(result.stdout.rstrip(), file=sys.stderr)
    if result.stderr:
        print(result.stderr.rstrip(), file=sys.stderr)
    if result.returncode:
        raise RuntimeError(f'Skin reference download failed (exit {result.returncode}); urinary models remain unchanged.')
    found = locate(destination)
    if found is None:
        raise RuntimeError('Skin reference download completed but verified FJ2810 OBJ is absent; urinary models remain unchanged.')
    return found


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--root', type=Path, required=True)
    p.add_argument('--work', type=Path, required=True)
    p.add_argument('--upstream', type=Path, required=True)
    p.add_argument('--python', type=Path, required=True)
    a = p.parse_args()
    try:
        answer = resolve(a.root.resolve(), a.work.resolve(), a.upstream.resolve(), a.python.resolve())
    except (RuntimeError, OSError, csv.Error) as exc:
        p.exit(1, f'ERROR: {exc}\n')
    print(answer)


if __name__ == '__main__':
    main()
