#!/usr/bin/env bash
# A PREVIEW / source-audit tool. It deliberately does not modify app.js, sw.js,
# any existing GLB, or the saved lesson library.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="$ROOT/.lymphatic-z-22-work"
SCRIPTS="$ROOT/tools"
BASE="$ROOT/models/lymphatic-standard.glb"
mkdir -p "$WORK/source" "$WORK/scan" "$WORK/preview/models"
if [[ ! -s "$BASE" ]]; then
  echo "ERROR: $BASE absent. Install the BodyParts3D 2.2.0 lymphatic source models first." >&2
  exit 2
fi
for script in export-z-lymphatic-blender.py z_lymph_identify.py build-z-lymphatic-preview.py; do
  [[ -s "$SCRIPTS/$script" ]] || { echo "Missing tools/$script; copy the whole package's tools folder into your repo"; exit 2; }
done

BLENDER="${BLENDER_BIN:-}"
if [[ -z "$BLENDER" ]]; then
  BLENDER="$(command -v blender || true)"
fi
if [[ -z "$BLENDER" ]]; then
  for path in "/Applications/Blender.app/Contents/MacOS/Blender" "$HOME/Applications/Blender.app/Contents/MacOS/Blender"; do
    [[ -x "$path" ]] && { BLENDER="$path"; break; }
  done
fi
if [[ -z "$BLENDER" ]]; then
  echo 'Blender is required to read original Z-Anatomy .blend meshes. Install Blender from https://www.blender.org/download/ then rerun.' >&2
  exit 2
fi

BLEND="${ZA_BLEND:-}"
if [[ -z "$BLEND" ]]; then
  BLEND="$(find "$WORK/source" -type f -iname 'Startup.blend' -print -quit 2>/dev/null || true)"
fi
if [[ -z "$BLEND" ]]; then
  ARCHIVE="${ZA_ARCHIVE:-$WORK/source/Z-Anatomy.zip}"
  if [[ ! -s "$ARCHIVE" ]]; then
    echo 'Downloading upstream Z-Anatomy archive (large file)...'
    TMP="$ARCHIVE.part"
    # The URL points to the original source, not a third-party repackaging.
    curl -fL --retry 3 --connect-timeout 20 --max-time 900 \
      'https://github.com/Z-Anatomy/Models-of-human-anatomy/raw/refs/heads/master/Z-Anatomy.zip' -o "$TMP" || {
      rm -f "$TMP"
      echo 'Upstream ZIP download failed. Download the original from https://github.com/Z-Anatomy/Models-of-human-anatomy and set ZA_ARCHIVE=/path/to/Z-Anatomy.zip.' >&2
      exit 2
    }
    mv "$TMP" "$ARCHIVE"
  fi
  unzip -tq "$ARCHIVE" >/dev/null || { echo "Archive is not a valid ZIP: $ARCHIVE"; exit 2; }
  unzip -n -q "$ARCHIVE" -d "$WORK/source/extracted"
  BLEND="$(find "$WORK/source/extracted" -type f -iname 'Startup.blend' -print -quit || true)"
  if [[ -z "$BLEND" ]]; then
    echo 'Original archive has no Startup.blend. No files altered. Obtain the standalone Blender model and rerun with ZA_BLEND="/path/Startup.blend".' >&2
    exit 2
  fi
fi
[[ -s "$BLEND" ]] || { echo "Blender source not found: $BLEND" >&2; exit 2; }
echo "Reading original Z-Anatomy source: $BLEND"
"$BLENDER" --background "$BLEND" --python "$SCRIPTS/export-z-lymphatic-blender.py" -- --outdir "$WORK/scan"

PY="$WORK/venv/bin/python"
if [[ ! -x "$PY" ]]; then
  python3 -m venv "$WORK/venv"
fi
# Use compatible, tested dependency pins for the typical Mac Python 3.9.
"$PY" -m pip install --disable-pip-version-check 'numpy==2.0.2' 'trimesh>=4,<5' 'fast-simplification==0.1.10'
"$PY" "$SCRIPTS/build-z-lymphatic-preview.py" \
  --source "$WORK/scan/z-lymphatic-source.glb" \
  --selection "$WORK/scan/selection-audit.json" \
  --baseline "$BASE" \
  --out "$WORK/preview/models"

cp "$SCRIPTS/z-lymph-preview.html" "$WORK/preview/index.html"
ln -sfn "$ROOT/vendor" "$WORK/preview/vendor"
ln -sfn "$BASE" "$WORK/preview/models/lymphatic-standard.glb"
echo
printf 'SUCCESS: Z-Anatomy preview written to %s\n' "$WORK/preview"
echo 'Run the following to preview locally (not on GitHub Pages):'
printf "  cd '%s/preview' && python3 -m http.server 8765\n" "$WORK"
echo 'Then visit http://localhost:8765/'
echo 'Do not publish these assets before alignment, mesh identity, and license review.'
