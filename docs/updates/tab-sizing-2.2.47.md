# AnatomIQ Studio 2.2.47 — Workspace tab sizing correction

This patch repairs the **actual application stylesheet**, not a screenshot. It is designed for the **2.2.46 Tab/Menu Polish** installation.

## What was wrong

The 42px Teacher menu bar has 4px vertical padding. Its workspace tab strip therefore only has about 33px of usable height. The 2.2.46 patch left the original project-tab 7px top margin in place and gave the add-tab circle both a 30px height and a 7px top margin. The tab became shortened and the circle extended beyond its clipped container.

## What changes

- The project tab now fills the available tab-strip height without the inherited 7px top margin.
- The circular new-tab button is **26 × 26px**, centered vertically in the same content row, with a centered 12px crosshair-style plus glyph.
- Dropdown hover areas, menu highlighting, and all navigation behavior remain as in 2.2.46.
- CSS cache revision and app version are updated to **2.2.47**.

No changes to lesson data, labels, models, student access, chapter storage, saved tabs, or the successful 2.2.38 label-occlusion optimization.

## Install

Download `AnatomIQ-Studio-Tab-Sizing-2.2.47.zip` to Downloads, then run:

```bash
cd "/Users/steve/Documents/GitHub/anatomiq-3d"
unzip -oq "$HOME/Downloads/AnatomIQ-Studio-Tab-Sizing-2.2.47.zip" -d "$HOME/Downloads"
python3 "$HOME/Downloads/AnatomIQ-Tab-Sizing-247/install.py" --repo . --dry-run && \
python3 "$HOME/Downloads/AnatomIQ-Tab-Sizing-247/install.py" --repo . && \
node --check app.js && \
node --check sw.js && \
git status --short
```

The installer checks the exact expected 2.2.46 markers. If it refuses, **do not bypass the guard**. It backs up modified files outside the Git repository and rolls back if writing fails.

## Verify in Chrome

1. Reload locally with cache bypass enabled if necessary.
2. Check the project tab has the full menu-row height (not a short strip).
3. Check the complete 26px add-tab circle is visible, with its plus centered.
4. Check the Library dropdown and menu hover highlights still fill their rows.
5. Open/close a second tab, switch projects, then test the existing label-heavy skull scene.

Tests use the same menu-bar sizing rules as the current AnatomIQ code, but the patch still needs visual confirmation in the full application.
