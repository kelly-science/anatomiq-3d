"""Offline checks for AnatomIQ 3D 1.9.1 refined upper-airway geometry.

These are synthetic meshes only; the BodyParts3D provider OBJs and real Mac
respiratory builds must still be validated during installation.
"""
import csv
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

import numpy as np
import trimesh

ROOT = Path(__file__).resolve().parents[1]


def load(name, script):
    spec=importlib.util.spec_from_file_location(name,ROOT/'tools'/script)
    m=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m

ref=load('refinement_191','refine-upper-airway-191.py')
selection=load('selection_191','upper-airway-191.py')
check=load('checker_191','check-respiratory-191.py')


class RefinementTests(unittest.TestCase):
    def test_tongue_resolution_and_registration(self):
        # 320 source faces * 16 = 5120 refined triangles.
        source=trimesh.creation.icosphere(subdivisions=2, radius=1.5)
        source.apply_translation([11.0,-3.25,92.0])
        before=source.vertices.copy()
        refined,details=ref.refine(source)
        self.assertEqual(len(refined.faces),len(source.faces)*16)
        self.assertEqual(details['subdivisions'],2)
        self.assertIn(details['method'],('loop-smoothed','midpoint-fallback'))
        self.assertTrue(np.array_equal(source.vertices,before))
        self.assertTrue(np.isfinite(refined.vertices).all())
        if details['method']=='loop-smoothed':
            self.assertTrue(ref.envelope_preserved(source,refined)[0])
        else:
            self.assertTrue(np.allclose(refined.bounds,source.bounds,atol=1e-10))

    def test_no_change_to_adequate_source(self):
        large=trimesh.creation.icosphere(subdivisions=4) # 5120 source faces
        refined,details=ref.refine(large)
        self.assertEqual(details['subdivisions'],0)
        self.assertEqual(details['method'],'original')
        self.assertTrue(np.allclose(large.vertices,refined.vertices))

    def test_shape_guard_fallback(self):
        cube=trimesh.creation.box()
        processed,details=ref.refine(cube)
        self.assertEqual(details['method'],'midpoint-fallback')
        self.assertTrue(np.allclose(cube.bounds,processed.bounds,atol=1e-7))
        self.assertEqual(len(processed.faces),len(cube.faces)*64)

    def test_invalid_mesh_rejected(self):
        cube=trimesh.creation.box()
        cube.vertices[0]=np.nan
        with self.assertRaises(ValueError): ref.refine(cube)

    def test_seventeen_source_models_are_only_ones_refined(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            source=root/'source'
            source.mkdir()
            rows=[]
            model=trimesh.creation.icosphere(subdivisions=2)
            for fj,name in selection.CORE:
                obj=Path('raw')/(fj+'.obj')
                (source/obj).parent.mkdir(exist_ok=True)
                (source/obj).write_text(trimesh.exchange.obj.export_obj(model))
                rows.append(dict(fj_id=fj,name=name,fma_id='FMA0',bp_id='BP0',obj=str(obj),bytes=str((source/obj).stat().st_size)))
            with (source/'MANIFEST.csv').open('w',newline='') as f:
                w=csv.DictWriter(f,fieldnames=rows[0].keys());w.writeheader();w.writerows(rows)
            source_hashes={row['fj_id']:ref.sha256_file(source/row['obj']) for row in rows}
            destination=root/'refined'
            reportfile=root/'report.json'
            report=ref.build_subset(source,destination,reportfile,selection.EXPECTED)
            self.assertEqual(len(report['meshes']),17)
            self.assertEqual(selection.verify_subset(destination),17)
            actual=json.loads(reportfile.read_text())
            self.assertEqual({a['id'] for a in actual['meshes']},set(selection.EXPECTED))
            self.assertTrue(all(a['refined_triangles']==5120 for a in actual['meshes']))
            self.assertEqual(source_hashes,{row['fj_id']:ref.sha256_file(source/row['obj']) for row in rows})
            with (destination/'MANIFEST.csv').open(newline='') as f:
                out_rows=list(csv.DictReader(f))
            self.assertTrue(all(r['obj'].startswith('meshes/') for r in out_rows))

    def test_checker_finds_manifest_vs_glb_triangle_mismatch(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            models=root/'models';models.mkdir()
            mesh=trimesh.creation.icosphere(subdivisions=1)
            # Need at least 45 ID entries to satisfy count safety.
            entries=[dict(id=f'FJ{i+1000}',category='airway',name='sample',standard_triangles=len(mesh.faces),detailed_triangles=len(mesh.faces)) for i in range(45)]
            (models/'respiratory-structures.json').write_text(json.dumps({'structures':entries}))
            for kind in ('standard','detailed'):
                scene=trimesh.Scene()
                for entry in entries:
                    scene.add_geometry(mesh,geom_name=entry['id'],node_name=entry['id'])
                (models/f'respiratory-{kind}.glb').write_bytes(scene.export(file_type='glb'))
            check.check(models)
            entries[0]['detailed_triangles']+=1
            (models/'respiratory-structures.json').write_text(json.dumps({'structures':entries}))
            with self.assertRaisesRegex(ValueError,'faces='):
                check.check(models)


if __name__=='__main__':unittest.main()
