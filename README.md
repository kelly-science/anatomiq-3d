# Anatomy Studio 0.7 — Teacher Menu Bar (Chromebook PWA)

Version 0.7 updates the 0.6 Scene Library app **without changing the saved scene format or database**. The Chromebook PWA now has **File, Edit, View, Library, and Help** menus, with a direct list of locally saved scenes under **Library**.

## Update your existing GitHub Pages app

Replace **these eight files in the repository root** with the contents of this ZIP's `anatomy-pwa-studio/` folder:

1. `index.html`
2. `app.js`
3. `styles.css`
4. `scene-codec.js`
5. `library-store.js`
6. `sw.js`
7. `manifest.webmanifest`
8. **`scene-history.js` — new in 0.7; required for Undo/Redo**

Keep your existing `icons/` files (or upload the supplied icons). **Keep your own `models/ecorche.glb`, if present**. It is not included in the ZIP, and the app continues to support the external model fallback. `README.md`, `package.json`, and the `tests/` folder are optional for runtime.

After committing and the GitHub Pages deployment completes, close and reopen the installed Chromebook PWA while online to get the new cache. **Do not clear Chrome site data** to force an update: this can erase saved library scenes. First create a library backup if a school-managed Chromebook might reset or clear website data.

## Menu overview

| Menu | Actions |
| --- | --- |
| **File** | New lesson, Save to Library, Save as New, Save working draft, Import/Export lesson JSON, Share student link |
| **Edit** | Undo, Redo, Add/Duplicate chapter, Restore hidden bones, Clear selection |
| **View** | Skull/full skeleton, front/back/side views, reset camera |
| **Library** | Open full Scene Library; **directly open one of the twelve most recently saved lessons**; Back up library; Import library backup |
| **Help** | Shortcuts and storage limitations, prepare for offline use |

The full **Scene Library** dialog still supports searching all locally saved lessons, opening, duplicating, exporting, and deleting lessons. Chapters, structure controls, Bone Paint, and custom labels remain in their normal editing panels. The student viewer does not display teacher menus.

### Keyboard shortcuts

- **Ctrl+S / ⌘S** — Save the current lesson to the local Scene Library.
- **Ctrl+Shift+S / ⌘Shift+S** — Save as New.
- **Ctrl+Z / ⌘Z** — Undo one saved edit/history state.
- **Ctrl+Shift+Z / ⌘Shift+Z** or **Ctrl+Y / ⌘Y** — Redo.
- **Ctrl+O / ⌘O** — Open full Scene Library.
- **Esc** — Close the active menu or help dialog.

Undo/Redo stores up to **50 bounded scene snapshots in memory per editing session**; it includes chapter changes, structure visibility, paint, labels, and camera views once a change is committed. Camera dragging and typing are coalesced (about 0.4 seconds of inactivity). It does **not** undo deleting records from the saved library, and history does not survive browser reloads. Native text-field undo continues to work while typing in inputs.

## Storage and student links

The Scene Library remains in **IndexedDB** in this website's Chrome profile, while the current draft auto-saves separately in localStorage. Neither is cloud-synced; export regular JSON backups to Google Drive. Updating GitHub Pages does **not** erase these stores on its own if the website URL/origin stays the same. Shared student links still contain scene data in the URL fragment, with the same chapter/paint/labels/camera encoding as in 0.6. An older published link is not automatically updated when you edit or save a library lesson; regenerate a link after changes.

Teachers and students use the same GitHub Pages site. The teacher/student split is **UI-only, not authenticated access control**; don't put private student records in annotations. Large multi-chapter links may exceed some sharing platforms' URL limits.

## Validation

- `node --test tests/*.test.mjs` passes 14 automated tests covering scene links, chapters, paint, library backup formats, and bounded Undo/Redo.
- JavaScript syntax, DOM-ID references, and HTML ID uniqueness checked.
- Desktop layout inspected in Chromium at 1366×768. Browser policy prevented navigating to a localhost app during automated testing, so **full live 3D model and IndexedDB interaction have not been validated end-to-end on a Chromebook**.

Model geometry credits: Écorché by Charleeh, derived from BodyParts3D and Z-Anatomy, applicable CC BY-SA 4.0 license and underlying attributions. Three.js renderer MIT. For education, not diagnosis.
