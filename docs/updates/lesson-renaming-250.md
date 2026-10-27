# AnatomIQ 2.2.50 — Lesson and chapter renaming

- The old **Teacher Studio** card is hidden; its two text inputs and status nodes remain in the DOM because the lesson serializer, autosave, and workspace tabs depend on them. No saved data is removed.
- In Teacher View, click a **project tab title** to edit that lesson name in place. Enter commits, Escape cancels, and clicking elsewhere commits. Clicking elsewhere on a tab still switches projects.
- **File → Rename Lesson…** opens that exact same active-tab inline editor.
- Under **Lesson Chapters**, click the **chapter name** to edit it in place. Enter commits, Escape cancels; the chapter number button opens that chapter (the bottom chapter bar still switches chapters as before).
- Chapter names remain per-project `chapters[i].t` strings; no structure, label, chapter ID, or compatibility fingerprint is changed.
- Existing draft and GitHub publishing paths continue to read from the original hidden `project-title` and `scene-title` inputs.
- Models, shader, and label occlusion BVH are untouched.

## Manual acceptance check
1. Rename a lesson in tab A; create tab B and rename it; switch back to A and verify names are independent.
2. Use File → Rename Lesson; press Escape, then Enter; verify cancel and commit.
3. Rename an inactive chapter from the Lesson Chapters card. Confirm the currently displayed chapter does not switch unexpectedly.
4. Rename the active chapter; switch chapters and reload. Verify the new title persists and the student chapter picker reflects it.
5. Save to Library and reopen, export and reimport a lesson, and ensure names persist.
6. Rotate a skull with labels to verify that the 2.2.38 occlusion performance remains unchanged.
