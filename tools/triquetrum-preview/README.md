# AnatomIQ Studio — Triquetrum Alignment Review (2.2.43 investigation)

This is **a standalone anatomical alignment preview**, not a classroom release. It does not modify `app.js`, `index.html`, `models/`, `sw.js`, stored lessons, chapter metadata, or structure IDs. It is deliberately not wired into the public Student or Teacher Viewer.

## Goal

Evaluate a verified left/right BodyParts3D 4.3 triquetral candidate against your Écorché skeleton and the native lunate, pisiform and hamate. Because the coordinate systems differ, a source OBJ cannot safely be inserted without registration. The preview supports a 3-landmark similarity transform (translation, rotation and uniform scale) and optional small adjustments. It exports a review JSON for **each side**, retaining upstream FJ identifiers.

## Install (Mac)

Save `AnatomIQ-Studio-Triquetrum-Alignment-Preview.zip` to Downloads. Run:

```bash
cd "/Users/steve/Documents/GitHub/anatomiq-3d"
unzip -oq "$HOME/Downloads/AnatomIQ-Studio-Triquetrum-Alignment-Preview.zip" -d "$HOME/Downloads"
python3 "$HOME/Downloads/AnatomIQ-Triquetrum-Alignment-243/install.py" --repo . --dry-run && \
python3 "$HOME/Downloads/AnatomIQ-Triquetrum-Alignment-243/install.py" --repo .
```

Only a new folder `tools/triquetrum-preview/` is created; the installer refuses to overwrite an existing one. It does not change your app version.

## Obtain source anatomy

```bash
python3 tools/triquetrum-preview/prepare.py
```

Requires internet access on your Mac. Downloads the public BodyParts3D 4.3 manifest and small subset downloader, then only left/right triquetral, lunate, pisiform and hamate models. It **does not** clone all 3,210 BodyParts3D meshes. Validates both sides and that every OBJ has actual vertices and faces; records file hashes and original FJ IDs. Downloading is the only step with an upstream dependency.

If you already have a suitable 4.3 subset (with `MANIFEST.csv` and its referenced `.obj` files), use:

```bash
python3 tools/triquetrum-preview/prepare.py --local-source "/path/to/your/bodyparts3d/subset"
```

The downloader is from https://github.com/olivercase/body_parts_3d_api. If network or upstream downloading fails, do not proceed or use fabricated substitute bone geometry. You can rerun `prepare.py` safely after the network problem is resolved.

## Launch in Chrome

From the Git project root:

```bash
python3 -m http.server 8795 --bind 127.0.0.1
```

Open: http://127.0.0.1:8795/tools/triquetrum-preview/preview.html

The viewer loads the existing `models/ecorche.glb` and the downloaded source meshes locally. Orange is the candidate triquetrum; cyan are three source reference carpals; translucent white shows native mesh data.

1. Choose **Left wrist** or **Right wrist**. If several original mesh variants are supplied, select one in the candidate dropdown.
2. Identify the **native** lunate, pisiform and hamate with the drop-downs. The **Auto-identify names** button works only if those original mesh names are unambiguous. If not, use **Pick … from model** to click the proper original carpal, and enable **Show all native meshes** if they were filtered out.
3. Click **Calculate alignment**. The initial transform fits source reference bone centroids to native bone centroids, *not* detailed surfaces. Inspect from multiple directions and adjust offsets/rotation as needed.
4. Use **Focus on wrist** to zoom in. Ensure triquetrum lies ulnar to the lunate, deep to the pisiform, in the proximal carpal row, and does not overlap adjacent bones incorrectly.
5. Click **Export review JSON** for each side. The report includes source FJ/FMA identity and SHA-256, selected AnatomIQ mesh labels, fit errors and a transform matrix. It is **not** an approval for production.

## Limitations & next step

- **Not pre-aligned or published**. We do not have the full original raw source assets in this delivery environment, so a reliable transform has not yet been measured or visually verified.
- The baseline alignment uses bounding-box centers of matching carpal meshes. Poor landmarks, different skeletal poses, or mismatched variants may require more careful rigid registration and/or manual correction. This is not equivalent to validated surface ICP.
- Native meshes may be labeled differently or nested in composite wrist meshes. If three distinct native landmarks cannot be selected, report that rather than inventing placement.
- No fabricated replacement triangles or artificial bone features are used.
- Mesh quality should be assessed after placement; FJ source geometry may be comparatively low resolution.
- For production, a separate guarded converter/metadata update is required to register **stable IDs, Student View selection, searching, labels, color materials, and visibility**, followed by a left/right anatomical review and publication of correctly attributed meshes.
- Be mindful of license obligations before committing the downloaded meshes or derivatives to public GitHub Pages. See `ATTRIBUTION.md`.

The earlier 2.2.38 bounding-volume-hierarchy occlusion optimization and all existing lesson workflows remain untouched.
