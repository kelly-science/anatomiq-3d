# AnatomIQ Studio 2.2.51 — Selection & student viewer

- Click empty renderer canvas to deselect a highlighted structure, without hijacking Orbit drags, Paint, or Label placement.
- Student or Teacher label-list focus, Preview Focus and student callout focus retain camera movement but do not select/highlight the bone.
- Student Lesson Settings → **Organ system toolbar** controls visibility of the top system tabs independently of Search, Explorer, and Identify permissions. The control appears in the existing publishing/student permissions list and is stored in the lesson-wide `sp.ot` field.
- Older projects without `sp.ot` preserve original toolbar behavior using `sp.ex` as fallback.
- When both Student Search and Explorer are off, apply the permissions before scene restoration, reserve the full canvas grid track, and resize after applying layout. Student readiness and errors remain available via `window.__AnatomIQStudentReadiness`.
- No model, structural identity, lesson format version, label BVH, or camera-rendering loop changes.

## Verification

Test Teacher canvas click selection/deselection, Orbit drag, selection rectangle, and Paint/Label placement separately. In Student View, test all four combinations of Search/Explorer plus the new Organ system toolbar toggle, both on desktop and compact screens. Confirm published lesson loads with Search and Explorer disabled. If any startup remains blocked, inspect `window.__AnatomIQStudentReadiness` and the first Chrome Console error; do not claim a catalog mismatch without evidence.

The project remains a PWA; publish updated `app.js`, `scene-codec.js`, `index.html`, `sw.js`, `interface-2221.js`, `version.json`, and new `student-selection-251.css` together.
