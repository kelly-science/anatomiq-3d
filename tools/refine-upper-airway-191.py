#!/usr/bin/env python3
"""AnatomIQ 3D 1.9.1: source-preserving, selective refinement of the NEW oral meshes.

The original 1.9.0 converter remains unchanged. Only the 17 source-backed
upper-airway OBJs are copied to an isolated refined subset; 1.9.0 lung/airway
sources, saved ID ordering, cardiovascular geometry, and registration are untouched.

Subdivision improves interpolation/silhouette, but DOES NOT invent anatomical
landmarks absent from BodyParts3D 4.3. Loop smoothing is attempted only where
conservative shape-tolerance checks pass, otherwise linear midpoint subdivision
preserves the original faceted surface. Output GLBs retain source attribution.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import shutil
import sys
from pathlib import Path

import numpy as np
import trimesh

# To visually match respiratory structures, aim for several thousand faces in
# Detailed mode while avoiding unnecessary growth of already-detailed sources.
# 1.9.0 converter handles the Standard / Detailed reduction to 3,200 / 16,000.
TARGET_DETAILED_FACES = 4200
MAX_SUBDIVISIONS = 3
MAX_INTERMEDIATE_FACES = 32000
# The smoothing pass is accepted only when it retains the original envelope.
MAX_BOUND_DRIFT_DIAG = 0.025
MAX_CENTER_DRIFT_DIAG = 0.015
MAX_CLOSED_VOLUME_CHANGE = 0.12
MAX_SURFACE_AREA_CHANGE = 0.20


def sha256_file(path: Path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def read_source_mesh(path: Path):
    # Exactly mirrors the 1.9.0 build-digestive-detail.py `load_mesh` semantics.
    scene = trimesh.load(path, force='scene', process=False)
    meshes = [g for g in scene.geometry.values()
              if isinstance(g, trimesh.Trimesh) and len(g.faces)]
    if not meshes:
        raise ValueError('Missing geometric triangles: ' + str(path))
    mesh = meshes[0].copy() if len(meshes) == 1 else trimesh.util.concatenate(meshes)
    # Finite geometry is a precondition; do NOT call trimesh.repair.fill_holes.
    if len(mesh.faces) < 5 or not np.isfinite(mesh.vertices).all():
        raise ValueError('Invalid input geometry: ' + str(path))
    if np.min(mesh.faces) < 0 or np.max(mesh.faces) >= len(mesh.vertices):
        raise ValueError('Invalid face indices: ' + str(path))
    return mesh


def safe_mesh(mesh, name='mesh'):
    if not len(mesh.vertices) or len(mesh.faces) < 5:
        raise ValueError(f'{name}: empty geometry')
    v = np.asarray(mesh.vertices)
    if not np.isfinite(v).all():
        raise ValueError(f'{name}: nonfinite geometry')
    if int(np.min(mesh.faces)) < 0 or int(np.max(mesh.faces)) >= len(v):
        raise ValueError(f'{name}: illegal face indices')
    # Geometry must not generate collapsed triangles from refinement.
    edges01 = v[mesh.faces[:, 1]] - v[mesh.faces[:, 0]]
    edges02 = v[mesh.faces[:, 2]] - v[mesh.faces[:, 0]]
    areas2 = np.linalg.norm(np.cross(edges01, edges02), axis=1)
    span = float(np.linalg.norm(v.max(axis=0) - v.min(axis=0)))
    area_eps = max(span * span * 1e-14, 1e-25)
    invalid = int(np.count_nonzero(areas2 <= area_eps))
    if invalid > 0:
        raise ValueError(f'{name}: {invalid} zero-area or collapsed faces')


def envelope_preserved(original, candidate):
    a = np.asarray(original.bounds, dtype=np.float64)
    b = np.asarray(candidate.bounds, dtype=np.float64)
    diagonal = float(np.linalg.norm(a[1] - a[0]))
    if diagonal <= 1e-12:
        return False, {'reason': 'nearly zero-size anatomical structure'}
    bound_shift = float(np.max(np.abs(a-b)) / diagonal)
    center_shift = float(np.linalg.norm(np.mean(a, axis=0) - np.mean(b, axis=0)) / diagonal)
    area_before = float(original.area)
    area_after = float(candidate.area)
    area_change = abs(area_after / area_before - 1.0) if area_before > 0 else float('inf')
    volume_change = None
    if original.is_watertight and candidate.is_watertight and abs(original.volume) > 1e-15:
        volume_change = abs(candidate.volume / original.volume - 1.0)
    metrics = {
        'bound_shift_fraction_of_diagonal': round(bound_shift, 6),
        'center_shift_fraction_of_diagonal': round(center_shift, 6),
        'surface_area_change_fraction': round(area_change, 6),
        'closed_volume_change_fraction': None if volume_change is None else round(float(volume_change), 6),
    }
    allowed = (bound_shift <= MAX_BOUND_DRIFT_DIAG and
               center_shift <= MAX_CENTER_DRIFT_DIAG and
               area_change <= MAX_SURFACE_AREA_CHANGE and
               (volume_change is None or volume_change <= MAX_CLOSED_VOLUME_CHANGE))
    return allowed, metrics


def refine(mesh, target_faces=TARGET_DETAILED_FACES, max_rounds=MAX_SUBDIVISIONS):
    """Return (refined mesh, audit). Each round quadruples triangle counts.

    Prioritize source fidelity: accept Loop-smoothed topology only if the final
    shape remains close to the source; otherwise use interpolation-only mesh.
    This also handles older trimesh versions missing remesh.subdivide_loop.
    """
    safe_mesh(mesh, 'input')
    n0 = int(len(mesh.faces))
    rounds = 0
    faces = n0
    while faces < target_faces and rounds < max_rounds and faces * 4 <= MAX_INTERMEDIATE_FACES:
        rounds += 1
        faces *= 4
    if rounds == 0:
        return mesh.copy(), {'source_triangles':n0, 'refined_triangles':n0,
                             'subdivisions':0, 'method':'original', 'shape_metrics':{}}
    current = mesh.copy()
    # Midpoint variant cannot change the original envelope; its new vertices
    # lie on old triangle edges. Calculate it as a safe, predictable fallback.
    for _ in range(rounds):
        vertices, faces = trimesh.remesh.subdivide(np.asarray(current.vertices), np.asarray(current.faces))
        current = trimesh.Trimesh(vertices=vertices, faces=faces, process=False)
    linear = current
    safe_mesh(linear, 'linear subdivision')
    chosen = linear
    method = 'midpoint-fallback'
    reason = 'Loop smoothing unavailable or altered anatomical envelope'
    metrics = {}
    try:
        func = getattr(trimesh.remesh, 'subdivide_loop', None)
        if callable(func):
            lv, lf = func(np.asarray(mesh.vertices), np.asarray(mesh.faces), iterations=rounds)
            loop_mesh = trimesh.Trimesh(vertices=lv, faces=lf, process=False)
            if len(loop_mesh.faces) != len(linear.faces):
                raise ValueError('Loop refinement changed the expected triangle count')
            safe_mesh(loop_mesh, 'Loop subdivision')
            ok, metrics = envelope_preserved(mesh, loop_mesh)
            if ok:
                chosen, method, reason = loop_mesh, 'loop-smoothed', ''
        else:
            reason = 'subdivide_loop missing in installed trimesh'
    except (ValueError, TypeError, IndexError, FloatingPointError) as exc:
        reason = 'Loop smoothing skipped: ' + str(exc)[:180]
    chosen.remove_unreferenced_vertices()
    safe_mesh(chosen, 'refined output')
    result = {'source_triangles':n0, 'refined_triangles':int(len(chosen.faces)),
              'subdivisions':rounds, 'method':method, 'shape_metrics':metrics}
    if reason:
        result['fallback_reason'] = reason
    return chosen, result


def build_subset(source: Path, destination: Path, report_path: Path, expected_ids):
    if source.resolve() == destination.resolve():
        raise ValueError('Output cannot overwrite the original anatomical sources')
    with (source / 'MANIFEST.csv').open(encoding='utf-8', newline='') as f:
        rows = list(csv.DictReader(f))
    if len(rows) != len(expected_ids) or {r['fj_id'] for r in rows} != set(expected_ids):
        raise ValueError('Source subset must contain exactly the 17 selected 1.9.1 meshes')
    # Staging is independent and deterministic; no original OBJ is modified.
    temp_dir = destination.parent / (destination.name + '.stage')
    if temp_dir.exists():
        shutil.rmtree(temp_dir)
    temp_dir.mkdir(parents=True)
    audit = []
    try:
        for row in rows:
            fj = row['fj_id']
            obj_rel = Path(row['obj'])
            if obj_rel.is_absolute() or '..' in obj_rel.parts or not obj_rel.suffix.lower() == '.obj':
                raise ValueError(f'Unsafe OBJ path in source manifest: {obj_rel}')
            input_file = source / obj_rel
            if not input_file.is_file():
                raise ValueError(f'Missing source OBJ: {input_file}')
            mesh = read_source_mesh(input_file)
            processed, details = refine(mesh)
            output_rel = Path('meshes') / (fj + '.obj')
            output_file = temp_dir / output_rel
            output_file.parent.mkdir(parents=True, exist_ok=True)
            output_file.write_text(trimesh.exchange.obj.export_obj(processed, include_normals=False),encoding='utf-8')
            reread = read_source_mesh(output_file)
            safe_mesh(reread, fj)
            if len(reread.faces) != len(processed.faces):
                raise ValueError(f'OBJ round-trip face count changed for {fj}')
            row['obj'] = str(output_rel)
            row['bytes'] = str(output_file.stat().st_size)
            audit.append({'id':fj, 'name':row['name'],
                          'original_obj_sha256':sha256_file(input_file),
                          'refined_obj_sha256':sha256_file(output_file), **details})
            print(f'{fj}: {details["source_triangles"]:,} -> {details["refined_triangles"]:,} faces '
                  f'({details["method"]}, {details["subdivisions"]} rounds)')
        header = list(rows[0].keys())
        with (temp_dir / 'MANIFEST.csv').open('w', newline='', encoding='utf-8') as f:
            w=csv.DictWriter(f, fieldnames=header)
            w.writeheader(); w.writerows(rows)
        report = {'release':'1.9.1','source':'BodyParts3D / DBCLS 4.3',
                  'license':'CC BY-SA 2.1 Japan',
                  'purpose':'Quality/refinement audit. Source geometry was not replaced; detail can only be interpolated.',
                  'standard_face_ceiling':3200, 'detailed_face_ceiling':16000,
                  'target_refined_source_faces':TARGET_DETAILED_FACES,
                  'mesh_count':len(audit),'meshes':audit}
        (temp_dir / 'REFINEMENT-REPORT.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
        # Replace only derived content; original source 1.9.0 subsets untouched.
        if destination.exists():
            shutil.rmtree(destination)
        temp_dir.replace(destination)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(destination/'REFINEMENT-REPORT.json',report_path)
        print(f'PASS: refined {len(audit)} upper-airway source meshes with provenance report {report_path}')
        return report
    finally:
        if temp_dir.exists():
            shutil.rmtree(temp_dir)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source', type=Path, required=True)
    p.add_argument('--out', type=Path, required=True)
    p.add_argument('--report', type=Path, required=True)
    a=p.parse_args()
    selector = Path(__file__).resolve().with_name('upper-airway-191.py')
    import importlib.util
    spec=importlib.util.spec_from_file_location('anatomiq_upper_airway_selection',selector)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.verify_subset(a.source)
    build_subset(a.source,a.out,a.report,module.EXPECTED)


if __name__=='__main__':
    main()
