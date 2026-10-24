# AnatomIQ 3D 2.0.0 — Nervous-System Integration

## Release scope

This is a **working integration package** for the existing 1.9.1 AnatomIQ PWA. Merge the contents of `anatomy-pwa-studio/` into your current GitHub repository **with the same relative paths**. This is *not* a clean install and does not include the large existing muscular, skeletal, cardiovascular, digestive, or respiratory GLBs.

### Integrated nervous-system atlas

The uploaded BodyParts3D 4.3 nervous atlas is verified to contain **125 meshes**:

- 64 brain-region meshes
- 1 spinal-cord mesh
- 60 cranial/peripheral nerve segments

The named nerves are source segments and are **not** claimed to form a continuous complete peripheral nervous system. Source anatomy © DBCLS / BodyParts3D; **CC BY-SA 2.1 Japan**. Retain `models/licenses/ATLAS-EXPANSION-43-ATTRIBUTION.txt` and all earlier model attributions.

Both new GLBs (provided) contain exactly the 125 mesh identifiers listed in `models/nervous-structures.json`.

| File | Size (bytes) | SHA-256 prefix |
|---|---:|---|
| `models/nervous-standard.glb` | 7,776,696 | `c837e05e9465508b` |
| `models/nervous-detailed.glb` | 17,367,652 | `6c660596edc46c6c` |
| `models/nervous-structures.json` | 26,353 | `7d812ccc381b7bb0` |

## Features

- Independent **Nervous** system button with selectable structures, hide/isolate, paint, labels, combined views, and existing studio lights and dynamic shadows.
- Study presets: entire nervous system, CNS, brain regions, spinal cord, peripheral nerves, plus **Focus nervous system** to hide distracting other system layers.
- Device-only **Standard/Detailed** quality preference (requires reload).
- Source-aware descriptions, organization by brain/spinal cord/peripheral and left/right, and unchanged IDs and ordering for all 1.9.1 structures.
- Nervous system appended **after respiratory**; old scene fingerprints accepted only for an exact matching prefix. Earlier saved scenes and labels use the same scene format (v1) and project format (v2).
- Student chapters load the nervous GLB only when needed; offline lesson downloads include it only if at least one chapter uses the system.
- PWA cache revision `anatomy-v2.0.0`; nervous model refresh verifies both GLB node sets against the JSON manifest before committing any replacements to cache.
- Corrected previously stale refresh-service-worker handshake to match this release.

## Installing

1. **Back up your local lesson library** from the app: Library → Export entire library. Do **not** clear browser storage (local IndexedDB drafts and lessons live there).
2. Merge the contents of this ZIP's `anatomy-pwa-studio/` into your **existing** project's root, keeping exact relative paths and preserving every preexisting `models/` and `vendor/` file.
3. Commit all changed files and the three `models/nervous-*` files **together**. A partial deployment may make the browser reject the GLB/manifest combination.
4. Confirm `https://kelly-science.github.io/anatomiq-3d/version.json` reports `2.0.0` (adjust URL if using a different site).
5. Open AnatomIQ; **Nervous** should be enabled. Toggle on Nervous and select **Focus nervous system** to see the brain even while the skull would otherwise obscure it.
6. In app Settings, use **Force re-download anatomy models → Nervous**, or run the included audit to confirm deployment:

    ```bash
    python3 tools/check-nervous-20.py --local models --remote https://kelly-science.github.io/anatomiq-3d/
    ```

    The audit must say **125 GLB meshes / 125 JSON entries — PASS** for both resolutions and all three published files must match local hashes.

## Verification and limitations

- Offline verified **125 IDs in both real GLBs**, identical to the original local manifest.
- **19 focused JavaScript tests passed**, including scene codec and render-performance tests, as did JS syntax checks and HTML duplicate-ID validation.
- Existing historical tests expecting former release numbers and old button counts are version-locked and were not all updated for this release. Do not interpret them as evidence of model corruption.
- This environment could not complete a WebGL browser smoke test because headless Chromium lacked a working graphics backend. Please confirm correct positioning and iPad/Chromebook rendering after deployment.
- This release **only integrates nervous**. The urinary, endocrine, lymphatic, reproductive, and sensory/integumentary systems still require independently verified generated GLBs and app wiring. Practical exam scoring is planned after those additions; no scoring functionality is claimed here.

## Files changed

`app.js`, `index.html`, `styles.css`, `system-layers.js`, `structure-layout.js`, `scene-codec.js`, `scene-assets.js`, `surface-lighting.js`, `sw.js`, `manifest.webmanifest`, `version.json`, and new `nervous-model.js`.

New model assets: `models/nervous-{standard,detailed}.glb`, `models/nervous-structures.json`, `models/licenses/ATLAS-EXPANSION-43-ATTRIBUTION.txt`, and `tools/check-nervous-20.py`. Test: `tests/nervous-20.test.mjs`.
