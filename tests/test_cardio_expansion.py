import csv
import importlib.util
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

ROOT=Path(__file__).resolve().parent.parent

def load(file):
    spec=importlib.util.spec_from_file_location(Path(file).stem.replace('-','_'),file)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

class CardioExpansionTests(unittest.TestCase):
    def test_curated_atlas_selection_uses_true_source_ids(self):
        chooser=load(ROOT/'tools'/'fetch-cardiovascular-expansion.py')
        with TemporaryDirectory() as td:
            p=Path(td)/'MANIFEST.csv'
            patterns=[('FJ2422','Cavity of left ventricle'),('FJ2423','Cavity of right ventricle'),('FJ2420','Anterior leaflet of mitral valve'),('FJ2421','Anterior leaflet of tricuspid valve'),('FJ2417','Left anterior cusp of pulmonary valve'),('FJ2924','Trunk of left pulmonary artery'),('FJ3019','Trunk of right pulmonary artery'),('FJ2925','Trunk of left superior pulmonary vein'),('FJ3020','Trunk of right superior pulmonary vein'),('FJ3479','Trunk of left subclavian artery'),('FJ4984','Trunk of right brachiocephalic vein'),('FJ3420','Splenic artery'),('FJ3421','Celiac trunk'),('FJ3416','Azygos vein'),('FJ2090','Left deep femoral artery'),('FJ2094','Left deep femoral artery'),('FJ2672','Marginal branch of right coronary artery'),('FJ2432','Posterior leaflet of mitral valve'),('FJ2433','Posterior leaflet of tricuspid valve'),('FJ2435','Anterior cusp of aortic valve'),('FJ2436','Septal leaflet of tricuspid valve'),('FJ2437','Septal papillary muscle of right ventricle'),('FJ2429','Posterior papillary muscle of left ventricle')]
            with p.open('w',newline='') as f:
                w=csv.DictWriter(f,fieldnames=['fj_id','bp_id','fma_id','name','faces']);w.writeheader()
                for id,name in patterns:w.writerow(dict(fj_id=id,bp_id='BP1',fma_id='FMA1',name=name,faces=1800))
            results=chooser.choose(p)
            ids={x['fj_id'] for x in results}
            self.assertIn('FJ2422',ids)
            self.assertIn('FJ3479',ids)
            self.assertNotIn('FJ2672',ids) # tiny marginal branches excluded from initial larger atlas
            self.assertGreaterEqual(len(results),20)

if __name__=='__main__':unittest.main()
