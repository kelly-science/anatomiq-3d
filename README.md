# AnatomIQ 3D 2.1.1 — Kidney Surface Finish

This is a small app-only patch for the urinary system.

## What it changes

- Makes the **kidneys** appear glossier / shinier.
- Leaves the **ureters, bladder, and urethra** unchanged.
- Does **not** regenerate urinary GLBs.

## Install

From the root of your `anatomiq-3d` repository, run:

```bash
python3 tools/apply-kidney-shine-211.py
```

## Files changed

- `app.js`
- `sw.js`
- `version.json`

A backup is created in `.kidney-shine-211-backup/`.
