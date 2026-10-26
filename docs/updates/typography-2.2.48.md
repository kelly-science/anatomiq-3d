# AnatomIQ Studio 2.2.48 — Menu & Editor Body Typography Audit

## Audit findings

AnatomIQ has accumulated several independent font declarations across its historical CSS layers. In the current source, these include:

| Location | Existing styles observed | Normalized behavior |
|---|---|---|
| Teacher menu commands | `.menu-item` 12px; View special options scale to `.92em` | 12px, weight 500, line-height 1.45 |
| Student menus | 12px, sometimes 11px at mobile breakpoints | 12px for menu options |
| Label Editor | inputs 11px, expanded fields 12px, accordion headings weight 650 | 12px, weight 500 for label text and field entries |
| Nested anatomy menu | 13px for menu choices, 12px for crumbs | 12px for menu choices |
| Explorer structure rows | 12px, hierarchy weight 600 | 12px body-weight 500 for structure names |
| Lesson Settings | mixed inherited, 11px, 12px, 13px | 12px for body labels and form text |
| App Settings/publishing | 12px–13px descriptive labels | 12px for ordinary form labels/entries |

All normalizations use the existing Inter/system font stack, normal letter spacing and casing, and line-height 1.45. Only typographic properties are changed. No geometry, animations, sizes of UI containers, student rules, app logic, lesson data, or file assets change.

**Deliberate exemptions:** Menu-bar titles/triggers; headers, card titles, section captions; keyboard shortcuts; footnotes/hints, timestamps, badge counts and metadata; ordinary action buttons, toolbar glyphs, plus-tab glyph, 3D canvas labels/callouts and quiz scoring typography. Teacher and Student dropdown *menu command rows* are treated as body text despite being HTML `<button>` elements.

## Installation (Mac)

Install after 2.2.47, using a dry run first:

```bash
cd "/Users/steve/Documents/GitHub/anatomiq-3d"
unzip -oq "$HOME/Downloads/AnatomIQ-Studio-Typography-Audit-2.2.48.zip" -d "$HOME/Downloads"
python3 "$HOME/Downloads/AnatomIQ-Typography-Audit-248/install.py" --repo . --dry-run && \
python3 "$HOME/Downloads/AnatomIQ-Typography-Audit-248/install.py" --repo . && \
node --check app.js && node --check sw.js && git status --short
```

## Verification checklist

1. Teacher menu → View → nested system submenus: check that all command lines have matching size and weight; hover surfaces still fill the row.
2. Right panel → Labels tool → collapsed and expanded label editor entries: inspect label names, text fields, description/photo fields. Check drag-reordering still works.
3. Student View → File/Edit/View: verify menu entries match Teacher command typography and that student permissions work normally.
4. File → Lesson Settings → Student Controls and Practical settings; Settings → App Settings; Library → published and local lessons.
5. Confirm project tab heights and `+` glyph, menu headings, keyboard shortcuts, footer hints, and 3D callout labels remain unchanged.

## Constraints

- This is a late-loaded, narrowly scoped CSS layer. `typography-248.css` is the single source for new body-text typography, avoiding editing old stylesheets one at a time.
- If the installer's dry run refuses, do not bypass it. The local checkout may have changed since the publicly observed 2.2.46 files and earlier 2.2.47 patch.
- A simulated browser and source-fixture test is not a substitute for full visual testing in the local AnatomIQ PWA.
