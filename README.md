# Anatomy Studio — Skull & Skeleton (Chromebook PWA beta 0.2)

An installable Progressive Web App for ChromeOS/Chromebooks. Includes a searchable, rotatable 3D skull and skeleton with individual selectable bones. No accounts, student information collection, or backend required.

## Publish using GitHub Pages

1. Extract `Anatomy-Studio-Chromebook-PWA.zip` on your computer.
2. Make a public GitHub repository (for example `anatomy-studio`).
3. Upload **the files and folders inside** the extracted `anatomy-pwa` directory to the **root** of the repository: `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, `icons/`, `models/`, and `README.md`.
4. In GitHub, go to **Settings → Pages → Build and deployment → Deploy from a branch**. Select `main` and `/ (root)`, then Save.
5. Open the GitHub Pages address (usually `https://USERNAME.github.io/anatomy-studio/`) in **Chrome on a Chromebook**.
6. In Chrome, click the install icon in the address bar or use Chrome's **⋮ menu → Cast, save, and share → Install page as app**. Chrome menu wording may vary. A district-managed Chromebook might have installation blocked by its administrator; the website still works in a normal tab.
7. **Prepare for offline use while connected to Wi-Fi:** allow the anatomical model to load, then look for **✓ Offline ready** at the top. If it says **Retry offline save**, click that button while online. Test by disconnecting from Wi-Fi and reopening the app. Chrome storage cleanup or clearing site data will remove the cache.

**Important:** This ZIP contains the complete website/PWA source code, manifest, service worker, and icons, but not the 13.7 MB third-party anatomy model or Three.js JavaScript modules. The first online launch downloads the Three.js runtime from `cdn.jsdelivr.net` and the model from jsDelivr or the upstream GitHub Pages mirror, and the service worker then caches them for offline use. ChromeOS school network restrictions may block one or more of those domains. Offline operation is available only after the app confirms **Offline ready**; the model is not bundled in the ZIP.

For self-hosted geometry, download `ecorche.glb` from <https://github.com/Charleeh/ecorche/tree/main/model> and put it in `models/ecorche.glb` before uploading. To avoid all dependence on external CDNs, vendor the Three.js ES modules and adjust the import map in `index.html` accordingly.

## Controls

- **Rotate:** drag with mouse, touchpad, or finger.
- **Zoom:** mouse wheel, two-finger pinch, or +/− viewer controls.
- **Pan:** right-drag or use two-finger gesture (depending on device settings).
- **Identify a bone:** click it in 3D or select it from the searchable bone list.
- **Inspect anatomy:** Focus, Isolate, Hide, Restore.
- **Skull / Full skeleton:** switch at the top. Front, Back, Left, and Right camera presets are available.
- **Smaller Chromebook windows/tablet mode:** use ☰ to open the bone explorer and ⓘ for bone details.

## Known limitations

- This is a beta prototype built around an open anatomical model, **not a validated medical atlas**. Some fine features are simplified and structure text is introductory. It depicts one adult skeleton.
- The application requires an up-to-date Chrome browser with WebGL. Older Chromebooks may render slowly.
- Chrome may not offer installation if the PWA is opened from a local `file://` URL. Serve the files on HTTPS, such as GitHub Pages.
- The external model source and library imports have not been run end-to-end on an actual Chromebook in this environment. Test the app online and offline on a school-managed device before student rollout.

## Attribution and licenses

3D geometry: **Écorché**, <https://github.com/Charleeh/ecorche>, **CC BY-SA 4.0**. Based on **BodyParts3D** (Database Center for Life Science, CC BY 4.0) and **Z-Anatomy** by Gauthier Kervyn (CC BY-SA 4.0). If you change and redistribute the geometry, follow the share-alike requirements. Model source, license, and credits are also linked inside the app.

Three.js renderer: <https://threejs.org/>, MIT license.
