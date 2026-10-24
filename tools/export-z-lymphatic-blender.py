"""Run with Blender: blender -b Startup.blend --python thisfile -- --outdir DIR

Does not save the .blend or alter it on disk. Exports candidate lymphatic meshes
plus spleen and bilateral thymus fiducials, and a complete provenance inventory.
"""
import sys, json, collections
from pathlib import Path

try:
    import bpy
except ImportError:
    raise SystemExit('Use Blender to run this script: blender -b Startup.blend --python export-z-lymphatic-blender.py -- --outdir DIR')

argv = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(argv)!=2 or argv[0]!='--outdir':
    raise SystemExit('Usage: blender -b Startup.blend --python export-z-lymphatic-blender.py -- --outdir DIRECTORY')
out=Path(argv[1]).resolve();out.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(Path(__file__).resolve().parent))
from z_lymph_identify import classify,anchor,stable_id

# Blender objects may be in multiple collections. Include nested collection names.
paths=collections.defaultdict(list)
def collect(col, prefix, stack):
    if col.name in stack:return
    p=prefix + [col.name]
    for ob in col.objects:
        paths[ob.name].append(p)
    for c in col.children:collect(c,p,stack|{col.name})
collect(bpy.context.scene.collection, [],set())

inventory=[]; selected=[]; anchor_candidates=collections.defaultdict(list)
for ob in bpy.data.objects:
    if ob.type!='MESH' or not ob.data or not len(ob.data.vertices):continue
    all_paths=paths.get(ob.name) or [[c.name for c in ob.users_collection]]
    # Prefer the most specific hierarchy including lymphatic anatomy.
    all_paths.sort(key=lambda p:(sum('lymph' in x.lower() for x in p),len(p)),reverse=True)
    parent_names=[]
    parent=ob.parent
    while parent is not None:
        parent_names.append(parent.name)
        parent=parent.parent
    ancestor=list(all_paths[0])+parent_names
    kind=classify(ob.name,ancestor)
    candidate_anchor=anchor(ob.name,ancestor)
    item={'name':ob.name,'path':'/'.join(all_paths[0]),'source_type':ob.type,
          'vertices':len(ob.data.vertices),'polygons':len(ob.data.polygons),
          'category':kind,'anchor':candidate_anchor}
    inventory.append(item)
    if candidate_anchor:anchor_candidates[candidate_anchor].append((ob,item))
    # exclude spleen and thymus from import; these are already in AnatomIQ
    if kind and not candidate_anchor:
        label=stable_id(ob.name,item['path'])
        item['id']=label
        selected.append((ob,item))

(out/'source-inventory.json').write_text(json.dumps({'source':'Z-Anatomy Blender source','meshes':inventory},indent=2))

# If no unambiguously identified spleen/thymus anchors, stop before export.
fiducials={}
for key in ('spleen','thymus_left','thymus_right'):
    candidates=anchor_candidates.get(key,[])
    # Avoid choosing separate tiny pieces if a whole anchor mesh exists.
    candidates=sorted(candidates,key=lambda a:a[1]['polygons'],reverse=True)
    if candidates: fiducials[key]=candidates[0]

report={'mesh_count':len(inventory),'candidate_count':len(selected),'categories':dict(collections.Counter(item['category'] for _,item in selected)),
        'anchor_candidate_counts':{key:len(anchor_candidates.get(key,[])) for key in ('spleen','thymus_left','thymus_right')},
        'anchors':{k:v[1]['name'] for k,v in fiducials.items()},'candidates':[x[1] for x in selected],
        'status':'audit_only'}
(out/'selection-audit.json').write_text(json.dumps(report,indent=2))
print('Z-Anatomy candidate lymphatic meshes:',len(selected),'categories',report['categories'])
print('Anchor candidates:',report['anchor_candidate_counts'])
if len(selected)==0:
    raise SystemExit('No lymphatic candidate meshes found. Inspect selection-audit.json before any import.')
if len(fiducials)<3:
    raise SystemExit('Need source spleen and left/right thymus for safe frame registration; audit written, no model published.')

chosen=selected + [(ob,{**item,'id':'ZAANCHOR_'+key.upper()}) for key,(ob,item) in fiducials.items()]
# Avoid duplicate meshes, e.g. when a naming rule selected an anchor too.
unique={id(ob): (ob,item) for ob,item in chosen}
for ob in bpy.data.objects:
    try:ob.select_set(False)
    except (RuntimeError,AttributeError):pass
for ob,item in unique.values():
    try:ob.hide_set(False)
    except (RuntimeError,AttributeError):pass
    ob.hide_viewport=False
    ob.name=item['id']
    ob['za_name']=item.get('name',ob.name)
    ob['za_category']=item.get('category') or 'anchor'
    try:ob.select_set(True)
    except RuntimeError:pass
if unique:
    bpy.context.view_layer.objects.active=next(iter(unique.values()))[0]
output=out/'z-lymphatic-source.glb'
bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,export_extras=True)
report['status']='exported_unregistered';report['source_glb']=output.name
(out/'selection-audit.json').write_text(json.dumps(report,indent=2))
# Blender can silently drop degenerate zero-primitive objects. Do not let the
# selection audit claim nodes that were not actually exported.
from z_lymph_selection_reconcile import reconcile
reconcile(output, out/'selection-audit.json')
print('Source GLB exported:',output,'size',output.stat().st_size)
