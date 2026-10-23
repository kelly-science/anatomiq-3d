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
 "$PY" "$ROOT/tools/fetch-cardiovascular-expansion.py" --upstream "$WORK/upstream" --out "$WORK/subsets/expanded"
fi
# Add only NEW named vessel meshes to the existing atlas. Never overwrite the
# older expanded subset; older published scenes rely on its structure ordering.
VESSEL_SUBSET="$WORK/subsets/vessels_181"
if subset_ready "$VESSEL_SUBSET" 0 && [[ -s "$VESSEL_SUBSET/COVERAGE.json" ]]; then
 echo 'Reusing verified additional major-vessel subset.'
else
 echo 'Selecting additional available arterial and venous trunk meshes...'
 "${PY}" "${ROOT}/tools/fetch-cardiovascular-vessels.py" --upstream "$WORK/upstream" --out "$VESSEL_SUBSET" \
   --exclude "$ROOT/models/cardiovascular-structures.json" \
   --exclude "$WORK/subsets/heart/MANIFEST.csv" \
   --exclude "$WORK/subsets/blood_vessel/MANIFEST.csv" \
   --exclude "$WORK/subsets/expanded/MANIFEST.csv"
fi
# 1.8.2: Curriculum-priority vessels and missing required heart features.
# This supplements the existing model; all older meshes retain their order.
CORE_SUBSET="$WORK/subsets/class-core-182"
if subset_ready "$CORE_SUBSET" 0 && [[ -s "$CORE_SUBSET/CURRICULUM_SELECTION.json" ]]; then
 echo 'Reusing curriculum-priority verified vascular meshes.'
else
 echo 'Selecting required vessels from the full BodyParts3D catalog (no fabricated geometry)...'
 "$PY" "$ROOT/tools/fetch-cardiovascular-class-core.py" --upstream "$WORK/upstream" \
   --curriculum "$ROOT/data/cardio-class-core.json" --out "$CORE_SUBSET" \
   --exclude "$ROOT/models/cardiovascular-structures.json" \
   --exclude "$WORK/subsets/heart/MANIFEST.csv" \
   --exclude "$WORK/subsets/blood_vessel/MANIFEST.csv" \
   --exclude "$WORK/subsets/expanded/MANIFEST.csv" \
   --exclude "$VESSEL_SUBSET/MANIFEST.csv"
fi
# 1.8.3: Only named missing primary trunks and paired veins. Reuse previous
# source downloads. No fabricated bridges or arbitrary extra small branches.
GAPS_SUBSET="$WORK/subsets/vascular-gaps-183"
if subset_ready "$GAPS_SUBSET" 0 && [[ -s "$GAPS_SUBSET/GAP_SELECTION.json" ]]; then
 echo 'Reusing targeted major-vessel gap subset.'
else
 echo 'Checking named missing right/left vessels and hepatic trunks...'
 "$PY" "$ROOT/tools/fetch-cardiovascular-gaps.py" --upstream "$WORK/upstream" \
   --out "$GAPS_SUBSET" --exclude "$ROOT/models/cardiovascular-structures.json"
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
# Stage all new artifacts and verify them before replacing currently working GLBs.
STAGE="$WORK/release-183"
mkdir -p "$STAGE"
CORE_ARGS=()
if [[ -s "$CORE_SUBSET/MANIFEST.csv" ]] && [[ $(wc -l < "$CORE_SUBSET/MANIFEST.csv") -gt 1 ]]; then
 CORE_ARGS=(--subset "$CORE_SUBSET")
fi
"$PY" tools/build-cardiovascular-43.py --subset "$WORK/subsets/heart" --subset "$WORK/subsets/blood_vessel" --subset "$WORK/subsets/expanded" --subset "$VESSEL_SUBSET" "${CORE_ARGS[@]}" --subset "$GAPS_SUBSET" --skin "$SKIN" --out "$STAGE" \
  --prior-manifest "$ROOT/models/cardiovascular-structures.json" "$@"
"$PY" tools/report-cardiovascular-class-core.py --curriculum "$ROOT/data/cardio-class-core.json" --manifest "$STAGE/cardiovascular-structures.json" --out "$STAGE/cardiovascular-class-core-coverage.json"
for name in cardiovascular-standard.glb cardiovascular-detailed.glb cardiovascular-structures.json cardiovascular-class-core-coverage.json; do
  [[ -s "$STAGE/$name" ]] || { echo "Build did not create $name" >&2; exit 1; }
done
for name in cardiovascular-standard.glb cardiovascular-detailed.glb cardiovascular-structures.json cardiovascular-class-core-coverage.json; do
  cp "$STAGE/$name" "$ROOT/models/$name.new"
done
for name in cardiovascular-standard.glb cardiovascular-detailed.glb cardiovascular-structures.json cardiovascular-class-core-coverage.json; do
  mv "$ROOT/models/$name.new" "$ROOT/models/$name"
done
cp "$VESSEL_SUBSET/COVERAGE.json" "$ROOT/models/cardiovascular-vessel-coverage.json"
cp "$GAPS_SUBSET/GAP_SELECTION.json" "$ROOT/models/cardiovascular-gap-selection.json"
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
files=[Path('models')/n for n in ['cardiovascular-standard.glb','cardiovascular-detailed.glb','cardiovascular-structures.json','cardiovascular-vessel-coverage.json','cardiovascular-class-core-coverage.json','cardiovascular-gap-selection.json']]
p=Path('ASSET_SHA256.txt');lines=p.read_text().splitlines() if p.exists() else []
lines=[line for line in lines if not any(line.endswith('  '+str(f)) for f in files)]
lines += [hashlib.sha256(f.read_bytes()).hexdigest()+'  '+str(f) for f in files]
p.write_text('\n'.join(lines)+'\n')
PY_HASH
echo 'SUCCESS: Cardiovascular 1.8.3 gap audit complete. Upload both cardiovascular GLBs, cardiovascular-structures.json, cardiovascular-class-core-coverage.json, cardiovascular-gap-selection.json, attribution and application files to GitHub.'
echo 'Do NOT upload .cardiovascular-43-work or .digestive-43-work.'
