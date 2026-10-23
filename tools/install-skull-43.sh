#!/usr/bin/env bash
# Downloads verified BodyParts3D 4.3 skull meshes and converts them to local GLB.
# Always reuses existing validated downloads; never alters the old Écorché model.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
WORK="$ROOT/.skull-43-work"
PREV="$ROOT/.digestive-43-work"
CARDIO="$ROOT/.cardiovascular-43-work"
mkdir -p "$WORK/upstream" "$WORK/subsets"
BASE='https://raw.githubusercontent.com/olivercase/body_parts_3d_api/v1.0.0'
for NAME in MANIFEST.csv bp3d_subset.py download_bodyparts3d_4.3.py LICENSE; do
  if [[ ! -s "$WORK/upstream/$NAME" ]]; then
    if [[ -s "$PREV/upstream/$NAME" ]]; then cp "$PREV/upstream/$NAME" "$WORK/upstream/$NAME"
    elif [[ -s "$CARDIO/upstream/$NAME" ]]; then cp "$CARDIO/upstream/$NAME" "$WORK/upstream/$NAME"
    else
      echo "Downloading verified BodyParts3D source metadata: $NAME"
      curl -fL --retry 3 --connect-timeout 20 "$BASE/$NAME" -o "$WORK/upstream/$NAME.part"
      mv "$WORK/upstream/$NAME.part" "$WORK/upstream/$NAME"
    fi
  fi
done
if [[ -x "$PREV/venv/bin/python" ]]; then PY="$PREV/venv/bin/python"
elif [[ -x "$CARDIO/venv/bin/python" ]]; then PY="$CARDIO/venv/bin/python"
else
  PYTHON="${PYTHON:-python3}"
  if [[ ! -x "$WORK/venv/bin/python" ]]; then "$PYTHON" -m venv "$WORK/venv"; fi
  PY="$WORK/venv/bin/python"
fi
"$PY" -m pip install --disable-pip-version-check 'numpy>=1.24,<3' 'trimesh>=4.0,<5' 'fast-simplification==0.1.10' 'scipy==1.13.1' >/dev/null
"$PY" - <<'PY_CHECK'
import trimesh
m=trimesh.creation.box().simplify_quadric_decimation(face_count=8)
assert 0<len(m.faces)<=8
print('Mesh conversion dependencies validated.')
PY_CHECK
subset_ready(){
 "$PY" - "$1" "$2" <<'PY_CHECK'
import csv,sys
from pathlib import Path
p=Path(sys.argv[1]);f=p/'MANIFEST.csv'
if not f.is_file():sys.exit(1)
with f.open(newline='') as file:rows=list(csv.DictReader(file))
if len(rows)<int(sys.argv[2]):sys.exit(1)
for row in rows:
    path=p/row.get('obj','')
    if not path.is_file() or path.stat().st_size<300:sys.exit(1)
PY_CHECK
}
if subset_ready "$WORK/subsets/skull" 15; then
  echo 'Reusing downloaded skull meshes.'
else
  echo 'Downloading high-resolution skull meshes (BodyParts3D 4.3)...'
  cd "$WORK/upstream"
  "$PY" "$ROOT/tools/fetch-skull-43.py" --upstream "$WORK/upstream" --out "$WORK/subsets/skull"
  cd "$ROOT"
fi
if subset_ready "$PREV/subsets/skin" 1; then SKIN_DIR="$PREV/subsets/skin"
elif subset_ready "$CARDIO/subsets/skin" 1; then SKIN_DIR="$CARDIO/subsets/skin"
else
  if ! subset_ready "$WORK/subsets/skin" 1; then
    cd "$WORK/upstream"
    "$PY" bp3d_subset.py --group skin --download --out "$WORK/subsets/skin"
    cd "$ROOT"
  fi
  SKIN_DIR="$WORK/subsets/skin"
fi
SKIN="$(find "$SKIN_DIR/skin" -type f -name '*.obj' | head -1)"
[[ -s "$SKIN" ]] || { echo 'Reference body skin missing; cannot register skull.' >&2; exit 1; }
"$PY" tools/build-skull-43.py --subset "$WORK/subsets/skull" --skin "$SKIN" --out models "$@"
mkdir -p models/licenses
cat > models/licenses/SKULL-43-ATTRIBUTION.txt <<'LICENSE'
BodyParts3D / Anatomography 4.3, © Database Center for Life Science (DBCLS).
Anatomical mesh license: Creative Commons Attribution-ShareAlike 2.1 Japan.
https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en
Derived self-hosted skull geometry retains the BodyParts3D share-alike license.
Source and verified downloader: Oliver Case, body_parts_3d_api v1.0.0 (MIT code).
https://github.com/olivercase/body_parts_3d_api
LICENSE
"$PY" - <<'PY_HASH'
from pathlib import Path
import hashlib
files=[Path('models')/n for n in ('skull-detailed.glb','skull-structures.json')]
p=Path('ASSET_SHA256.txt');lines=p.read_text().splitlines() if p.exists() else []
lines=[line for line in lines if not any(line.endswith('  '+str(f)) for f in files)]
lines.extend(hashlib.sha256(f.read_bytes()).hexdigest()+'  '+str(f) for f in files)
p.write_text('\n'.join(lines)+'\n')
PY_HASH
echo 'SUCCESS: Upload models/skull-detailed.glb, skull-structures.json, models/licenses/SKULL-43-ATTRIBUTION.txt, and application files to GitHub.'
echo 'Keep models/ecorche.glb. Do NOT upload .skull-43-work or other local working directories.'
