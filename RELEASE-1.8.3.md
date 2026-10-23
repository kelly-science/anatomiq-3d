# Anatomy Studio 1.8.3 — Vascular Completeness & Classroom Review

**Teacher-first, Chromebook/iPad PWA · GitHub Pages · No new mandatory anatomy downloads**

## Changes

- **Vascular Completeness Inspector:** Open **Cardiovascular → Vascular completeness inspector (teacher only)**. Filter to needs-attention targets, paired structures, previously reviewed targets, or the whole class list. Click **Inspect in 3D** to temporarily show only the meshes associated with that requirement, while retaining other visible body systems as reference. **Restore full view** returns the original camera and visibility. The preview does *not* modify the lesson's hidden structures or student scene.
- **Teacher verification notes:** Mark a vessel **Verified / Incomplete / Incorrect** and enter your observations. They are kept in this browser profile's `localStorage`, independently of the Scene Library and student links. **Export review JSON** to back up/share the results. A new model manifest automatically invalidates an old verification whose matched FJ identifiers changed while preserving its note.
- **More honest coverage:** Wrist branches no longer count as a complete radial/ulnar arterial trunk. Missing contralateral vessels and principal hepatic/vertebral/jugular/lumbar vein components are flagged for inspection. Matches *do not* mean geometry is continuous or clinically accurate.
- **Label-only exceptions:** Chordae tendineae, right auricle and left auricle stay in the checklist for labels but are excluded from the geometry review backlog; no false meshes are added.
- **Grouped teacher explorer:** Enable **Only show class-core names** to group repeated meshes with identical anatomical names, while keeping each source FJ identifier selectable and all saved structure indices intact.
- **Nonvascular cleanup:** A handful of mistakenly included nerve meshes are identified as nonvascular source anatomy and omitted from cardiovascular study presets, but kept in the source atlas for backward compatibility.
- **Targeted Mac installer:** It checks BodyParts3D 4.3 for a short list of **missing principal vessel segments** (right radial/ulnar trunks, missing jugular/vertebral counterparts, and main hepatic/lumbar veins). It only downloads actual matched meshes. It generates a separate `cardiovascular-gap-selection.json` report with the available and unavailable targets. **It cannot fabricate missing vessel continuations.**

## Safest deployment: app-only update first

1. In the current Anatomy Studio, **Library → Export entire library** as a backup. Do *not* clear browser site data.
2. Copy the updated app files from this package into the directory served by GitHub Pages. **Add `cardio-vascular-audit.js`**. Replace `app.js`, `cardio-presentation.js`, `cardiovascular-model.js`, `index.html`, `styles.css`, `sw.js`, `version.json`, `manifest.webmanifest`. Include the two new/updated installer scripts under `tools/` on the Mac.
3. **Keep all existing `models/`, `vendor/three/`, `.cardiovascular-43-work/`, `.digestive-43-work/` and the existing Python environment.** The package intentionally excludes third-party GLB binaries and the Three.js distribution.
4. Confirm `https://<your GitHub Pages site>/version.json` says `1.8.3`, then reopen the PWA online. Avoid clearing site data because locally saved scenes and verification notes aren't automatically synced to GitHub.
5. Enable Cardiovascular, open the Inspector, use **Inspect in 3D**, then **Restore full view**. Confirm your old chapters, colors, and published student links remain correct.

## Optional: add any available missing principal vessels

Run from your **existing merged project folder** (not a fresh folder lacking your model assets):

```bash
bash tools/install-cardiovascular-43.sh
```

This preserves the existing 298-mesh order via `--prior-manifest` and only appends provider meshes if they exist in the pinned catalog. Check the terminal output and `models/cardiovascular-gap-selection.json` before claiming a vessel is fixed. Upload:

```
models/cardiovascular-standard.glb
models/cardiovascular-detailed.glb
models/cardiovascular-structures.json
models/cardiovascular-class-core-coverage.json
models/cardiovascular-gap-selection.json
models/licenses/CARDIOVASCULAR-43-ATTRIBUTION.txt
ASSET_SHA256.txt
```

Upload GLBs **individually** if the GitHub website rejects a batch. Do not upload `.cardiovascular-43-work/` or `.digestive-43-work/`. The downloader must run on your Mac with internet access; the classroom PWA remains self-hosted.

## Verification and limits

- **86 JavaScript tests and 9 Python tests passed.** The missing-vessel selector is tested using a synthetic BodyParts3D manifest. Browser rendering and final expanded anatomy alignment still need a live Chromebook/iPad check.
- This release **does not create a fully connected vascular tree**, improve chordae/auricle geometry, or guarantee bilateral completeness just because a structure has a name match. It improves review and targeted selection only.
- Teacher audit notes remain device-local. Export review JSON to keep them; this release intentionally does not import reviews (to prevent accidental overwrites from another class/device).
- Existing scene URL formats, bone/material indexing, student permissions and lesson library storage remain unchanged. Published links are not rewritten.
