# AnatomIQ Triquetrum Alignment — source attribution

**Preview status:** Experimental, unverified model registration. Do not publish the candidate meshes until alignment and anatomy have been checked.

- **Geometry:** BodyParts3D / Anatomography 4.3, © Database Center for Life Science (DBCLS).
- **Subset downloader:** Oliver Case, *body_parts_3d_api* — https://github.com/olivercase/body_parts_3d_api (MIT-licensed source code, separate from anatomical data).
- **Relevant upstream historical mesh licensing:** CC BY-SA 2.1 Japan, as documented for the version 4.3 source dataset by its distribution. See https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en and upstream source README. **The current DBCLS archive license page states CC BY 4.0; establish applicability to these specific version 4.3 meshes before permanently publishing derived geometry.**
- **AnatomIQ base anatomy:** Écorché, https://github.com/Charleeh/ecorche — CC BY-SA 4.0.

Downloaded candidate meshes are stored under `tools/triquetrum-preview/assets` in the user's local repository. They must not be committed/published during the exploratory phase. This kit does not add new IDs to the application's structure metadata and does not create a merge/production GLB.

Identity is retained as original FJ mesh ID, FMA mapping, polygon count, and SHA-256 fingerprint in `assets/index.json` and review exports.
