# Anatomy Studio 0.3 — Chromebook PWA with teacher scenes and student links

**What is new:** A teacher-facing editor can customize the skull or skeleton, hide individual bones, add point-anchored custom labels, set the start camera, and generate a URL that reproduces the scene in a read-only student viewer. This uses **Option A**: the scene configuration is compressed into the URL fragment, and there is **no database, login, or backend**. The same underlying 3D anatomical model is used by all scenes.

## Publish the website on GitHub Pages

1. Extract `Anatomy-Studio-Scene-Sharing-Chromebook-PWA.zip`.
2. Upload the contents of the included `anatomy-pwa-studio` folder (not the enclosing folder) to the **root** of a public GitHub repository. The repository should contain `index.html`, `app.js`, `scene-codec.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, `icons/`, and `models/`.
3. In the repository go to **Settings > Pages > Build and deployment > Deploy from a branch**. Select `main`, `/ (root)`, and Save.
4. Open `https://YOURUSERNAME.github.io/YOURREPO/` in Chrome on the Chromebook, then allow the model to load. The first visit requires internet access.
5. Optional: use Chrome's **Install page as app** option. School-managed Chromebooks may restrict PWA installation, but the URL can still work in Chrome if the school allows the required websites and WebGL.

**Important model dependency:** The ZIP includes application source and icons, **not** the ~13.7 MB third-party 3D geometry. When `models/ecorche.glb` is absent, the app attempts to load it from jsDelivr and the Écorché GitHub Pages mirror. For the most reliable classroom deployment and to avoid unexpected upstream changes to shared links, download the original `ecorche.glb` file from <https://github.com/Charleeh/ecorche/tree/main/model> and place it at `models/ecorche.glb` **before** publishing. Leave the file name unchanged. The app also imports Three.js from jsDelivr on first load; blocked school networks can prevent the viewer from opening, even if the site is hosted by GitHub Pages.

## Teacher: create a skull study scene

1. Open the **base website address** (without `#scene=...`). This is Studio mode.
2. Switch to **Skull** in the top bar. This hides the other bones of the skeleton; the full model is still available in Studio.
3. Select any individual bone in the structure explorer or the 3D model. Use **Hide structure** or **Isolate structure** to customize the view. Change the camera with drag, zoom and presets.
4. In the Teacher Studio panel, enter a scene title such as `Skull: Cranial Bones`.
5. Under **Custom labels** at right, type `Frontal bone` or `Coronal suture` and click **Place label on bone**. Click the relevant location **on the 3D model**. Its label is anchored to the 3D surface and tracks the structure as the skull rotates. Drag the callout to adjust its screen-space offset.
6. Repeat as needed. Modify label text or remove a label with the list in the right panel. Labels are saved on the teacher device as you work.
7. Choose whether students see labels, click numbered labels to reveal them, or don't see any labels. Optional: allow students to change bone visibility while viewing. By default students can rotate and inspect, but cannot alter the published visibility configuration.
8. Click **Share student link** in the top right. Click **Copy link**, then paste into Google Classroom or another LMS. Click **Open student preview** to verify the scene yourself.

## Student viewer

Opening a URL ending in `#scene=...` shows **Student View**, not the editor. The shared title, visible bones, labels and camera orientation are restored. Students can rotate, zoom, use view presets, identify visible structures, and interact with numbered label reveals if enabled. Hidden teacher controls do not appear in the student UI. The saved scene is not modified by student interactions.

**Not access control:** Anyone can open the base site (without the scene fragment) and make their own local editable draft. There is no teacher authentication. The shared link is an immutable snapshot of the scene, not a private or centrally editable class assignment. Updates to the teacher's draft do **not** change links already shared; publish and post a new link when necessary.

## Drafts, portability and link size

- The teacher draft is automatically saved to this browser's `localStorage` as well as by the **Save draft** button. Clearing Chrome site data, changing devices, or using a different Chromebook removes access to this **local** draft (it does not invalidate already-shared student links).
- Use **Export editable JSON** to keep a backup or move projects between devices. **Import JSON project** reconstructs it on another installation that uses the identical anatomy model.
- A share URL contains compressed scene data, including annotations. It may be several hundred or a few thousand characters long. The app warns when it is above 2,000 characters. Test large links by pasting them into Google Classroom and opening them from a student's account. If a platform truncates a URL, you will need a different sharing method (e.g. a static scene JSON file or backend short links); Option A cannot generate short permanent IDs.
- Labels are rendered using their coordinates relative to the target bone. The viewport offset of each callout is stored in pixels; on very differently sized screens, students may need to adjust their view.
- Scene links are checked against the number and identity/order of model structures. If a newer model has changed, the app will show an incompatibility error instead of displaying labels on the wrong bones. Hosting `models/ecorche.glb` yourself keeps the model fixed and protects old scene links.
- The scene URL is public and carries teacher-authored label text. Do not include private student information or other confidential data in labels.

## Offline use

The viewer's **Save offline** control caches the application, model, and Three.js library files after a successful online load. The display should say **✓ Offline ready** before testing by disconnecting Wi-Fi. On school-managed Chromebooks, storage may be cleared automatically, and CDNs may be blocked. The generated URL works offline **only if** the complete application and 3D assets have already been cached on that Chromebook. Sharing a scene does not copy 3D geometry into the URL.

## Testing

Run `npm test` (or `node --test`) from the project directory to test the scene encoder, decoder, model fingerprints, bone visibility bitmasks, and corruption/error handling. No external npm dependencies are required.

The code and share-link serialization have passed automated checks, and the teacher/student layouts have been inspected in a desktop Chromium renderer. **Live 3D loading, labeling, and scene restoration have not been verified end-to-end on a Chromebook**, so treat this as a test build until validated on a school device.

## License and attribution

Anatomical geometry: [Écorché by Charleeh](https://github.com/Charleeh/ecorche), based on BodyParts3D and Z-Anatomy, distributed under **CC BY-SA 4.0**. Preserve attribution when distributing or modifying geometry; follow any applicable share-alike license conditions. The 3D renderer uses [Three.js](https://threejs.org/) (MIT license). For educational exploration only, not a clinical reference.
