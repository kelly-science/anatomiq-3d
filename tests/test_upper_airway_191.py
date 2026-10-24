"""Offline synthetic tests for the 1.9.1 compatibility and guarded app updater."""
import csv
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

source = load_module('source', 'upper-airway-191.py')
ui = load_module('ui', 'apply-upper-airway-ui-191.py')


class SourceChecks(unittest.TestCase):
    def test_exact_17_unique(self):
        self.assertEqual(len(source.CORE), 17)
        self.assertEqual(len(set(source.EXPECTED)), 17)

    def test_manifest_and_download_validation(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            rows = []
            for fj, name in source.CORE:
                rows.append({'fj_id': fj, 'name': name, 'fma_id': 'FMA0', 'bp_id': 'BP0'})
            manifest = root / 'MANIFEST.csv'
            with manifest.open('w', newline='') as f:
                writer = csv.DictWriter(f, ['fj_id','bp_id','fma_id','name'])
                writer.writeheader(); writer.writerows(rows)
            self.assertEqual(len(source.verify_catalog(manifest)), 17)
            rows[0]['name'] = 'Incorrect title'
            with manifest.open('w', newline='') as f:
                writer = csv.DictWriter(f, ['fj_id','bp_id','fma_id','name'])
                writer.writeheader(); writer.writerows(rows)
            with self.assertRaises(ValueError): source.verify_catalog(manifest)
            rows[0]['name'] = source.CORE[0][1]
            for r in rows:
                r['group']='upper-airway'; r['obj']='upper-airway/'+r['fj_id']+'.obj';r['bytes']='310'
                p = root / r['obj']; p.parent.mkdir(exist_ok=True);p.write_text('x'*310)
            with manifest.open('w', newline='') as f:
                writer = csv.DictWriter(f, ['group','fj_id','bp_id','fma_id','name','obj','bytes'])
                writer.writeheader(); writer.writerows(rows)
            self.assertEqual(source.verify_subset(root), 17)
            (root / rows[3]['obj']).unlink()
            with self.assertRaises(ValueError): source.verify_subset(root)

    def test_prefix_immutability(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            prior={'version': 1,'registration':{'scale':0.003907105277482984},'structures':[
                {'id':'FJ1000','name':'Lung sample','category':'lung'},
                {'id':'FJ1001','name':'Trachea','category':'airway'}]}
            before=root/'old.json';after=root/'new.json'
            before.write_text(json.dumps(prior))
            self.assertEqual(source.verify_previous(before),['FJ1000','FJ1001'])
            new=json.loads(before.read_text())
            new['structures'] += [dict(id=fj,name=name,category='airway',standard_triangles=300,detailed_triangles=450) for fj,name in source.CORE]
            after.write_text(json.dumps(new))
            self.assertEqual(source.verify_result(before,after),(2,19))
            new['structures'][0],new['structures'][1]=new['structures'][1],new['structures'][0]
            after.write_text(json.dumps(new))
            with self.assertRaises(ValueError):source.verify_result(before,after)

    def test_ui_patch_and_fail_closed(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            (root/'respiratory-model.js').write_text("function respiratoryFamily(n){if(/\\b(?:nasal cavity|nasal concha|pharynx|nasopharynx|oropharynx)\\b/.test(n))return 'upper';}\nfunction respiratoryEntries(){}")
            (root/'app.js').write_text("const APP_VERSION = '1.9.0';\nconst respiratory = true;")
            (root/'sw.js').write_text("const VERSION='anatomy-v1.9.0';const SHELL=['./respiratory-model.js'];const scopes=['respiratory-standard.glb','respiratory-structures.json'];")
            (root/'version.json').write_text('{"version":"1.9.0"}')
            updated=ui.transform(root)
            self.assertIn("tongue",updated['respiratory-model.js'])
            self.assertIn("anatomy-v1.9.1",updated['sw.js'])
            self.assertIn("'1.9.1'",updated['app.js'])
            for name, text in updated.items(): (root/name).write_text(text)
            self.assertEqual(updated, ui.transform(root))
            (root/'app.js').write_text("const APP_VERSION = '1.8.5';")
            with self.assertRaises(ValueError):ui.transform(root)


if __name__ == '__main__':
    unittest.main()
