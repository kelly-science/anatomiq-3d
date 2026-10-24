#!/usr/bin/env bash
# AnatomIQ 2.1.0 — six real BodyParts3D 4.3 urinary meshes, no fabricated interior geometry.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
for file in tools/build-digestive-detail.py tools/refine-upper-airway-191.py tools/build-urinary-21.py models/respiratory-structures.json;do
  [[ -s "$file" ]] || { echo "ERROR: required existing AnatomIQ file missing: $file" >&2;exit 1; }
done
# Isolate urinary dependencies from older project virtual environments.
# Previous installer selected a respiratory venv which may not have NumPy.
WORK="$ROOT/.urinary-21-work"
mkdir -p "$WORK"
BASE_PYTHON="${URINARY_BOOTSTRAP_PYTHON:-python3}"
PYTHON="$WORK/venv/bin/python"
if [[ ! -x "$PYTHON" ]];then
  echo 'Creating isolated urinary converter Python environment...'
  "$BASE_PYTHON" -m venv "$WORK/venv"
fi
if ! "$PYTHON" -c 'import numpy,trimesh,fast_simplification' >/dev/null 2>&1;then
  echo 'Installing NumPy, trimesh and mesh-simplification dependencies into urinary environment...'
  "$PYTHON" -m pip install --disable-pip-version-check 'numpy>=1.24,<2' 'trimesh>=4,<5' 'fast-simplification==0.1.10'
fi
"$PYTHON" - <<'PY'
import numpy,trimesh,fast_simplification
print('PASS: isolated urinary converter dependencies',numpy.__version__,trimesh.__version__)
PY
UPSTREAM="$ROOT/.respiratory-43-work/upstream"
mkdir -p "$WORK" "$UPSTREAM"
BASE='https://raw.githubusercontent.com/olivercase/body_parts_3d_api/v1.0.0'
for file in MANIFEST.csv bp3d_subset.py download_bodyparts3d_4.3.py LICENSE;do
  if [[ ! -s "$UPSTREAM/$file" ]];then
    curl --fail --location --retry 3 --connect-timeout 20 "$BASE/$file" --output "$UPSTREAM/$file.part"
    mv "$UPSTREAM/$file.part" "$UPSTREAM/$file"
  fi
done
SUBSET="$WORK/subset"
"$PYTHON" - "$UPSTREAM/MANIFEST.csv" <<'PY'
import csv,sys
names={'FJ3145':'Left kidney','FJ3147':'Right kidney','FJ3144':'Left ureter','FJ3146':'Right ureter','FJ3149':'Urinary bladder','FJ3148':'Urethra'}
rows=list(csv.DictReader(open(sys.argv[1],newline='')))
for fj,name in names.items():
    matches=[r for r in rows if r['fj_id']==fj and r['name']==name]
    by_name=[r['fj_id'] for r in rows if r['name']==name]
    if len(matches)!=1 or by_name!=[fj]:raise SystemExit(f'Urinary catalog ambiguity: {fj} {name} source={by_name}')
print('PASS: Six exact urinary source IDs verified in pinned BodyParts3D 4.3 manifest')
PY
if ! "$PYTHON" - "$SUBSET" <<'PY'
import csv,sys,pathlib
folder=pathlib.Path(sys.argv[1]);file=folder/'MANIFEST.csv'
if not file.is_file():sys.exit(1)
rows=list(csv.DictReader(file.open(newline='')))
ids={'FJ3144','FJ3145','FJ3146','FJ3147','FJ3148','FJ3149'}
if len(rows)!=6 or {r['fj_id'] for r in rows}!=ids:sys.exit(1)
if any(not (folder/r['obj']).is_file() or (folder/r['obj']).stat().st_size<300 for r in rows):sys.exit(1)
PY
then
  echo 'Downloading six source urinary meshes...'
  # Upstream bp3d_subset.py uses re.match: match exact provider names.
  "$PYTHON" "$UPSTREAM/bp3d_subset.py" --pattern '^(?:Left kidney|Right kidney|Left ureter|Right ureter|Urinary bladder|Urethra)$' --name urinary --download --out "$SUBSET"
else
  echo 'Reusing six previously downloaded urinary source meshes.'
fi
SKIN=''
for DIR in "$ROOT/.respiratory-43-work/subsets/skin" "$ROOT/.digestive-43-work/subsets/skin";do
  if [[ -d "$DIR" ]];then
    SKIN="$(find "$DIR" -type f -name '*.obj' -print -quit)"
    [[ -n "$SKIN" && -s "$SKIN" ]] && break
  fi
done
[[ -n "$SKIN" && -s "$SKIN" ]] || { echo 'ERROR: skin-registration OBJ absent. Run the existing respiratory installer to prepare the skin reference.' >&2;exit 1; }
STAGE="$WORK/stage"
mkdir -p "$STAGE" "$ROOT/models" "$ROOT/models/licenses"
"$PYTHON" tools/build-urinary-21.py --subset "$SUBSET" --skin "$SKIN" --respiratory-manifest models/respiratory-structures.json --out "$STAGE"
"$PYTHON" tools/check-urinary-21.py --local "$STAGE"
BACKUP="$WORK/backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"
for f in urinary-structures.json urinary-standard.glb urinary-detailed.glb urinary-source-audit.json;do
  [[ ! -f "$ROOT/models/$f" ]] || cp -p "$ROOT/models/$f" "$BACKUP/$f"
done
# All model files were fully built and checked in staging before touching models/.
for f in urinary-structures.json urinary-standard.glb urinary-detailed.glb urinary-source-audit.json;do
  cp -p "$STAGE/$f" "$ROOT/models/$f"
done
"$PYTHON" tools/check-urinary-21.py --local "$ROOT/models"
cat > models/licenses/URINARY-43-ATTRIBUTION.txt <<'EOF'
Source mesh geometry: BodyParts3D / Anatomography 4.3
Copyright (c) Database Center for Life Science (DBCLS)
Creative Commons Attribution-ShareAlike 2.1 Japan (CC BY-SA 2.1 JP)
Generated Standard and Detailed geometry must retain source attribution.
The internal kidney schematic is independently drawn instructional art,
not BodyParts3D internal kidney anatomy.
EOF
echo 'SUCCESS: Six urinary mesh nodes generated and verified.'
echo "BACKUP: $BACKUP"
echo 'Deploy updated app files and models/urinary-* together in ONE GitHub commit.'
echo 'Do not modify/reupload nervous, respiratory or cardiovascular GLBs.'
