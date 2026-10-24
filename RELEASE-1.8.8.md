# Anatomiq 3D / Anatomy Studio 1.8.8 — Dynamic Anatomical Shadows

**Rendering-only upgrade.** This patch does not touch GLB geometry, source IDs,
classroom lessons, annotations, saved drafts, or metadata. It builds on 1.8.7
Universal Studio Lighting and retains scene-aware model loading and refresh.

## What changes

- One *real* shadow-casting Three.js directional studio key light. All opaque
  anatomical meshes can cast shadows on themselves and on overlapping bone,
  muscle, digestive, and cardiovascular anatomy.
- Shadow direction follows the inspection camera so rotating, zooming or
  panning produces useful depth/shadow cues. Shadow coverage is focused near the
  camera's inspection target rather than using a wasteful whole-world shadow
  atlas. No floor, artificial ground plane, or material texture is added.
- Light maps update on camera changes, chapter/preset visibility edits, and
  model loading; the demand-rendering loop still stops when interaction stops.
- Faint transparent heart cavity reference meshes **do not** cast opaque shadows.
- App Settings → **Dynamic anatomical shadows**:
  - **Auto** (default): enabled in Balanced/Sharp render quality; off in Fast.
  - **On**: force one soft dynamic shadow map even in Fast mode.
  - **Off**: disables shadow-map rendering while retaining 1.8.7 Studio lighting.
- Shadow map sizes: Fast (manually On) 512×512; Balanced 1024×1024;
  Sharp 2048×2048. One shadow-casting light only; fill/rim/hemisphere remain
  unshadowed. The setting is per device and does not travel with lesson links.
- A changed shadow preference reloads the app so WebGL material shader variants
  are correctly recompiled; teacher drafts are saved before this reload.

## Installation: update from 1.8.7

Extract `Anatomiq-3D-1.8.8-Dynamic-Shadows-Update.zip` and upload its six files
into the **root** of `kelly-science/anatomiq-3d`, keeping their names:

- `app.js` (replace)
- `index.html` (replace)
- `surface-lighting.js` (replace)
- `dynamic-shadows.js` (**new**)
- `sw.js` (replace)
- `version.json` (replace)

Do **not** overwrite the `models/` directory or upload any GLB for this upgrade.
Continue using your existing matching 304-entry cardiovascular Standard/Detailed
models and your chosen high-detail skeletal `ecorche.glb`.

GitHub Pages must publish the six files together. After it publishes, close
old installed-app tabs, reopen, and verify version 1.8.8 in App Settings.
The service-worker cache is versioned `anatomy-v1.8.8`; do not clear site data
because local lesson drafts and the IndexedDB library are stored there.

## Verification

1. Open an isolated skull. Enable Studio lighting and Dynamic Shadows **On**.
   Orbit and zoom: shadows should appear in skull foramina, under nasal and
   zygomatic projections, and between adjacent surfaces.
2. Compare Off versus On from the same camera angle; verify a visible change.
3. Enable skeleton + muscles and verify shadows at muscle/bone boundaries.
4. Check the heart and vessels, including transparent chamber reference volumes.
5. In student view, switch chapters and show/hide anatomy: shadow maps should
   update after new meshes load, with no extra model downloads.
6. On a budget Chromebook, choose Fast + Auto to disable the extra depth pass.
   Force On only if your device sustains comfortable interaction.

**Limitations:** This is a performance-sensitive GPU effect. A large muscle
scene can temporarily require an additional depth pass for visible objects.
Directional shadow maps have finite resolution: tiny vessels may not cast
noticeable crisp shadows at wide views, and some glTF source meshes can exhibit
shadow acne or edge artifacts. Real Chromebook/WebGL rendering has not yet
been visually verified, so consider this build beta.

## Regression tests

- `npm test`: 110 JavaScript tests passed, including new shadow modes,
  caster/receiver filters, camera-following frustum, and device-only persistence.
- `python -m pytest tests -q`: 15 Python tests passed.
