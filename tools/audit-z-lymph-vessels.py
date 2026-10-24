"""Read-only Blender audit of Z-Anatomy lymphatic vessel coverage.
Run in Blender: blender -b Startup.blend --python audit-z-lymph-vessels.py -- --output /path/report.json
Never modifies the source .blend on disk.
"""
import bpy, json, re, sys, collections
from pathlib import Path

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if len(args) != 2 or args[0] != '--output':
    raise SystemExit('Usage: blender -b Startup.blend --python audit-z-lymph-vessels.py -- --output report.json')
output = Path(args[1]).expanduser().resolve()
output.parent.mkdir(parents=True, exist_ok=True)

V = re.compile(r'lymph(?:atic|oid)?\s*(?:vessels?|ducts?|trunks?|collectors?|channels?)|thoracic\s+duct|right\s+lymphatic\s+duct|cisterna\s+chyli|chylous\s+cistern|ductus\s+thoracicus|vasa\s+lymphatica|trunci\s+lymphatici', re.I)
LYMPH = re.compile(r'lymph|chyl|ductus\s+thoracicus', re.I)
NODE = re.compile(r'\b(?:lymph\s*(?:node|gland)s?|nodes?|tonsil|thymus|spleen)\b', re.I)
POTENTIAL = re.compile(r'\b(?:vessels?|ducts?|trunks?|collectors?|channels?|cistern|capillaries|vasa)\b', re.I)
paths = collections.defaultdict(set)

def visit(col, chain, parents):
    ident = id(col)
    if ident in parents:
        return
    new_chain = chain + (col.name,)
    for obj in col.objects:
        paths[obj.name].add(' / '.join(new_chain))
    for child in col.children:
        visit(child, new_chain, parents | {ident})

visit(bpy.context.scene.collection, (), set())
rows = []
counts = collections.Counter()
types = collections.Counter()
for obj in bpy.data.objects:
    types[obj.type] += 1
    all_paths = sorted(paths.get(obj.name, []))
    if not all_paths:
        all_paths = [', '.join(sorted(c.name for c in obj.users_collection))]
    ancestry = []
    parent = obj.parent
    while parent and len(ancestry) < 15:
        ancestry.append(parent.name)
        parent = parent.parent
    context = ' '.join([obj.name, *all_paths, *ancestry])
    vessel_named = bool(V.search(obj.name))
    in_lymph = bool(LYMPH.search(context))
    node_named = bool(NODE.search(obj.name))
    vessel_context = (in_lymph and bool(POTENTIAL.search(obj.name)) and not node_named)
    # Flag all nonmesh source objects within lymphatic collections, since our old exporter skipped these.
    nonmesh_lymph = in_lymph and obj.type in {'CURVE','CURVES','SURFACE','FONT','META','GREASEPENCIL','GPENCIL'}
    if vessel_named or vessel_context or nonmesh_lymph:
        category = 'explicit_vessel' if vessel_named else 'candidate_vessel' if vessel_context else 'nonmesh_lymphatic'
        counts[category] += 1
        counts[category+'_'+obj.type] += 1
        data = getattr(obj, 'data', None)
        polys = len(getattr(data, 'polygons', ())) if data is not None else 0
        splines = len(getattr(data, 'splines', ())) if data is not None else 0
        verts = len(getattr(data, 'vertices', ())) if data is not None else 0
        rows.append(dict(name=obj.name, type=obj.type, category=category, paths=all_paths, parents=ancestry,
                         polygons=polys, vertices=verts, splines=splines, hidden=bool(obj.hide_viewport)))

rows.sort(key=lambda r:(r['category'],r['type'],r['name'].lower()))
report = {'purpose':'Z-Anatomy lymphatic vessel source audit (read-only)',
          'source_blend':bpy.data.filepath,
          'total_objects':len(bpy.data.objects),
          'object_types':dict(types),
          'candidate_counts':dict(counts),
          'potential_vessel_or_nonmesh_objects':rows,
          'note':'Candidates require anatomy and licensing review. Counts do not establish vascular geometry or connectivity.'}
output.write_text(json.dumps(report,indent=2)+'\n')
print('\n--- ANATOMIQ LYMPHATIC VESSEL AUDIT ---')
print('Total source objects:', report['total_objects'])
print('Source object types:', dict(types))
print('Vessel candidate counts:', dict(counts))
print('Report:',output)
for r in rows[:60]:
    print(f"  {r['category']} | {r['type']} | {r['name']} | polygons={r['polygons']} splines={r['splines']}")
if len(rows)>60:
    print('  ...',len(rows)-60,'additional entries in report')
if not rows:
    print('NO VESSEL CANDIDATES: this Z-Anatomy file appears to contain nodes but no identifiable vessel objects.')
print('This audit does not alter or export the Blender source.\n')
