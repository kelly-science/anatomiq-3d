#!/usr/bin/env python3
"""Copy only the modules reachable from Anatomy Studio's pinned Three.js addons."""
from pathlib import Path
import re
import shutil
import sys

npm_dir = Path(sys.argv[1]).resolve() / 'package'
output_dir = Path(sys.argv[2]).resolve()
jsm_dir = npm_dir / 'examples' / 'jsm'

(output_dir / 'build').mkdir(parents=True, exist_ok=True)
shutil.copy2(npm_dir / 'build' / 'three.module.js', output_dir / 'build' / 'three.module.js')
shutil.copy2(npm_dir / 'LICENSE', output_dir / 'LICENSE')

pending = ['controls/OrbitControls.js', 'loaders/GLTFLoader.js']
seen = set()
# Match real top-level ES module import/re-export declarations, not the word
# 'from' in JavaScript comments or documentation. In GLTFLoader.js there
# are illustrative URLs like https://my-cnd-server.com/... in comments.
# The old unanchored regex mistook these for package imports.
import_pattern = re.compile(
    r"""(?mxs)
      ^[ \t]*(?:import|export)[ \t]+
      (?:
        ['\"](?P<side_effect>[^'\"\r\n]+)['\"]
        | [^;]*?\bfrom[ \t\r\n]*['\"](?P<from_module>[^'\"\r\n]+)['\"]
      )
    """
)

while pending:
    name = pending.pop()
    if name in seen:
        continue
    file = (jsm_dir / name).resolve()
    try:
        relative = file.relative_to(jsm_dir.resolve())
    except ValueError:
        raise SystemExit(f'Unexpected external addon path: {name}')
    if not file.is_file():
        raise SystemExit(f'Required Three.js addon is missing: {name}')
    copied_path = output_dir / 'examples' / 'jsm' / relative
    copied_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(file, copied_path)
    seen.add(name)
    for match in import_pattern.finditer(file.read_text(encoding='utf-8')):
        dependency = match.group('from_module') or match.group('side_effect')
        if dependency == 'three':
            continue
        if dependency.startswith('.'):
            child = (file.parent / dependency).resolve()
            try:
                pending.append(child.relative_to(jsm_dir.resolve()).as_posix())
            except ValueError:
                raise SystemExit(f'Import escapes addon folder: {dependency} in {name}')
        else:
            raise SystemExit(f'Unexpected external package: {dependency} in {name}')

print('Vendored Three.js and addons:', ', '.join(sorted(seen)))
