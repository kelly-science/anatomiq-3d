# AnatomIQ Studio 2.2.52 — Student label-list separation

- **Show Label List** (`sp.ll`) is a separate publishing permission from Structure Explorer (`sp.st`). The existing Teacher Annotations permission (`sp.sl`) is still required to prevent revealing classroom answers through the list when annotations are disabled.
- On Student View, labels are presented in a standalone collapsible floating panel inside the viewer, no longer as children of Structure Explorer. Students can show or hide that panel using **Label List**, even when Search and Structure Explorer are disabled.
- Older lessons without `ll` fall back to their old effective visibility (`sl && (st || ss)`). Presets are updated for new lessons; the new `ll` field is optional for legacy validation.
- The Show Teeth sidebar row is removed, but `toggle-teeth` remains as a hidden functional input for the existing **View** menu and legacy lesson code.
- **No changes:** anatomical meshes, structure indices, label anchors/ordering, label occlusion BVH (2.2.38), lesson schema version, Student practical code.

Test on desktop and Chromebook-sized Chrome windows: independent label list permission, no Search/Explorer startup, annotations disabled, practical active, old lessons, View > Show Teeth. Dry-run first.
