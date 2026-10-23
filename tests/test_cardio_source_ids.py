import csv
import importlib.util
from pathlib import Path
import tempfile
import unittest

CONVERTER=Path(__file__).resolve().parents[1]/'tools'/'build-cardiovascular-43.py'
spec=importlib.util.spec_from_file_location('cardio_converter',CONVERTER)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class CardioSourceIDTests(unittest.TestCase):
 def test_suffixed_meshes_are_retained_without_collision(self):
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder)
   ids=['FJ1682M','FJ1725M','FJ1682','FJ1725','FJ999']
   with (root/'MANIFEST.csv').open('w',newline='') as file:
    writer=csv.DictWriter(file,fieldnames=['fj_id','fma_id','name','obj'])
    writer.writeheader()
    for id in ids:
     f=root/(id+'.obj');f.write_text('x'*400)
     writer.writerow({'fj_id':id,'fma_id':'FMA1','name':id,'obj':f.name})
   rows=mod.read_rows([root])
   self.assertEqual([r['fj_id'] for r,_ in rows],['FJ999','FJ1682','FJ1682M','FJ1725','FJ1725M'])
   with (root/'MANIFEST.csv').open('a',newline='') as file:
    csv.writer(file).writerow(['FJ1682MA','FMA1','Invalid','FJ1682.obj'])
   with self.assertRaisesRegex(SystemExit,'Unrecognized FJ identifier'):
    mod.read_rows([root])

if __name__=='__main__': unittest.main()
