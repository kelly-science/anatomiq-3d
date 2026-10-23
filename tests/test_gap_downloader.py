"""End-to-end regression for Cardiovascular 1.8.3 gap fetch, no network."""
import csv
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

FETCHER = Path(__file__).resolve().parents[1] / 'tools' / 'fetch-cardiovascular-gaps.py'

class DownloaderTests(unittest.TestCase):
    def test_selected_mesh_is_written_into_valid_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            upstream = base / 'upstream'
            upstream.mkdir()
            with (upstream / 'MANIFEST.csv').open('w', newline='') as fh:
                writer = csv.DictWriter(fh, fieldnames=['fj_id', 'bp_id', 'fma_id', 'name', 'faces'])
                writer.writeheader()
                writer.writerow({'fj_id':'FJ3493', 'bp_id':'BP', 'fma_id':'FMA', 'name':'Left lumbar vein', 'faces': '900'})
            # Fake the pinned upstream helper with its actual row,path return contract.
            (upstream / 'bp3d_subset.py').write_text('''from pathlib import Path\ndef download_picked(upstream, selected, output, cache, chunk_size=20):\n    output.mkdir(parents=True, exist_ok=True)\n    result=[]\n    for row in selected:\n        p=output / (row["fj_id"] + ".obj")\n        p.write_text("v 0 0 0\\nv 1 0 0\\nv 0 1 0\\nf 1 2 3\\n"*15)\n        result.append((row,p))\n    return result\n''')
            previous = base / 'existing.json'
            previous.write_text(json.dumps({'structures':[]}))
            result = subprocess.run([sys.executable, str(FETCHER), '--upstream', str(upstream), '--exclude', str(previous), '--out', str(base/'output')], capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            with (base/'output'/'MANIFEST.csv').open(newline='') as fh:
                found=list(csv.DictReader(fh))
            self.assertEqual(len(found),1)
            self.assertEqual(found[0]['fj_id'],'FJ3493')
            self.assertTrue((base/'output'/found[0]['obj']).is_file())
            selection=json.loads((base/'output'/'GAP_SELECTION.json').read_text())
            self.assertEqual(selection['added_meshes'],1)

    def test_no_missing_meshes_writes_empty_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp)
            upstream=base/'upstream'
            upstream.mkdir()
            (upstream/'MANIFEST.csv').write_text('fj_id,bp_id,fma_id,name,faces\nFJ3493,BP,FMA,Left lumbar vein,900\n')
            existing=base/'existing.json'
            existing.write_text(json.dumps({'structures':[{'id':'FJ3493'}]}))
            proc=subprocess.run([sys.executable,str(FETCHER),'--upstream',str(upstream),'--out',str(base/'output'),'--exclude',str(existing)],capture_output=True,text=True)
            self.assertEqual(proc.returncode,0,proc.stderr)
            with (base/'output'/'MANIFEST.csv').open(newline='') as fh:
                self.assertEqual(len(list(csv.DictReader(fh))),0)

if __name__=='__main__':unittest.main()
