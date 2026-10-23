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

Reload the installed PWA online; confirm **Settings → App Settings** shows version **1.3.0** and detailed digestive structures. Open Digestive mode, enable **Detailed anatomy**, search for the named intestine sections and test paint/label. In Settings, select **Detailed** geometry if you want the higher triangle count (reload required).

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
