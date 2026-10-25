#!/usr/bin/env python3
"""Postinstall app source validation; optionally also verify generated GLB containers."""
import argparse,json,re,sys
from pathlib import Path

def main():
 p=argparse.ArgumentParser();p.add_argument('--repo',required=True,type=Path);p.add_argument('--models',action='store_true');a=p.parse_args()
 root=a.repo.expanduser().resolve()
 expected={'app.js':['ANATOMIQ_CONNECTIVE_228','await loadConnective();','systemLayers.connective','cn:systemLayers.connective','cm:connectiveAvailable'],
  'system-layers.js':['connective:raw.connective!==false','system===\'connective\''],
  'structure-layout.js':['...lymphatic,...connective','connectiveCount:connective.length'],
  'scene-codec.js':["'cn','cm'"],
  'scene-assets.js':['connective:chapter.cm===true','models/connective-structures.json'],
  'index.html':['id="mode-connective"','id="connective-study-panel"','id="settings-connective-geometry"'],
  'sw.js':["'./connective-model.js'",'anatomy-v2.2.9-connective-curated'],
  'connective-model.js':['const SOURCE_IDS','validateConnectiveManifest','baseConnectiveVisibleInPreset']}
 for name,terms in expected.items():
  data=(root/name).read_text()
  for term in terms:
   if term not in data:raise ValueError(f'{name}: missing expected connective integration: {term}')
  print('OK',name)
 from json import loads
 v=loads((root/'version.json').read_text());print('version.json',v)
 selected=loads((root/'tools/connective-selection.json').read_text())['structures']
 if len(selected)!=14 or len({s['fj_id'] for s in selected})!=14:raise ValueError('Incorrect source selection')
 if a.models:
  m=loads((root/'models/connective-structures.json').read_text())
  if [x['id'] for x in m.get('structures',[])]!=[s['fj_id'] for s in selected]:raise ValueError('Connective source manifest structure order differs from pinned selection')
  for variant in ('standard','detailed'):
   path=root/f'models/connective-{variant}.glb';raw=path.read_bytes()
   if len(raw)<1000 or raw[:4]!=b'glTF' or int.from_bytes(raw[4:8],'little')!=2 or int.from_bytes(raw[8:12],'little')!=len(raw):raise ValueError(f'Invalid GLB header/length: {path}')
   print('OK',path.name,len(raw),'bytes')
 print('PASS — app patch validated'+(' and GLB files have valid containers' if a.models else ' (native model build not checked)'))

if __name__=='__main__':
 try:main()
 except Exception as e:print('ERROR:',e,file=sys.stderr);sys.exit(1)
