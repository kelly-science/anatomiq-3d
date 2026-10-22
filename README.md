# Anatomy Studio 0.5 — Chromebook PWA with per-bone coloring and multi-chapter lessons

One interactive anatomical lesson can contain **multiple chapters**, each saving its own structure visibility, **bone colors**, camera orientation, labels, and student permissions. Publish **one link** for the entire lesson. Students use chapter tabs or Previous/Next to move through it. The app remains a GitHub Pages PWA; **no database, login, or backend is required**.

## New in version 0.5: Paint bones

Teacher Studio now includes a **BONE PAINT** panel in the right Structure Details sidebar, above Custom Labels. This paints the **entire individually modeled bone**, not freehand patches on its surface.

1. Choose a preset color or use the color picker.
2. Click **Paint mode — click bones**. Click one or more visible bones in the 3D viewer to assign that color; painting does not hide bones. Press **Esc** or click the button again to stop painting.
3. Alternatively, select a bone normally and choose **Color selected** to recolor it.
4. **Erase selected** restores the selected bone’s original model material. **Reset all chapter colors** clears all custom bone colors for the active chapter (with confirmation).
5. Different chapters can have entirely different colors. **Add Chapter** carries forward the colors as a starting point and **Duplicate Chapter** preserves them too; future edits stay chapter-specific.
6. **Save draft**, **Export editable JSON**, and **Share student link** all include the colors. Students see the painted bones, but cannot change the published colors through Student View.

Older version 0.3 and 0.4 scene links and JSON projects without bone colors still open normally. Existing student links do not automatically update when you repaint a lesson; create a new link.

## Updating from Anatomy Studio 0.4

Extract the ZIP, then upload the **contents** of the `anatomy-pwa-studio` directory directly into the **root** of the existing GitHub repository. Replace files of the same name:

- `index.html`
- `app.js`
- `styles.css`
- `scene-codec.js`
- `sw.js` (version bumped to 0.5 to refresh the PWA cache)
- `manifest.webmanifest`

The included `icons/` assets are unchanged; you can keep existing copies or upload them again. Keep an existing `models/ecorche.glb` if you host your own copy. The ZIP does **not** include the large model file. The `README.md`, `tests/`, and `package.json` are documentation/development aids.

Wait for GitHub Pages to deploy, then reload Chrome or fully close and reopen the installed PWA. The service worker should switch from the 0.3 cache to the 0.4 cache. If an older version persists, reload the website online; clearing site storage also deletes **locally saved lesson drafts**, so export a JSON backup before doing that.

## Example: two chapters for skull anatomy

1. Open the main website without a `#scene=...` fragment (Teacher Studio).
2. **Lesson title:** `Skull Anatomy and Landmarks`.
3. **Chapter 1 title:** `Skull: Exterior`. Hide unwanted structures, rotate to the desired view, and add exterior labels.
4. Click **＋ Add chapter**. This carries over the current visibility and camera but starts with **no labels**, so you can prepare the interior without clearing old labels. Or select **⧉ Duplicate** to carry over the labels as well.
5. Name the second chapter `Skull: Interior`. Hide individual cranial bones to reveal the interior, orient the camera, and add interior labels. A chapter can use a different student label-display setting.
6. Switch between the chapters in the **Lesson Chapters** sidebar or tabs above the 3D viewer. Changes stay with their own chapter.
7. Use ↑/↓ next to a chapter to reorder it, and × to delete an unneeded chapter. The chapter name is edited using the **Current chapter title** field when that chapter is active.
8. Click **Share student link**. The generated URL includes **all chapters** and opens in read-only Student View. The student can use chapter tabs or the ‹ › arrows to navigate.
9. Use **Open student preview** to test the link before sending it via Google Classroom.

**Model limitation:** The current model supports hiding individual bones, rotating, and viewing exposed surfaces. It does **not** yet provide an anatomical slice plane, cutaway geometry, or detailed internal bone structures beyond what is present in the original GLB. Chapter switching does not fabricate additional anatomy.

## What is stored per chapter

- Chapter title
- Per-bone color overrides (sparse list stored by stable structure index)
- Skull versus full skeleton
- Hidden/visible skeletal structures, teeth and cartilage switches
- Camera position and orbit target
- Custom point-anchored labels and their callout positions
- Show / click-to-reveal / hide-label setting
- Whether students can hide or isolate bones

The **lesson title** and **chapter order** belong to the whole project. A chapter retains its edits when you switch away from it.

## Drafts, backward compatibility, and sharing

- Teacher drafts save in browser `localStorage` on the device. **Export editable JSON** backs up **all chapters**; **Import JSON project** restores them. A 0.3 single-scene JSON draft is automatically treated as a one-chapter lesson. Older 0.4 multi-chapter lessons import with original bone colors.
- Existing **0.3 and 0.4 `#scene=` student links remain supported**; the older v1 data loads as a one-chapter lesson. The old v1 local draft is migrated on first open if no 0.4 draft exists.
- A published link is an immutable snapshot; saving changes to your teacher draft **does not** change the already-shared link. Publish a new link after edits.
- The student viewer is *read-only for published scene editing* but not an authentication system. Anyone can visit the base URL and make their own local studio draft. Links are public: do not put confidential student information into labels.
- Up to **12 chapters** per lesson and 64 labels per chapter (240 total across chapters). The scene URL length is capped and warned about above 2,000 characters. Lots of labels and chapters can create links too long for some learning management systems. There is no short-link server in this option.
- Chrome site storage can be cleared by school management. Export JSON backups for important teacher lessons. Student links do not depend on the teacher device's local storage.
- Shared scenes are tied to the specific model's structure names/order. If the upstream anatomy model changes, the app refuses to load a mismatched scene rather than applying visibility to the wrong bones. Host `models/ecorche.glb` inside your repository to pin the model.

## Hosting, installing, and offline use

1. In GitHub Pages, enable **Settings → Pages → Deploy from branch** (`main`, `/ (root)`). The site should resolve as `https://YOURUSERNAME.github.io/YOURREPO/`.
2. The first visit needs internet access to load Three.js and the GLB model. The app looks for `models/ecorche.glb` locally, and otherwise tries the Écorché model hosted on jsDelivr or the project's GitHub Pages mirror. For school reliability, download the 3D model from <https://github.com/Charleeh/ecorche/tree/main/model> and add it at `models/ecorche.glb`.
3. On a Chromebook open the published site in Chrome and choose **Install app** when available. Managed school devices may disable installation or external model hosts.
4. Once online, wait for **✓ Offline ready**. This caches the shell, libraries, and model. Test offline operation on the same Chromebook. The link contains scene data, **not** the actual 3D geometry.

## Validation and credits

Run `npm test` (or `node --test`) to verify v1/v2 scene encoding, decoding, model fingerprints, per-chapter visibility, camera data, legacy links, and size/error validation. JavaScript syntax and generated HTML element references were checked. This update has **not** been verified end-to-end with the live 3D model on a school Chromebook, so test the scene editor and published link there before assigning to a class.

3D geometry: [Écorché by Charleeh](https://github.com/Charleeh/ecorche), based on BodyParts3D and Z-Anatomy, CC BY-SA 4.0. Preserve proper attribution and associated terms. Renderer: [Three.js](https://threejs.org/) (MIT). Educational visualization, not a clinical reference.
