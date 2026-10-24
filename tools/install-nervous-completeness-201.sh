#!/usr/bin/env bash
# AnatomIQ 2.0.1 expanded nervous atlas. Append-only source geometry + labeled teaching schematics.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
WORK="$ROOT/.atlas-20-work/expansion-201"
UPSTREAM="$ROOT/.respiratory-43-work/upstream"
CATALOG="$UPSTREAM/MANIFEST.csv"
BASE='https://raw.githubusercontent.com/olivercase/body_parts_3d_api/v1.0.0'
MODELS="$ROOT/models"
mkdir -p "$WORK" "$MODELS" "$UPSTREAM"
[[ -s "$MODELS/nervous-structures.json" && -s "$MODELS/nervous-standard.glb" && -s "$MODELS/nervous-detailed.glb" ]] || { echo 'ERROR: install and verify AnatomIQ 2.0.0 nervous GLBs first.' >&2;exit 1; }
PYTHON="${PYTHON:-python3}"
for candidate in "$ROOT/.digestive-43-work/venv/bin/python" "$ROOT/.respiratory-43-work/venv/bin/python";do
 if [[ -x "$candidate" ]];then PYTHON="$candidate";break;fi
done
"$PYTHON" - <<'PY'
import numpy,trimesh
print('Geometry dependencies verified')
PY
for filename in MANIFEST.csv bp3d_subset.py;do
 if [[ ! -s "$UPSTREAM/$filename" ]];then
   echo "Downloading pinned source selector $filename..."
   curl -fLsS --retry 3 --connect-timeout 20 "$BASE/$filename" -o "$UPSTREAM/$filename.part"
   mv "$UPSTREAM/$filename.part" "$UPSTREAM/$filename"
 fi
done
CATALOG_PATH="$CATALOG"
SELECTOR="tools/expand-nervous-201.py"
[[ -s "$SELECTOR" ]] || { echo 'Missing 2.0.1 converter. Copy package tools/ files first.' >&2;exit 1; }
"$PYTHON" "$SELECTOR" --models "$MODELS" --catalog "$CATALOG_PATH" --selection-only --report "$WORK/selection-report.json" --pattern-file "$WORK/exact-source-names.regex"
SKIN=''
for dir in "$ROOT/.digestive-43-work/subsets/skin" "$ROOT/.respiratory-43-work/subsets/skin";do
 [[ -d "$dir" ]] || continue
 SKIN="$(find "$dir" -type f -name '*.obj' -print -quit)"
 [[ -s "$SKIN" ]] && break
done
[[ -s "$SKIN" ]] || { echo 'ERROR: Skin reference OBJ missing. Keep your original .digestive-43-work/ directory.' >&2;exit 1; }
SUBSET="$WORK/source-extras"
subset_ok(){
 "$PYTHON" - "$SUBSET/MANIFEST.csv" "$WORK/selection-report.json" "$SUBSET" <<'PY'
import csv,json,pathlib,sys
mf=pathlib.Path(sys.argv[1]);root=pathlib.Path(sys.argv[3])
if not mf.is_file():sys.exit(1)
rows=list(csv.DictReader(mf.open(newline='')))
expected={x['id'] for x in json.load(open(sys.argv[2]))['candidates']}
actual={r['fj_id'] for r in rows}
if actual!=expected:sys.exit(1)
if not all((root/r['obj']).is_file() and (root/r['obj']).stat().st_size>300 for r in rows):sys.exit(1)
print(f'Reusing {len(rows)} verified optional source meshes')
PY
}
if ! subset_ok;then
 echo 'Downloading verified BodyParts3D extra nerves and deep-brain structures...'
 # When an interrupted install leaves partial files, the pinned downloader may reuse
 # valid _chunks internally; no existing nervous GLB is modified until all pass.
 "$PYTHON" "$UPSTREAM/bp3d_subset.py" --pattern "$(cat "$WORK/exact-source-names.regex")" --name nervous-expansion-201 --download --chunk-size 35 --out "$SUBSET"
 subset_ok || { echo 'Source download incomplete; original 2.0 models are unchanged.' >&2;exit 1; }
fi
STAGE="$WORK/staged"
mkdir -p "$STAGE"
FLAGS=()
if [[ "${ANATOMIQ_NO_ILLUSTRATIVE_LEGS:-0}" == 1 ]];then FLAGS+=(--no-illustrative-legs);fi
"$PYTHON" "$SELECTOR" --models "$MODELS" --catalog "$CATALOG_PATH" --report "$WORK/selection-report.json" --subset "$SUBSET" --skin "$SKIN" --out "$STAGE" "${FLAGS[@]}"
"$PYTHON" tools/check-nervous-20.py --local "$STAGE"
BACKUP="$WORK/backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"
for f in nervous-standard.glb nervous-detailed.glb nervous-structures.json nervous-source-audit.json;do
 if [[ -f "$MODELS/$f" ]];then cp -p "$MODELS/$f" "$BACKUP/$f";fi
done
# This is the sole point at which the project model files are changed.
for f in nervous-standard.glb nervous-detailed.glb nervous-structures.json nervous-source-audit.json;do
 cp -p "$STAGE/$f" "$MODELS/$f"
done
"$PYTHON" tools/check-nervous-20.py --local "$MODELS"
printf '\nPASS: Expanded nervous atlas is ready for local use.\nBACKUP: %s\n' "$BACKUP"
echo 'IMPORTANT: publish models/nervous-{standard,detailed}.glb and nervous-structures.json in ONE GitHub commit with the 2.0.1 app update.'
echo 'Lower-limb meshes are explicitly flagged as educational reconstructions, not verified BodyParts3D geometry.'
