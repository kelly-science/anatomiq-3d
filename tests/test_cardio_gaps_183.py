import importlib.util,unittest
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'tools'/'fetch-cardiovascular-gaps.py'
spec=importlib.util.spec_from_file_location('cardio_gaps183',p)
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
class GapsTests(unittest.TestCase):
 def row(self,fj,name,faces=300):return {'fj_id':fj,'name':name,'faces':str(faces),'bp_id':'BP','fma_id':'FMA'}
 def test_identifies_missing_major_trunks_not_distant_branches(self):
  rows=[self.row('FJ1','Dorsal carpal branch of right radial artery',5000),
        self.row('FJ2','Trunk of right radial artery',700),self.row('FJ3','Right ulnar artery',800),
        self.row('FJ4','Trunk of left maxillary nerve',9000),
        self.row('FJ5','Left external jugular vein',800)]
  selected,report=mod.choose(rows,{'FJ3'})
  self.assertEqual({s['fj_id'] for s in selected},{'FJ2','FJ5'})
  self.assertEqual(next(t for t in report if t['target']=='right-ulnar-trunk')['status'],'already-present')
 def test_does_not_repeat_existing_id_or_invent_missing_mesh(self):
  selected,report=mod.choose([self.row('FJ10','Left vertebral vein')],{'FJ10'})
  self.assertEqual(selected,[])
  self.assertEqual(next(t for t in report if t['target']=='right-radial-trunk')['status'],'not-found')
if __name__=='__main__':unittest.main()
