# Anatomy Studio 1.8.5 — Model Download & Cache Recovery

This is a cache reliability update to 1.8.4; no geometry regeneration or scene format changes.

## Problem
The previous service worker served any cached model asset first. Replacing a cardiovascular GLB and its JSON catalog on GitHub could leave a device using an older GLB with a newer catalog. Model parsing would fail and the Cardiovascular toggle would be disabled.

## Fixes
- Network-revalidate model GLB and JSON files on online loads; use cached versions during a genuine network failure.
- In App Settings, choose a system and force re-download its models. The app downloads via a cache-busting URL, verifies files and updates **only model entries** in the service worker cache. Never clears lesson libraries or drafts.
- Cardiovascular refresh validates that every FJ mesh ID listed in the uploaded manifest exists as a node in **both** Standard and Detailed GLBs. If GitHub has an incomplete upload or unmatched model, the tool reports the exact error instead of damaging working cache entries.
- Model load failures now appear in the App Settings cardiovascular status rather than only in developer console.
- Includes the earlier corrected `fetch-cardiovascular-gaps.py` installer.

## Deploy
From 1.8.3 or 1.8.4, merge **all files in the small update ZIP**, preserving their relative folder paths: `app.js`, `scene-assets.js`, `sw.js`, `index.html`, `version.json`, `manifest.webmanifest`, plus the included installer correction. Keep your existing `models/` and `vendor/` directories. The complete project ZIP is also supplied if you need a clean reference; neither ZIP includes your previously generated large anatomical models.

After GitHub Pages finishes updating, close and reopen the site once so the new service worker activates. Open App Settings > Force re-download anatomy models > Cardiovascular. Do not clear browser site data: the scene library resides in browser storage.

### Diagnostic notes
If a direct `models/cardiovascular-*.glb` URL returns 404, a GitHub HTML page, or an outdated GLB whose nodes do not match `cardiovascular-structures.json`, the refresh button reports a useful error. In that case, regenerate or re-upload **both** GLBs and the metadata together. Upload each large GLB individually if the GitHub browser declines a batch.
