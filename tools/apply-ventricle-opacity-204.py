#!/usr/bin/env python3
"""AnatomIQ 2.0.4: higher-opacity ventricular anatomy, without GLB rebuilds.

The patch operates on the deployed 2.0.3 repository. All edits are prepared and
validated in memory, then backed up before files are replaced.
"""
from __future__ import annotations

import datetime as dt
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'app.js'
NERVOUS = ROOT / 'nervous-model.js'
SW = ROOT / 'sw.js'
VERSION = ROOT / 'version.json'
TARGET = '2.0.4'

# Intentional scope: only the ventricular return branch in the existing visual
# styling function. Meninges, colors, geometry and all source IDs are untouched.
FUNCTION = re.compile(r'export\s+function\s+nervousMaterialOverrides\s*\(\s*s\s*\)\s*\{[\s\S]*?\n\}', re.M)
BRANCH = re.compile(r'(?P<start>if\s*\(\s*(?:category|group)\s*===\s*[\'\"]ventricle[\'\"]\s*\)\s*return\s*)\{(?P<body>[^{}]+)\}', re.M)
APP_VERSION = re.compile(r'(?P<start>const\s+APP_VERSION\s*=\s*[\'\"])[0-9]+\.[0-9]+\.[0-9]+(?P<end>[\'\"]\s*;)')
PONG_VERSION = re.compile(r'(?P<start>pong\.version\s*!==\s*[\'\"]anatomy-v)[0-9]+\.[0-9]+\.[0-9]+(?P<end>[\'\"])')
SW_VERSION = re.compile(r'(?P<start>const\s+VERSION\s*=\s*[\'\"]anatomy-v)[0-9]+\.[0-9]+\.[0-9]+(?P<end>[\'\"]\s*;)')


def error(message: str):
    raise RuntimeError(message + '\nNo files changed in this run.')


def version_tuple(version):
    try:
        return tuple(int(s) for s in version.split('.'))
    except (TypeError, ValueError):
        error('Unrecognized current version.')


def prepare():
    if not all(p.is_file() for p in (APP, NERVOUS, SW, VERSION)):
        error('Run from an AnatomIQ project containing app.js, nervous-model.js, sw.js and version.json.')
    n = NERVOUS.read_text(encoding='utf-8')
    a = APP.read_text(encoding='utf-8')
    sw = SW.read_text(encoding='utf-8')
    meta = json.loads(VERSION.read_text(encoding='utf-8'))
    if version_tuple(meta.get('version')) > version_tuple(TARGET):
        error(f"Project version {meta.get('version')} is newer than this 2.0.4 patch.")
    if 'nervousMaterialOverrides(entry)' not in a:
        error('This project does not use the 2.0.3 nervous material overrides. Install 2.0.3 first.')
    # Confirm the app uses all three settings from overrides; otherwise updating
    # only the model file would falsely appear to fix transparency.
    if not all(s in a for s in ('transparent:nervous', 'opacity:nervous', 'depthWrite:nervous')):
        error('App nervous material constructor does not expose opacity/depthWrite as expected.')

    fn = FUNCTION.search(n)
    if not fn:
        error('Could not locate the nervous-material styling function.')
    match = BRANCH.search(fn.group(0))
    if not match:
        error('Could not identify the ventricular material branch; refusing a generic replacement.')
    body = match.group('body')
    changes = {'transparent': 'true', 'opacity': '0.94', 'depthWrite': 'true'}
    updated_body = body
    for key, value in changes.items():
        rx = re.compile(rf'\b{key}\s*:\s*(?:true|false|0(?:\.\d+)?|1(?:\.0+)?)\b')
        updated_body, count = rx.subn(f'{key}:{value}', updated_body)
        if count != 1:
            error(f'Ventricle style has an unexpected {key} definition.')
    fixed_function = fn.group(0)[:match.start('body')] + updated_body + fn.group(0)[match.end('body'):]
    n = n[:fn.start()] + fixed_function + n[fn.end():]

    # Service worker cache bump to guarantee iPad/Chromebook installs see the
    # new JS, without resetting IndexedDB or deleting local lessons.
    a, count = APP_VERSION.subn(r'\g<start>2.0.4\g<end>', a, count=1)
    if count != 1:
        error('Could not update APP_VERSION.')
    a, count = PONG_VERSION.subn(r'\g<start>2.0.4\g<end>', a)
    if count < 1:
        error('Could not update service-worker version check in app.js.')
    sw, count = SW_VERSION.subn(r'\g<start>2.0.4\g<end>', sw, count=1)
    if count != 1:
        error('Could not update service worker cache revision.')
    meta['version'] = TARGET
    meta['notes'] = 'Ventricular model opacity corrected: 94% opaque ventricular volumes with depth writes enabled. Meninges remain translucent; GLBs unchanged.'
    version = json.dumps(meta, indent=2, ensure_ascii=False) + '\n'

    if "if(category==='dura')return {transparent:true,opacity:0.3,depthWrite:false" not in n:
        # Don't fail if an edited instance used a different (still-translucent)
        # dural setting; just insist the meningeal branch was not removed.
        if not re.search(r"if\s*\(\s*(?:category|group)\s*===\s*['\"]dura['\"]\s*\)", n):
            error('Dura material classification is unexpectedly missing.')
    if shutil.which('node'):
        for filename, code in ((APP.name, a), (NERVOUS.name, n), (SW.name, sw)):
            result = subprocess.run(['node', '--input-type=module', '--check'], input=code, text=True, capture_output=True)
            if result.returncode:
                error(f'JavaScript syntax check failed for {filename}: {result.stderr[:1000]}')
    return {NERVOUS: n, APP: a, SW: sw, VERSION: version}


def main():
    updated = prepare()
    changed = {path: content for path, content in updated.items() if path.read_text(encoding='utf-8') != content}
    if not changed:
        print('PASS: Nervous ventricular opacity 2.0.4 is already applied; no changes needed.')
        return
    stamp = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%d-%H%M%S-%f')
    backup = ROOT / f'.nervous-204-backup-{stamp}'
    backup.mkdir(exist_ok=False)
    for path in changed:
        shutil.copy2(path, backup / path.name)
    try:
        for path, content in changed.items():
            tmp = path.with_name(f'.{path.name}.204-tmp')
            tmp.write_text(content, encoding='utf-8')
            tmp.replace(path)
    except Exception:
        for path in changed:
            shutil.copy2(backup / path.name, path)
        raise
    print('PASS: Applied AnatomIQ 2.0.4 ventricular opacity fix.')
    print('VENTRICLES: opacity 0.94, transparency on, depth writing on.')
    print('MENINGES: unchanged, translucent.')
    print('Updated:', ', '.join(path.name for path in changed))
    print('BACKUP:', backup)
    print('Commit the four updated app files together. No models/ files changed.')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print('ERROR:', exc, file=sys.stderr)
        sys.exit(1)
