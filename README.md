# Anatomy Studio 0.9 — Schoology Embed & Student Publishing Controls

This update extends 0.8 (Chromebook PWA) and retains all existing skull/skeleton, paint, annotations, chapters, student links, teacher menus, local Scene Library, update checks, and optional self-hosting support.

## Publishing study scenes and practical questions

1. Open a saved lesson in **Teacher Studio**; adjust its chapters, bones, colors, camera, and custom labels.
2. Select **File → Share student link…**.
3. Select **Study Mode**, **Practical Exam**, or **Custom permissions**. The options apply to every chapter of that published link:
   - **Search**: show search and allow finding bones by anatomical names.
   - **Structure explorer**: show a collapsible hierarchy of Bones/Teeth/Cartilage and Left/Right/Midline, with a bone list.
   - **Identify by clicking**: allow clicking a bone to reveal its name/description in the details panel. When disabled, bone picking is ignored in the 3D canvas; if the list is available, it uses anonymous structure numbers.
   - **Teacher annotations**: include the chapter's labels and its original Show / Click to reveal / Hide policy. Disabling this option hides all labels on the student view, regardless of chapter settings.
   - **Hide and isolate bones**: let students alter bone visibility in the published view. Disabled for practical questions.
4. Click **Generate student links & embed code**. The dialog provides a direct link, an embed-optimized link (`?embed=1#scene=…`), and optional iframe HTML, with copy and preview controls.
5. These controls **do not change the saved scene's anatomy**. Each new published link contains its own settings, so you can publish study and practical versions of the same lesson.

**Study Mode** enables all five controls; **Practical Exam** disables all five. A custom mode can enable only selected controls. You can use teacher-created labels such as `A`, `B`, `C` in practical scenes by enabling Teacher annotations and setting the chapter label mode to Show. Avoid including answers in labels if you intend students to see them.

## Embedding in Schoology

### Recommended: Schoology's built-in external link iframe

1. In your course, choose **Add Materials → Add File/Link/External Tool → Link**.
2. Paste the **Schoology embedded viewer link** produced by Anatomy Studio.
3. Choose **Display in Schoology** rather than opening the link in a new window, if available for your course.
4. Publish, then check the link as a **student** on a school-managed Chromebook.

This uses Schoology's supported external-link display, which opens an external website in an iframe. Not every district permits all embeds and some configurations open in a new tab instead. If the embedded version fails, use the direct student link.

### Optional: HTML iframe

The generated HTML uses the embedded viewer link in an iframe with `width:100%`, `height:640px`, and no border. If the district's Schoology Page HTML editor accepts iframes, you may paste it there. **Schoology does not support script embed codes and may sanitize pasted HTML**. The built-in external Link method is preferred.

Embedding requires the hosted site's response headers to allow framing. Schoology and your browser/security policies may also restrict the iframe. Test after publishing.

## Important for practical exams

Anatomy Studio uses **client-side presentation permissions, not authenticated security**. Someone who can use browser developer tools, inspect the downloaded GLB model, or decode the URL may recover anatomical names or reveal hidden controls. It is useful for identification practice and instructor-controlled *presentation*, but it is **not a secure, locked-down exam engine**. For graded secure assessments, use Schoology's assessment controls and school testing policies; never depend solely on Anatomy Studio to conceal answers.

Long scene links may run into Schoology link length limits. If a long link is rejected, shorten lesson content/chapters or use a hosted scene library with short IDs in a future release.

## Updating an existing GitHub Pages repository

Replace these root files with the v0.9 versions: `index.html`, `app.js`, `styles.css`, `scene-codec.js`, `sw.js`, `manifest.webmanifest`, `version.json`, `library-store.js`, `scene-history.js`. Existing `icons/`, `models/`, `vendor/three/`, and `tools/` can stay, but do not delete your previously downloaded local Three.js and `ecorche.glb` assets. **If you previously changed your `index.html` import map to local vendor files, preserve those paths**. The ZIP retains the original CDN fallback import map to avoid breaking fresh deployments; re-run `bash tools/download-self-hosted-assets.sh` after extracting the new project on your Mac, or restore your local import map manually before uploading.

Back up your Scene Library via **Library → Back up entire library** before major upgrades and school-managed Chromebook resets. The local IndexedDB scene library is **not uploaded to GitHub** and is not synced across profiles. Do **not clear site data** to force an update.

Run automated tests with `npm test` (Node 20+). Browser rendering and Schoology iframe support still require checking on your school's actual devices.

## Self-hosting and licenses

The included ZIP does **not** embed the third-party renderer or GLB. Run `bash tools/download-self-hosted-assets.sh` on an internet-connected Mac to download them into `vendor/three/` and `models/ecorche.glb`. Then upload those folders to GitHub Pages. The 3D viewer's first run otherwise relies on a Three.js CDN and the original anatomy-model provider. Three.js is MIT licensed; Écorché credits and CC BY-SA 4.0 attribution apply to the model. See `tools/` and the application's Model Credits for attribution.
