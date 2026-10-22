# Anatomy Studio 0.6 — Scene Library (Chromebook PWA)

Anatomy Studio now includes a **teacher-only Scene Library** that stores **multiple named lessons on your Chromebook**. Each saved lesson can have multiple chapters with independent bone visibility, bone paint, custom labels, saved camera views, and student permissions. Student share links continue to work as before—**no database or server is needed to view them**.

## Updating an existing GitHub Pages installation

Replace/upload these **seven files in the repository root**:

1. `index.html` — replace
2. `app.js` — replace
3. `styles.css` — replace
4. `scene-codec.js` — replace (format is backward-compatible)
5. `sw.js` — replace (new cache version 0.6)
6. `manifest.webmanifest` — replace
7. **`library-store.js` — new, required**

Keep the existing `icons/` folder and `models/ecorche.glb` if you host a model locally. The ZIP includes icons but **does not** contain the full 3D geometry. You may also upload README, package.json, and tests, but those aren't required at runtime.

GitHub Pages should continue publishing from the same repository/URL. Wait for deployment, then close and reopen the installed PWA online to update its service worker. **Do not clear the site's storage to force an update** without first exporting all important locally stored drafts and library lessons.

## How to use the Scene Library

**Create and save a lesson**

1. Edit the skull/full skeleton as usual, including chapters, labels, paint, and camera positions.
2. Give the full lesson a name in **Lesson title**.
3. Click **Save to Library**. This saves the whole lesson (all chapters) in the local browser database.
4. Continue editing and click **Save to Library** again to update the *same* lesson.
5. To preserve the original and make a separate version, use **Save as New**.

**Manage saved scenes**

Click **Scene Library** in the top bar or **Open Library** in the teacher sidebar. Search saved titles or chapter names. For each saved lesson:

- **Open:** Load it back into Teacher Studio for further editing.
- **Duplicate:** Add a copy to the library with “(copy)” in its title.
- **Export:** Download that single editable lesson as JSON.
- **Delete:** Remove the local library entry after confirmation. The currently open working draft is not forcibly closed, and previously shared student links continue to work.

**Back up or transfer the whole library**

- Choose **Back up library** to download one `.json` file containing every saved lesson, including chapters, labels, painted bones, and camera positions.
- Store the file somewhere persistent, e.g. Google Drive, rather than relying only on your Chromebook's Downloads folder.
- On another Chromebook (or after reinstalling), open **Scene Library → Import backup**, choose the saved backup JSON, and all imported lessons will be added as **new library entries**, without overwriting existing entries.
- You may continue importing individual older lesson files through the existing **Import JSON project** button in Structure Details. To keep one of those lessons in the library, open it, then use **Save to Library**.

Your previous **0.5 working draft** is automatically restored as before; it does not silently become a library entry. Use **Save to Library** once to add it.

## Important storage limitations

- The Scene Library uses **IndexedDB** in Chrome. Its data is local to **this website URL and Chrome profile**. It does **not sync across devices**, Gmail, or Google Drive automatically. A Chromebook reset, Chrome profile removal, school administration cleanup, site-data clearing, private browsing, or storage eviction may delete it. **Regular JSON backups are strongly recommended.**
- The current *working draft* continues to autosave separately in `localStorage`. Autosaving a draft does **not** overwrite a saved Scene Library entry; use Save to Library to commit revisions.
- Library entries save **only the model's edit settings**, not copies of the GLB skeleton itself. The same model is reused by all lessons and student links.
- Maximum **500 lessons** per local library. Whole-library backup files are limited to **16 MB** for importing. Individual lessons retain the existing maximum 12 chapters, 240 total labels, and 160 KB uncompressed scene size.
- The anatomy model's structure fingerprint must match for saved scenes to open. To pin the anatomy model to a specific version, host the matching `models/ecorche.glb` at the same GitHub Pages origin.
- Shared student links continue to encode the entire scene in the URL. Editing a saved lesson **does not update an older published link**: select **Share student link** again after changes. Long multi-chapter links may exceed limits imposed by some learning platforms.
- Students opening a published `#scene=...` link get read-only Student View. The library only appears in Teacher Studio. This is an interface separation, **not a security/login system**. Anyone who can access the base website can use Teacher Studio on their own browser. Don't include private student data in scene labels.

If you want a **single shared library accessible from your own Mac, Chromebook, and iPad**, the next version would need a cloud backend or file sync with authentication. Version 0.6 intentionally needs no database account or server.

## Hosting and offline notes

GitHub Pages serves the HTML/JavaScript/PWA files and the model (when uploaded to `models/ecorche.glb`). Service worker `anatomy-v0.6.0` caches the new `library-store.js` module as part of the application shell. Save the 3D model for offline use using **Save offline** after its first successful load.

Storage of saved lessons and caching of 3D files are **separate** browser features. Clearing cache alone may reload model files; clearing **site data** can erase the library. The library can still be used offline when the PWA and model have already been cached.

## Validation

`node --test tests/*.test.mjs` runs the share-link, chapter, paint, and library backup-format tests. Syntax, all literal DOM element IDs, and package structure were checked. Automated browser launch was restricted in this environment, so **IndexedDB interactions in a real Chromebook Chrome session and 3D model rendering have not yet been validated end-to-end**.

3D geometry: Écorché by Charleeh, based on BodyParts3D and Z-Anatomy (CC BY-SA 4.0, with applicable underlying attributions). Renderer: Three.js (MIT). Educational visualization, not a clinical reference.
