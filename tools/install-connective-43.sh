#!/usr/bin/env bash
# AnatomIQ 2.2.8d: rebuild curated connective anatomy, retaining original discs
# and Achilles tendons in their existing Écorché/Muscular models (no duplicates).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
WORK="$ROOT/.connective-43-work"
mkdir -p "$WORK/subsets/joints" "$WORK/upstream"
SRC="$ROOT/.respiratory-43-work/upstream"
BASE='https://raw.githubusercontent.com/olivercase/body_parts_3d_api/v1.0.0'
for FILE in MANIFEST.csv bp3d_subset.py download_bodyparts3d_4.3.py; do
  if [[ ! -s "$WORK/upstream/$FILE" ]]; then
    if [[ -s "$SRC/$FILE" ]]; then
      cp "$SRC/$FILE" "$WORK/upstream/$FILE"
    else
      curl -fL --retry 3 --connect-timeout 20 "$BASE/$FILE" -o "$WORK/upstream/$FILE.part"
      mv "$WORK/upstream/$FILE.part" "$WORK/upstream/$FILE"
    fi
  fi
done
PYTHON="${PYTHON:-python3}"
for VENV in "$ROOT/.digestive-43-work/venv/bin/python" "$ROOT/.respiratory-43-work/venv/bin/python" "$ROOT/.lymphatic-z-22-work/venv/bin/python" "$WORK/venv/bin/python"; do
  if [[ -x "$VENV" ]] && "$VENV" -c 'import numpy,trimesh,fast_simplification' >/dev/null 2>&1; then
    PYTHON="$VENV"
    break
  fi
done
if ! "$PYTHON" -c 'import numpy,trimesh,fast_simplification' >/dev/null 2>&1; then
  if [[ ! -x "$WORK/venv/bin/python" ]]; then python3 -m venv "$WORK/venv"; fi
  "$WORK/venv/bin/python" -m pip install 'numpy>=1.24,<3' 'trimesh>=4,<5' 'fast-simplification==0.1.10'
  PYTHON="$WORK/venv/bin/python"
fi
if ! "$PYTHON" tools/prepare-connective-curated.py check --repo "$ROOT"; then
  # 2.2.8c already downloaded all the old source meshes; only the six
  # 8th/9th/10th left/right costal cartilages are new.
  echo 'Fetching ONLY missing costal-cartilage source meshes for ribs 8–10…'
  (
    cd "$WORK/upstream"
    "$PYTHON" bp3d_subset.py \
      --pattern '(?i)^(left|right) (eighth|ninth|tenth) costal cartilage$' \
      --name connective-costal-8to10 --download --chunk-size 10 \
      --out "$WORK/subsets/costal-8to10"
  )
fi
"$PYTHON" tools/prepare-connective-curated.py assemble --repo "$ROOT"
SKIN="$("$PYTHON" tools/prepare-connective-curated.py skin --repo "$ROOT")" || {
 echo 'ERROR: Verified FJ2810 skin reference not found in local BodyParts3D cache' >&2
 exit 1
}
[[ -s "$SKIN" ]] || { echo 'ERROR: Empty FJ2810 skin source' >&2; exit 1; }
[[ -s tools/build-digestive-detail.py ]] || { echo 'ERROR: Missing registration converter' >&2; exit 1; }
"$PYTHON" tools/build-connective-43.py --subset "$WORK/subsets/curated" --skin "$SKIN" --selection tools/connective-selection.json --out models
printf '\nGenerated 14 unique Connective meshes. Check costal cartilages against ribs 8–10 before publishing.\n'
