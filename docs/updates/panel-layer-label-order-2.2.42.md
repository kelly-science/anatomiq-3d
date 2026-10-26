# AnatomIQ Studio 2.2.42 — Menu Layering & Draggable Label Order

This is a **guarded incremental patch** for a working 2.2.41 checkout at `/Users/steve/Documents/GitHub/anatomiq-3d`.

## Changes

### 1. Panel handles stay under menus

The workspace receives its own low-priority stacking context (`z-index: 1`, `isolation: isolate`). This preserves the handles' high local z-index needed above the compact panels, but the entire workspace remains below the Teacher and Student menu bars and outside global dialogs. It does not interfere with the fullscreen floating-details panel.

### 2. Teacher label order is draggable

On the right panel, each label header has a **⠿ grip**. Drag a grip above or below another label row to reorder. The drop location (upper/lower half) determines before/after. Expand the row to edit label content as before. Keyboard alternative: focus the grip and press **Up** / **Down** arrow.

This actually reorders the `labels` array, not just the DOM. Existing chapter snapshot and lesson-publishing code already serialize this array in order, so the new ordering is retained when the chapter is saved or published. Student numbered markers and the label list use that same order. The label objects, their original 3D anchors, descriptions, photos, focus views, and IDs are unchanged. History / Undo receives the edit through `queueDraft()`.

Chrome desktop/Chromebook trackpad dragging is the primary input path. Keyboard Up/Down is an accessibility alternative. Native HTML drag-and-drop support on touch-only browsers varies.

### 3. Triquetrum inventory finding

The Écorché base model's published **`model/ecorche.structures.json`** includes scaphoid, lunate, pisiform and neighboring wrist structures, but **no name matching `triqu`**. Therefore the left/right triquetrum is **missing from the actual upstream model**, not hidden by AnatomIQ's viewer search. Do **not** rename another mesh or fabricate a stand-in. A later geometry enhancement can introduce anatomically sourced and registered left/right carpal geometry, with stable appended IDs and compatibility testing.

Upstream inventory: `https://github.com/Charleeh/ecorche/blob/main/model/ecorche.structures.json`

## Installation

Save `AnatomIQ-Studio-Menu-Label-Order-2.2.42.zip` in Downloads. Execute **without explanatory # comment lines**:

```bash
cd "/Users/steve/Documents/GitHub/anatomiq-3d"
unzip -oq "$HOME/Downloads/AnatomIQ-Studio-Menu-Label-Order-2.2.42.zip" -d "$HOME/Downloads"
python3 "$HOME/Downloads/AnatomIQ-Panel-Layer-Label-Order-242/install.py" --repo . --dry-run && \
python3 "$HOME/Downloads/AnatomIQ-Panel-Layer-Label-Order-242/install.py" --repo . && \
node --check app.js && \
node --check label-reorder-242.js && \
node --check sw.js && \
node --test "$HOME/Downloads/AnatomIQ-Panel-Layer-Label-Order-242/tests/test_reorder.mjs" && \
git status --short
```

The script refuses mismatched versions or source anchors. It creates a timestamped sibling backup **outside the repository** and restores files if installation fails partway through.

## Visual acceptance checklist

1. In compact Teacher View, open **View** menu, verify it overlays both chevrons. Repeat for File and Help.
2. Collapse/expand both panels and verify controls remain clickable.
3. Add at least three labels, drag the third to first, verify number markers 1–3 reflect the order.
4. Rename a label and verify its grip remains visible, then move with keyboard arrows.
5. Save chapter, change chapter, return. Verify order. Also check Undo/Redo and publish preview.
6. Rotate the 13-label skull: preserve the performance improvement of BVH 2.2.38.
7. Check Student View; no drag controls for students.

## Scope / safety

Changes: `app.js`, `index.html`, `interface-2221.js`, `sw.js`, `version.json`.

New files: `label-reorder-242.js`, `label-order-242.css`, this documentation, and self-contained tests in the installer ZIP.

**No changes to the skeletal model, GLBs, structure IDs, anatomy positions, existing label data schema, student permissions, 2.2.38 label occlusion BVH, or Lesson Settings.** Do not publish until verifying in Chrome. Test patch was checked on a source-layout fixture, not your actual Mac checkout.
