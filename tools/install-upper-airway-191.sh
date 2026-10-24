#!/usr/bin/env bash
# AnatomIQ 3D 1.9.1: append real oral / pharyngeal geometry to a complete local 1.9.0 install.
# Does not fetch, regenerate or modify cardiovascular GLBs.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
WORK="$ROOT/.respiratory-43-work"
UPSTREAM="$WORK/upstream"
UPPER="$WORK/subsets/upper-airway-selection"
HELPER="$ROOT/tools/upper-airway-191.py"
UI="$ROOT/tools/apply-upper-airway-ui-191.py"
CHECK="$ROOT/tools/check-respiratory-191.py"
REFINE="$ROOT/tools/refine-upper-airway-191.py"
REFINED="$WORK/subsets/upper-airway-refined-191"
REFINEMENT_REPORT="$WORK/upper-airway-refinement-report-191.json"
if [[ ! -s models/respiratory-structures.json || ! -s models/respiratory-standard.glb || ! -s models/respiratory-detailed.glb ]];then
  echo 'ERROR: 1.9.0 respiratory model set is missing. Run bash tools/install-respiratory-43.sh first.' >&2;exit 1
fi
for f in tools/build-respiratory-43.py tools/build-digestive-detail.py "$HELPER" "$UI" "$CHECK" "$REFINE";do
  [[ -s "$f" ]] || { echo "Missing 1.9.0 dependency or 1.9.1 tool: $f" >&2;exit 1; }
done
PYTHON="${PYTHON:-python3}"
if [[ -x "$ROOT/.digestive-43-work/venv/bin/python" ]];then PYTHON="$ROOT/.digestive-43-work/venv/bin/python"
elif [[ -x "$WORK/venv/bin/python" ]];then PYTHON="$WORK/venv/bin/python";fi
"$PYTHON" "$UI" --root "$ROOT" --check-only
"$PYTHON" "$HELPER" verify-previous models/respiratory-structures.json
"$PYTHON" -c 'import trimesh,numpy;import fast_simplification;print("Required converter dependencies verified")' || {
 echo 'ERROR: Missing existing respiratory converter dependencies. Install via bash tools/install-respiratory-43.sh.' >&2;exit 1;
}
mkdir -p "$UPSTREAM" "$(dirname "$UPPER")"
BASE='https://raw.githubusercontent.com/olivercase/body_parts_3d_api/v1.0.0'
for NAME in MANIFEST.csv bp3d_subset.py download_bodyparts3d_4.3.py LICENSE;do
  if [[ ! -s "$UPSTREAM/$NAME" ]];then
    curl -fL --retry 3 --connect-timeout 20 "$BASE/$NAME" -o "$UPSTREAM/$NAME.part"
    mv "$UPSTREAM/$NAME.part" "$UPSTREAM/$NAME"
  fi
done
"$PYTHON" "$HELPER" verify-catalog "$UPSTREAM/MANIFEST.csv"
if "$PYTHON" "$HELPER" verify-subset "$UPPER" >/dev/null 2>&1;then
  echo "Reusing verified upper-airway meshes."
else
  echo 'Downloading exactly 17 source-backed mouth and pharyngeal meshes.'
  patterns=()
  while IFS= read -r rx;do patterns+=(--pattern "$rx");done < <("$PYTHON" "$HELPER" patterns "$UPSTREAM/MANIFEST.csv")
  # Remove stale partial downloads; keep verified 1.9.0 lung and airway subsets intact.
  rm -rf "$UPPER"
  cd "$UPSTREAM"
  "$PYTHON" bp3d_subset.py "${patterns[@]}" --name upper-airway --download --chunk-size 17 --out "$UPPER"
  cd "$ROOT"
fi
"$PYTHON" "$HELPER" verify-subset "$UPPER"
# Build refined copies from real provider meshes. Existing 1.9.0 sources and
# converter are NOT modified. Only the 17 added OBJs are subdivided.
"$PYTHON" "$REFINE" --source "$UPPER" --out "$REFINED" --report "$REFINEMENT_REPORT"
"$PYTHON" "$HELPER" verify-subset "$REFINED"
for REQUIRED in "$WORK/subsets/lungs/MANIFEST.csv" "$WORK/subsets/airways/MANIFEST.csv";do
  [[ -s "$REQUIRED" ]] || { echo "Missing 1.9.0 source subset: $REQUIRED. Re-run its installer." >&2;exit 1;}
done
if [[ -s "$ROOT/.digestive-43-work/subsets/skin/MANIFEST.csv" ]];then
  SKIN_FOLDER="$ROOT/.digestive-43-work/subsets/skin"
else
  SKIN_FOLDER="$WORK/subsets/skin"
fi
SKIN="$(find "$SKIN_FOLDER" -type f -name '*.obj' -print -quit 2>/dev/null || true)"
[[ -s "$SKIN" ]] || { echo 'Missing original BodyParts3D skin reference. Re-run 1.9.0 installer.' >&2;exit 1;}
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$WORK/backups/1.9.0-before-1.9.1-$STAMP"
mkdir -p "$BACKUP/models" "$BACKUP/app"
for f in respiratory-standard.glb respiratory-detailed.glb respiratory-structures.json;do cp -p "models/$f" "$BACKUP/models/$f";done
[[ ! -f models/respiratory-upper-airway-detail-report.json ]] || cp -p models/respiratory-upper-airway-detail-report.json "$BACKUP/models/"
for f in respiratory-model.js app.js sw.js version.json index.html manifest.webmanifest;do [[ ! -f "$f" ]] || cp -p "$f" "$BACKUP/app/$f";done
# If anything fails after model generation begins, restore the complete 1.9.0 set.
rollback_on_error() {
  code=$?
  trap - ERR
  echo "ERROR: 1.9.1 failed. Restoring the preserved 1.9.0 files from $BACKUP" >&2
  # A brand new detail report must not remain after a failed installation.
  [[ -f "$BACKUP/models/respiratory-upper-airway-detail-report.json" ]] || rm -f models/respiratory-upper-airway-detail-report.json
  for file in "$BACKUP"/models/*;do cp -p "$file" models/;done
  for file in "$BACKUP"/app/*;do cp -p "$file" ./;done
  exit "$code"
}
trap rollback_on_error ERR
# The backup remains independently available even if conversion fails.
"$PYTHON" tools/build-respiratory-43.py \
  --subset "$WORK/subsets/lungs" --subset "$WORK/subsets/airways" --subset "$REFINED" \
  --skin "$SKIN" --out models --previous "$BACKUP/models/respiratory-structures.json"
"$PYTHON" "$HELPER" verify-result "$BACKUP/models/respiratory-structures.json" models/respiratory-structures.json
"$PYTHON" "$CHECK" --models models --previous "$BACKUP/models/respiratory-structures.json" --report "$REFINEMENT_REPORT"
"$PYTHON" "$UI" --root "$ROOT"
cp -p "$REFINEMENT_REPORT" models/respiratory-upper-airway-detail-report.json
trap - ERR
echo 'SUCCESS: 1.9.1 local upper-airway geometry and PWA version updated.'
echo "BACKUP: $BACKUP"
echo 'Commit app files, models/respiratory-* and the detail report as ONE deployment; leave cardiovascular models untouched.'
