# AnatomIQ 3D 2.0.1 — Nervous Atlas Completeness

## What changed

- Corrected a major source-selection omission in 2.0.0: the original 125-mesh core lacked **82 available internal-brain structures** (third, fourth, left and right lateral ventricles, hypothalamic regions, basal ganglia, and connecting brain tissue) and **178 available peripheral/cranial nerve structures**.
- Added the left **C5–C8 cervical nerve trunks, T1 trunk, superior/middle/inferior trunks of the brachial plexus, and lateral/medial/posterior cords** from verified DBCLS/BodyParts3D 4.3 meshes. Real-source nerve segments may meet at or nearly at a common anatomical location; continuity cannot be guaranteed from the component catalog alone.
- Added twelve **optional-in-converter** illustrated lower-limb pathways (left/right lumbosacral roots, sciatic, femoral, obturator, tibial, common fibular). These are **clearly labelled educational schematic reconstructions**, not exact dissections, and may not accurately follow individual muscles, foramina or bony landmarks. They are amber rather than source-nerve yellow. The canonical 4.3 catalog does **not** have matching lower-limb nerve meshes. To omit every schematic, install with `ANATOMIQ_NO_ILLUSTRATIVE_LEGS=1`.
- New presets: Deep brain & ventricles, Brachial plexus & arm, Leg pathways (schematic), Verified source only. All old presets continue to work.
- New structures append *after* the 125 existing nervous model entries. Existing skeletal, muscle, digestive, cardiovascular and respiratory models are **not modified**. Existing lesson IDs, structure indices, and saved colors/labels preserve the original prefix.

## What is supplied

- `tools/install-nervous-completeness-201.sh` — downloads source-backed additions, stages and verifies new GLBs, then creates a rollback copy and copies matching model assets.
- `tools/expand-nervous-201.py` — exact-catalog selection, skin-aligned conversion, stable append-only export, GLB/JSON face-count checks, and optional separately attributed teaching schematics.
- Updated 2.0.1 PWA application files and test.
- `models/` binaries are **not prebuilt** in this ZIP. Run the installer on the Mac containing your existing BodyParts3D 4.3 download directories, since direct mesh downloads are needed. The package is not a fully deployable model set before the installer finishes.

## Install

1. Back up **Library → Export entire library** in your current AnatomIQ app; don't clear site storage or IndexedDB.
2. Unzip this 2.0.1 package and merge `anatomy-pwa-studio/` into your existing local 2.0.0 project. Do NOT remove original `models/`, `vendor/`, or hidden `.digestive-43-work/` / `.respiratory-43-work/` folders.
3. In Terminal inside the project root:

   ```bash
   bash tools/install-nervous-completeness-201.sh
   ```

   It will search the pinned 3,210-mesh BodyParts3D catalog and download 260 additional, exact-name matched source OBJs. It may take time depending on upstream availability. On failure, your 2.0.0 GLBs are unchanged.
4. Before deploying, run `python3 tools/check-nervous-20.py --local models`. Expect matching node counts in both Standard and Detailed. **Expected after success:** 397 mesh entries (125 original + 260 source + 12 clearly labelled reconstructions); or 385 without the schematics.
5. Commit the **entire coordinated 2.0.1 application update plus**:
   - `models/nervous-structures.json`
   - `models/nervous-standard.glb`
   - `models/nervous-detailed.glb`
   - `models/nervous-source-audit.json`
   - keep `models/licenses/ATLAS-EXPANSION-43-ATTRIBUTION.txt`

   Do not upload the manifest alone or only one of the GLBs. The service worker rejects mismatched deployments (intentionally).
6. Confirm `/version.json` reports `2.0.1`, select Nervous, choose **Deep brain & ventricles** and **Brachial plexus & arm**, and test **Leg pathways (schematic)**. Check both Detailed and Standard qualities.

## Limitations and validation

- This is not a complete, contiguous human nerve atlas. Some nerve source pieces are disconnected or only one-sided. The 4.3 dataset lacks named sciatic/femoral/tibial/common fibular source meshes, so exact lower-limb anatomy requires a separate more complete source or manual anatomical modeling and specialist review.
- The leg schematics are instructional paths, not accurate anatomical registrations or clinical visualization. They should not be scored as anatomical-identification questions until verified, and **should be excluded from practical exams by default**.
- Synthetic offline geometry tests check append-only GLB generation and exact node/triangle verification. Actual upstream downloads and rendering were not executed in this environment; inspect the exported models on your Mac and Chromebook before classroom use.
- Attribution: BodyParts3D / DBCLS, CC BY-SA 2.1 Japan. The new reconstruction meshes are derived teaching diagrams and must not be confused with source geometry.
