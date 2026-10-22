# Anatomy Studio 1.0 — Skeletal + Muscular Systems

Installable Chromebook PWA hosted on GitHub Pages. This release extends the existing 0.9 teacher editor and student publishing system, rather than starting over.

## New in 1.0

- **Skull**: the original individual cranial and facial bones.
- **Skeleton**: original full-skeleton view.
- **Muscular**: selectable, searchable, paintable and labelable deep and superficial muscles, based on the same Écorché GLB already used in 0.9.
- **Combined**: skeletal structures and muscle layers in the same 3D view. The left sidebar's **Anatomical Systems** panel controls bones, superficial muscles, and deep muscles independently. Deep muscles default to OFF so they can be exposed by hiding the superficial layer.
- Each chapter saves its own view mode, 3D camera, visibility, paint, labels and layer settings; share links and Schoology practical permissions still work.
- **Legacy scenes**: 0.3–0.9 skeletal scenes/links still load against the unchanged model. Teacher-opened older chapters are migrated into the expanded indexing format before they are resaved. **Back up your local library** before making major changes, and keep a copy of the old 0.9 code for rollback.

The source GLB has 198 bones, 42 cartilage meshes, 28 teeth, two eyes, 159 deep and 203 superficial muscle meshes, with named structure metadata. Eye meshes are deliberately not included in the selectable structure list.

## Installer hotfix (Three.js dependency scan)

The original `tools/vendor-three.py` mistakenly treated an example URL in a
`GLTFLoader.js` comment as a third-party package and stopped with
`Unexpected external package: https://my-cnd-server.com/...`. The included
fixed scanner checks actual ES module import statements instead.

If the self-hosting command previously failed, just run
`bash tools/download-self-hosted-assets.sh` again from this project folder.
It is safe to rerun; the downloader overwrites the generated asset copies,
then writes the local import map and SHA-256 manifest on success.

## GitHub Pages installation / upgrade

1. **Back up your local scenes now**: open the current app on your Chromebook and choose **Library → Back up entire library**. Browser-local data may be lost after Chrome site-data clearing or school device resets.
2. Extract the release ZIP. Open `anatomy-pwa-studio/`.
3. Upload/replace its **contents**, not the outer folder, in the root of your existing GitHub Pages repository. The complete application files in the ZIP are designed to be deployed together. The added runtime module is **`structure-layout.js`**. To avoid an older service worker serving stale files, replace `sw.js`, `version.json`, `index.html`, `app.js`, `scene-codec.js`, and `styles.css` together.
4. **Keep your locally hosted `models/ecorche.glb`, `vendor/three/` and model credit/license files in the repository**. These large binary assets are **not included** in this ZIP. The new muscular viewer uses the very same GLB; no additional model download is needed if 0.9 was already self-hosted.
5. If you have *not* yet self-hosted them, on a Mac with internet access run `bash tools/download-self-hosted-assets.sh` from this extracted folder and then upload the generated `models/`, `vendor/` and `ASSET_SHA256.txt` to GitHub. That script also switches `index.html` to your own locally hosted Three.js import map. If you already self-host Three.js, ensure the replacement `index.html` points back to the local paths, or rerun the downloader before upload.
6. Open the deployed site in Chrome (online on first visit), verify the **STUDIO 1.0** label and visit **Settings → App Settings → Check local files**. Avoid clearing site data to force an update, as this will erase locally saved scenes.

## Suggested classroom walkthrough

1. Click **Muscular**. The superficial muscle layer appears by default. Toggle **Deep muscles** on or **Superficial muscles** off to examine deep structures.
2. Search **deltoid**, select its structure, **Focus**, paint it or place a custom label.
3. Click **Combined** and leave **Skeletal system** on; hide the superficial muscles to view deep muscle relationships to bones.
4. Use **Add Chapter** for a second view. Each chapter remembers its own system settings.
5. Save the scene via **File → Save to Library**, then **File → Share Student Link**. Student pages use the teacher-selected layers and obey Study/Practical Exam naming/search permissions. They cannot edit muscle layers through the teacher controls.

## Reliability and licensing

- Same model source: [Écorché](https://github.com/Charleeh/ecorche), CC BY-SA 4.0. Geometry derived from BodyParts3D and Z-Anatomy. Read source `ATTRIBUTION.md` / `LICENSE.md`, and keep these credits with your hosted assets.
- Three.js is pinned to 0.169.0 under the MIT license. To fully self-host, use the downloader and upload its files rather than relying on CDN fallbacks.
- GitHub Pages serves a static site, no database or account. Student scene data is encoded in their URL; the teacher Scene Library uses browser-local IndexedDB.
- The model includes bones, teeth, cartilage and muscles but **not** organs, nerves, vessels or a skin layer.
- Muscle geometry belongs to one adult male specimen with fixed pose. Use for gross anatomy classroom demonstrations, not clinical interpretation.
- The offline service worker must cache the full model and renderer. Use the built-in **Save offline** control and confirm readiness before working without Wi-Fi.

## Validation

Run `npm test` (Node 20+) or `node --test tests/*.test.mjs` to check chapter serialization, new system layer settings, older scene compatibility, library backups, publisher permissions, and update metadata. These are automated logic tests. **An end-to-end Chromebook rendering test with the real GLB and Schoology is still necessary.**
