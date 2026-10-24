#!/usr/bin/env python3
from pathlib import Path
import json, shutil, sys, re

ROOT = Path.cwd()
app_js = ROOT / 'app.js'
sw_js = ROOT / 'sw.js'
version_json = ROOT / 'version.json'

for p in (app_js, sw_js, version_json):
    if not p.exists():
        print(f'Missing required file: {p.name}')
        sys.exit(1)

backup_dir = ROOT / '.kidney-shine-211-backup'
backup_dir.mkdir(exist_ok=True)
for p in (app_js, sw_js, version_json):
    shutil.copy2(p, backup_dir / p.name)

app = app_js.read_text()
old = "mesh.material=new THREE.MeshStandardMaterial({color:urinaryColor(entry),metalness:0,roughness:0.73,side:THREE.DoubleSide});"
new = "mesh.material=new THREE.MeshStandardMaterial({color:urinaryColor(entry),metalness:0,roughness:entry.organId==='kidney'?0.42:0.73,side:THREE.DoubleSide});"
if new in app:
    print('PASS: Kidney shine patch already applied.')
else:
    if old not in app:
        print('Could not find urinary material assignment in app.js')
        sys.exit(1)
    app = app.replace(old, new, 1)
    app = app.replace("const APP_VERSION = '2.1.0';", "const APP_VERSION = '2.1.1';")
    app = app.replace("pong.version!=='anatomy-v2.1.0'", "pong.version!=='anatomy-v2.1.1'")
    app_js.write_text(app)

sw = sw_js.read_text()
sw = sw.replace("const VERSION='anatomy-v2.1.0';", "const VERSION='anatomy-v2.1.1';")
sw_js.write_text(sw)

try:
    data = json.loads(version_json.read_text())
    data['version'] = '2.1.1'
    data['published'] = '2026-10-23'
    data['notes'] = 'Urinary-system visual tuning: kidneys use a glossier surface finish while other urinary structures remain unchanged.'
    version_json.write_text(json.dumps(data, indent=2) + "\n")
except Exception as exc:
    print(f'Warning: could not update version.json: {exc}')

print('PASS: Applied AnatomIQ 2.1.1 kidney surface finish update.')
print(f'BACKUP: {backup_dir}')
print('Updated: app.js, sw.js, version.json')
