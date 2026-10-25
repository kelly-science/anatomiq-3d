
#!/usr/bin/env python3
"""Source-backed BodyParts3D connective GLB builder; never creates synthetic anatomy."""

import argparse
import csv
import hashlib
import importlib.util
import json
import re
from pathlib import Path

import numpy as np
import trimesh


# ============================================================
# AnatomIQ Studio 2.2.9d
# Costal cartilage micro-adjustment: ribs 8-10
# ============================================================

RIB_CARTILAGE_POSTERIOR_IDS = {
    "FJ3667",   # Left tenth costal cartilage
    "FJ3668",   # Left eighth costal cartilage
    "FJ3669",   # Left ninth costal cartilage
    "FJ3667M",  # Right tenth costal cartilage
    "FJ3668M",  # Right eighth costal cartilage
    "FJ3669M",  # Right ninth costal cartilage
}

# Small adjustment in NORMALIZED model coordinates.
#
# Proposed initial offset: -0.004 on Z.
# IMPORTANT: Verify that -Z is posterior in the viewer.
# If the cartilage moves anteriorly, reverse the sign.
# If Z is vertical, use the appropriate Y-axis direction.
#
# No other anatomy is moved.

RIB_CARTILAGE_POSTERIOR_SHIFT = np.array(
    [0.0, 0.0, 0.015],
    dtype=float
)


def apply_connective_micro_adjustments(mesh, fj_id):
    """
    Apply targeted geometry adjustments to selected structures.

    Only the six costal cartilages for ribs 8-10 are modified.
    All other connective structures remain unchanged.
    """

    if fj_id in RIB_CARTILAGE_POSTERIOR_IDS:
        mesh = mesh.copy()
        mesh.apply_translation(RIB_CARTILAGE_POSTERIOR_SHIFT)

        print(
            f"  Alignment adjustment: {fj_id} "
            f"offset={RIB_CARTILAGE_POSTERIOR_SHIFT.tolist()}"
        )

    return mesh


def main():

    # --------------------------------------------------------
    # Command-line arguments
    # --------------------------------------------------------

    p = argparse.ArgumentParser()

    p.add_argument(
        '--subset',
        type=Path,
        required=True
    )

    p.add_argument(
        '--skin',
        type=Path,
        required=True
    )

    p.add_argument(
        '--out',
        type=Path,
        required=True
    )

    p.add_argument(
        '--selection',
        type=Path,
        required=True
    )

    a = p.parse_args()

    # --------------------------------------------------------
    # Load existing AnatomIQ geometry conversion utilities
    # --------------------------------------------------------

    spec = importlib.util.spec_from_file_location(
        'digestive_convert',
        Path(__file__).parent / 'build-digestive-detail.py'
    )

    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    # --------------------------------------------------------
    # Load curated connective selection
    # --------------------------------------------------------

    chosen = json.loads(
        a.selection.read_text()
    )['structures']

    selected = {
        s['fj_id']: s
        for s in chosen
    }

    if len(selected) != 14:
        raise ValueError(
            'Selection must have 14 unique curated FJ IDs'
        )

    # --------------------------------------------------------
    # Read source manifest and validate identity
    # --------------------------------------------------------

    rows = {}

    with (a.subset / 'MANIFEST.csv').open(newline='') as f:

        for row in csv.DictReader(f):

            if row['fj_id'] in selected:

                fj = row['fj_id']

                if fj in rows:
                    raise ValueError(
                        'Duplicate source row ' + fj
                    )

                if row['name'] != selected[fj]['name']:
                    raise ValueError(
                        'Source name changed for ' + fj
                    )

                obj = a.subset / row['obj']

                if not obj.is_file() or obj.stat().st_size < 300:
                    raise ValueError(
                        'Missing source OBJ ' + str(obj)
                    )

                rows[fj] = (row, obj)

    if set(rows) != set(selected):
        raise ValueError(
            f'Missing FJ source IDs: '
            f'{sorted(set(selected) - set(rows))}'
        )

    # --------------------------------------------------------
    # Establish shared BodyParts3D coordinate normalization
    # --------------------------------------------------------

    normal, registration = mod.normalizer(
        mod.load_mesh(a.skin),
        axis='auto',
        invert=False
    )

    # --------------------------------------------------------
    # Initialize Standard and Detailed scenes
    # --------------------------------------------------------

    scenes = {
        k: trimesh.Scene()
        for k in ['standard', 'detailed']
    }

    meta = []

    # --------------------------------------------------------
    # Process selected native connective structures
    # --------------------------------------------------------

    for fj in [s['fj_id'] for s in chosen]:

        row, obj = rows[fj]

        mesh = mod.load_mesh(obj)

        # Normalize geometry into the shared anatomical frame.
        mesh.vertices = normal(
            np.asarray(mesh.vertices)
        )

        # ----------------------------------------------------
        # 2.2.9d: Apply targeted cartilage alignment adjustment
        #
        # This occurs AFTER coordinate normalization
        # and BEFORE mesh reduction.
        #
        # All other structures remain unchanged.
        # ----------------------------------------------------

        mesh = apply_connective_micro_adjustments(
            mesh,
            fj
        )

        # ----------------------------------------------------
        # Validate source geometry
        # ----------------------------------------------------

        if (
            not np.isfinite(mesh.vertices).all()
            or len(mesh.faces) < 10
        ):
            raise ValueError(
                'Invalid source geometry ' + fj
            )

        # ----------------------------------------------------
        # Generate Standard and Detailed geometry
        # ----------------------------------------------------

        small = mod.reduce(mesh, 3200)
        large = mod.reduce(mesh, 16000)

        for label, part in [
            ('standard', small),
            ('detailed', large)
        ]:

            part.remove_unreferenced_vertices()

            # Generate / access vertex normals.
            _ = part.vertex_normals

            scenes[label].add_geometry(
                part,
                geom_name=fj,
                node_name=fj
            )

        # ----------------------------------------------------
        # Preserve metadata and stable FJ identifiers
        # ----------------------------------------------------

        meta.append({
            'id': fj,
            'fma_id': row.get('fma_id', ''),
            'name': row['name'],
            'category': selected[fj]['category'],
            'standard_triangles': len(small.faces),
            'detailed_triangles': len(large.faces)
        })

        print(fj, row['name'])

    # --------------------------------------------------------
    # Prepare output and temporary staging directory
    # --------------------------------------------------------

    out = a.out

    out.mkdir(
        parents=True,
        exist_ok=True
    )

    stage = out / '.connective-stage'

    stage.mkdir(
        exist_ok=True
    )

    # --------------------------------------------------------
    # Export both GLBs and validate mesh IDs
    # --------------------------------------------------------

    for label, scene in scenes.items():

        path = stage / f'connective-{label}.glb'

        mod.glb(scene, path)

        if path.stat().st_size > 90_000_000:
            raise ValueError(
                'GLB too large for GitHub'
            )

        check = trimesh.load(
            path,
            force='scene'
        )

        if set(check.graph.nodes_geometry) != set(selected):
            raise ValueError(
                'GLB source ID mismatch'
            )

    # --------------------------------------------------------
    # Export native structure metadata
    # --------------------------------------------------------

    (stage / 'connective-structures.json').write_text(
        json.dumps(
            {
                'version': 1,
                'source': 'BodyParts3D / DBCLS 4.3',
                'license': 'CC BY-SA 2.1 Japan',
                'registration': registration,
                'structures': meta
            },
            indent=2
        ) + '\n'
    )

    # --------------------------------------------------------
    # Publish validated files from staging
    # --------------------------------------------------------

    for file in list(stage.iterdir()):

        dest = out / file.name

        file.replace(dest)

        print(
            dest.name,
            dest.stat().st_size,
            'bytes SHA256',
            hashlib.sha256(
                dest.read_bytes()
            ).hexdigest()
        )

    stage.rmdir()

    print(
        'SUCCESS: 14 curated native connective meshes. '
        'Verify alignment visually before classroom use.'
    )

    print(
        'AnatomIQ 2.2.9d: '
        'Targeted rib cartilage alignment adjustment applied.'
    )


if __name__ == '__main__':
    main()
