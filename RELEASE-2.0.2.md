# AnatomIQ 3D 2.0.2 — Deep Brain, Meninges and Nervous Repair

This is an **update package**, not a replacement for your existing 2.0/2.0.1 project. It contains revised app files and a source-mesh installer. Real BodyParts3D OBJs and final GLBs must be generated on your Mac. **No leg nerves are added or generated.**

## What it repairs

- Adds source-backed **left/right superior parietal lobule surfaces** (`FJ7463`, `FJ7463M`) omitted from the older cortical selection. This is the strongest catalog-supported candidate for the visible posterior cortical hole, but requires visual validation; it does not guarantee a watertight brain surface.
- Includes missing **deep brain/ventricular** source meshes and **left C5–C8/T1 → brachial plexus** source pieces when upgrading directly from 2.0.0. If already installed with 2.0.1, these are detected and **not duplicated**.
- Adds source-backed meningeal anatomy: `FJ3890` cerebral hemisphere segment of **dura mater**, `FJ7445` **falx cerebri**, and `FJ1843` **tentorium cerebelli**. These are separate, selectable meshes; arachnoid and pia mater are **not available as comparable standalone source geometry** and are not fabricated.
- Introduces **Posterior cortex** and **Meninges & brain** presets. Dural surfaces use a pale transparent material and are hidden by default. The ordinary Entire System view excludes schematic reconstructions.
- Produces `models/nervous-continuity-202.json`, a *geometric-gap audit* of candidate C5–C8 → brachial plexus → arm pathways. Close 3D surfaces do not establish biological nerve continuity. No endpoints are synthetically joined.

## Install on your existing Mac project

1. Back up the **AnatomIQ Library → Export entire library** from your installed app. Keep your local `models/`, `vendor/`, `.respiratory-43-work/`, `.digestive-43-work/`, and `.atlas-20-work/` folders. Do **not** clear browser site data.
2. Extract this ZIP. Copy the files under `anatomy-pwa-studio/` into the corresponding paths of your existing local project; replace matching app and tools files, **do not delete other files**.
3. In Terminal from the existing project's root:

   ```bash
   bash tools/install-nervous-repair-202.sh
   python3 tools/check-nervous-20.py --local models
   ```

   The installer reads your existing nervous manifest and downloads *only* source meshes not already present; it reuses cached 2.0.1 sources where possible. Both GLBs, manifest and reports are generated in a temporary staging directory and checked before the existing files are replaced. A timestamped backup is retained under `.atlas-20-work/repair-202/backups/`.
4. Expected counts after a complete install:
   - From 2.0.0: **390** structures (125 original + 260 previously omitted source structures + 5 posterior/meningeal structures)
   - From source-only 2.0.1 (385): **390**
   - From 2.0.1 with 12 earlier schematic leg structures (397): **402** (previous identities are preserved, but no new legs are added and the ordinary preset hides the schematics)
5. Commit the complete 2.0.2 application update **in the same GitHub commit** as all of these generated files:

   ```text
   models/nervous-standard.glb
   models/nervous-detailed.glb
   models/nervous-structures.json
   models/nervous-source-audit.json
   models/nervous-repair-202-report.json
   models/nervous-continuity-202.json
   ```

   Keep the attribution file `models/licenses/ATLAS-EXPANSION-43-ATTRIBUTION.txt` from 2.0. Do **not** modify cardiovascular, digestive, respiratory or skeletal models. Do not upload hidden temporary download folders.
6. Confirm `https://kelly-science.github.io/anatomiq-3d/version.json` reports **2.0.2** after Pages deploys. Then choose **Settings → Force re-download models → Nervous**. Check both Standard and Detailed in the Posterior cortex, Deep brain & ventricles, Meninges & brain, and Brachial plexus & arm presets.

## How to diagnose unresolved gaps

Inspect `models/nervous-continuity-202.json`. It reports candidate nerve-pair minimum geometric separations in **normalized viewer units**, *not centimeters*. It cannot verify anatomical connectivity; a nerve can be anatomically disconnected despite close meshes. The screenshot's isolated segments may therefore remain where BodyParts3D has no connecting surface. For a fully connected nerve tree, use an anatomically validated supplementary source or manually reconstructed connections reviewed against atlas references.

The superior parietal lobules are a plausible correction for the posterior cortical gap. If there is still an opening after upload, we should compare individual Brain region visibility and raw source meshes before adding further surfaces. This update intentionally does not fill holes with guessed topology.

## Verification performed

- 3 Python synthetic tests passed, including a real 125-mesh GLB pair exported to 130 entries without changing previous IDs or triangle counts.
- 2 new JavaScript tests passed for meninges and study presets.
- 25 targeted JavaScript tests passed covering scene codecs, rendering profile, publication and Nervous 2.0 compatibility.
- Shell syntax, Python compilation and JS syntax checks passed.
- Two old tests that hard-code obsolete 1.8.x source strings/version numbers are outdated and were **not** counted as regressions.
- The 265 requested extra BodyParts3D meshes have **not** been downloaded/visually inspected in this environment; the Mac installer and resulting app rendering need live verification.

### Attribution

BodyParts3D / DBCLS 4.3, CC BY-SA 2.1 Japan. Preserve source attribution when redistributing generated geometry.
