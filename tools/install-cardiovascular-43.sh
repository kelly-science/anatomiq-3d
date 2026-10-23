#!/usr/bin/env bash
# Builds locally hosted cardiovascular 3D layers using verified BodyParts3D 4.3 data.
# Reuses existing digestive download/reference skin when available.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
WORK="$ROOT/.cardiovascular-43-work"
PREV="$ROOT/.digestive-43-work"
mkdir -p "$WORK/upstream" "$WORK/subsets"
BASE='https://raw.githubusercontent.com/olivercase/body_parts_3d_api/v1.0.0'
for NAME in MANIFEST.csv bp3d_subset.py download_bodyparts3d_4.3.py LICENSE; do
  if [[ ! -s "$WORK/upstream/$NAME" ]]; then
    if [[ -s "$PREV/upstream/$NAME" ]]; then
      cp "$PREV/upstream/$NAME" "$WORK/upstream/$NAME"
    else
      echo "Retrieving verified BodyParts3D tool: $NAME"
      curl -fL --retry 3 --connect-timeout 20 "$BASE/$NAME" -o "$WORK/upstream/$NAME.part"
      mv "$WORK/upstream/$NAME.part" "$WORK/upstream/$NAME"
    fi
  fi
done
# Reuse the known working Digestive virtual environment if present.
if [[ -x "$PREV/venv/bin/python" ]]; then PY="$PREV/venv/bin/python"; else
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
    obj=p/row.get('obj','')
    if not obj.is_file() or obj.stat().st_size<300:sys.exit(1)
PY_CHECK
}
cd "$WORK/upstream"
if subset_ready "$WORK/subsets/heart" 3; then echo 'Reusing downloaded heart meshes.'; else
 echo 'Downloading heart walls (BodyParts3D 4.3)...'
 "$PY" bp3d_subset.py --group heart --download --chunk-size 20 --out "$WORK/subsets/heart"
fi
if subset_ready "$WORK/subsets/blood_vessel" 12; then echo 'Reusing major vessel meshes.'; else
 echo 'Downloading major blood vessels (BodyParts3D 4.3)...'
 "$PY" bp3d_subset.py --group blood_vessel --download --chunk-size 20 --out "$WORK/subsets/blood_vessel"
fi
# 1.6 extra atlas, selected by anatomical name from the pinned 4.3 manifest.
# Its downloader uses a content-keyed chunk cache, so reruns can reuse files.
if subset_ready "$WORK/subsets/expanded" 20; then
 echo 'Reusing downloaded expanded cardiovascular meshes.'
else
 echo 'Downloading expanded heart detail and major vessels (BodyParts3D 4.3)...'
 "$PY" tools/fetch-cardiovascular-expansion.py --upstream "$WORK/upstream" --out "$WORK/subsets/expanded"
fi
if subset_ready "$PREV/subsets/skin" 1; then SKIN_DIR="$PREV/subsets/skin"; else
 if ! subset_ready "$WORK/subsets/skin" 1; then
  echo 'Downloading reference skin for common-system alignment...'
  "$PY" bp3d_subset.py --group skin --download --out "$WORK/subsets/skin"
 fi
 SKIN_DIR="$WORK/subsets/skin"
fi
SKIN="$(find "$SKIN_DIR/skin" -name '*.obj' -type f | head -1)"
[[ -s "$SKIN" ]] || { echo 'Skin reference missing. Cannot safely align models.' >&2;exit 1; }
cd "$ROOT"
"$PY" tools/build-cardiovascular-43.py --subset "$WORK/subsets/heart" --subset "$WORK/subsets/blood_vessel" --subset "$WORK/subsets/expanded" --skin "$SKIN" --out models "$@"
mkdir -p models/licenses
cat > models/licenses/CARDIOVASCULAR-43-ATTRIBUTION.txt <<'EOF'
BodyParts3D / Anatomography 4.3, © Database Center for Life Science (DBCLS).
Mesh license: CC BY-SA 2.1 Japan https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en
Source selector: Oliver Case, body_parts_3d_api v1.0.0 (MIT tool code).
https://github.com/olivercase/body_parts_3d_api
The anatomical meshes retain the BodyParts3D share-alike license.
EOF
"$PY" - <<'PY_HASH'
from pathlib import Path
import hashlib
files=[Path('models')/n for n in ['cardiovascular-standard.glb','cardiovascular-detailed.glb','cardiovascular-structures.json']]
p=Path('ASSET_SHA256.txt');lines=p.read_text().splitlines() if p.exists() else []
lines=[line for line in lines if not any(line.endswith('  '+str(f)) for f in files)]
lines += [hashlib.sha256(f.read_bytes()).hexdigest()+'  '+str(f) for f in files]
p.write_text('\n'.join(lines)+'\n')
PY_HASH
echo 'SUCCESS: Expanded cardiovascular layer ready. Upload models/cardiovascular-standard.glb, cardiovascular-detailed.glb, cardiovascular-structures.json, attribution and updated application files to GitHub.'
echo 'Do NOT upload .cardiovascular-43-work or .digestive-43-work.'
