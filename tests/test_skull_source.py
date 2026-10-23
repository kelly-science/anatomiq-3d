"""Offline, synthetic regression for skull selector/converter. No anatomy invented for production."""
import csv,importlib.util,tempfile,unittest
from pathlib import Path
import trimesh
ROOT=Path(__file__).resolve().parents[1]
def load(p,name):
    spec=importlib.util.spec_from_file_location(name,p)
    mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);return mod
selector=load(ROOT/'tools/fetch-skull-43.py','skull_fetch')
builder=load(ROOT/'tools/build-skull-43.py','skull_build')
class TestSkull(unittest.TestCase):
    def test_selector_prefers_verified_late_group_and_converter_exports_exact_meshes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);source=root/'upstream.csv'
            cols=['fj_id','bp_id','fma_id','name','faces','verts','bytes','mtime']
            with source.open('w',newline='') as f:
                w=csv.DictWriter(f,fieldnames=cols);w.writeheader()
                for i,n in enumerate(selector.TARGETS):
                    for group in (3000,6000):
                        w.writerow({'fj_id':f'FJ{group+i}','bp_id':f'BP{i}','fma_id':f'FMA{i}',
                                    'name':n.title(),'faces':260,'verts':130,'bytes':12000,'mtime':0})
            picked=selector.choose(source)
            self.assertEqual(len(picked),len(selector.TARGETS))
            self.assertTrue(all(int(r['fj_id'][2:])>=6000 for r in picked))
            subset=root/'subset';subset.mkdir()
            with (subset/'MANIFEST.csv').open('w',newline='') as f:
                w=csv.DictWriter(f,fieldnames=['fj_id','name','target','fma_id','obj']);w.writeheader()
                for i,r in enumerate(picked):
                    mesh=trimesh.creation.icosphere(subdivisions=1,radius=0.2)
                    mesh.apply_translation([(i%5)*0.06,0,0])
                    fname=r['fj_id']+'.obj';mesh.export(subset/fname)
                    w.writerow({'fj_id':r['fj_id'],'name':r['name'],'target':r['target'],
                                'fma_id':r['fma_id'],'obj':fname})
            skin=root/'skin.obj';s=trimesh.creation.box(extents=[1,3,1]);s.export(skin)
            out=root/'models';builder.build(subset,skin,out,max_faces=50000)
            data=__import__('json').loads((out/'skull-structures.json').read_text())
            self.assertEqual(len(data['structures']),len(selector.TARGETS))
            self.assertEqual(len(trimesh.load(out/'skull-detailed.glb',force='scene').graph.nodes_geometry),len(selector.TARGETS))
if __name__=='__main__':unittest.main()
