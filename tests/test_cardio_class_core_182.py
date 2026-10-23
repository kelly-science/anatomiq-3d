import csv
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def load(name):
    path=ROOT/'tools'/name
    sp=importlib.util.spec_from_file_location(name.replace('.','_').replace('-','_'),path)
    mod=importlib.util.module_from_spec(sp);sp.loader.exec_module(mod)
    return mod
class CurriculumTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fetch=load('fetch-cardiovascular-class-core.py')
        cls.report=load('report-cardiovascular-class-core.py')
        cls.spec=json.loads((ROOT/'data/cardio-class-core.json').read_text())
    def test_choose_real_required_vessel_and_never_a_nerve(self):
        rows=[dict(fj_id='FJ900',name='Trunk of left brachiocephalic vein',faces='700',bp_id='B',fma_id='F'),
              dict(fj_id='FJ901',name='Trunk of left maxillary nerve',faces='90000',bp_id='B',fma_id='F'),
              dict(fj_id='FJ902',name='Left dorsalis pedis artery',faces='1000',bp_id='B',fma_id='F'),
              dict(fj_id='FJ903',name='Right femoral vein',faces='900',bp_id='B',fma_id='F')]
        chosen,ledger=self.fetch.choose(rows,self.spec['targets'],{'FJ903'},limit=15)
        assert {r['fj_id'] for r in chosen}=={'FJ900','FJ902'}
        assert not any('nerve' in r['name'] for r in chosen)
    def test_report_only_counts_actually_present_segments(self):
        meta={'source':'BodyParts3D 4.3','structures':[{'id':'FJ1','name':'Left dorsalis pedis artery'},{'id':'FJ2','name':'Right femoral vein'}]}
        out=self.report.report(self.spec,meta)
        assert out['required_count']==len(self.spec['targets'])
        assert next(t for t in out['targets'] if t['name']=='Dorsalis pedis arteries')['status']=='partial'
        assert next(t for t in out['targets'] if t['name']=='Chordae tendineae')['status']=='missing'
        assert next(t for t in out['targets'] if t['name']=='Femoral veins')['status']=='partial'
if __name__=='__main__':unittest.main()
