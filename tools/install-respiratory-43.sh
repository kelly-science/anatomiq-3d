#!/usr/bin/env bash
# Real BodyParts3D 4.3 lung segments + named respiratory airway meshes.
# Uses the same normalization basis as digestive and cardiovascular models.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
WORK="$ROOT/.respiratory-43-work"
mkdir -p "$WORK/upstream" "$WORK/subsets"
BASE='https://raw.githubusercontent.com/olivercase/body_parts_3d_api/v1.0.0'
for NAME in MANIFEST.csv bp3d_subset.py download_bodyparts3d_4.3.py LICENSE; do
 if [[ ! -s "$WORK/upstream/$NAME" ]]; then
  echo "Downloading BodyParts3D 4.3 retrieval utility: $NAME"
  curl -fL --retry 3 --connect-timeout 20 "$BASE/$NAME" -o "$WORK/upstream/$NAME.part"
  mv "$WORK/upstream/$NAME.part" "$WORK/upstream/$NAME"
 fi
done
PYTHON="${PYTHON:-python3}"
if [[ -x "$ROOT/.digestive-43-work/venv/bin/python" ]];then
 PYTHON="$ROOT/.digestive-43-work/venv/bin/python"
else
 if [[ ! -x "$WORK/venv/bin/python" ]];then "$PYTHON" -m venv "$WORK/venv";fi
 PYTHON="$WORK/venv/bin/python"
fi
"$PYTHON" -m pip install --disable-pip-version-check 'numpy>=1.24,<3' 'trimesh>=4,<5' 'fast-simplification==0.1.10' >/dev/null
"$PYTHON" -c 'import trimesh,numpy; assert len(trimesh.creation.icosphere().simplify_quadric_decimation(face_count=40).faces)>5;print("Mesh conversion preflight passed.")'
subset_ready() {
 "$PYTHON" - "$1" "$2" <<'PY_CHECK'
import csv,sys
from pathlib import Path
p=Path(sys.argv[1]);m=p/'MANIFEST.csv'
if not m.is_file():sys.exit(1)
with m.open(newline='') as f:rows=list(csv.DictReader(f))
if len(rows)<int(sys.argv[2]):sys.exit(1)
if not all((p/row.get('obj','')).is_file() and (p/row['obj']).stat().st_size>300 for row in rows):sys.exit(1)
PY_CHECK
}
cd "$WORK/upstream"
if subset_ready "$WORK/subsets/lungs" 18;then echo 'Reusing 18 verified lung segment meshes.'
else "$PYTHON" bp3d_subset.py --group lungs --download --chunk-size 20 --out "$WORK/subsets/lungs";fi
# Airway selection is optional. Only actual provider meshes are included; no
# synthetic bronchi or pulmonary vascular branches are made up.
AIRWAY_REGEX='(?i)^(?!.*(?:artery|arteries|vein|veins|nerve|lymph)).*(?:trachea|bronchus|bronchi|bronchiole|carina|larynx|epiglottis|cricoid cartilage|thyroid cartilage|vocal fold|pleura|diaphragm)$'
if subset_ready "$WORK/subsets/airways" 1;then echo 'Reusing named airway meshes.'
else "$PYTHON" bp3d_subset.py --pattern "$AIRWAY_REGEX" --name airway-anatomy --download --chunk-size 20 --out "$WORK/subsets/airways" || echo 'WARNING: Optional airway subset unavailable; proceeding with verified lung segments only.';fi
if [[ -s "$ROOT/.digestive-43-work/subsets/skin/MANIFEST.csv" ]];then
 SKIN_FOLDER="$ROOT/.digestive-43-work/subsets/skin"
else
 SKIN_FOLDER="$WORK/subsets/skin"
 if ! subset_ready "$SKIN_FOLDER" 1;then "$PYTHON" bp3d_subset.py --group skin --download --out "$SKIN_FOLDER";fi
fi
SKIN=$(find "$SKIN_FOLDER" -type f -name '*.obj' | head -1)
[[ -s "$SKIN" ]] || { echo 'Missing BodyParts3D skin reference for registration';exit 1;}
cd "$ROOT"
ARGS=(--subset "$WORK/subsets/lungs" --skin "$SKIN" --out models)
if subset_ready "$WORK/subsets/airways" 1;then ARGS+=(--subset "$WORK/subsets/airways");fi
if [[ -s models/respiratory-structures.json ]];then ARGS+=(--previous models/respiratory-structures.json);fi
"$PYTHON" tools/build-respiratory-43.py "${ARGS[@]}" "$@"
mkdir -p models/licenses
cat > models/licenses/RESPIRATORY-43-ATTRIBUTION.txt <<'ATTRIBUTION'
BodyParts3D / Anatomography 4.3, © Database Center for Life Science (DBCLS).
Mesh license CC BY-SA 2.1 Japan, https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en
Subset downloader software: Oliver Case, body_parts_3d_api v1.0.0 (MIT).
https://github.com/olivercase/body_parts_3d_api
Conversion uses the same BodyParts3D skin-normalized coordinate frame as the
existing Anatomiq 3D digestive and cardiovascular systems.
ATTRIBUTION
echo 'Upload the three respiratory-*.glb/json model files and RESPIRATORY-43-ATTRIBUTION.txt to GitHub models/; DO NOT upload .respiratory-43-work.'
echo 'Keep current cardiovascular files intact. Refresh Respiration in App Settings.'
