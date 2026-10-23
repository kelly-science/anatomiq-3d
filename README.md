# Anatomy Studio 1.8.1 — Expanded Cardiovascular Anatomy

**Chromebook PWA · Teacher Studio · Student sharing · GitHub Pages self-hosting**

## What's fixed in 1.8.1

- **Heart cavities are empty spaces, not solid tissue.** Their meshes render as faint, depth-write-disabled blue reference shells in **Show all**. **Heart interior** hides both the external heart walls and chamber cavity volumes, exposing the actual valve leaflets, chordae and papillary muscle meshes *where supplied by your installed BodyParts3D model*. A new **Chamber spaces** preset lets you inspect chamber volumes separately.
- **Additional named major arteries and veins.** The updated Mac installer inspects the pinned BodyParts3D 4.3 manifest for source-backed vessel segments across the head/neck, thorax, abdomen, pelvis and limbs. Downloads are bounded to at most 100 new meshes, prioritizing larger named trunks. The exact number is reported by the installer; **gaps may remain because the source doesn't supply a continuous vascular tree**.
- **Preserved scene IDs.** The original 15 cardiovascular meshes and **all previously installed 1.8 expansion meshes** keep their exact order. Only genuinely new vessels are appended. Existing cardiovascular links and annotations can migrate by verifying the fingerprint of their unchanged mesh prefix.
- **Safer conversion.** New GLBs are validated in a staging directory before replacing your current working models. It creates `models/cardiovascular-vessel-coverage.json`, listing exactly which additional vessels were obtained.

## Fast update: cavity fix without more downloads

1. Export a backup from **Library → Back up entire library**. Keep a local copy of your deployed project.
2. Upload the new 1.8.1 application files (`app.js`, `cardio-presentation.js`, `structure-layout.js`, `index.html`, `sw.js`, `version.json`) to the same GitHub Pages directory. **Keep all your current models and renderer files.**
3. After GitHub Pages deploys, visit `<your Pages URL>/version.json` and confirm `1.8.1`. Open the app online, enable Cardiovascular, and select **Heart interior · valves**. This hides chamber-space volumes and exterior walls without rebuilding a model. Use **Chamber spaces** to view the volumes translucently.
4. Do **not** clear site data: local Scene Library entries live in IndexedDB.

## Optional: expand the arteries and veins from the source atlas

1. Extract the full ZIP and copy your previous `models/`, `vendor/three/`, `.cardiovascular-43-work/`, and `.digestive-43-work/` into it. The dot-prefixed work directories are local download caches and **must not** be uploaded to GitHub.
2. From Terminal in the updated `anatomy-pwa-studio` folder, run:

   ```bash
   bash tools/install-cardiovascular-43.sh
   ```

3. The installer reuses verified old meshes, fetches selected **additional existing** vessel meshes, then exports and verifies:

   ```text
   models/cardiovascular-standard.glb
   models/cardiovascular-detailed.glb
   models/cardiovascular-structures.json
   models/cardiovascular-vessel-coverage.json
   models/licenses/CARDIOVASCULAR-43-ATTRIBUTION.txt
   ASSET_SHA256.txt
   ```

4. Upload those generated files and the updated 1.8.1 application code to GitHub, keeping your original skeletal/digestive models and `vendor/three/` intact. Do not upload `.cardiovascular-43-work/` or `.digestive-43-work/`.
5. Check the cardiovascular structure count in Settings, use **Systemic vessels** to inspect new named structures and **Heart interior** for the unobstructed internal meshes. Compare vessels with the skeleton and check the left/right orientation before publishing any assessment.

## Important limitations

- No complete cardiovascular dataset is included in the downloadable project ZIP. Real BodyParts3D mesh download/conversion happens on your Mac and remains an external prerequisite for the *build process*, not for the final self-hosted app.
- The source provides varying anatomical granularity; it does not necessarily contain complete continuous vessels or every valve and chordal component. Heart interior hides wall/cavity meshes, but is not a physical cross-section or geometric cutaway.
- Legacy student links keep their existing anatomy visibility. Updating a previously shared lesson with newly added structures requires you to save and publish an updated link.
- Live rendering on your Chromebook/iPad and real downloaded 4.3 geometry have not been tested in this environment. Synthetic converter fixtures and automated application tests do not replace anatomical validation.

## Source and licenses

- BodyParts3D / DBCLS 4.3 anatomy: **CC BY-SA 2.1 Japan**; preserve attribution and share-alike requirements for derivative geometry.
- The source downloader: [`olivercase/body_parts_3d_api`](https://github.com/olivercase/body_parts_3d_api), code licensed MIT.
- Écorché skeleton: retains its separate licensing and attribution.

---

## Previous release notes

# Anatomy Studio 1.7.2 — Skeletal Stabilization

This is a **maintenance release**, not a new anatomy dataset. It keeps version 1.7.1's scene sharing, chapters, painting, cardiovascular/digestive systems, offline support, and optional skull upgrade.

## Changes

- **Standard Écorché skull is the default again**, including on devices that had enabled the previous 1.7/1.7.1 detailed option. This is a one-time preference reset via a new device-local key. Teachers may explicitly opt back into Experimental from **Settings → App Settings → Skull geometry**; that choice then persists on the device.
- Experimental skull meshes use a **less bright, neutral bone material** instead of the overly white 1.7.1 material. Exact tonal matching still requires checking in the actual classroom browser.
- **The maxillae and mandible remain from Écorché even in Experimental mode** to preserve their fit with the existing teeth. Other verified cranial and facial bones may still be upgraded, individually, when alignment and polygon-count checks pass.
- Geometry quality remains **device-specific**, never stored in the Scene Library or student share links. Original selectable structure IDs, label data, bone paints, and layer state are unchanged.
- PWA cache identifier, app version, and update manifest advance together to `1.7.2`.

## Upgrade your existing GitHub Pages project

1. **Export a backup** from Library → Back up entire library before deploying.
2. Extract the ZIP; upload the contents of its `anatomy-pwa-studio/` folder into the **same GitHub Pages directory** as the current release. Overwrite existing app files. **Add `skull-preferences.js`**, which is new.
3. **Keep** your existing `models/`, `vendor/three/`, license files, and `ASSET_SHA256.txt`. No model conversion or new anatomy download is required for this release.
4. Check `<your GitHub Pages site>/version.json` shows `1.7.2`. Reload Anatomy Studio online (do not clear Chrome/Chromebook/iPad site data, since your Scene Library is local IndexedDB).
5. Verify **Settings → App Settings → Skull geometry** shows **Standard**. Test an older painted/annotated skull lesson and an existing student link. You can optionally opt into Experimental on a test device; this reloads the viewer.

### Quick hotfix alternative

The companion hotfix ZIP contains only `app.js`, `skull-geometry.js`, `skull-preferences.js` (NEW), `index.html`, `sw.js`, `version.json`, and `manifest.webmanifest`. Overwrite or add these files in the GitHub Pages root. All other project assets remain unchanged.

**Limits:** The experimental high-resolution model is not yet validated for all foramina, landmarks, mesh registration, or dental accuracy; Standard remains recommended for student practical assessments. This release does not add new skull structures or improve the underlying BodyParts3D anatomical segmentation. There is no guarantee that changing the material alone fully matches the original model color.

**Testing:** Automated JavaScript compatibility and preference tests plus synthetic Python model-conversion tests; physical iPad/Chromebook rendering must still be checked after deployment.

---

## Archived release notes (1.7.1 and earlier)

# Anatomy Studio 1.7.1 – High-resolution skull appearance fix

This release fixes black/dark, patchy high-resolution skull meshes caused by reusing the original Écorché textured/vertex-colored material on BodyParts3D replacement geometry. It assigns a neutral untextured bone material to successfully upgraded bones, keeps smooth normals/double-sided shading, and updates the teacher paint/selection baseline. The existing face-orientation transform is unchanged; the geometry is still unverified on physical Chromebook/iPad with your exact source assets.

**No re-download or reconversion required.** Upload the changed `app.js`, `skull-geometry.js`, `sw.js`, and `version.json` (plus `index.html` if updating the full distribution). Preserve your existing `models/`, `vendor/three/`, and saved scenes. Clear neither site data nor IndexedDB.

In **Settings → App Settings**, switch Skull Geometry to **Standard** for a guaranteed fallback if the replacement geometry still has an orientation issue. Standard mode requires reloading the app. For high-resolution verification, focus the skull and inspect the frontal, parietal, temporal, and occipital bones from front, side and back. Use a new test scene before publishing anatomical practicals. Teacher-painted bones and labels should still appear.

## Known limit

This fixes material incompatibility; it does not assert that every downloaded skull mesh has anatomically correct normals or matches the Écorché skull millimeter-for-millimeter. If holes or reversed surfaces persist after updating, preserve the affected GLB and report which bones are impacted for a mesh-normal/registration pass.

---

# Anatomy Studio 1.7.0 — High-Resolution Skull (Beta)

**What's new:** Optional high-resolution cranial/facial bone geometry from the verified **BodyParts3D 4.3** mesh set. Anatomy Studio keeps your existing Écorché skull and full skeleton as the fast default. The upgraded skull is enabled per Chromebook/iPad in **Settings → App Settings → Skull geometry → High resolution**. The full-body skeleton is unchanged in this first 1.7 release.

The new models are **not included in the ZIP**. They require a one-time download/conversion on your Mac. The installer selects up to 22 individually named cranial/facial bones (frontal, parietal, temporal, occipital, sphenoid, ethmoid, maxilla, mandible, etc.) and creates locally hosted GLB assets. Source meshes and names are verified against the version-stamped BodyParts3D 4.3 manifest. A structure only uses the replacement when it is **higher-polygon and safely aligned**; otherwise the original bone remains. Teeth, cartilage, and bones outside the skull keep their existing geometry.

## Install 1.7 on your Mac and GitHub Pages

1. Extract this ZIP. **Merge your existing** `models/` and `vendor/three/` directories into `anatomy-pwa-studio/`. Keep your existing Ecorché model, digestive/cardiovascular models and `ASSET_SHA256.txt`.
2. Reuse `.digestive-43-work/` if you have it: it contains the reference skin OBJ and Python environment and avoids re-downloading. It is optional, and must **not** be uploaded to GitHub. You can also reuse `.cardiovascular-43-work/`.
3. From the project root, run:

   ```bash
   bash tools/install-skull-43.sh
   ```

   The script downloads the verified 4.3 skull meshes and reuses any existing reference skin. It generates:

   ```text
   models/skull-detailed.glb
   models/skull-structures.json
   models/licenses/SKULL-43-ATTRIBUTION.txt
   ASSET_SHA256.txt
   ```

4. Upload the **updated application files** (including the new `skeletal-detail.js` and `skull-geometry.js`) and generated skull assets to the same directory that GitHub Pages serves. Preserve all existing `models/`, `vendor/`, icons, Scene Library-compatible scripts, and attribution files.
5. Open your site's `/version.json` and verify `1.7.0`. Reload the installed PWA online without clearing site data. Go to **Settings → App Settings → Skull geometry** and choose **High resolution**. It reloads the app and displays how many cranial/facial bones actually upgraded.
6. With Skeletal enabled, use **View → Focus Skull Only**, rotate, and verify registration from front, back, lateral and inferior views. Check existing custom labels and painting before using the high-detail skull for practical exams.

**Important:** The skull is sourced from a different model than Écorché. No real 4.3 skull geometry was available to test in this build environment, so alignment and fine anatomical accuracy **must be checked on your Mac/iPad/Chromebook** after the installer runs. If a bone cannot be matched safely or has fewer triangles, the old bone stays visible. An updated mesh's surface can differ slightly from previous label anchor coordinates; inspect important old callouts.

**Scene compatibility:** No new selectable structures are inserted, no existing structure indices/fingerprints change, and the 1.7 quality setting is stored locally on each device, not embedded in student links. Older skeletal/muscular/digestive/cardiovascular lesson links and library drafts continue to reference the same bones. Your current student scenes therefore keep functioning even when the high-resolution skull assets are absent.

**Offline:** The service worker caches the optional skull model on the device when **Prepare offline access** is used while high-resolution skull is enabled. Do not clear Chrome site data: locally saved Scene Library entries live in IndexedDB and are not hosted on GitHub. Back up the library before upgrading.

**Licensing:** Source anatomy © DBCLS / BodyParts3D, CC BY-SA 2.1 Japan, with attribution in the generated file. Existing Écorché is CC BY-SA 4.0. Keep both license notices with redistributed geometry. Not for clinical diagnosis or navigation.

**Testing:** 63 JavaScript application tests and one synthetic model-selector/converter test passed. Real downloaded skull alignment and full Chromebook performance still need validation.

---

## Previous 1.6 cardiovascular release notes


**Goal:** A useful cardiovascular teaching model, not just 3 heart-wall meshes and 12 major vessel fragments. The expanded cast is selected by exact names from the verified BodyParts3D 4.3 source manifest. Its count is determined during installation; no substitute geometry is generated. This release is not yet visually validated on a physical Chromebook/iPad with the real downloaded assets.

## What gets added

- Internal heart geometry: ventricular cavity surfaces, mitral/tricuspid leaflets, aortic/pulmonary cusps, papillary muscles, where actually present in 4.3.
- Pulmonary artery and vein trunks; more systemic vessel trunks from the neck, chest, abdomen, and limbs; selected coronary components.
- **View → Expose heart interior (hide walls)** helps reveal internal structures without deleting them.
- Cardiovascular objects are organized within the student tree into heart walls, heart internals, pulmonary circulation, coronary circulation, and systemic vessels. Teacher paint, labels, visibility, chapter differences and Exam/Study publishing still apply.
- Standard and Detailed geometry remain **device-specific**, both downloaded from your own GitHub Pages deployment once installed.
- The original **15 cardiovascular FJ IDs and their exact mesh order stay first**. New entries append afterward. Old labels and painted structures therefore retain their indices; old scenes are automatically migrated to the new total when opened. Back up your Scene Library before changing a published site.

## Upgrade steps on your Mac

1. Extract the ZIP and merge **your existing** `models/`, `vendor/three/`, and any `ASSET_SHA256.txt` into the new `anatomy-pwa-studio` folder. The ZIP does **not** include large anatomical meshes or Three.js binaries.
2. For the best resumable behavior, preserve `.cardiovascular-43-work/` and `.digestive-43-work/` from your prior install (these are local temporary work folders; do not upload them to GitHub).
3. From the **updated** project directory, run:

   ```bash
   bash tools/install-cardiovascular-43.sh
   ```

   The script reuses the original 15 meshes, downloads only the newly selected structures, and regenerates `models/cardiovascular-standard.glb`, `models/cardiovascular-detailed.glb`, `models/cardiovascular-structures.json` and `ASSET_SHA256.txt`.
4. Upload the **entire updated application code** to the root of your GitHub Pages deployment, plus the newly generated `models/cardiovascular-*` files and updated `ASSET_SHA256.txt`. Preserve the other anatomical models, vendor libraries and `models/licenses/` directory. Do not upload `.cardiovascular-43-work/` or the project virtual environment.
5. On your iPad or Chromebook, verify `/version.json` now shows `1.6.0`, reopen the PWA online, and check **Settings → App Settings → Cardiovascular**. It should show **more than 15 meshes** if the expanded data installed. Toggle the cardiovascular system on. Test View → Expose heart interior and select a named valve leaflet.
6. In **View → Front/Back** with the skeleton enabled, confirm anatomical left/right and depth alignment before publishing practicals. If anything appears reversed, stop and report a screenshot; do not use it for assessment until alignment is corrected.

If the expanded download encounters a network problem, do not upload partial GLB replacements. Re-run the same installer to reuse the cached chunks. If the app reports just **15** cardiovascular structures, it is still reading the older model/metadata; verify the generated three files were actually uploaded to GitHub Pages and reload after the service worker updates. Do not clear site data or you risk losing the local IndexedDB Scene Library.

### Technical and licensing notes

- Source meshes: BodyParts3D 4.3, © DBCLS, **CC BY-SA 2.1 JP**, via the pinned v1.0.0 `olivercase/body_parts_3d_api` selector (MIT tool code). Preserve `models/licenses/CARDIOVASCULAR-43-ATTRIBUTION.txt` and its references.
- The exact number and anatomical completeness depend on source geometry; this does not claim all coronary vessels, all heart chambers as separately dissectible walls, or histological detail.
- The scene/link format is unchanged. The previous 15 cardiovascular structure IDs and mesh indices are frozen; new cardiovascular entries are appended only. Very large custom-label scenes can still reach URL-fragment limits.
- For low-power Chromebooks choose Settings → Cardiovascular geometry → Standard and rendering Quality → Fast. Only the selected system layers need render, but the cardiovascular GLB currently loads at app startup if installed.

---

# Anatomy Studio 1.3.1 — Digestive visibility fix

This patch addresses the case where the application reports **77 detailed digestive structures loaded**, but the viewer displays only the original three-organs layer.

## Usage

1. Update the project in GitHub, keeping `models/` and `vendor/three/` unchanged.
2. In Teacher Studio, switch from **Skull/Skeleton** to **Digestive**. If the 77-mesh dataset is installed, new views default to it.
3. For an **existing saved Digestive chapter**, its existing selection is preserved deliberately. Enable **Anatomical Systems → Detailed anatomy** on the left. This replaces the basic layer with the 77 individually selectable structures.
4. If needed, press **Restore hidden structures**, then save the scene to retain the expanded anatomy.
5. Refresh the PWA after GitHub Pages has deployed; check Settings for **1.3.1**.

Do not delete Chrome site data: scenes saved to the local library live in IndexedDB. Existing links are left unchanged.

# Anatomy Studio 1.3 — Digestive Anatomy Upgrade (Chromebook PWA)

A drop-in upgrade of Anatomy Studio 1.2, preserving chapters, student links, Schoology embedding, teacher paint, local Scene Library, and the 1.1 on-demand renderer.

## What's new

- Natural default organ colors and smoother standard materials on the existing liver/stomach/intestine model. **Works immediately**, using the `anatomy-organs.glb` already installed in 1.2.
- Optional **BodyParts3D 4.3** individual digestive structures: stomach, intestinal sections, colon, rectum, and accessory structures if present in the versioned catalogue.
- Teacher **Detailed anatomy** checkbox in Digestive or Combined view. Each chapter stores this separately. When off, the older three-organ model displays as before.
- Standard vs Detailed **geometry resolution**, selected per device in App Settings. Both resolutions include identical structure IDs, so lesson links remain compatible.
- Default organ colors remain teacher-paintable and are saved in student links.
- New geometry is **appended after all existing 1.2 bones, muscles, and organs**. Older saved scenes and labels keep their previous IDs.

## Before upgrading

1. Back up your Scene Library (Library → Back up entire library).
2. Unzip this project. **Preserve your existing** `models/ecorche.glb`, `models/anatomy-organs.glb`, and `vendor/three/` by copying them into this extracted project. Those large files are not included in the ZIP.
3. You can deploy the updated web files now. The existing three organs will be automatically colored. No new 4.3 geometry will appear until the next step succeeds.

## Getting the higher-resolution digestive structures on your Mac

From Terminal inside the newly extracted `anatomy-pwa-studio` directory:

```bash
bash tools/install-digestive-43.sh
```

This script uses a **pinned v1.0.0** release of [Oliver Case's BodyParts3D 4.3 selector](https://github.com/olivercase/body_parts_3d_api), which downloads meshes from the Anatomography viewer endpoint. It selects the gut subset, attempts to add accessory organs (liver, gallbladder, pancreas, esophagus and so on where available), and gets the full-body skin mesh as a reference for positioning. It installs an isolated Python virtual environment under `.digestive-43-work/` with numpy, trimesh, and fast-simplification; converts OBJ meshes to two self-hosted GLB files; validates the mesh counts; and saves SHA-256 checksums. No external model-service requests are required **after the generated assets are uploaded**.

It generates:

```
models/digestive-standard.glb
models/digestive-detailed.glb
models/digestive-structures.json
models/licenses/DIGESTIVE-43-ATTRIBUTION.txt
ASSET_SHA256.txt
```

The downloaded original OBJs and intermediary files stay in `.digestive-43-work/`. **Do not upload `.digestive-43-work/` or the converter's virtual environment** to GitHub.

If the external 4.3 retrieval endpoint rejects downloads, the script will stop with an error. This release does not ship or claim to have tested those full-resolution anatomical meshes. The colored 1.2 digestive model will keep working even if the 4.3 download fails.


### Installer compatibility fix (Python 3.9)

The original 1.3 installer allowed newer `fast-simplification` releases that import
Python 3.10+ type annotations and can crash on Apple's Python 3.9. This
corrected installer pins `fast-simplification==0.1.10`, which publishes Python
3.9 macOS wheels, and tests mesh decimation *before* building the models.

If the earlier installer stopped after downloading 61 gut, 16 accessory, and 1
skin mesh, simply run `bash tools/install-digestive-43.sh` again. The updated
script verifies those downloaded meshes and reuses them, retaining your
`.digestive-43-work` directory. Do not delete that directory.

## Uploading to GitHub Pages

Upload the updated files from `anatomy-pwa-studio/` to your existing repository, **including** the three newly generated model files, `digestive-detail.js`, and attribution document, but not `.digestive-43-work/`, Python cache files, or the Mac virtual environment. Keep your existing `models/ecorche.glb`, `models/anatomy-organs.glb`, and `vendor/three/` files.

Since some GitHub interfaces restrict large browser uploads, you may need GitHub Desktop / Git for the GLBs. The converter refuses model files over 95 MB to help avoid impractical GitHub Pages assets.

Reload the installed PWA online; confirm **Settings → App Settings** shows version **1.3.1** and detailed digestive structures. Open Digestive mode, enable **Detailed anatomy**, search for the named intestine sections and test paint/label. In Settings, select **Detailed** geometry if you want the higher triangle count (reload required).

To prepare offline use, choose Help → Prepare offline access after the new assets have loaded. Offline geometry caches are device-specific.

## Geometry alignment: important beta limitation

The new 4.3 downloader and converter have been tested only with synthetic OBJ geometry in this environment. The **actual 4.3 geometry and its placement relative to the existing Écorché skeleton have not been visually verified**. The converter maps the BodyParts3D skin bounding box into the same approximate 1.2 source body frame; this does not guarantee precise specimen registration. Check the liver/stomach/colon positions relative to the spine, ribs and pelvis before using it for graded assessments. The converter supports `--vertical-axis x|y|z` and `--invert-vertical` if alignment appears inverted. It does *not* yet provide a manual 3D calibration GUI.

BodyParts3D also represents a single adult reference body and is not appropriate for diagnostic use.

## Compatibility / known limits

- Older 1.2 links remain valid. Their default remains the previous three-organ view because the `hd` setting is absent.
- New 1.3 links that use detailed structures require the new model/metadata files on the published site. Missing files result in an explicit error, not invented anatomy.
- Bones and muscles use unchanged Écorché assets; the high-detail geometry is downloaded separately and does not slow down skull-only lessons.
- The library is still local to each Chrome profile (IndexedDB). Export backups before device resets.
- The 1.3 detailed model may be too heavy for low-spec Chromebooks in Detailed geometry mode. Standard is recommended for student devices.

## Attribution / licensing

- Écorché original body asset: CC BY-SA 4.0.
- BodyParts3D / Database Center for Life Science (DBCLS) 4.3 data: CC BY-SA 2.1 Japan according to the pinned subset supplier. Retain the attribution and share-alike conditions for distributed adapted assets. The upstream Python retrieval code is MIT licensed. See `models/licenses/DIGESTIVE-43-ATTRIBUTION.txt` created by the installer.
- Three.js 0.169.0: MIT. Existing files are preserved.

## Testing

```bash
node --test tests/*.test.mjs
```

39 automated app/format tests pass in this environment. The offline converter successfully produced and validated standard and detailed GLBs from **synthetic** OBJ meshes; actual provider download, renderer visuals, and Chromebook performance remain to be verified.


## Version 1.4: Independent anatomical layers

The three top buttons **Skeletal**, **Muscular**, and **Digestive** are now independent on/off switches (with highlighted states). Enabling Digestive while Skeletal is enabled shows both; switching Skeletal off removes the bones but leaves the digestive organs. Camera orientation and zoom remain unchanged when switching layers. The muscle details section appears when muscles are enabled and lets you toggle superficial and deep muscles separately.

**View → Focus Skull Only** and **View → Show Full Skeleton** replace the old Skull / Combined tabs. The View menu retains Front / Back / Left / Right camera options.

**Detailed digestive anatomy is now the only digestive option for new lessons.** The 77 individually selectable BodyParts3D 4.3 structure model is required for new digestive scenes. The 3-organ model is intentionally retained *internally* to open existing 1.2–1.3 published student links and saved lessons without breaking previous teacher annotations. Old scenes keep their authored contents until edited; the legacy option is not shown in the interface. Keep your existing `models/anatomy-organs.glb` to support older links. Do not delete it if you still use old lessons. To switch an old scene to the detailed geometry, use the new Digestive toggle to turn it off and back on, then save and republish. Old basic-organ labels are not automatically reanchored to the new meshes.

**Student interaction:** A published Study link with the *Hide/isolate bones* exploration permission enabled can use the same system-layer toggles. Practical Exam links with exploration disabled never display those toggles. They cannot bypass search/identification restrictions through these controls.

### Updating from 1.3.1

Copy the updated application files into the repository root, and **add `system-layers.js`**. Keep your existing self-hosted `vendor/three/`, `models/ecorche.glb`, `models/digestive-standard.glb`, `models/digestive-detailed.glb`, `models/digestive-structures.json`, and legacy `models/anatomy-organs.glb`. You do not need to rerun the model conversion. The service-worker cache name changes to `anatomy-v1.4.0` to activate the release. Export the Scene Library first as a precaution. Older student URLs remain readable, and IndexedDB records are not intentionally modified by upgrading the PWA files.

Run `node --test tests/*.mjs` to execute the application unit and source integration tests. The full WebGL renderer and Chromebook-specific performance need checking on a deployed site.

## Version 1.4.1: Digestive front/back orientation correction

The BodyParts3D 4.3 converter shipped in 1.3 normalized OBJ geometry from a
Z-up frame to Y-up using `(x,z,+y)`. That mapping reverses the depth direction
relative to the expected `(x,z,-y)` right-handed frame. Version 1.4.1 corrects
**only the detailed 4.3 digestive root** at runtime, reflecting the depth axis
about the registered mid-plane. Its source meshes keep their original local
coordinates, so stored paint, visibility, and 3D-anchored labels remain attached
to the correct mesh. The Écorché skeleton and muscles and the legacy digestive
asset are not transformed.

**Update GitHub:** Replace `app.js`, `digestive-detail.js`, `index.html`,
`sw.js`, and `version.json`. No model files need to be replaced or reconverted.
Once deployed, verify front and back views against the skeleton and anatomical
landmarks. The specific registration has not yet been visually validated on a
Chromebook. Do not assume different source anatomy specimens align perfectly.

Future model conversions must be versioned if the converter itself adopts the
corrected coordinate convention; otherwise applying this runtime correction to
a newly fixed export would reverse it a second time.


## Anatomy Studio 1.5 — Cardiovascular beta (heart and major blood vessels)

Adds **Cardiovascular** as a fourth independent anatomy toggle. BodyParts3D 4.3 supplies
**3 heart-wall meshes and 12 major-vessel meshes**; it does *not* include all
four separately isolated chambers, valves, or complete vascular branching in
this subset. No representative substitute organs are generated.

**One-time Mac installation:** Keep your current `models/`, `vendor/three/`,
and `.digestive-43-work/` folders. From the updated app folder run:

```bash
bash tools/install-cardiovascular-43.sh
```

The script uses the pinned BodyParts3D 4.3 subset utility, reuses the digestive
reference skin and venv if available, converts the real OBJs to independent
optimized GLB files, checks the GLBs, and writes SHA-256 hashes. Upload:

```
models/cardiovascular-standard.glb
models/cardiovascular-detailed.glb
models/cardiovascular-structures.json
models/licenses/CARDIOVASCULAR-43-ATTRIBUTION.txt
ASSET_SHA256.txt
```

Also upload all updated 1.5 application files (including new
`cardiovascular-model.js` and `system-layers.js`). **Do not upload hidden work
folders.** Until cardiovascular assets are uploaded, its toggle is disabled;
all existing skeletal, muscular, digestive lessons continue to load.

The heart/vessel layer uses the same skin-based normalization and viewer-level
front/back correction as the 4.3 digestive layer. Because the provider geometry
and the Écorché skeleton come from different datasets, verify left/right,
front/back, scale and overlap on an actual Chromebook before using in exams.
Standard geometry loads by default; Settings offers higher-detail geometry.
Both choices are local-device preferences. Student links contain the layer's
visibility, colors and annotations, not whole GLB binaries.

Saved scenes remain browser-local. Back up your Scene Library before deploying.
Old scenes' indexed structures are unchanged: cardiovascular indices append
at the end, and the 1.4.1 model fingerprint is accepted during migration.
Older published single-scene and chapter links are intentionally supported.

**Planned digestive additions (not part of 1.5):** tongue, salivary glands,
pharynx, and any further accessory digestive structures with verifiable meshes.


## Anatomy Studio 1.5.1 — Cardiovascular installer ID correction

BodyParts3D uses suffixed FJ identifiers such as `FJ1682M` (a distinct
left-side arterial structure). Version 1.5.0 incorrectly required numbers-only
identifiers in the Python converter and truncated the same identifiers in the
browser. This release preserves the **complete** original ID in both places.

If the installer stopped at `Unrecognized FJ identifier: FJ1682M`, simply
replace `tools/build-cardiovascular-43.py`, rerun
`bash tools/install-cardiovascular-43.sh` from the project folder, and keep
`.cardiovascular-43-work/` intact. The script verifies and reuses the 15
already-downloaded heart and major-vessel meshes.

**Also update `cardiovascular-model.js`, `app.js`, `index.html`, `sw.js`,
`version.json`** before publishing to GitHub Pages. The cache is bumped to
`anatomy-v1.5.1` so ChromeOS installs the corrected mesh-ID parser. Keep your
existing `models/` and `vendor/three/` assets.

Only the ID handling and app version change: no digestive or skeletal assets
are modified. The downloaded cardiovascular source meshes are not included
in this ZIP.
