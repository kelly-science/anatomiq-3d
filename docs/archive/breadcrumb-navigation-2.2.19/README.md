# Archived: AnatomIQ 2.2.18–2.2.19 top breadcrumb explorer

**Status:** Retired from the live UI in **2.2.20**. Preserved here intentionally in case top-of-viewer breadcrumbs are reconsidered. Do not load or execute the `.txt` files directly.

## Why it was removed

The top breadcrumb implemented a second navigation surface for systems, divisions, regions, and structures. The lower-left Anatomical Structures explorer already provides these capabilities and also exposes the complete structure catalog, chapter visibility and multi-selection. Maintaining both controls confused users and increased UI clutter.

## Saved implementation

- `breadcrumb-original-2.2.19.js.txt` — exact original 2.2.19 JavaScript for the transient division state and top navigation, including the rendered breadcrumb trail and division dropdown.
- `breadcrumb-original-2.2.19.css.txt` — exact existing `anatomy-divisions-2218.css` styling for the breadcrumb UI.

**Important:** `anatomy-divisions-2218.mjs` is still actively used by the sidebar for its anatomical taxonomy and path lookup. The 2.2.20 release does not delete or replace it. The `divisionOpen`, `divisionClose`, `divisionNavReset` and `divisionScope` transient-isolation code remains live. Only the duplicate top navigation and dropdown are retired. The old CSS source file remains in the repository, but is no longer linked from the HTML.

## How to bring it back

1. Compare the archived JavaScript against the current division navigation state in `app.js`; do **not** copy the whole archived block over modern code. Restore only the breadcrumb DOM/rendering functions and the necessary state variables/listener hooks.
2. Reintroduce the breadcrumb CSS through `index.html` and bump its cache query.
3. Ensure it reads the current `anatomyPath` hierarchy; avoid creating a separate classification table.
4. Keep sidebar as authoritative for selecting/revealing/painting anatomy; make any restored breadcrumb an optional context-only bar.
5. Test student name permissions, saved-lesson restoration, temporary division isolation, Practical Quiz, keyboard selection and Safari/iOS PWA layout.
6. Update `version.json`, `sw.js`, and HTML resource revision together so old PWA caches do not retain stale breadcrumb behavior.

The archive is source documentation, not a second runtime feature or a separate navigation module.
