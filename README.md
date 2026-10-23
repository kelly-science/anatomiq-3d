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
