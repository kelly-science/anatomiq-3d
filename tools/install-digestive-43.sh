#!/usr/bin/env bash
# Create locally hosted digestive GLBs from the verified BodyParts3D 4.3 subset.
# Run once on a Mac. No model-provider dependency remains at runtime.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
WORK="$ROOT/.digestive-43-work"
mkdir -p "$WORK/upstream" "$WORK/subsets"
# Upstream source is version-pinned. The checked-in conversion script belongs to Anatomy Studio.
BASE='https://raw.githubusercontent.com/olivercase/body_parts_3d_api/v1.0.0'
for NAME in MANIFEST.csv bp3d_subset.py download_bodyparts3d_4.3.py LICENSE; do
  if [[ ! -s "$WORK/upstream/$NAME" ]]; then
    echo "Retrieving verified BodyParts3D tool: $NAME"
    curl -fL --retry 3 --connect-timeout 20 "$BASE/$NAME" -o "$WORK/upstream/$NAME.part"
    mv "$WORK/upstream/$NAME.part" "$WORK/upstream/$NAME"
  fi
done
PYTHON="${PYTHON:-python3}"
if [[ ! -x "$WORK/venv/bin/python" ]]; then "$PYTHON" -m venv "$WORK/venv"; fi
# Pin the last tested Python 3.9-compatible simplifier; newer 0.1.x releases
# can import Python-3.10-only union annotations despite allowing Python 3.9.
# Using the EXISTING venv avoids touching already downloaded mesh data.
"$WORK/venv/bin/python" -m pip install --disable-pip-version-check 'numpy>=1.24,<3' 'trimesh>=4.0,<5' 'fast-simplification==0.1.10' >/dev/null
DOWN="$WORK/venv/bin/python"
# Fail immediately with a useful message if the simplifier is unusable, instead
# of downloading everything and failing halfway through GLB conversion.
"$DOWN" - <<'PY_CHECK'
import trimesh
import fast_simplification
mesh = trimesh.creation.box()
small = mesh.simplify_quadric_decimation(face_count=8)
assert 0 < len(small.faces) <= 8, 'Mesh simplification sanity check failed'
print('Mesh simplification preflight passed.')
PY_CHECK

# Reruns should preserve previously downloaded source meshes. Confirm that
# every expected OBJ listed in the manifest is present before skipping.
subset_ready() {
  "$DOWN" - "$1" "$2" <<'PY_CHECK'
import csv, sys
from pathlib import Path
folder = Path(sys.argv[1]); minimum = int(sys.argv[2])
manifest = folder / 'MANIFEST.csv'
if not manifest.is_file():
    sys.exit(1)
with manifest.open(newline='') as f:
    rows = list(csv.DictReader(f))
if len(rows) < minimum:
    sys.exit(1)
for row in rows:
    obj = folder / row.get('obj', '')
    if not obj.is_file() or obj.stat().st_size < 300:
        sys.exit(1)
sys.exit(0)
PY_CHECK
}

cd "$WORK/upstream"
if subset_ready "$WORK/subsets/gut" 61; then
  echo 'Reusing 61 downloaded gut meshes.'
else
  echo 'Downloading core gut meshes (source version 4.3)...'
  "$DOWN" bp3d_subset.py --group gut --download --chunk-size 20 --out "$WORK/subsets/gut"
fi
if subset_ready "$WORK/subsets/accessory" 16; then
  echo 'Reusing 16 downloaded accessory meshes.'
else
  echo 'Downloading accessory organs (if present in the 4.3 manifest)...'
  "$DOWN" bp3d_subset.py --pattern '^(liver|caudate lobe of liver|hepatovenous segment [IVX]+|gall.?bladder|parenchyma of pancreas|pancreatic duct tree|pancreas|esophagus|oesophagus|cecum|caecum|vermiform appendix|appendix|anal canal)$' --name accessory --download --chunk-size 20 --out "$WORK/subsets/accessory"
fi
if subset_ready "$WORK/subsets/skin" 1; then
  echo 'Reusing downloaded skin mesh for registration.'
else
  echo 'Downloading reference body skin for registration...'
  "$DOWN" bp3d_subset.py --group skin --download --out "$WORK/subsets/skin"
fi
SKIN="$(find "$WORK/subsets/skin/skin" -name '*.obj' -type f | head -1)"
[[ -s "$SKIN" ]] || { echo 'No skin reference OBJ. Stopping without creating potentially misaligned geometry.' >&2; exit 1; }
cd "$ROOT"
"$DOWN" tools/build-digestive-detail.py --subset "$WORK/subsets/gut" --subset "$WORK/subsets/accessory" --skin "$SKIN" --out models "$@"
mkdir -p models/licenses
cat > models/licenses/DIGESTIVE-43-ATTRIBUTION.txt <<'EOF'
BodyParts3D / Anatomography version 4.3, © Database Center for Life Science (DBCLS).
License: CC BY-SA 2.1 Japan, https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en
Full-resolution OBJ mesh retrieval tooling: Oliver Case, body_parts_3d_api v1.0.0,
MIT source code. https://github.com/olivercase/body_parts_3d_api
Conversion/decimation and skin-based normalization for Anatomy Studio 1.3.
Please retain this attribution and applicable share-alike license in distributions.
EOF
"$DOWN" - <<'PY'
from pathlib import Path
import hashlib
p=Path('ASSET_SHA256.txt'); rows=p.read_text().splitlines() if p.exists() else []
paths=[Path('models')/name for name in ['digestive-standard.glb','digestive-detailed.glb','digestive-structures.json']]
rows=[r for r in rows if not any(r.endswith('  '+str(f)) for f in paths)]
rows += [hashlib.sha256(f.read_bytes()).hexdigest()+'  '+str(f) for f in paths]
p.write_text('\n'.join(rows)+'\n')
PY
echo 'Success. Upload models/digestive-{standard,detailed}.glb, digestive-structures.json, models/licenses/, and ASSET_SHA256.txt to GitHub.'
echo 'The original skin/body scans and provider download scripts remain in .digestive-43-work/ and need NOT be uploaded.'
