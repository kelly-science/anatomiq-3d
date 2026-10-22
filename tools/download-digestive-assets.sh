#!/usr/bin/env bash
# Download optional BodyParts3D organ model, plus local Draco decoder assets.
# Existing Écorché model and Scene Library are untouched.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
mkdir -p models/licenses
URL='https://raw.githubusercontent.com/yamz8/human-body-simulator/main/public/models/anatomy-organs.glb'
echo 'Downloading BodyParts3D 3.0 organ GLB from open human-body-simulator project...'
curl -fL --retry 3 --connect-timeout 20 "$URL" -o models/anatomy-organs.glb.part
python3 - <<'PYVALIDATE'
from pathlib import Path
import struct,json
p=Path('models/anatomy-organs.glb.part');h=p.open('rb').read(20)
if len(h)!=20 or h[:4]!=b'glTF' or struct.unpack('<I',h[4:8])[0]!=2 or p.stat().st_size<50_000:
    raise SystemExit('Downloaded file is not a glTF 2.0 binary model.')
chunk_length,chunk_type=struct.unpack('<II',h[12:20])
if chunk_type != 0x4E4F534A or chunk_length>2_000_000:
    raise SystemExit('GLB lacks a readable JSON metadata chunk.')
with p.open('rb') as f:
    f.seek(20)
    metadata=json.loads(f.read(chunk_length))
names={x.get('name','').split('__')[0].lower() for x in metadata.get('nodes',[])}
needed={'liver','stomach','intestines'}
if not needed.issubset(names):
    raise SystemExit('Organ file does not contain the expected selectable liver, stomach and intestines meshes.')
print('Verified digestive organs:',', '.join(sorted(needed)),f'({p.stat().st_size:,} bytes)')
PYVALIDATE
mv models/anatomy-organs.glb.part models/anatomy-organs.glb
if [[ ! -s vendor/three/examples/jsm/loaders/DRACOLoader.js || ! -s vendor/three/examples/jsm/libs/draco/gltf/draco_decoder.wasm ]]; then
  echo 'Downloading pinned Three.js and Draco decoding files...'
  bash tools/download-self-hosted-assets.sh
fi
cat > models/licenses/DIGESTIVE-ATTRIBUTION.txt <<'EOF'
Digestive organ model source:
BodyParts3D, Database Center for Life Science (DBCLS), Japan — CC BY-SA 2.1 Japan.
https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en
Derived web-optimized geometry distributed in the human-body-simulator project:
https://github.com/yamz8/human-body-simulator
Asset: public/models/anatomy-organs.glb
Adaptations in Anatomy Studio: filter to liver, stomach, intestines; scale and position the source model at runtime to the Écorché reference anatomy. Retain this credit when distributing.

The rest of the ecorche skeletal model has its own CC BY-SA 4.0 attribution.
EOF
python3 - <<'PYSHA'
from pathlib import Path
import hashlib
checksum=Path('ASSET_SHA256.txt')
rows=checksum.read_text().splitlines() if checksum.exists() else []
files=[Path('models/anatomy-organs.glb'),Path('vendor/three/examples/jsm/loaders/DRACOLoader.js'),Path('vendor/three/examples/jsm/libs/draco/gltf/draco_decoder.wasm')]
paths={x.as_posix() for x in files}
rows=[line for line in rows if not any(line.endswith('  '+path) for path in paths)]
for path in files:
    rows.append(f'{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.as_posix()}')
checksum.write_text('\n'.join(rows)+'\n')
print('Updated ASSET_SHA256.txt')
PYSHA
echo 'Digestive model installed. Upload models/anatomy-organs.glb, licenses, vendor/three/, and ASSET_SHA256.txt to GitHub Pages.'
