import csv
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent

def module(path):
    spec=importlib.util.spec_from_file_location(path.stem.replace('-','_'),path)
    m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
    return m

class TestMajorVessels181(unittest.TestCase):
    def test_selector_broadens_trunks_without_fabricating_meshes(self):
        m=module(ROOT/'tools/fetch-cardiovascular-vessels.py')
        rows=[]
        names=['Trunk of left subclavian artery','Right femoral artery','Left renal vein',
               'Anterior branch of left coronary artery','Left sublingual gland',
               'Left vein (unrelated)', 'Right internal jugular vein',
               'Right axillary artery','Inferior mesenteric artery']
        for i,name in enumerate(names):
            rows.append({'fj_id':'FJ'+str(8000+i),'name':name,'faces':'1800',
                         'bp_id':'BP1','fma_id':'FMA1'})
        chosen=m.choose(rows,{'FJ8000'},max_additional=10)
        labels=[x['name'] for x in chosen]
        self.assertIn('Right femoral artery',labels)
        self.assertIn('Left renal vein',labels)
        self.assertIn('Anterior branch of left coronary artery',labels)
        self.assertNotIn('Left sublingual gland',labels)
        self.assertNotIn('Trunk of left subclavian artery',labels)
        self.assertEqual(len(m.choose(rows,set(),max_additional=2)),2)

    def test_converter_preserves_every_prior_id_before_new_ones(self):
        m=module(ROOT/'tools/build-cardiovascular-43.py')
        legacy=m.LEGACY_CARDIO_IDS
        with tempfile.TemporaryDirectory() as t:
            root=Path(t)
            prior=list(legacy)+['FJ9900','FJ9999']
            rows=list(reversed(prior))+['FJ2300']
            subset=root/'subset';subset.mkdir()
            with (subset/'MANIFEST.csv').open('w',newline='') as f:
                w=csv.DictWriter(f,fieldnames=['fj_id','name','obj','fma_id','category']);w.writeheader()
                for idx,id in enumerate(rows):
                    (subset/(id+'.obj')).write_text('v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n'*15)
                    w.writerow({'fj_id':id,'name':'Vessel','obj':id+'.obj','fma_id':'FMA1','category':'systemic'})
            manifest=root/'previous.json'
            manifest.write_text(json.dumps({'structures':[{'id':id} for id in prior]}))
            result=m.read_rows([subset],manifest)
            self.assertEqual([r[0]['fj_id'] for r in result],prior+['FJ2300'])
            manifest.write_text(json.dumps({'structures':[{'id':'FJ_NOT_PRESENT'}]}))
            with self.assertRaises(SystemExit): m.read_rows([subset],manifest)

if __name__=='__main__':unittest.main()
