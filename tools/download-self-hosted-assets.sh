#!/usr/bin/env bash
# Download pinned runtime dependencies into the GitHub Pages project.
# Run this on a Mac/PC with Internet access BEFORE uploading the updated files.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cd "$ROOT"

command -v curl >/dev/null || { echo 'curl is required'; exit 1; }
command -v tar >/dev/null || { echo 'tar is required'; exit 1; }
command -v python3 >/dev/null || { echo 'python3 is required to validate the GLB'; exit 1; }

THREE_VERSION='0.169.0'
echo "Downloading Three.js ${THREE_VERSION} (MIT license)…"
curl --fail --location --retry 3 --connect-timeout 15 \
  "https://registry.npmjs.org/three/-/three-${THREE_VERSION}.tgz" -o "$TMP/three.tgz"
mkdir -p "$TMP/three"
tar -xzf "$TMP/three.tgz" -C "$TMP/three"
test -s "$TMP/three/package/build/three.module.js"
test -s "$TMP/three/package/examples/jsm/controls/OrbitControls.js"
test -s "$TMP/three/package/examples/jsm/loaders/GLTFLoader.js"
test -s "$TMP/three/package/LICENSE"
mkdir -p vendor/three
python3 tools/vendor-three.py "$TMP/three" "$ROOT/vendor/three"

echo 'Downloading Écorché model and attribution (CC BY-SA 4.0)…'
mkdir -p models/licenses
curl --fail --location --retry 3 --connect-timeout 15 \
  'https://raw.githubusercontent.com/Charleeh/ecorche/main/model/ecorche.glb' \
  -o "$TMP/ecorche.glb"
python3 - "$TMP/ecorche.glb" <<'PYVALIDATE'
import pathlib,sys,struct
p=pathlib.Path(sys.argv[1]);data=p.open('rb').read(12)
if len(data)<12 or data[:4]!=b'glTF' or struct.unpack('<I',data[4:8])[0]!=2 or p.stat().st_size<5_000_000:
    raise SystemExit('Downloaded model is not a valid glTF v2 GLB (> 5 MB).')
print(f'Validated GLB: {p.stat().st_size:,} bytes')
PYVALIDATE
cp "$TMP/ecorche.glb" models/ecorche.glb
curl --fail --location --retry 3 \
  'https://raw.githubusercontent.com/Charleeh/ecorche/main/ATTRIBUTION.md' \
  -o models/licenses/ATTRIBUTION.md
curl --fail --location --retry 3 \
  'https://raw.githubusercontent.com/Charleeh/ecorche/main/LICENSE.md' \
  -o models/licenses/LICENSE.md

echo 'Switching the app import map to the locally hosted renderer…'
python3 - <<'PYMAP'
from pathlib import Path
path=Path('index.html')
s=path.read_text()
old_a='https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js'
old_b='https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/'
new_a='./vendor/three/build/three.module.js'
new_b='./vendor/three/examples/jsm/'
if old_a in s and old_b in s:
    s=s.replace(old_a,new_a).replace(old_b,new_b)
elif new_a in s and new_b in s:
    print('Local import map already configured.')
else:
    raise SystemExit('Cannot find the expected pinned Three.js import map in index.html.')
path.write_text(s)
PYMAP

echo 'Writing checksums for future integrity checks…'
python3 - <<'PYSHA'
from pathlib import Path
import hashlib
files=[Path('models/ecorche.glb'),Path('vendor/three/build/three.module.js'),
       Path('vendor/three/examples/jsm/controls/OrbitControls.js'),
       Path('vendor/three/examples/jsm/loaders/GLTFLoader.js'),Path('vendor/three/examples/jsm/loaders/DRACOLoader.js')]
with Path('ASSET_SHA256.txt').open('w') as out:
  for f in files:
    digest=hashlib.sha256(f.read_bytes()).hexdigest()
    out.write(f'{digest}  {f.as_posix()}\n')
print('Saved ASSET_SHA256.txt')
PYSHA

echo 'Success! Upload vendor/, models/, and ASSET_SHA256.txt with the PWA files to GitHub.'
echo 'Once GitHub Pages deploys, open Settings > App Settings > Check local files.'
