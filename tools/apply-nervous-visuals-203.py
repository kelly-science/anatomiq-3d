#!/usr/bin/env python3
"""AnatomIQ 2.0.3 visual refresh — safe on 2.0.2 and partial 2.0.3 installs.

Works with both 2.0.0 and 2.0.2 nervous material assignments, validates all
required edits before writing, and never overwrites earlier backups.
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

BLOCK = """export const NERVOUS_COLORS=Object.freeze({
  cortex:'#e4b2b7',
  cerebellum:'#cfaea9',
  spinal_cord:'#e1c3b2',
  peripheral:'#dcc379',
  ventricle:'#7c96a8',
  thalamus:'#907986',
  hypothalamus:'#ad8173',
  basal_ganglia:'#a17670',
  limbic:'#b59278',
  dura:'#c6d7df',
  brainstem:'#c3a29b',
  brain:'#e4b2b7'
});
export function nervousNameGroup(s){
  const n=(s?.name||'').toLowerCase();
  if(s?.organId==='meninges'||/dura mater|falx cerebri|tentorium cerebelli/.test(n))return 'dura';
  if(/third ventricle|fourth ventricle|lateral ventricle|interventricular foramen|cerebral aqueduct/.test(n))return 'ventricle';
  if(/hypothalam|mammillar/.test(n))return 'hypothalamus';
  if(/thalam|habenul|geniculate/.test(n))return 'thalamus';
  if(/caudate|putamen|globus pallidus|substantia nigra|subthalamic nucleus/.test(n))return 'basal_ganglia';
  if(/amygdala|fornix|hippocamp|corpus callosum|septum pellucidum/.test(n))return 'limbic';
  if(/cerebell/.test(n))return 'cerebellum';
  if(/pons|midbrain|medulla oblongata|brainstem/.test(n))return 'brainstem';
  if(s?.organId==='spinal_cord')return 'spinal_cord';
  if(s?.organId==='peripheral')return 'peripheral';
  return 'brain';
}
export const nervousColor=s=>s?.provenance==='illustrative-reconstruction'?'#cf9856':NERVOUS_COLORS[nervousNameGroup(s)];
export function nervousMaterialOverrides(s){
  const category=nervousNameGroup(s);
  if(category==='dura')return {transparent:true,opacity:0.3,depthWrite:false,roughness:0.48};
  if(category==='ventricle')return {transparent:true,opacity:0.9,depthWrite:false,roughness:0.48};
  return {transparent:false,opacity:1,depthWrite:true,roughness:0.48};
}
"""

DESCRIPTIONS = """if(s.system==='nervous'){
    const n=(s.name||'').toLowerCase();
    if(/dura mater|falx cerebri|tentorium cerebelli/.test(n))return 'A protective fold or covering of the brain\u2019s dura mater.';
    if(/ventricle|cerebral aqueduct|interventricular foramen/.test(n))return 'Part of the cerebrospinal-fluid ventricular system.';
    if(/hypothalam/.test(n))return 'Diencephalic region involved in autonomic and endocrine regulation.';
    if(/thalam/.test(n))return 'Diencephalic region involved in relaying and processing information.';
    if(/caudate|putamen|globus pallidus/.test(n))return 'A basal ganglia component involved in motor circuits.';
    if(/amygdala/.test(n))return 'A limbic structure involved in emotion and memory.';
    if(/fornix/.test(n))return 'A limbic white-matter pathway connecting regions including the hippocampus.';
    if(s.organId==='spinal_cord')return 'The central nervous system pathway between brainstem and peripheral nerves.';
    if(s.organId==='peripheral')return 'A named peripheral or cranial nerve carrying sensory, motor or mixed signals.';
    return 'A named structure of the central nervous system.';
  }"""

NERV_START='export const NERVOUS_COLORS=Object.freeze('
NERV_END='export function nervousVisibleInPreset'
MAT_ASSIGN = re.compile(r'mesh\.material\s*=\s*new\s+THREE\.MeshStandardMaterial\s*\(\s*\{(?P<props>[^{}]*\bcolor\s*:\s*nervousColor\(entry\)[^{}]*)\}\s*\)\s*;', re.S)
IMPORT = re.compile(r'(import\s*\{)([^{}]*\bnervousColor\b[^{}]*)(\}\s*from\s*[\'\"]\./nervous-model\.js[\'\"]\s*;)', re.S)
APP_VERSION = re.compile(r'(const\s+APP_VERSION\s*=\s*[\'\"])[0-9]+\.[0-9]+\.[0-9]+([\'\"]\s*;)')
WORKER_VERSION = re.compile(r'(pong\.version\s*!==\s*[\'\"]anatomy-v)[0-9]+\.[0-9]+\.[0-9]+([\'\"])')
SW_VERSION = re.compile(r'(const\s+VERSION\s*=\s*[\'\"]anatomy-v)[0-9]+\.[0-9]+\.[0-9]+([\'\"]\s*;)')


def fail(message):
    raise RuntimeError(message + '\nNo new changes have been written by this run.')


def prepare():
    if not all(p.is_file() for p in (APP, NERVOUS, SW, VERSION)):
        fail('Run this from the existing AnatomIQ repository with app.js, nervous-model.js, sw.js, and version.json.')

    n = NERVOUS.read_text(encoding='utf-8')
    a = APP.read_text(encoding='utf-8')
    sw = SW.read_text(encoding='utf-8')
    meta = json.loads(VERSION.read_text(encoding='utf-8'))
    if not isinstance(meta, dict) or not isinstance(meta.get('version'), str):
        fail('version.json has an unexpected format.')
    if NERV_START not in n or NERV_END not in n:
        fail('nervous-model.js does not contain the expected nervous color and preset sections.')
    start, end = n.index(NERV_START), n.index(NERV_END)
    if end <= start:
        fail('nervous-model.js has an unexpected function order.')
    n = n[:start] + BLOCK + n[end:]

    found = IMPORT.search(a)
    if not found:
        fail('app.js has a different nervous-model import; update cannot safely proceed.')
    names = found.group(2)
    if 'nervousMaterialOverrides' not in names:
        names = names.rstrip() + ',nervousMaterialOverrides'
        a = a[:found.start()] + found.group(1) + names + found.group(3) + a[found.end():]

    # The 2.0.0 and 2.0.2 releases use different object literal properties.
    # Replace only the matching nervous material constructor, leaving all other
    # material setup and applySurfaceFinish logic alone.
    already_styled = ('nervousVisualStyle=nervousMaterialOverrides(entry)' in a
                      or 'nervousStyle=nervousMaterialOverrides(entry)' in a)
    m = None if already_styled else MAT_ASSIGN.search(a)
    if m:
        constructor = ("const nervousVisualStyle=nervousMaterialOverrides(entry);\n"
          "      mesh.material=new THREE.MeshStandardMaterial({"
          "color:nervousColor(entry),metalness:0,"
          "roughness:nervousVisualStyle.roughness,side:THREE.DoubleSide,"
          "transparent:nervousVisualStyle.transparent,opacity:nervousVisualStyle.opacity,"
          "depthWrite:nervousVisualStyle.depthWrite});")
        a = a[:m.start()] + constructor + a[m.end():]
    elif not already_styled:
        fail('Nervous material setup was not recognized; refusing to modify app.js.')

    # The right-panel description is only changed when it matches the known
    # one-line legacy branch. Newer custom text remains untouched.
    legacy_description = re.compile(r"if\(s\.system==='nervous'\)return \(\{brain:[^\n]*\}\)\[s\.organId\]\|\|'Nervous-system anatomy\.';")
    a = legacy_description.sub(lambda _: DESCRIPTIONS, a, count=1)
    a, version_matches = APP_VERSION.subn(r'\g<1>2.0.3\g<2>', a, count=1)
    if version_matches != 1:
        fail('Could not locate APP_VERSION in app.js.')
    a, worker_matches = WORKER_VERSION.subn(r'\g<1>2.0.3\g<2>', a)
    if worker_matches < 1:
        fail('Could not locate the model refresh service-worker version in app.js.')
    sw, sw_matches = SW_VERSION.subn(r'\g<1>2.0.3\g<2>', sw, count=1)
    if sw_matches != 1:
        fail('Could not locate the service-worker cache version in sw.js.')

    meta['version'] = '2.0.3'
    meta['notes'] = 'Nervous visual tuning: pink cortex, color-separated deep brain/ventricles, translucent meninges. Geometry unchanged.'
    v = json.dumps(meta, indent=2, ensure_ascii=False) + '\n'

    if not all(["nervousMaterialOverrides" in n, "nervousMaterialOverrides" in a,
                "color:nervousColor(entry)" in a, '2.0.3' in a, '2.0.3' in sw]):
        fail('A required update did not pass content checks.')

    if shutil.which('node'):
        for filename, content in ((APP.name, a), (NERVOUS.name, n), (SW.name, sw)):
            test = subprocess.run(['node', '--input-type=module', '--check'], input=content,
                                  text=True, capture_output=True)
            if test.returncode:
                fail(f'JavaScript syntax validation failed for {filename}: {test.stderr[:900]}')

    return {APP: a, NERVOUS: n, SW: sw, VERSION: v}


def install(updated):
    changed = {p: txt for p, txt in updated.items() if p.read_text(encoding='utf-8') != txt}
    if not changed:
        print('PASS: Nervous visual tuning 2.0.3 is already installed. Nothing changed.')
        return
    stamp = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%d-%H%M%S-%f')
    backups = ROOT / f'.nervous-203-fix-backup-{stamp}'
    backups.mkdir(exist_ok=False)
    for path in changed:
        shutil.copy2(path, backups / path.name)
    try:
        for path, contents in changed.items():
            temp = path.with_name(f'.{path.name}.203-tmp')
            temp.write_text(contents, encoding='utf-8')
            temp.replace(path)
    except Exception:
        for path in changed:
            shutil.copy2(backups / path.name, path)
        raise
    print('PASS: Applied AnatomIQ 2.0.3 nervous visuals.')
    print('Updated:', ', '.join(p.name for p in changed))
    print('BACKUP:', backups)
    print('Commit app.js, nervous-model.js, sw.js, version.json together.')
    print('No GLBs, structure manifests or saved lessons were modified.')


if __name__ == '__main__':
    try:
        install(prepare())
    except Exception as exc:
        print(f'ERROR: {exc}', file=sys.stderr)
        sys.exit(1)
