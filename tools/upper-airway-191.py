#!/usr/bin/env python3
"""Source-verified AnatomIQ 3D 1.9.1 upper-airway selector and safety checks.

Run by install-upper-airway-191.sh. Keeps the 1.9.0 respiratory manifest as
an exact prefix and refuses to publish partially retrieved geometry.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path

# Only source-backed anatomy; note that muscles do not represent airway cavities.
CORE = (
    ("FJ2761", "Tongue"),
    ("FJ2762", "Uvular muscle"),
    ("FJ2741", "Left levator veli palatini"),
    ("FJ2753", "Right levator veli palatini"),
    ("FJ2748", "Left tensor veli palatini"),
    ("FJ2760", "Right tensor veli palatini"),
    ("FJ2743", "Left palatopharyngeus"),
    ("FJ2755", "Right palatopharyngeus"),
    ("FJ2747", "Left superior pharyngeal constrictor"),
    ("FJ2759", "Right superior pharyngeal constrictor"),
    ("FJ2754", "Left middle pharyngeal constrictor"),
    ("FJ2742", "Right middle pharyngeal constrictor"),
    ("FJ2740", "Left inferior pharyngeal constrictor"),
    ("FJ2752", "Right inferior pharyngeal constrictor"),
    ("FJ1252", "Maxillary gingiva"),
    ("FJ1253", "Mandibular gingiva"),
    ("FJ2814", "Lip"),
)
EXPECTED = dict(CORE)


def load_csv(path: Path):
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def verify_catalog(path: Path):
    rows = load_csv(path)
    by_id = {r["fj_id"]: r for r in rows}
    if len(by_id) != len(rows):
        raise ValueError("Provider source manifest contains duplicate FJ identifiers")
    for fj, name in CORE:
        row = by_id.get(fj)
        if not row or row.get("name") != name:
            raise ValueError(f"BodyParts3D manifest mismatch: {fj}, expected {name!r}")
        competing = [r["fj_id"] for r in rows if r["name"].casefold() == name.casefold()]
        if competing != [fj]:
            raise ValueError(f"Name-only downloader would select the wrong meshes for {name}: {competing}")
    return rows


def verify_subset(path: Path):
    manifest = path / "MANIFEST.csv"
    if not manifest.is_file():
        raise ValueError(f"Missing downloaded subset manifest: {manifest}")
    rows = load_csv(manifest)
    if {row["fj_id"] for row in rows} != set(EXPECTED) or len(rows) != len(EXPECTED):
        missing = set(EXPECTED) - {row["fj_id"] for row in rows}
        extra = {row["fj_id"] for row in rows} - set(EXPECTED)
        raise ValueError(f"Incomplete upper-airway download, missing={sorted(missing)}, extra={sorted(extra)}")
    for row in rows:
        fj = row["fj_id"]
        if row["name"] != EXPECTED[fj]:
            raise ValueError(f"Incorrect source name: {fj} {row['name']}")
        obj_rel = Path(row.get("obj", ""))
        if obj_rel.is_absolute() or ".." in obj_rel.parts:
            raise ValueError(f"Unsafe relative source path: {obj_rel}")
        obj = path / obj_rel
        if not obj.is_file() or obj.stat().st_size < 300:
            raise ValueError(f"Missing or empty source OBJ: {obj}")
    return len(rows)


def verify_previous(path: Path):
    data = json.loads(path.read_text())
    old = [x["id"] for x in data["structures"]]
    if len(old) != len(set(old)) or not old:
        raise ValueError("Previous manifest has duplicate/no structure IDs")
    overlap = set(old).intersection(EXPECTED)
    if overlap:
        raise ValueError(f"These upper-airway IDs already exist; refusing a duplicate: {sorted(overlap)}")
    if not any(s.get("category") == "lung" for s in data["structures"]):
        raise ValueError("Previous catalog is missing the expected respiratory lung layer")
    return old


def verify_result(previous: Path, current: Path):
    old = [x["id"] for x in json.loads(previous.read_text())["structures"]]
    data = json.loads(current.read_text())
    rows = data["structures"]
    final = [x["id"] for x in rows]
    if final[:len(old)] != old:
        raise ValueError("Compatibility failure: existing respiratory order changed")
    if len(final) != len(old) + len(CORE) or set(final[len(old):]) != set(EXPECTED):
        raise ValueError("Final manifest does not contain the exact expected 1.9.1 additions")
    for row in rows[len(old):]:
        if row["name"] != EXPECTED[row["id"]] or row["category"] != "airway":
            raise ValueError(f"Incorrect upper-airway row: {row}")
        if min(row["standard_triangles"], row["detailed_triangles"]) <= 0:
            raise ValueError("One of the upper-airway meshes is empty")
    reg_prev = json.loads(previous.read_text()).get("registration")
    if data.get("registration") != reg_prev:
        raise ValueError("Registration frame changed; rejecting inconsistent geometry")
    return len(old), len(rows)


def main():
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="command", required=True)
    for cmd in ("patterns", "verify-catalog", "verify-subset", "verify-previous"):
        sub.add_parser(cmd).add_argument("file", type=Path)
    t = sub.add_parser("verify-result")
    t.add_argument("previous", type=Path)
    t.add_argument("current", type=Path)
    a = p.parse_args()
    if a.command in ("patterns", "verify-catalog"):
        verify_catalog(a.file)
        if a.command == "patterns":
            for _, name in CORE:
                print("^" + re.escape(name) + "$")
        else:
            print(f"PASS: {len(CORE)} exact FJ IDs in pinned provider manifest")
    elif a.command == "verify-subset":
        print(f"PASS: {verify_subset(a.file)} real OBJ meshes and exact provider IDs")
    elif a.command == "verify-previous":
        print(f"PASS: {len(verify_previous(a.file))} prior structures preserved as prefix")
    else:
        old, new = verify_result(a.previous, a.current)
        print(f"PASS: {old} prior structures plus {new-old} new = {new} total")


if __name__ == "__main__":
    main()
