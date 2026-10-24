# Anatomiq 3D / Anatomy Studio 1.8.7 — Unified Studio Lighting

This is a **rendering-only** update. No GLB geometry, structure order, saved lesson data,
scene URLs, material colors, or curricular inventory has been changed.

## Changes
- One shared static studio-lighting rig illuminates **skeletal, muscular, digestive, and cardiovascular** geometry. Low-cost key/fill/rim directional lights with a reduced hemisphere fill improve contours and specular definition.
- Less matte PBR materials: skeletal roughness **0.38** (source 0.62), digestive **0.43** (was 0.79), cardiovascular **0.41** (was 0.77); muscles remain at their **0.48** source finish. Transparent chamber cavity reference volumes remain faint and subdued.
- Studio mode uses ACES Filmic tone mapping to preserve variation on strongly lit bones and tissue.
- App Settings → **Anatomical surface lighting** has **Studio (default)** and **Classic** (previous lighting and finishes). This preference is local to the student's or teacher's device and is never saved in shared scene data. Changing it reloads the page.
- Lighting has no shadow maps, new HDR assets, textures, animation loops, or network requests. Student scene-aware model loading remains unchanged.

## GitHub Pages update from 1.8.6

Extract **Anatomiq-3D-1.8.7-Universal-Lighting-Update.zip**. Upload these files to the **repository root**, preserving their filenames:

1. `app.js` (replace)
2. `index.html` (replace)
3. `surface-lighting.js` (**new**)
4. `sw.js` (replace)
5. `version.json` (replace)

You may also upload this release note. **Do not re-upload or rebuild any `models/*.glb` or cardiovascular JSON files** for this update. The files in `models/` remain untouched.

After GitHub Pages finishes deployment, close any older app tabs and reopen or use App Settings → Check for updates. Verify the installed version is **1.8.7**. Open App Settings → Anatomical surface lighting → Studio. It is the default if the device has not chosen another appearance.

The service worker is versioned separately (`anatomy-v1.8.7`) to ensure the new module is cached. If an installed PWA is stuck on the older worker, close all its tabs, restart the app, and check for updates. Do **not** clear all site data: lesson drafts and the local library depend on it.

## Visual checks
- Rotate an exposed femur or skull in Skeletal: curved surfaces should show moving highlights without appearing metallic.
- In Digestive, check liver/stomach/intestines at both wide and close-up views.
- In Cardiovascular, inspect aorta, pulmonary trunk, and cardiac walls, including transparent cavities.
- Return to Muscular: it should retain visible muscle definition, rather than acquiring a chrome finish.
- Try Classic to compare the old, flatter look.
- Test on a Chromebook with Auto/Fast rendering quality for practicals. Extra lights require some shading work, but they do not add shadow-map passes or additional draw calls from mesh duplication.

## Development validation
`npm test` → 106 tests passing, including five new lighting/compatibility tests.

All render appearances require visual testing on a physical device; screenshots are not generated in this release.
