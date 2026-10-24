#!/usr/bin/env python3
"""Guarded, idempotent app integration for 1.9.1 upper-airway models.

Does not change lesson codec, stable IDs, cardinality order, or cardiovascular assets.
"""
import argparse
import json
import re
from pathlib import Path

UPPER_MATCH = (r"\b(?:nasal cavity|nasal concha|nasopharynx|oropharynx|"
               r"laryngopharynx|pharynx|pharyngeal constrictor|palatopharyngeus|"
               r"levator veli palatini|tensor veli palatini|tongue|uvular muscle|"
               r"maxillary gingiva|mandibular gingiva|lip)\b")


def transform(root: Path):
    paths = {name: root / name for name in ["respiratory-model.js", "app.js", "sw.js", "version.json", "index.html", "manifest.webmanifest"]}
    needed = ["respiratory-model.js", "app.js", "sw.js", "version.json"]
    for name in needed:
        if not paths[name].is_file():
            raise ValueError(f"Requires local 1.9.0 project file: {name}")
    original = {name: path.read_text(encoding="utf-8") for name, path in paths.items() if path.is_file()}
    model = original["respiratory-model.js"]
    if "respiratoryEntries" not in model or "respiratoryFamily" not in model:
        raise ValueError("This is not the AnatomIQ 3D 1.9.0 respiratory module")
    # Insert the upper-airway names in the existing classification, preserving other families.
    # Existing 1.9.0 has a single upper-family regexp and return on one line.
    marker = "if(/\\b(?:nasal cavity|nasal concha|pharynx|nasopharynx|oropharynx)\\b/.test(n))return 'upper';"
    replacement = f"if(/{UPPER_MATCH}/.test(n))return 'upper';"
    if marker in model:
        model = model.replace(marker, replacement)
    elif replacement not in model:
        raise ValueError("Unknown respiratoryFamily upper-airway classification; refusing to edit")
    original["respiratory-model.js"] = model

    app = original["app.js"]
    if "respiratory" not in app:
        raise ValueError("app.js has no respiratory integration; merge 1.9.0 before 1.9.1")
    match = re.search(r"const APP_VERSION\s*=\s*['\"](\d+\.\d+\.\d+)['\"]", app)
    if not match or match.group(1) not in ("1.9.0", "1.9.1"):
        raise ValueError(f"Expected 1.9.0 app.js, found version {match.group(1) if match else 'unknown'}")
    if match.group(1) == "1.9.0":
        app = app[:match.start(1)] + "1.9.1" + app[match.end(1):]
    original["app.js"] = app

    sw = original["sw.js"]
    sm = re.search(r"const VERSION\s*=\s*['\"]anatomy-v(\d+\.\d+\.\d+)['\"]", sw)
    if not sm or sm.group(1) not in ("1.9.0", "1.9.1"):
        raise ValueError(f"Expected 1.9.0 service worker, found {sm.group(1) if sm else 'unknown'}")
    if sm.group(1) == "1.9.0":
        sw = sw[:sm.start(1)] + "1.9.1" + sw[sm.end(1):]
    if "'./respiratory-model.js'" not in sw and '"./respiratory-model.js"' not in sw:
        raise ValueError("1.9.0 service worker shell does not include respiratory-model.js")
    if "respiratory-standard.glb" not in sw or "respiratory-structures.json" not in sw:
        raise ValueError("Missing 1.9.0 respiratory refresh/offline support in sw.js")
    original["sw.js"] = sw

    v = json.loads(original["version.json"])
    if v.get("version") not in ("1.9.0", "1.9.1"):
        raise ValueError(f"Expected 1.9.0 version.json; got {v.get('version')}")
    v["version"] = "1.9.1"
    v["notes"] = "Source-backed tongue, lip, gingiva and pharyngeal muscles with selective surface refinement; preserve pulmonary circulation and saved lesson IDs."
    original["version.json"] = json.dumps(v, indent=2) + "\n"
    for n in ("index.html", "manifest.webmanifest"):
        if n in original:
            original[n] = original[n].replace("1.9.0", "1.9.1")
    return original


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--root", type=Path, default=Path("."))
    p.add_argument("--check-only", action="store_true")
    a = p.parse_args()
    changed = transform(a.root)
    if a.check_only:
        print("PASS: 1.9.0 app integration accepts the 1.9.1 edits")
        return
    for name, text in changed.items():
        path = a.root / name
        if path.read_text(encoding="utf-8") != text:
            path.write_text(text, encoding="utf-8")
            print("Updated", name)
    print("PASS: 1.9.1 respiratory upper-airway grouping, version, and worker cache revision")


if __name__ == "__main__":
    main()
