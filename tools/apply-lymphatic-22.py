#!/usr/bin/env python3
"""Append a small verified lymphatic atlas without changing existing anatomy assets.
Preflight all edits before writing; restore backups on failure. Safe to rerun.
"""
from pathlib import Path
import datetime,json,re,shutil,sys
ROOT=Path(__file__).resolve().parents[1]
REQUIRED=('app.js','index.html','sw.js','system-layers.js','structure-layout.js','scene-assets.js','scene-codec.js','styles.css','version.json','lymphatic-model.js','lymphatic-drainage.svg')
for name in REQUIRED:
    if not (ROOT/name).is_file():raise SystemExit(f'Missing {name}. Use setup-lymphatic-22.sh to merge assets into the repository first.')
if "const LYMPHATIC_MANIFEST=" in (ROOT/'app.js').read_text():
    print('PASS: Lymphatic app integration already present; no app files changed.')
    sys.exit(0)
changed={n:(ROOT/n).read_text() for n in REQUIRED if n not in ('lymphatic-model.js','lymphatic-drainage.svg')}
def sub(name,old,new,count=1):
    cur=changed[name]
    found=cur.count(old)
    if found!=count:raise ValueError(f'{name}: expected {count} occurrences but found {found} for {old[:95]!r}; project files unchanged')
    changed[name]=cur.replace(old,new,count)
def rex(name,regex,replacement):
    new,n=re.subn(regex,replacement,changed[name],count=1,flags=re.M)
    if n!=1:raise ValueError(f'{name}: anchor missing {regex[:100]!r}; files unchanged')
    changed[name]=new

# App source + default-off layer and metadata.
sub('app.js',"from './urinary-model.js';", "from './urinary-model.js';\nimport {lymphaticEntries,validateLymphaticManifest,lymphaticColor,LYMPHATIC_PRESETS,lymphaticVisibleInPreset} from './lymphatic-model.js';")
sub('app.js',"const URINARY_MANIFEST='./models/urinary-structures.json';", "const LYMPHATIC_MANIFEST='./models/lymphatic-structures.json';\nconst LYMPHATIC_STANDARD='./models/lymphatic-standard.glb';\nconst LYMPHATIC_DETAILED='./models/lymphatic-detailed.glb';\nconst URINARY_MANIFEST='./models/urinary-structures.json';")
sub('app.js',"let urinaryRoot=null,urinaryEntriesList=[],urinaryAvailable=false,urinaryLoaded=false,urinaryMetadata=null;", "let urinaryRoot=null,urinaryEntriesList=[],urinaryAvailable=false,urinaryLoaded=false,urinaryMetadata=null;\nconst LYMPHATIC_QUALITY_KEY='anatomiq-lymphatic-geometry-v1';\nlet lymphaticGeometry='standard';\ntry{lymphaticGeometry=localStorage.getItem(LYMPHATIC_QUALITY_KEY)==='detailed'?'detailed':'standard';}catch{}\nlet lymphaticRoot=null,lymphaticEntriesList=[],lymphaticAvailable=false,lymphaticLoaded=false,lymphaticMetadata=null;")
sub('app.js',"nervous:false,urinary:false};", "nervous:false,urinary:false,lymphatic:false};")
sub('app.js',"if(s.system==='urinary')return layers.urinary && urinaryAvailable && !s.mesh.userData?.deferredAsset;", "if(s.system==='urinary')return layers.urinary && urinaryAvailable && !s.mesh.userData?.deferredAsset;\n  if(s.system==='lymphatic')return layers.lymphatic && lymphaticAvailable && !s.mesh.userData?.deferredAsset;")
sub('app.js',"$('mode-urinary').disabled=!urinaryAvailable;", "$('mode-lymphatic').disabled=!lymphaticAvailable;\n  $('mode-lymphatic').title=lymphaticAvailable?'Verified spleen and thymus models':'Publish lymphatic GLBs and manifest to activate this layer';\n  $('lymphatic-study-panel').hidden=!teacherMode||!lymphaticAvailable||!layers.lymphatic;\n  if(lymphaticAvailable)$('lymphatic-study-count').textContent=`${lymphaticEntriesList.length} verified source meshes · 1 spleen, 2 thymus lobes`;\n  $('mode-urinary').disabled=!urinaryAvailable;")
sub('app.js',"layers.urinary?'Urinary':null]", "layers.urinary?'Urinary':null,layers.lymphatic?'Lymphatic':null]")
sub('app.js',"if(s.system==='urinary')return ({kidney:", "if(s.system==='lymphatic')return s.organId==='spleen'?'Filters blood, removes aging red blood cells and supports immune surveillance.':'Primary lymphoid organ where T lymphocytes mature.';\n  if(s.system==='urinary')return ({kidney:")
sub('app.js',"s.system==='urinary'?({'kidney':'Kidneys'", "s.system==='lymphatic'?({'spleen':'Spleen','thymus':'Thymus'}[s.organId]||'Lymphatic structures'):s.system==='urinary'?({'kidney':'Kidneys'")
sub('app.js',"...nervousEntriesList,...urinaryEntriesList]);", "...nervousEntriesList,...urinaryEntriesList,...lymphaticEntriesList]);")
sub('app.js',"${catalog.urinaryCount} urinary meshes;", "${catalog.urinaryCount} urinary meshes; ${catalog.lymphaticCount} lymphatic meshes;")

loader='''async function loadLymphatic(){
  lymphaticLoaded=false;lymphaticAvailable=false;lymphaticEntriesList=[];
  if(lymphaticRoot){scene.remove(lymphaticRoot);lymphaticRoot=null;}
  try{
    const response=await fetch(LYMPHATIC_MANIFEST,{cache:'no-cache'});
    if(!response.ok||/text\\/html/i.test(response.headers.get('content-type')||''))return;
    const manifest=validateLymphaticManifest(await response.json());
    const requested=lymphaticGeometry==='detailed'?LYMPHATIC_DETAILED:LYMPHATIC_STANDARD;
    let gltf;
    try{gltf=await new GLTFLoader().loadAsync(requested);}
    catch(error){if(requested===LYMPHATIC_STANDARD)throw error;console.warn('Lymphatic Detailed unavailable, using Standard',error);gltf=await new GLTFLoader().loadAsync(LYMPHATIC_STANDARD);}
    const entries=lymphaticEntries(gltf.scene,manifest);
    const alignment=correctedDetailTransform(sourceRegistration(new THREE.Box3().setFromObject(sceneRoot)));
    gltf.scene.scale.set(...alignment.scale);gltf.scene.position.set(...alignment.position);
    scene.add(gltf.scene);lymphaticRoot=gltf.scene;
    for(const entry of entries){
      const mesh=entry.mesh;
      if(mesh.geometry?.attributes?.position&&!mesh.geometry.attributes.normal)mesh.geometry.computeVertexNormals();
      const original=mesh.material;
      mesh.material=new THREE.MeshStandardMaterial({color:lymphaticColor(entry),metalness:0,roughness:entry.organId==='spleen'?0.46:0.59,side:THREE.DoubleSide});
      applySurfaceFinish(mesh.material,'lymphatic',surfaceMode);
      if(Array.isArray(original))original.forEach(m=>m?.dispose());else original?.dispose();
      materials.set(mesh,mesh.material);mesh.visible=false;
    }
    lymphaticEntriesList=entries;lymphaticAvailable=true;lymphaticLoaded=true;
    configureAnatomyShadows(lymphaticRoot,shadows.profile.enabled);
  }catch(error){console.warn('Lymphatic atlas missing or inconsistent',error);if(lymphaticRoot){scene.remove(lymphaticRoot);lymphaticRoot=null;}}
}
'''
sub('app.js','async function loadHighResolutionSkull(){',loader+'async function loadHighResolutionSkull(){')
sub('app.js',"urinaryMetadata=await readOptionalManifest(URINARY_MANIFEST,validateUrinaryManifest);", "lymphaticMetadata=await readOptionalManifest(LYMPHATIC_MANIFEST,validateLymphaticManifest);\n  if(lymphaticMetadata){lymphaticEntriesList=lymphaticEntries(asVirtualRoot(lymphaticMetadata.structures.map(s=>s.id)),lymphaticMetadata);lymphaticAvailable=true;}\n  urinaryMetadata=await readOptionalManifest(URINARY_MANIFEST,validateUrinaryManifest);")
sub('app.js',"system==='nervous'?s.system==='nervous':s.system==='urinary'", "system==='nervous'?s.system==='nervous':system==='lymphatic'?s.system==='lymphatic':s.system==='urinary'")
sub('app.js',"}else if(kind==='urinary'){", "}else if(kind==='lymphatic'){\n    if(lymphaticLoaded)return;\n    await loadLymphatic();\n    if(!lymphaticLoaded)throw new Error('Missing lymphatic models; publish matching GLBs and JSON.');\n    restoreDeferredReferences('lymphatic',lymphaticEntriesList);\n  }else if(kind==='urinary'){")
sub('app.js',"'nervous','urinary'])if(needed[type])", "'nervous','urinary','lymphatic'])if(needed[type])")
sub('app.js',"await loadNervous();await loadUrinary();", "await loadNervous();await loadUrinary();await loadLymphatic();",2)
sub('app.js',"if(requirements.urinary)await loadUrinary();", "if(requirements.urinary)await loadUrinary();\n      if(requirements.lymphatic)await loadLymphatic();")
sub('app.js',"||system==='urinary'))", "||system==='urinary'||system==='lymphatic'))")
sub('app.js',"system==='urinary'?'urinary':'cardiovascular'", "system==='urinary'?'urinary':system==='lymphatic'?'lymphatic':'cardiovascular'")
sub('app.js',"system==='urinary'?systemLayers.urinary:systemLayers.cardiovascular", "system==='urinary'?systemLayers.urinary:system==='lymphatic'?systemLayers.lymphatic:systemLayers.cardiovascular")
sub('app.js',"respiratoryAvailable,nervousAvailable,urinaryAvailable);", "respiratoryAvailable,nervousAvailable,urinaryAvailable,lymphaticAvailable);")
sub('app.js',"'nervous','urinary']){", "'nervous','urinary','lymphatic']){")
sub('app.js',"\n$('settings-urinary-geometry').value=urinaryGeometry;", "\n$('settings-lymphatic-geometry').value=lymphaticGeometry;\n$('settings-lymphatic-geometry').addEventListener('change',()=>{const next=$('settings-lymphatic-geometry').value==='detailed'?'detailed':'standard';if(next===lymphaticGeometry)return;if(teacherMode)saveDraft(false);try{localStorage.setItem(LYMPHATIC_QUALITY_KEY,next);}catch{}location.reload();});\n$('settings-urinary-geometry').value=urinaryGeometry;")
# This setting appears in two contexts. above replace only first, add the second without duplicate listener.
sub('app.js',"  $('settings-urinary-geometry').value=urinaryGeometry;", "  $('settings-lymphatic-geometry').value=lymphaticGeometry;\n  $('settings-urinary-geometry').value=urinaryGeometry;")
sub('app.js',"urinaryMode:urinaryGeometry,lessonModels:", "urinaryMode:urinaryGeometry,lymphatic:teacherMode&&lymphaticAvailable,lymphaticMode:lymphaticGeometry,lessonModels:")
sub('app.js',"nervousGeometry,urinaryGeometry}):[]", "nervousGeometry,urinaryGeometry,lymphaticGeometry}):[]")
sub('app.js',"ur:systemLayers.urinary,ro:", "ur:systemLayers.urinary,ly:systemLayers.lymphatic,ro:")
sub('app.js',"systemLayers.urinary=saved.ur ?? false;", "systemLayers.urinary=saved.ur ?? false;\n    systemLayers.lymphatic=saved.ly ?? false;")
sub('app.js',"if(systemLayers.urinary&&!urinaryAvailable)", "if(systemLayers.lymphatic&&!lymphaticAvailable)throw new Error('This lesson requires lymphatic-standard.glb and lymphatic-structures.json.');\n    if(systemLayers.urinary&&!urinaryAvailable)")
sub('app.js',"nervous:false,urinary:false});", "nervous:false,urinary:false,lymphatic:false});")
sub('app.js',"if(!$('kidney-interior-dialog').hidden)$('kidney-interior-dialog').hidden=true;", "if(!$('kidney-interior-dialog').hidden)$('kidney-interior-dialog').hidden=true;\n    if(!$('lymphatic-diagram-dialog').hidden)$('lymphatic-diagram-dialog').hidden=true;")
# Lymphatic study presets, with accompanying illustration independent of 3D geometry.
study='''function applyLymphaticPreset(preset){
  if(!teacherMode||!lymphaticAvailable||!Object.hasOwn(LYMPHATIC_PRESETS,preset))return;
  mode='systems';Object.assign(systemLayers,{skeletal:false,superficial:false,deep:false,digestive:false,cardiovascular:false,respiratory:false,nervous:false,urinary:false,lymphatic:true});
  for(const s of lymphaticEntriesList){if(lymphaticVisibleInPreset(s,preset))hidden.delete(s.mesh);else hidden.add(s.mesh);}
  isolated=false;setSelection(null);updateLayerHeading();updateSystemControls();refreshVisibility();frameVisible('front');queueDraft();showToast(LYMPHATIC_PRESETS[preset]+' applied');
}
for(const b of document.querySelectorAll('[data-lymphatic-preset]'))b.addEventListener('click',()=>applyLymphaticPreset(b.dataset.lymphaticPreset));
$('lymphatic-diagram-open').addEventListener('click',()=>{$('lymphatic-diagram-dialog').hidden=false;});
$('lymphatic-diagram-close').addEventListener('click',()=>{$('lymphatic-diagram-dialog').hidden=true;});
$('lymphatic-diagram-dialog').addEventListener('click',e=>{if(e.target===$('lymphatic-diagram-dialog'))e.currentTarget.hidden=true;});
'''
sub('app.js','function applyUrinaryPreset(preset){',study+'function applyUrinaryPreset(preset){')
rex('app.js',r"const APP_VERSION = '\d+\.\d+\.\d+';", "const APP_VERSION = '2.2.0';")
rex('app.js',r"pong\.version!=='anatomy-v[^']+'", "pong.version!=='anatomy-v2.2.0'")

# Append-only scene layout: every older label/painted structure retains its absolute index.
sub('structure-layout.js',"const structures=[...preCardio,...cardiovascular,...respiratory,...nervous,...urinary];", "const lymphatic=entries.filter(s=>s.system==='lymphatic');\n  const structures=[...preCardio,...cardiovascular,...respiratory,...nervous,...urinary,...lymphatic];")
sub('structure-layout.js',"urinaryCount:urinary.length};", "urinaryCount:urinary.length,lymphaticCount:lymphatic.length};")
sub('scene-codec.js',"'nv','ur']", "'nv','ur','ly']")
sub('scene-assets.js',"urinary:chapter.ur===true,", "urinary:chapter.ur===true,\n    lymphatic:chapter.ly===true,")
sub('scene-assets.js',"urinary:false,skull:false", "urinary:false,lymphatic:false,skull:false")
sub('scene-assets.js',"urinaryGeometry='standard'}={}", "urinaryGeometry='standard',lymphaticGeometry='standard'}={}")
sub('scene-assets.js',"if(needed.urinary)files.push('models/urinary-structures.json',`models/urinary-${urinaryGeometry==='detailed'?'detailed':'standard'}.glb`);", "if(needed.urinary)files.push('models/urinary-structures.json',`models/urinary-${urinaryGeometry==='detailed'?'detailed':'standard'}.glb`);\n  if(needed.lymphatic)files.push('models/lymphatic-structures.json',`models/lymphatic-${lymphaticGeometry==='detailed'?'detailed':'standard'}.glb`);")
# Independent layer toggles and legacy scenes.
sub('system-layers.js',"urinary:Boolean(raw.urinary)}", "urinary:Boolean(raw.urinary),lymphatic:Boolean(raw.lymphatic)}")
sub('system-layers.js',"nervous:false,urinary:false};", "nervous:false,urinary:false,lymphatic:false};",3)
sub('system-layers.js',"nervous:s.nervous,urinary:s.urinary};", "nervous:s.nervous,urinary:s.urinary,lymphatic:s.lymphatic};")
sub('system-layers.js',"nervousAvailable=false,urinaryAvailable=false){", "nervousAvailable=false,urinaryAvailable=false,lymphaticAvailable=false){")
sub('system-layers.js',"'nervous','urinary'].includes", "'nervous','urinary','lymphatic'].includes")
sub('system-layers.js',"if(system==='urinary'&&!urinaryAvailable)", "if(system==='lymphatic'&&!lymphaticAvailable)throw new Error('Publish matching lymphatic-standard.glb, lymphatic-detailed.glb and lymphatic-structures.json.');\n  if(system==='urinary'&&!urinaryAvailable)")
sub('system-layers.js',"if(system==='urinary')next.urinary=!next.urinary;", "if(system==='urinary')next.urinary=!next.urinary;\n  if(system==='lymphatic')next.lymphatic=!next.lymphatic;")

# UI: insert whole valid nodes; do not repeat the malformed id attribute from 2.1.
sub('index.html', '<button id="mode-urinary"', '<button id="mode-lymphatic" class="mode-tab" type="button" aria-pressed="false" data-system="lymphatic" disabled>Lymphatic</button>\n        <button id="mode-urinary"')
sub('index.html','<section id="urinary-study-panel"', '''<section id="lymphatic-study-panel" class="systems-panel cardio-study-panel teacher-only" aria-label="Lymphatic and immune organs" hidden>
          <div class="systems-header"><span class="eyebrow">LYMPHATIC / IMMUNE ORGAN STUDY</span><p id="lymphatic-study-count" class="studio-hint"></p></div>
          <p class="studio-hint">Verified BodyParts3D spleen and thymus only. The atlas has no lymph node, duct, vessel or tonsil geometry. Use the separately labeled regional drainage teaching diagram.</p>
          <div class="cardio-presets" role="group" aria-label="Lymphatic organ presets">
            <button class="button small" type="button" data-lymphatic-preset="all">Immune organs</button>
            <button class="button small" type="button" data-lymphatic-preset="spleen">Spleen only</button>
            <button class="button small" type="button" data-lymphatic-preset="thymus">Thymus only</button>
            <button id="lymphatic-diagram-open" class="button small primary" type="button">Lymph drainage (diagram)</button>
          </div>
        </section>
        <section id="urinary-study-panel"''')
sub('index.html','<div class="dialog-backdrop" id="kidney-interior-dialog" hidden>', '''<div class="dialog-backdrop" id="lymphatic-diagram-dialog" hidden>
    <section class="share-dialog lymphatic-diagram-dialog" role="dialog" aria-modal="true" aria-labelledby="lymphatic-diagram-title">
      <div class="dialog-header"><div><span class="eyebrow">LYMPHATIC SYSTEM · TEACHING DIAGRAM</span><h2 id="lymphatic-diagram-title">Major drainage regions (schematic)</h2></div><button type="button" id="lymphatic-diagram-close" class="icon-button" aria-label="Close lymphatic diagram">✕</button></div>
      <p class="studio-hint">These simplified regional pathways are not anatomical meshes or patient-specific geometry. The spleen and thymus remain selectable in the 3D atlas.</p>
      <img class="lymphatic-diagram-image" src="./lymphatic-drainage.svg" alt="Schematic major lymphatic nodes, thoracic duct, spleen and thymus" />
    </section>
  </div>
  <div class="dialog-backdrop" id="kidney-interior-dialog" hidden>''')
sub('index.html','<label for="settings-urinary-geometry">', '''<label for="settings-lymphatic-geometry"><strong>Lymphatic geometry</strong></label>
        <select id="settings-lymphatic-geometry" class="text-input" aria-label="Lymphatic geometry quality"><option value="standard">Standard — Chromebook optimized</option><option value="detailed">Detailed — smoother spleen and thymus</option></select>
        <label for="settings-urinary-geometry">''')
sub('index.html','<option value="urinary">Urinary — catalog, Standard and Detailed models</option>', '<option value="urinary">Urinary — catalog, Standard and Detailed models</option>\n          <option value="lymphatic">Lymphatic — catalog, Standard and Detailed models</option>')
# Handle 2.1 startup malformed respiratory id defensively in case an older repo was not repaired.
changed['index.html']=changed['index.html'].replace('id="respiratory-study-panel class=', 'id="respiratory-study-panel" class=')
rex('index.html',r'<span class="version">STUDIO [^<]+</span>', '<span class="version">STUDIO 2.2.0</span>')
changed['styles.css']+='\n/* AnatomIQ 2.2 labeled educational schematic, not 3D anatomy. */\n.lymphatic-diagram-dialog{width:min(980px,96vw);max-height:90vh;overflow:auto}\n.lymphatic-diagram-image{display:block;width:100%;height:auto;border-radius:12px}\n'

# Worker: atomic refresh and lesson caching; new files in shell, NOT bundled GLBs.
rex('sw.js',r"const VERSION='anatomy-v[^']+';", "const VERSION='anatomy-v2.2.0';")
sub('sw.js',"'./urinary-model.js'", "'./urinary-model.js','./lymphatic-model.js','./lymphatic-drainage.svg'")
sub('sw.js',"urinary:['models/urinary-structures.json','models/urinary-standard.glb','models/urinary-detailed.glb'],", "urinary:['models/urinary-structures.json','models/urinary-standard.glb','models/urinary-detailed.glb'],\n  lymphatic:['models/lymphatic-structures.json','models/lymphatic-standard.glb','models/lymphatic-detailed.glb'],")
sub('sw.js',"scope==='nervous'||scope==='urinary'", "scope==='nervous'||scope==='urinary'||scope==='lymphatic'")
sub('sw.js',"urinary-(?:standard|detailed)|skull-detailed", "urinary-(?:standard|detailed)|lymphatic-(?:standard|detailed)|skull-detailed")
sub('sw.js',"nervous|urinary|skull)-structures", "nervous|urinary|lymphatic|skull)-structures")
sub('sw.js',"...(event.data.urinary?['./models/urinary-structures.json'", "...(event.data.lymphatic?['./models/lymphatic-structures.json',event.data.lymphaticMode==='detailed'?'./models/lymphatic-detailed.glb':'./models/lymphatic-standard.glb']:[]),...(event.data.urinary?['./models/urinary-structures.json'")
# Make sure no student can cache an unapproved URL or unexpected extension.

current=json.loads(changed['version.json'])
current.update(version='2.2.0',published='2026-10-24',notes='New BodyParts3D verified spleen and thymus layer; schematic lymphatic drainage diagram; exact GLB validation; append-only scene indices.')
changed['version.json']=json.dumps(current,indent=2)+'\n'

# Preflight structural HTML and script references before mutating the user's project.
for name in ('lymphatic-study-panel','respiratory-study-panel','lymphatic-diagram-dialog','mode-lymphatic','settings-lymphatic-geometry'):
    if changed['index.html'].count('id="'+name+'"')!=1:raise ValueError('HTML panel validation failed for '+name)
for name in ('lymphaticEntries','loadLymphatic','lymphaticAvailable','lymphatic-study-count'):
    if name not in changed['app.js']:raise ValueError('App integration validation failed: '+name)

backup=ROOT/'.lymphatic-22-backups'/datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
backup.mkdir(parents=True,exist_ok=False)
try:
    for name in changed:shutil.copy2(ROOT/name,backup/name)
    for name,data in changed.items():
        temp=ROOT/(name+'.lymphatic-tmp');temp.write_text(data);temp.replace(ROOT/name)
except Exception:
    for name in changed:
        if (backup/name).exists():shutil.copy2(backup/name,ROOT/name)
    raise
print('PASS: AnatomIQ 2.2.0 lymphatic app integration applied.')
print('Existing urinary, nervous, cardiovascular, digestive, respiratory and skeletal GLBs untouched.')
print('Backup:',backup)
