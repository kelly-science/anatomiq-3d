#!/usr/bin/env bash
# Self-contained source-backed installer; no respiratory/urinary venv dependencies.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)";cd "$ROOT"
for file in tools/build-lymphatic-22.py tools/check-lymphatic-22.py tools/build-digestive-detail.py tools/refine-upper-airway-191.py models/respiratory-structures.json;do
  [[ -s "$file" ]] || { echo "ERROR: Required source/registration file missing: $file" >&2;exit 1; }
done
WORK="$ROOT/.lymphatic-22-work";mkdir -p "$WORK" "$ROOT/models" "$ROOT/models/licenses"
PY="$WORK/venv/bin/python"
if [[ ! -x "$PY" ]];then
  echo 'Creating dedicated lymphatic Python environment...'
  "${LYMPHATIC_BOOTSTRAP_PYTHON:-python3}" -m venv "$WORK/venv"
fi
NUMPY="$($PY - <<'PY'
import sys
print('numpy==2.0.2' if sys.version_info<(3,13) else 'numpy>=2.1,<3')
PY
)"
if ! "$PY" - <<'PY' >/dev/null 2>&1
import numpy,trimesh,fast_simplification
assert int(numpy.__version__.split('.')[0])==2
m=trimesh.creation.icosphere(subdivisions=1)
assert len(m.simplify_quadric_decimation(face_count=50).faces)<=50
PY
then
  echo 'Installing isolated compatible NumPy/trimesh conversion tools...'
  "$PY" -m pip install --disable-pip-version-check --prefer-binary "$NUMPY" 'trimesh>=4,<5' 'fast-simplification==0.1.10'
fi
UP="$WORK/upstream";mkdir -p "$UP"
BASE='https://raw.githubusercontent.com/olivercase/body_parts_3d_api/v1.0.0'
for name in MANIFEST.csv bp3d_subset.py download_bodyparts3d_4.3.py LICENSE;do
  if [[ ! -s "$UP/$name" ]];then
    curl --fail --location --retry 3 --connect-timeout 20 "$BASE/$name" --output "$UP/$name.part"
    mv "$UP/$name.part" "$UP/$name"
  fi
done
"$PY" - "$UP/MANIFEST.csv" <<'PY'
import sys,csv
rows=list(csv.DictReader(open(sys.argv[1],newline='')))
expected={'FJ2561':'Spleen','FJ3150':'Left lobe of thymus','FJ3151':'Right lobe of thymus'}
for fj,name in expected.items():
  if len([r for r in rows if r['fj_id']==fj and r['name']==name])!=1:raise SystemExit('Pinned source does not contain exact mesh '+fj+' '+name)
print('PASS: Verified three source meshes in version-pinned catalog')
PY
SUB="$WORK/subset"
if ! "$PY" - "$SUB" <<'PY'
import csv,sys,pathlib
root=pathlib.Path(sys.argv[1]);mf=root/'MANIFEST.csv'
if not mf.is_file():sys.exit(1)
rows=list(csv.DictReader(mf.open(newline='')))
if len(rows)!=3 or {r['fj_id'] for r in rows}!={'FJ2561','FJ3150','FJ3151'}:sys.exit(1)
if any(not (root/r['obj']).is_file() or (root/r['obj']).stat().st_size<300 for r in rows):sys.exit(1)
PY
then
  echo 'Downloading the spleen and both thymus lobes...'
  "$PY" "$UP/bp3d_subset.py" --pattern '^(?:Spleen|Left lobe of thymus|Right lobe of thymus)$' --name lymphatic --download --out "$SUB"
else echo 'Reusing three verified source OBJs';fi
SKIN=''
for FOLDER in "$ROOT/.urinary-21-work/skin" "$ROOT/.urinary-21-work/subsets/skin" "$ROOT/.respiratory-43-work/subsets/skin" "$ROOT/.digestive-43-work/subsets/skin" "$WORK/skin";do
  if [[ -d "$FOLDER" ]];then
    FOUND="$(find "$FOLDER" -type f -name '*.obj' -print -quit)"
    if [[ -n "$FOUND" && -s "$FOUND" ]];then SKIN="$FOUND";break;fi
  fi
done
if [[ ! -s "$SKIN" ]];then
  echo 'Downloading independent whole-body skin registration reference...'
  "$PY" "$UP/bp3d_subset.py" --group skin --download --out "$WORK/skin"
  SKIN="$(find "$WORK/skin" -type f -name '*.obj' -print -quit)"
  [[ -n "$SKIN" && -s "$SKIN" ]] || { echo 'ERROR: Skin OBJ still missing; no models changed' >&2;exit 1; }
fi
STAGE="$WORK/stage";mkdir -p "$STAGE"
"$PY" tools/build-lymphatic-22.py --subset "$SUB" --skin "$SKIN" --respiratory-manifest models/respiratory-structures.json --out "$STAGE"
python3 tools/check-lymphatic-22.py --local "$STAGE"
BACKUP="$WORK/backups/$(date +%Y%m%d-%H%M%S)";mkdir -p "$BACKUP"
for name in lymphatic-standard.glb lymphatic-detailed.glb lymphatic-structures.json lymphatic-source-audit.json;do
  [[ ! -f "models/$name" ]] || cp -p "models/$name" "$BACKUP/$name"
done
# Publish locally only when both GLBs and the matching JSON have passed staging tests.
for name in lymphatic-standard.glb lymphatic-detailed.glb lymphatic-structures.json lymphatic-source-audit.json;do cp -p "$STAGE/$name" "models/$name";done
python3 tools/check-lymphatic-22.py --local models
cat > models/licenses/LYMPHATIC-43-ATTRIBUTION.txt <<'EOF'
Spleen and both lobes of thymus: BodyParts3D / Anatomography 4.3.
© Database Center for Life Science (DBCLS), CC BY-SA 2.1 Japan.
Downloaded using the version-pinned BodyParts3D 4.3 mesh utility.
The separately labeled educational lymph drainage diagram is an illustration;
it is not the three-dimensional source geometry or a clinical reference.
EOF
echo 'SUCCESS: Three source-backed lymphatic GLB meshes generated and verified.'
echo 'Commit ALL models/lymphatic-* files and app changes in a single deployment.'
echo 'Keep existing urinary, nervous, respiratory and cardiovascular GLBs unchanged.'
