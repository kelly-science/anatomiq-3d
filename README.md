# AnatomIQ 3D 2.0.3 — Nervous Visual Tuning

This small update patches your existing AnatomIQ 2.0.2 project to improve the *appearance* of the nervous system without regenerating the GLBs.

## What it changes

- Changes the outer brain to a more realistic **pink cortical tone**.
- Gives **deep brain structures** more reference-like color separation:
  - ventricles: blue-gray
  - thalamic regions: muted purple
  - hypothalamic / deep nuclei regions: warm brown tones
  - basal ganglia: darker brown-red tones
  - cerebellum / brainstem: softer tan-pink tones
- Renders **dura / meninges** more transparently so they do not obscure the brain.
- Improves right-panel nervous-system descriptions for deep brain structures.

## Files patched

- `nervous-model.js`
- `app.js`
- `sw.js`
- `version.json`

## Install

Copy the included `tools/apply-nervous-visuals-203.py` into your existing `anatomy-pwa-studio/tools/` folder, then run:

```bash
python3 tools/apply-nervous-visuals-203.py
```

The script creates a backup folder named `.nervous-203-backup` before changing files.

## After patching

Commit and deploy these updated app files to GitHub:

- `app.js`
- `nervous-model.js`
- `sw.js`
- `version.json`

No nervous-system GLB regeneration is required for this update.

## Notes

This update changes presentation and grouping only. It does **not** add new meshes.
