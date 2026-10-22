# Anatomy Studio 0.8 — App Settings and self-hosting

This is an update of the **0.7 Chromebook PWA**. It retains the same lesson and student-link format, Chrome IndexedDB Scene Library and teacher menu bar.

## New: Settings menu

Select **Settings → App Settings** to see:

- Installed app version **0.8.0** and the published version reported by your own GitHub Pages `version.json`.
- **Check for updates**, which reads `version.json` on the **same website** using a cache-busting request. No external API, database, or GitHub login is needed.
- **Reload to update** when a newer version is detected. The service worker network-first strategy allows new app files to be fetched while keeping offline fallbacks.
- The actual source of the 3D renderer and 3D anatomy model, and **Check local files** to confirm local runtime assets are uploaded.

The app **does not** check whether a GitHub commit exists or whether a ZIP is available: it only compares its installed version against the `version.json` deployed at the same GitHub Pages site. Keep `version.json` updated whenever deploying a new version. GitHub Pages propagation/browser caches can cause a delay. The user must reload explicitly to activate an update.

## Fully self-hosting the runtime (recommended)

This ZIP contains **all original first-party PWA source files**, icons, and self-host preparation scripts. **It does not contain the large third-party Three.js runtime and Écorché GLB** because the build environment could not retrieve these binary dependencies. Uploading only this ZIP will continue to work **using the previous external fallback**; it is *not* yet fully self-hosted.

To remove the external runtime dependencies:

1. Unzip the archive on your Internet-connected Mac.
2. Open Terminal, change into the unzipped **`anatomy-pwa-studio`** folder, and run:

   ```bash
   bash tools/download-self-hosted-assets.sh
   ```

3. The script downloads a pinned **Three.js 0.169.0** npm release into `vendor/three/` including the required addon modules and their static imports, downloads **Écorché** into `models/ecorche.glb`, and saves its attribution notices and `ASSET_SHA256.txt`.
4. Upload the **entire contents** of `anatomy-pwa-studio/` to the GitHub Pages repository root, replacing existing files and **adding** the new `vendor/three/` and `models/` directories. Keep `version.json` and `sw.js` in the root.
5. Open the deployed site in Chrome and choose **Settings → App Settings → Check local files**. The target is **4/4 present**, with renderer and model displaying **Locally hosted**. Test a new Chromebook/device online, then enable offline access and test again without a connection.

The downloader **rewrites the import map in `index.html`** to point to locally served Three.js files. This is more reliable across school-managed Chrome versions than a dynamic import map. The model loader checks for `models/ecorche.glb` and prefers it. The ZIP starts with the previous renderer CDN mappings so it keeps working until the downloader runs. After that, the local renderer files are required; if they are missing from your upload, the renderer will not load. The model retains its original CDN/mirror fallback if its local file is missing. Once both are installed, runtime traffic for the model and rendering libraries stays on your GitHub Pages origin. Attribution links in the UI remain external informational links, but aren't needed to run the app.

Files hosted on GitHub Pages are still delivered by **GitHub's infrastructure** and rely on its domain/TLS/certificates, ChromeOS security policies, browser WebGL support, and network access for a first-time user. For long-term independence, keep a local backup of the repo and model plus exports of the Chrome Scene Library. GitHub Pages has a ~1 GB published-site limit; the needed model and renderer files should fit comfortably.

## Files changed/added in 0.8

Changed: `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, `README.md`, `models/README.txt`.

New: `version.json`, `tools/download-self-hosted-assets.sh`, `tools/vendor-three.py`, `vendor/three/README.md` and dependency documentation. Keep all 0.7 files: `scene-codec.js`, `scene-history.js`, `library-store.js`, `icons/`. The old 0.7 scene format and local IndexedDB database are unchanged.

**Do not clear Chrome site data** as an update workaround: that can erase local saved scenes. Before major Chromebook resets, use **Library → Back up entire library** and save that JSON backup independently.

## Dependencies and provenance

| Dependency | Function | Pinned local path | License |
|---|---|---|---|
| Three.js 0.169.0 | WebGL rendering and math | `vendor/three/build/three.module.js` | MIT |
| OrbitControls & GLTFLoader | Orbit camera and GLB loading | `vendor/three/examples/jsm/` | MIT (Three.js addons) |
| Écorché model | 3D skeleton, muscles and skull meshes | `models/ecorche.glb` | CC BY-SA 4.0, attribution |
| Browser/PWA APIs | IndexedDB, Cache Storage, Service Workers, WebGL | Provided by ChromeOS browser | Browser features, no npm runtime |
| GitHub Pages | Static hosting, HTTPS and distribution | Your repository | External hosting infrastructure |

First-party JavaScript files use native ES modules; `package.json` is only for Node's local tests and **does not require a build server** or runtime npm install. No remote fonts, analytics, server-side API, or database are required for normal operation once assets are hosted locally.

To run the tests (Node 20+): `node --test tests/*.test.mjs`.

**Caveats:** A scene's URL link can be very long, and local saved scenes still do not sync between Chromebooks. The app's teacher/student split is presentation-only, not authenticated permissions. The model is for education and not clinical use. The reference Écorché model represents one adult male and does not include internal organs or detailed foramina.
