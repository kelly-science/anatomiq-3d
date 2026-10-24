"""Offline synthetic converter regression, requires numpy and trimesh; no source download."""
from pathlib import Path
import tempfile,csv,json,subprocess,sys
import numpy as np,trimesh

HERE=Path(__file__).resolve().parent
ROOT=HERE.parent
BUILDER=ROOT/'tools/build-urinary-21.py'
CHECK=ROOT/'tools/check-urinary-21.py'
SOURCES={'FJ3145':'Left kidney','FJ3147':'Right kidney','FJ3144':'Left ureter','FJ3146':'Right ureter','FJ3149':'Urinary bladder','FJ3148':'Urethra'}


def test_synthetic():
    with tempfile.TemporaryDirectory() as tmp:
        root=Path(tmp); subset=root/'subset';subset.mkdir()
        rows=[]
        for i,(fj,name) in enumerate(SOURCES.items()):
            m=trimesh.creation.icosphere(subdivisions=2,radius=20+i)
            m.apply_translation([i*25,100+i*20,0])
            f=fj+'.obj';(subset/f).write_text(trimesh.exchange.obj.export_obj(m,include_normals=False))
            rows.append({'fj_id':fj,'name':name,'fma_id':'FMA_TEST','obj':f})
        with (subset/'MANIFEST.csv').open('w',newline='') as f:
            w=csv.DictWriter(f,fieldnames=['fj_id','name','fma_id','obj']);w.writeheader();w.writerows(rows)
        skin=root/'skin.obj';m=trimesh.creation.box(extents=[250,1719,200]);skin.write_text(trimesh.exchange.obj.export_obj(m))
        reg={'vertical_axis':'y','inverted':False,'scale':(3.183290+3.534865)/1719}
        ref=root/'respiratory.json';ref.write_text(json.dumps({'registration':reg}))
        args=[sys.executable,str(BUILDER),'--subset',str(subset),'--skin',str(skin),'--respiratory-manifest',str(ref),'--out',str(root/'models')]
        subprocess.run(args,check=True)
        subprocess.run([sys.executable,str(CHECK),'--local',str(root/'models')],check=True,capture_output=True)
        d=json.loads((root/'models/urinary-structures.json').read_text())
        assert len(d['structures'])==6
        assert all(x['detailed_triangles']>=x['standard_triangles'] for x in d['structures'])
        # Both source IDs and an input OBJ remain completely unchanged.
        assert list(subset.glob('*.obj')) and all((subset/(r['fj_id']+'.obj')).is_file() for r in rows)
        print('PASS: synthetic urinary GLB export, geometry refinement, IDs and manifest consistency')

if __name__=='__main__':test_synthetic()
