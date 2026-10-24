# Anatomiq 3D 1.9.0 — Respiratory + Pulmonary Circulation

## What's included

- New independent **Respiratory** layer alongside Skeletal, Muscular, Digestive, and Cardiovascular.
- Real **BodyParts3D / DBCLS 4.3** lung parenchyma, using **18 named bronchopulmonary segment meshes** in the provider `lungs` subset. Each structure is selectable, paintable, hideable, and labelable.
- An additional *optional* source-backed trachea, bronchi, larynx, diaphragm and related structure search. Only matching provider meshes are included. A full branching airway tree is **not guaranteed** by the dataset.
- **Airways + Pulmonary Circulation** combined teacher study preset: transparent lung tissue (30%), existing cardiovascular pulmonary arterial/venous vessels, and heart-wall context. **Vessels are not duplicated or rebuilt.**
- **Respiratory Overview**, **Lung Lobes & Segments**, **Airways Only**, **Airways + Pulmonary Circulation** presets. Opacity slider and respiratory coverage JSON export.
- **Standard** and **Detailed** source-backed respiratory GLBs from one verified manifest, aligned using the same source-skin normalization as existing digestive/cardio systems.
- Student links load respiratory assets only when required by their chapter; offline lesson download includes required respiratory assets. New respiratory IDs append *after* the existing cardiovascular inventory, preserving saved structure indices.
- App Settings quality selector and **Force re-download models → Respiratory** with strict matching metadata/GLB verification. Studio lighting and dynamic shadows apply to the respiratory layer.

## Install into existing GitHub Pages project

1. From **Library → Export**, save a copy of local lessons. *Do not clear site data.*
2. Extract `Anatomiq-3D-1.9.0-Respiratory-Update.zip`. Merge the inner `anatomy-pwa-studio/` files into your existing project. Preserve folder paths. Do not replace or delete existing model files.
3. From Terminal within your project on a Mac with Internet access, run:

   ```bash
   bash tools/install-respiratory-43.sh
   ```

   The installer downloads the real source meshes into `.respiratory-43-work/`, verifies source manifests, and generates *both* GLB versions plus `models/respiratory-structures.json`. Re-running it reuses downloaded geometry.
4. Before uploading any changes, confirm the three new `models/respiratory-*` files exist. Upload these to the GitHub repository under **`models/`**:

   - `models/respiratory-standard.glb`
   - `models/respiratory-detailed.glb`
   - `models/respiratory-structures.json`
   - `models/licenses/RESPIRATORY-43-ATTRIBUTION.txt`

   If a GLB is larger than the GitHub web uploader's limit, use GitHub Desktop/local Git push. Do **not** upload `.respiratory-43-work/`. Keep the existing cardiovascular-*.glb/json files exactly as they are.
5. Upload all application files from the 1.9.0 update ZIP to the **repository root**, including the new `respiratory-model.js` and updated `app.js`, `index.html`, `styles.css`, `sw.js`, `scene-*`, `structure-layout.js`, `system-layers.js`, `version.json`, `manifest.webmanifest`. Installer tools belong in `tools/` in the source repository.
6. After GitHub Pages deployment, open `https://kelly-science.github.io/anatomiq-3d/version.json` and confirm **1.9.0**. In the app, go to **App Settings → Force re-download anatomy models → Respiratory**.
7. In Teacher Studio enable **Respiratory**, then select **Airways + Pulmonary Circulation**. The existing Cardiovascular layer and new Respiratory layer appear together. Set lung opacity to taste and save a chapter for student publishing.

## Validation and limitations

- Source-backbone builder tested end-to-end with two *synthetic mesh fixtures* and matching Standard/Detailed IDs. It has **not yet been run on your real Mac or deployed site**.
- JavaScript and Python regression suites completed locally. GLB material rendering on Chromebooks needs visual testing.
- *Pulmonary vessels* are exactly the branches already present in your existing 304-mesh cardiovascular model. This release **does not fabricate pulmonary lobar/segmental arterial or venous geometry**.
- Optional provider airway source may not include all primary/secondary/tertiary bronchi. Inspector will show what's present; use classroom labels for missing anatomy until another verified 3D source is added.
- Respiratory lung mesh names and segmentation come from the provider and might not delineate whole lobes as independently selectable objects; segment visibility can represent lobe regions by grouping.
- The original 304 cardiovascular mesh IDs and indices are preserved as long as the existing `models/cardiovascular-structures.json` remains unchanged.

## Licensing

BodyParts3D / Anatomography 4.3 © DBCLS, anatomical meshes under **CC BY-SA 2.1 Japan**. Retain attribution file and share-alike requirements on redistribution. The `body_parts_3d_api` downloader by Oliver Case is MIT-licensed. No provider download/CDN dependency is required when students open the app.
