# AnatomIQ Studio 2.2.49-r2 — Lesson Experience (installer repair)

**r2 fixes only the guarded installer.** The original 2.2.49 dry run refused a whitespace-sensitive `scene-codec.js` anchor. This revision keeps the existing Practical validation intact, appends its chapter-selection check separately, and adds a regression test for reordered whitespace. No feature code, geometry, or lesson data was changed relative to 2.2.49.


**For your existing 2.2.48 checkout** at `/Users/steve/Documents/GitHub/anatomiq-3d`. Guarded dry-run and installer. This is an application-code update, not a mockup.

## Changes

1. **View → Take Screenshot** in both Teacher and Student views. Downloads a PNG of the 3D viewport and currently visible annotation callouts/leader lines. It does not include the control panels. In some configurations browser/security restrictions on WebGL capture may prevent export; the command will report failure rather than claiming the screenshot was saved.
2. **Teacher Orbit selection → Edit Location & Notes.** Adds an Edit button under the selected structure's text. The two fields are chapter-specific, saved in the scene as optional sparse `sd` entries `[structureIndex,location,notes]`. Older scenes without `sd` retain their original descriptions. Student View sees the chapter's authored text but has no editing controls. Edits are part of draft snapshots, per-tab workspaces, undo history and published scenes.
3. **Content-sized chapter bar.** A short chapter list produces a shorter picker; many chapters never exceed the actual camera toolbar's width. Existing horizontal scrolling and previous/next arrows remain.
4. **Practical chapter selection.** Lesson Settings → Practical now includes checkboxes for quiz chapters. Only visible structures and labeled targets from selected chapters are eligible, and answer distractors also come from that eligible pool. Chapter indices follow insert, duplicate, reorder and removal. Previously published lessons continue to use all chapters unless configured otherwise. Selecting no chapters yields no quiz questions, with the existing empty-practical message.
5. **View → Open Student Preview** in Teacher View. Opens the current unsaved lesson in a separate browser tab using the existing scene-link codec. This is a preview, not a GitHub publish. Very large lessons may exceed the existing scene-link size limit; publish to GitHub instead in that case.
6. **Chrome refresh confirmation.** Installs a native `beforeunload` listener. After a user interaction, unsaved teacher edits and student work should trigger Chrome's standard Leave/Cancel prompt on reload/navigation. This is browser-controlled: Chromium may omit the prompt if it sees no qualifying user gesture, and apps cannot force custom wording or block an OS/browser shutdown.

## Installation

Save `AnatomIQ-Studio-Lesson-Experience-2.2.49-r2.zip` in Downloads. Then run:

```bash
cd "/Users/steve/Documents/GitHub/anatomiq-3d"
unzip -oq "$HOME/Downloads/AnatomIQ-Studio-Lesson-Experience-2.2.49-r2.zip" -d "$HOME/Downloads"
python3 "$HOME/Downloads/AnatomIQ-Lesson-Experience-249-r2/install.py" --repo . --dry-run && \
python3 "$HOME/Downloads/AnatomIQ-Lesson-Experience-249-r2/install.py" --repo . && \
node --check app.js && \
node --check practical-quiz.js && \
node --check scene-codec.js && \
node --check lesson-experience-249.js && \
node --check sw.js && \
python3 -m unittest discover -s "$HOME/Downloads/AnatomIQ-Lesson-Experience-249-r2/tests" -v && \
git status --short
```

The installer refuses conflicting anchors or an unexpected project version **before writing anything** and creates a timestamped sibling backup outside the repository. No anatomy models, materials, structure ordering or the 2.2.38 label occlusion acceleration are changed. Keep the new CSS/JS files when committing.

## Acceptance checks in Chrome

1. With two chapters, verify the chapter strip is narrower than the camera toolbar; create additional chapters and confirm scroll appears before it exceeds that width.
2. Use Teacher View → View → Take Screenshot. Check that the PNG includes the model and visible annotation text; repeat in Student View.
3. Select a carpal with the Orbit tool, edit its Location and Notes, switch chapters, confirm different text in each, switch back, save/reload and confirm persistence. In Student View check content but no Edit action.
4. Set Practical to only the carpal chapter, with fewer than four visible structures. Confirm each question and each distractor comes from structures visible in that chapter. Toggle other chapters and repeat; test drag/reorder chapters and save/reload.
5. Open Student Preview; it should create a new Chrome tab using the *current draft*, without publishing or changing your current teacher tab.
6. Edit a title or structure note, then use Chrome Reload (⌘R). Browser should offer the standard confirmation; Cancel should preserve the working page. Save a backup before testing.
7. Rotate the 13-label skull and confirm the previously successful BVH improvement remains intact.

**Testing limitations:** Automated checks and a simulated source fixture passed in this environment. The real repository on your Mac is not available here, so the local dry run and interactive Chrome acceptance tests are still required. Do not publish until they pass. If the dry run fails, copy the exact `REFUSED:` output; never bypass its source checks.
