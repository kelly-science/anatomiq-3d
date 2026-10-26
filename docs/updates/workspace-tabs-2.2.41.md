# AnatomIQ Studio 2.2.41 — Lesson Settings, keyboard shortcuts and Teacher project tabs

## Prerequisite

Requires the local **2.2.40 Teacher Toolbar** update, with `teacher-tools-2240.js` and `label-occlusion-bvh.js`. The installer refuses unexpected source versions and makes a backup in a sibling folder outside your Git repository. No models or saved scene files are rewritten.

## What changed

- **File → Lesson Settings…** opens a modal containing the **existing** Student Controls and Practical Examination sections, moved out of the right panel. Their input elements and listeners are preserved.
- **Teacher project tabs** appear in the menu bar, just after Help. Click **+** for a new project, a tab title to switch, or **×** to close after confirming. Each tab stores an independent validated project snapshot (chapters, labels, colors, camera, practical and sharing settings), Scene Library record ID, and GitHub publishing source reference. File → New lesson also creates a new tab. Maximum 10 tabs to protect browser storage.
- All tab drafts are stored locally on this device; they are **not** automatically published to GitHub or saved into the permanent Scene Library. Use File → Save to Library or Publish / Share for a permanent or live copy. Workspace tabs are restored on reload, if the browser retains local storage. Avoid clearing site data.
- The **Working draft / saved status** moves to the top-right header beside offline connection status. It no longer crowds the menu bar.
- Version metadata and About fallback advance to **2.2.41**.
- The successful 2.2.38 BVH occlusion optimization remains unchanged.

### New shortcuts

| Action | Mac | Windows / Chromebook |
|---|---|---|
| Find | ⌘⇧F | Ctrl+Shift+F |
| Isolate selected structure | ⌘⇧I | Ctrl+Shift+I |
| Fade / Restore structure | ⌘⇧- | Ctrl+Shift+- |
| Labels tool | ⌘⇧L | Ctrl+Shift+L |
| Paint tool | ⌘⇧P | Ctrl+Shift+P |
| Select tool | ⌘⇧S | Ctrl+Shift+S |
| Orbit tool | ⌘⇧O | Ctrl+Shift+O |

Shortcuts operate while the viewer has focus, not while text fields or dialogs have focus. Student view retains permitted Find but not Teacher editing shortcuts. Some browser or OS shortcuts can override page handlers.

## Install

Save `AnatomIQ-Studio-Workspace-Tabs-2.2.41.zip` to Downloads, then in Terminal:

```bash
cd "/Users/steve/Documents/GitHub/anatomiq-3d"
unzip -oq "$HOME/Downloads/AnatomIQ-Studio-Workspace-Tabs-2.2.41.zip" -d "$HOME/Downloads"
python3 "$HOME/Downloads/AnatomIQ-Workspace-Tabs-241/install.py" --repo . --dry-run && \
python3 "$HOME/Downloads/AnatomIQ-Workspace-Tabs-241/install.py" --repo . && \
node --check app.js && \
node --check workspace-tabs-241.js && \
node --check teacher-tools-2240.js && \
node --check sw.js && \
git status --short
```

## Acceptance tests before publishing

1. Open File → Lesson Settings: both Student Controls and Practical Examination appear, and **neither** remains in Structure Details. Change a setting, close and reopen the dialog, and verify it remains selected.
2. Make changes in Project A, click + to open Project B, edit Project B, then return to A: names, labels, chapters, camera and practical settings must stay separate.
3. Open a saved library lesson into a fresh tab and save it; verify the correct library record updates. Open a published GitHub lesson in another tab and verify the correct original slug is used for republishing.
4. Close a tab, cancel the confirmation, then confirm to close it; verify other tabs remain intact. Reload and ensure surviving tabs restore.
5. Test shortcuts with the model focused. Verify old ⌘F, ⌘I and ⌘- no longer trigger their AnatomIQ actions.
6. Check the 13-label skull rotation remains smooth; this update must not change `label-occlusion-bvh.js` or its raycast path.
7. Student View must not display Teacher tabs, Lesson Settings, or Teacher editing shortcuts.

## Limitations and safeguards

- Each project tab is an independent *working draft* in **one** browser window. This is not a multi-window synchronizer. If you open a second AnatomIQ browser window at the same origin, the workspace storage may conflict. Use a single window for tabbed editing.
- Tabs are backed up in the browser's local storage and are subject to browser quota. The patch stops opening new tabs if its current drafts cannot be saved. Export or Save to Library important projects.
- The app uses one 3D rendering context and swaps validated project snapshots between tabs; models are not duplicated in GPU memory.
- The standalone tests cover guarded source patching and simulated browser interactions. **A full run against your exact current Mac checkout and 3D scene still needs local verification.**
