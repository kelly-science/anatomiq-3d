# Registered triquetra — AnatomIQ Studio 2.2.44

Only **left triquetrum (FJ3285)** and **right triquetrum (FJ3390)** were imported. The original Écorché lunate, pisiform, hamate and other carpals have not been replaced.

## Provenance and license
BodyParts3D 4.3, © Database Center for Life Science (DBCLS), **CC BY-SA 2.1 Japan**. This extension contains adapted, scene-aligned derivatives of the original meshes. Preserve this credit and follow applicable attribution and share-alike requirements when publishing or redistributing the resulting geometry. Source retrieval tools: olivercase/body_parts_3d_api (MIT for tools; separate license for anatomy meshes).

Original OBJ filenames:
- Left: `FJ3285_BP23878_FMA24440_Left triquetral.obj`
- Right: `FJ3390_BP21751_FMA24439_Right triquetral.obj`

The two source files are checksum-verified against the teacher-reviewed registration reports included in the installer. Do not treat any inconsistent FMA metadata field as a verified unique anatomical identifier. The FJ IDs and raw OBJ SHA-256 hashes are the authoritative checks in this installation.

## Alignment
Both were registered as a **single non-reflective similarity transform per wrist** derived from three matched BodyParts3D/Écorché carpal pairs (lunate, pisiform, hamate). No independent repositioning of the triquetrum. Left and right matrices are embedded by the installer, in a geometry-data asset. The reported geometric fits and teacher inspection are not clinical validation.

## Compatibility
All existing structure indices remain unchanged: the pair is placed at the end of the catalog as skeletal extension objects. Original model GLBs, chapter annotations, student permissions, saved scenes, and label-occlusion BVH code are unchanged. Older lessons can be upgraded with the two new visibility positions initially disabled, so they do not unexpectedly change published lesson anatomy.
