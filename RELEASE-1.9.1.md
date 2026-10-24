# AnatomIQ 3D 1.9.1 — Mouth and Upper Airway

## What this update actually adds

Adds **17 real BodyParts3D / DBCLS 4.3 meshes** to the existing respiratory model. The original respiratory manifest is kept as an **exact prefix**, so old structure indices stay unchanged.

- Oral context: **tongue**, **lip**, **maxillary gingiva**, **mandibular gingiva**.
- Palate-related anatomy: **uvular muscle**, left/right **levator veli palatini**, and left/right **tensor veli palatini**.
- Pharyngeal muscles: left/right **palatopharyngeus** and left/right **superior**, **middle**, and **inferior pharyngeal constrictors**.

All are named separately for search, selection, coloring, and hiding. The additions are categorized as upper airway/context within the existing respiratory model. Existing **Airways Only** preset includes the new structures; **Airways + Pulmonary Circulation** continues to reuse the existing cardiovascular vessels.

**Anatomical limitations:** The uvular muscle is not a complete uvula; palatal muscles are not a continuous soft-palate mucosal surface; pharyngeal muscles are not a model of the nasopharynx, oropharynx, or laryngopharynx airspace. This release does **not** add full nasal-cavity or oral-cavity lining surfaces, tonsils, or a fully connected airflow lumen. Those require separate mesh creation/acquisition and registration. The original provider tongue has only about **524 source triangles**. This revision adds selective subdivision with bounded smoothing: at 524 source triangles, two subdivision rounds can produce **8,384 interpolated triangles** before the Standard/Detailed converter applies its 3,200/16,000 ceilings. More triangles make silhouettes and shading smoother but **do not reveal anatomical landmarks missing from the source**. Bony palate/conchae and extrinsic tongue muscles remain with existing skeletal/muscular systems to avoid duplicates.

## Requirements

- A **complete, working local 1.9.0** AnatomIQ 3D source project, including `app.js`, `respiratory-model.js`, `sw.js`, `version.json`, `tools/build-respiratory-43.py`, `tools/build-digestive-detail.py`, and both `models/respiratory-*.glb` files plus `models/respiratory-structures.json`.
- Source staging from 1.9.0: `.respiratory-43-work/subsets/lungs/`, `airways/` and the BodyParts3D skin subset (from respiratory or digestive source cache).
- Internet access on the Mac for 17 additional source OBJ downloads; the original 1.9 installer Python environment with `trimesh`, `numpy`, and `fast_simplification`. Loop subdivision is used when that installed `trimesh` exposes it; a shape-preserving midpoint subdivision fallback remains available otherwise.
- Source license: **CC BY-SA 2.1 Japan**, BodyParts3D / DBCLS 4.3. Keep the existing `models/licenses/RESPIRATORY-43-ATTRIBUTION.txt` with redistributed geometry.

## Install

1. Export the entire local lesson library in **Library** and preserve your current project. Do not clear browser site data.
2. Extract this ZIP. Copy the **five included scripts in `tools/`** (`install-upper-airway-191.sh`, `upper-airway-191.py`, `refine-upper-airway-191.py`, `apply-upper-airway-ui-191.py`, `check-respiratory-191.py`) into your existing project's `tools/` directory. These are installer tools, not new UI files. The ZIP does not replace your 1.9.0 converter.
3. In macOS Terminal, from the **existing project root**, run:

   ```bash
   bash tools/install-upper-airway-191.sh
   ```

4. The script verifies the provider's exact 17 FJ IDs, downloads the actual meshes, and builds an **isolated refined copy** of each source OBJ. Source meshes with fewer than approximately 4,200 triangles are subdivided (up to three rounds). Conservative Loop smoothing is accepted only if bounding-box drift, surface area, center, and closed-mesh volume stay within limits; otherwise midpoint subdivision is used to avoid deformation. Existing lung and trachea sources are never refined. It then creates a time-stamped backup, regenerates Standard/Detailed respiratory GLBs with the **unchanged 1.9.0 converter**, verifies structure IDs, original prefix rows, coordinate registration, per-structure GLB/JSON face counts, and updates PWA version/cache metadata.
5. In GitHub Desktop or Git, **commit the resulting local project changes as a single deployment**. Upload `models/respiratory-standard.glb`, `models/respiratory-detailed.glb`, `models/respiratory-structures.json`, **`models/respiratory-upper-airway-detail-report.json`**, and updated app sources (`respiratory-model.js`, `app.js`, `sw.js`, `version.json`, plus `index.html`/`manifest.webmanifest` if modified). Do not upload `.respiratory-43-work/`, downloaded OBJ files, backups, or Python environments. Leave cardiovascular assets unchanged.
6. Confirm the published `version.json` reports **1.9.1**. In AnatomIQ App Settings, refresh Respiratory model assets, then open an Airways Only view and verify the tongue, pharyngeal muscles, and uvular muscle. Check both model qualities, saved lessons, and pulmonary circulation.

## Failure and recovery

- A missing or older app (for example 1.8.5), unverified source geometry, corrupted triangles, duplicate IDs, missing converter, incompatible previous manifest, divergent registration, changed previous structure triangle counts, or an incorrect GLB/JSON triangle mapping triggers an explicit failure instead of silently deploying mismatched assets.
- The script backs up models and app files at `.respiratory-43-work/backups/1.9.0-before-1.9.1-<timestamp>/` immediately before rebuilding. Refinement reports capture original and refined OBJ SHA-256 checksums, face counts, smoothing method and shape-tolerance measurements. A conversion or verification error after this point automatically restores the backed-up app and model files. You can also restore them manually later if you need to roll back.
- Re-running after a **successful** 1.9.1 installation is **not necessary**. The script intentionally refuses a duplicate upgrade because those added IDs are already in the manifest.

## Checks performed here

Ten offline Python tests cover candidate selection, incomplete downloads, immutable manifest prefix, guarded app patching, idempotent UI changes, source-geometry preservation, subdivision fallback, 17-mesh manifest generation, and GLB/JSON face-count mismatch detection. The 3D mesh download and real final GLB build **cannot be exercised in this sandbox** because the upstream download requires your Mac's network connection and the working 1.9.0 project. The Mac installer validates both generated GLBs before reporting success.

## Detail strategy

- Original source > 4,200 triangles: leave unchanged, and use 1.9.0 quality decimation caps as before.
- Original source below 4,200 triangles: subdivide until reaching that minimum or the three-round cap (quadrupling triangles per round). Avoid intermediate meshes above 32,000 triangles.
- **Standard:** at most 3,200 triangles per structure, using the original converter. **Detailed:** at most 16,000 triangles per structure.
- Smooth only when the candidate remains within source-boundary tolerances. Where source fidelity and visual smoothing conflict, fidelity wins.
- Correct normals and the existing PWA lighting/shadows continue to be applied by the unchanged converter/renderer.
- The file `models/respiratory-upper-airway-detail-report.json` reports what actually happened for each of the 17 structures. Triangle counts are not guarantees of anatomical accuracy.
