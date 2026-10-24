# AnatomIQ 3D 2.0.4 — Ventricular Visibility Adjustment

**Only the ventricular material changes.** The ventricles remain slightly translucent (94% opacity) but write depth information, helping overlapping surfaces retain their form. The meninges, structure colors, anatomical geometry, and all other body systems remain unchanged.

## Apply to your GitHub Desktop checkout

1. Extract this ZIP.
2. Copy `tools/apply-ventricle-opacity-204.py` into your existing repository's `tools/` folder, replacing nothing else.
3. Open Terminal in your existing GitHub repository, for example:

   ```bash
   cd /Users/steve/Documents/GitHub/anatomiq-3d
   python3 tools/apply-ventricle-opacity-204.py
   ```

4. The script updates exactly these four application files:
   - `nervous-model.js`
   - `app.js`
   - `sw.js`
   - `version.json`
5. Commit those four files using GitHub Desktop and **Push origin**. Once Pages finishes deploying, reload your installed PWA. If it still shows the old version, close and reopen the app to activate the updated service worker.

The script creates a timestamped `.nervous-204-backup-*` folder before writing. It validates all edits before applying them and can safely be run again. It requires the **2.0.3 visual-tuning installer** to have been applied successfully.

## Expected material settings

| Structure | Opacity | Depth writing | Modified? |
|---|---:|---|---|
| Cerebral ventricles (3rd, 4th, left and right lateral) | 0.94 | On | Yes |
| Dura / falx / tentorium | 0.30 (existing setting) | Off | No |

**No GLB files, mesh manifests, generated models, local saved lessons or structures are altered.**

## Verify

Run `python3 tests/check-ventricle-opacity-204.py` from your repository after copying the included test to `tests/`. It confirms the 2.0.4 material settings and the 2.0.4 version stamps.

This is a source-level visual fix; its final appearance should be checked in the browser after deployment.
