#!/usr/bin/env python3
"""Simple self-check for the 2.0.4 ventricular visibility patch."""
import pathlib, re, sys, json
root=pathlib.Path(__file__).resolve().parents[1]
n=(root/'nervous-model.js').read_text()
a=(root/'app.js').read_text()
sw=(root/'sw.js').read_text()
v=json.loads((root/'version.json').read_text())
branches=re.findall(r"if\(category==='ventricle'\)return\s*\{([^}]+)\}",n)
assert len(branches)==1, 'Expected exactly one ventricular branch'
assert all(k in branches[0] for k in ('transparent:true','opacity:0.94','depthWrite:true')), branches[0]
assert "if(category==='dura')return {transparent:true,opacity:0.3,depthWrite:false" in n, 'Expected meningeal settings unchanged'
assert 'nervousMaterialOverrides(entry)' in a
assert "const APP_VERSION = '2.0.4'" in a
assert "pong.version!=='anatomy-v2.0.4'" in a
assert "const VERSION='anatomy-v2.0.4'" in sw
assert v['version']=='2.0.4'
print('PASS: Ventricles 94% opacity with depth writes; meninges unchanged; 2.0.4 cache revision.')
