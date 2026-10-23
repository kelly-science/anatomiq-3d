# Anatomy Studio 1.8.4 — Scene-aware student loading

**Focus:** faster student loading on Chromebooks and within Schoology embeds. No new anatomy assets and no changes to the published scene JSON schema.

## Loading behavior

- The student URL is decoded and validated **before** any model downloads.
- The shared Écorché skeleton/muscle GLB remains necessary at launch for the original anatomical coordinate frame and stable structure indices. It is not yet split into smaller skeletal versus muscular files.
- Cardiovascular, BodyParts3D 4.3 digestive, and legacy digestive GLBs download **only when the opening chapter uses that layer**. Their small structure manifests may be fetched immediately to preserve the structure-index map and keep existing labels and paint accurate.
- When a later chapter needs an additional system, it loads then, with a loading status. Once loaded, the model stays in memory for subsequent chapters.
- Students granted exploration permissions can turn on other systems; those systems download when enabled.
- **Save lesson offline** explicitly caches the anatomy files needed by *all chapters in the published lesson*. This can download more files than the first chapter and is not run automatically on student launch. If students plan to explore extra systems, they must enable and save those assets before disconnecting.
- Teacher Studio continues to preload available systems (its previous behavior) for smooth unrestricted editing.

## Replacing files on GitHub

Replace the existing application files using the complete ZIP and **add `scene-assets.js`**. At minimum update: `app.js`, `scene-assets.js`, `sw.js`, `index.html`, `version.json`, and `manifest.webmanifest`. Preserve `models/`, `vendor/three/`, existing data JSON, licenses, and your saved browser library. Do **not** clear Chrome site data; this can erase IndexedDB scene drafts and locally saved lessons.

There are no new GLBs to download or convert. Your generated cardiovascular and digestive assets stay untouched. The service worker version becomes `anatomy-v1.8.4`.

## Classroom verification

1. Publish a skull-only scene. Open the student link in a new Chrome profile or incognito window online. Chrome DevTools → Network → filter `glb`. Expected: `ecorche.glb` and **no cardiovascular/digestive GLB** on the normal path. Metadata JSON requests are expected.
2. Publish a two-chapter scene: Chapter 1 skull, Chapter 2 cardiovascular. With cache disabled in Network, open Chapter 1: no cardiovascular GLB. Switch to Chapter 2: it should fetch exactly the chosen cardiovascular GLB and render it with saved colors/labels.
3. Return to Chapter 1 and then Chapter 2: cardiovascular GLB should not be downloaded/parsed again while the page is open.
4. Open an older published link and verify original labels and visibility. In unusual cases where a legacy atlas does not match the metadata-only catalog, the viewer deliberately falls back to loading the full existing model set to avoid misanchoring labels.
5. Click **Save lesson offline** while online, allow it to finish, then disconnect Wi-Fi and test each chapter.
6. In Schoology, open an embedded practical, verify its search and bone-name restrictions remain enforced.

## Limitations

- Existing fully-loaded Teacher Studio is intentionally unchanged in this release.
- The base Écorché GLB is always loaded, even for cardiovascular-only scenes; a future release can split that dependency once old index compatibility is migrated.
- `models/anatomy-organs.glb` is retained only for older lessons and should no longer load for newer digestive chapters that use BodyParts3D 4.3.
- The legacy three-organ placeholder catalog assumes the original 1.2 source mesh IDs. If a customized legacy GLB differs, the viewer loads full anatomy and checks the fingerprint before displaying a lesson, rather than guessing the correct labels.
- All JavaScript tests validate scene selection, metadata ordering and integration wiring. This release has not yet been benchmarked in a physical classroom Chromebook or Schoology installation.
