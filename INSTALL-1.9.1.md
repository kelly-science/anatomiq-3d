# Install AnatomIQ 3D 1.9.1 — Refined Upper Airway

This is an **upgrade installer for the existing 1.9.0 source project**, not a standalone AnatomIQ website or pre-generated GLB package. It adds 17 verified BodyParts3D mouth and pharyngeal meshes and selectively refines the low-poly ones before the unchanged 1.9.0 model converter produces Standard and Detailed GLBs.

1. In AnatomIQ, back up your entire Scene Library (Library → Export). Do **not** clear browser site data.
2. Extract this ZIP and merge the **five `tools/*.py`/`*.sh` files** into `tools/` under the existing 1.9.0 project folder. Keep all existing files, especially `tools/build-respiratory-43.py`, `tools/build-digestive-detail.py`, `models/`, and the existing `.respiratory-43-work/` downloads.
3. From the 1.9.0 project's root in Terminal, run:

   ```bash
   bash tools/install-upper-airway-191.sh
   ```

4. Check for `SUCCESS:` at the end; on failure read the error. The previous respiratory models and app files are restored automatically if model generation or final integration fails after backups. The 17 source OBJs and subdivision results remain private to the local `.respiratory-43-work/` folder.
5. Commit the updated `models/respiratory-standard.glb`, `models/respiratory-detailed.glb`, `models/respiratory-structures.json`, `models/respiratory-upper-airway-detail-report.json`, plus changed `app.js`, `respiratory-model.js`, `sw.js`, `version.json`, and any changed `index.html`/`manifest.webmanifest` **together** to GitHub. Do not upload cached OBJ source/venvs/backups. Keep the existing license attribution file and do not change cardiovascular GLBs.
6. Refresh Respiratory in AnatomIQ's App Settings, select **Detailed** geometry, and inspect the tongue and pharyngeal muscles in **Airways Only**. Also verify Standard quality, lung segments, and Airways + Pulmonary Circulation.

**Expected structure count:** 28 existing + 17 appended = **45**, assuming the provided 1.9.0 respiratory manifest. Existing indexes are preserved. The refine report records actual triangle counts and whether Loop smoothing or midpoint-only subdivision was used for each new mesh. Standard max: 3,200 triangles/mesh; Detailed max: 16,000 triangles/mesh. Source geometry that's already adequately detailed is left unchanged. No mesh subdivision can recreate missing uvular, nasal cavity, or mucosal detail.

**If you already installed the earlier unrefined 1.9.1 package:** restore the original 1.9.0 models and app sources using its timestamped `.respiratory-43-work/backups/1.9.0-before-1.9.1-*` snapshot, then run this revised installer. Do not install it twice on an already-expanded 45-mesh manifest.

The offline test suite covers synthetic meshes and metadata. Real BodyParts3D download, Mac conversion and browser display must be validated by the installer and in your project environment.
