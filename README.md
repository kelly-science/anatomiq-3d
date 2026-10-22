# Anatomy Studio 1.1 — Chromebook Performance Pass

Version 1.1 is a drop-in performance update to version 1.0. It **does not change** the anatomical model, scene JSON format, structure indices, teacher library schema, share links, practical-exam permissions, chapters, paint, or labels.

## What changed

- **Demand-driven WebGL rendering**: the 3D canvas renders only when the camera is moving, damping is settling, or something changes in the view. Previously, the OrbitControls `change` handler re-extended a 20-frame draw window every time `controls.update()` ran, potentially generating a long-running loop. Hidden browser tabs stop rendering.
- **Camera edits are saved when interaction ends**, instead of asking for scene serialization/history updates on every OrbitControls `change` event. Camera preset, Focus, Fit and zoom buttons still save their changed positions. Undo/redo and library saves remain supported.
- **Per-device quality selection** in the viewer bottom controls and Settings → App Settings. Auto uses Fast for devices reporting up to 4 GB RAM or up to 4 CPU cores, Balanced for others. Fast caps drawing buffer pixel density at 1x; Balanced at 1.25x; Sharp at 2x or device native density, whichever is lower. Earlier releases capped density at 1.5x. Fast at 1x shades approximately 56% fewer pixels than 1.5x, though speedup depends on GPU vs draw-call limitations.
- Removed a redundant full-scene matrix update for label placement after each WebGL render.
- Quality is stored in the Chromebook's browser storage only; it is **not** saved in the lesson or student URL. Students can choose Fast even when viewing a teacher's shared assessment.
- Updated version manifest and service worker cache (1.1.0).

## Updating GitHub Pages

1. **Back up your existing Scene Library** using Library → Back up entire library. Keep a copy of the prior 1.0 repository for rollback.
2. Extract the ZIP. Upload the **contents of `anatomy-pwa-studio/`** to the root of your existing GitHub Pages repo, replacing application files. **New required file:** `render-performance.js`.
3. **Keep your existing `models/ecorche.glb`, `vendor/three/` directories and attribution files.** They are deliberately not embedded in the release ZIP. The shipped import map in `index.html` points to **your own local Three.js files** so updating will not silently reactivate a CDN.
4. If you have *not* yet downloaded the local assets, run `bash tools/download-self-hosted-assets.sh` from the project directory on a Mac with internet, then upload the resulting `models/`, `vendor/`, `ASSET_SHA256.txt` and model licenses with the app. This installer includes the repaired `vendor-three.py` that skips comment-only sample URLs.
5. Allow GitHub Pages to deploy. Reload the installed PWA online (do **not** clear Chrome site data, which would delete locally saved lessons) and check Settings → App Settings. Verify it displays **1.1.0** and all local files present.
6. In a muscle-heavy lesson, select **Quality → Fast** at the bottom of the 3D viewer, or choose Auto to let the device decide. Try Balanced or Sharp when image detail is more important than responsiveness.

## Suggested validation

- Compare the same muscle scene on the same Chromebook, with the same visible layers, first at Sharp, then Fast. Rotate and zoom, and check responsiveness after releasing the trackpad. FPS depends on hardware and isn't guaranteed.
- Open an existing multi-chapter scene with painted bones and anchored labels. Select a muscle, paint it, rotate the camera, switch chapters, Undo, then publish a student link.
- Open that link in a Chromebook student window or Schoology iframe, check that names/search are still disabled for Practical Exam mode, and test the Quality selector in the student view.
- Confirm your previously saved Scene Library and offline availability are intact. For offline use, prepare the app using **Save offline** while online; a newly deployed service worker may need to recache assets.

## Known limits

This is a source-level performance pass, **not a verified benchmark on classroom Chromebook hardware**. It reduces redundant rendering and GPU pixel workload but does not yet lower the polygon count of the Écorché muscles or combine meshes. If hundreds of muscle meshes remain slow on lower-end GPUs at Fast quality, the next step is optional reduced-poly geometry / level-of-detail models while preserving structure IDs and label anchors.

The teacher Scene Library remains in browser-local IndexedDB. It does not automatically sync or back up to GitHub.

## Tests

Run `node --test tests/*.test.mjs` (Node 20+) to validate scene compatibility, chapter serialization, publishing, app update metadata, library backup format, quality policy, and the revised render scheduling. Hardware interaction and complete 3D rendering require a live Chromebook test.
