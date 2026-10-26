# Archived feature: experimental high-resolution skull

The AnatomIQ v1.7-era optional `skull-detailed.glb` replacement produced dental alignment and geometry registration concerns. It is retired from the active UI in this update. **It is not part of the new global Standard/Detailed switch.**

The active viewer always initializes `anatomy-studio-skull-geometry-v2` as `standard` before `app.js` runs. The settings control remains present but hidden for legacy app handlers. Previously saved lesson/chapter data are not modified.

For rollback safety, original source modules (`skull-geometry.js`, `skull-preferences.js`, `skeletal-detail.js`) and original assets (`models/skull-detailed.glb`, `models/skull-structures.json`) **remain in their original paths** for now. Do not delete them until auditing student offline manifests, existing scene compatibility and any PWA cache references. This is a reversible **feature archive**, not a destructive asset migration.

To restore the experiment later, restore the project backup created by the installer. The archive itself is documentation, not an alternate 3D asset.
