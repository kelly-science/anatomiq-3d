# AnatomIQ Studio 2.2.45 — Triquetrum material, surface refinement and legacy lesson support

## Fixes

1. **Bone color/material:** sample the real Écorché left/right lunate's rendered material (including source vertex colors where present). The triquetra now inherit the approved Natural Bone satin/microrelief pipeline rather than a fixed pale base color. Classic Bone still works.
2. **Surface refinement:** four triangles replace each original triangle. Every ORIGINAL vertex stays fixed at its teacher-approved world coordinate. Inserted edge vertices receive a restrained 12% curvature correction only on interior edges. The alignment matrices are not recomputed or changed. Source JSON is archived at `docs/archive/triquetrum-2.2.44-original.json`.
3. **Older lessons:** a legitimate saved scene is accepted when its original structure fingerprint matches an **exact, unchanged prefix** of the new catalog, even if it predates the cardiovascular model. Counts or names alone cannot bypass the test; unknown or reordered catalogs remain rejected, with a useful warning. Every chapter in a saved project is checked before upgrades.
4. Version and PWA URLs bumped to 2.2.45; label BVH performance fix is unmodified.

## Install

Keep your original drafts, GitHub publications and JSON backups. Download ZIP into `~/Downloads` and run:

```bash
cd "/Users/steve/Documents/GitHub/anatomiq-3d"
unzip -oq "$HOME/Downloads/AnatomIQ-Studio-Triquetrum-Refinement-2.2.45.zip" -d "$HOME/Downloads"
python3 "$HOME/Downloads/AnatomIQ-Triquetrum-Material-Compatibility-245/install.py" --repo . --dry-run && \
python3 "$HOME/Downloads/AnatomIQ-Triquetrum-Material-Compatibility-245/install.py" --repo . && \
node --check app.js && \
node --check structure-layout.js && \
node --check triquetrum-extension.mjs && \
node --check sw.js && \
git status --short
```

Dry run validates existing source files, the reviewed two-bone geometry and the prior extension file checksum. It makes no changes. Installation creates a timestamped backup **outside** the Git repository and can be restored if necessary. Never force installation after a refusal; inspect the stated mismatch.

## Acceptance tests before publishing

- Open **Classic Bone** and **Natural Bone** and inspect both triquetra against neighboring lunates. Confirm material color and sheen match; no false anatomical landmarks.
- Inspect both wrist positions from dorsal and palmar perspectives. Confirm original position relative to lunate/pisiform/hamate; this patch does not alter approved original vertices.
- Open a **previously saved local lesson** in Teacher View, and a previously published lesson in Student View. Check labels, saved paint, hidden/faded bones, and chapter changes. New triquetra default to hidden in older scenes; open them explicitly if wanted, then republish to update.
- Create a new lesson, add a triquetrum label, save/reopen, and compare the original structure IDs. Confirm the 13-label skull still rotates smoothly (2.2.38 occlusion BVH unchanged).
- Only commit when successful: `app.js`, `structure-layout.js`, `index.html`, `sw.js`, `version.json`, `triquetrum-extension.mjs`, `models/triquetrum-extension.json`, and the new archive/docs files.

If an older lesson still reports **incompatible anatomical model**, don't republish or overwrite it. This means its fingerprint does not match an exact prefix (for example, older changed/reordered anatomy or missing optional GLB metadata). Export that lesson JSON and the Chrome Console diagnostic to identify a safe explicit migration. The patch deliberately does not guess at indices or silently reset labels.

## Technical note

The original BodyParts3D meshes and Écorché carpals retain their respective attribution/license notices from 2.2.44. The triquetrum is artistically smoothed, not replaced with higher-resolution clinical scan geometry. The fix does not change BVH occlusion, orbital controls, rendering frame loop, student permissions, any stored scene schema or ID ordering.
