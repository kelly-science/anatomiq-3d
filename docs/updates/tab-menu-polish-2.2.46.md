# AnatomIQ Studio 2.2.46 — Tab and Menu UI Polish

This is an **actual application source patch**, not an image modification.

## Changes

- The new-project `+` glyph is flex-centered within its circle.
- The circle is vertically centered on the visible project tab (including the tab's 7-pixel top offset).
- Teacher menu triggers now fill the menu row height when hovered/open, instead of forming narrow text-height pills.
- Teacher dropdown item highlights, including Local Library entries, fill their entire selectable row width.
- Version strings and offline CSS cache are updated together.

There are **no changes** to models, lesson JSON, saved drafts, anatomy structure IDs, occlusion BVH, or user data. Student menus remain untouched.

## Install on Mac

Unzip `AnatomIQ-Studio-Tab-Menu-Polish-2.2.46.zip` in Downloads. Then run:

```bash
cd "/Users/steve/Documents/GitHub/anatomiq-3d"

python3 "$HOME/Downloads/AnatomIQ-Tab-Menu-Polish-246/install.py" --repo . --dry-run && \
python3 "$HOME/Downloads/AnatomIQ-Tab-Menu-Polish-246/install.py" --repo . && \
node --check app.js && \
node --check workspace-tabs-241.js && \
node --check sw.js && \
git status --short
```

Supported prior versions are 2.2.44 and 2.2.45 (both contain the original workspace-tabs feature). If the dry run refuses, do not bypass its safeguards. It creates a complete backup of modified files outside your repository.

## Verify

1. Reload AnatomIQ in Chrome with cache bypass if necessary; check the new `+` button circle and glyph center with the adjacent project tab.
2. Hover over File, Edit, Library, View, Settings, and Help. The hover and open-state highlights should fill the full menu row height.
3. Open Library, and hover over a saved lesson and the backup actions. The highlight should cover the entire menu item row.
4. Open a second project tab and switch between the two. Confirm lesson data is preserved.
5. Check **File → About**, then test the existing 13-label skull scene to ensure the occlusion optimization is unchanged.

The automatic tests cover source compatibility and CSS layout rules. Verify appearance in your actual Chrome viewer before publishing.
