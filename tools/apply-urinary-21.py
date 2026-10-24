#!/usr/bin/env python3
"""Patch an EXISTING AnatomIQ 2.0.x project without replacing its nervous-system refinements.

All patches are preflighted in memory. No project files are altered until all
expected application anchors have matched. Any failure leaves project unchanged.
"""
from __future__ import annotations
from pathlib import Path
import datetime, json, re, shutil, sys

ROOT=Path(__file__).resolve().parents[1]
REQUIRED=['app.js','index.html','styles.css','system-layers.js','structure-layout.js',
          'scene-assets.js','scene-codec.js','sw.js','version.json','urinary-model.js','kidney-interior.svg']
for name in REQUIRED:
    if not (ROOT/name).is_file():raise SystemExit(f'Missing {name}. Merge the update package into the existing repository first.')

content={n:(ROOT/n).read_text() for n in REQUIRED if n not in ('urinary-model.js','kidney-interior.svg')}
if 'const URINARY_MANIFEST=' in content['app.js']:
    raise SystemExit('Urinary 2.1.0 patch already installed; refusing to apply twice.')


def sub(name,old,new,count=1):
    src=content[name]
    if src.count(old)!=count:
        raise ValueError(f'{name}: expected {count} occurrences of {old[:110]!r}, found {src.count(old)}. No files changed.')
    content[name]=src.replace(old,new,count)


def regex_sub(name,pattern,replacement):
    result,n=re.subn(pattern,replacement,content[name],count=1,flags=re.M)
    if n!=1:raise ValueError(f'{name}: missing expected pattern {pattern[:110]!r}; no files changed')
    content[name]=result

# App: one line for import, then exact anchors at every urinary layer lifecycle.
sub('app.js',"from './nervous-model.js';", "from './nervous-model.js';\nimport {urinaryEntries,validateUrinaryManifest,urinaryColor,URINARY_PRESETS,urinaryVisibleInPreset,isRenalVessel} from './urinary-model.js';")
sub('app.js',"const NERVOUS_MANIFEST='./models/nervous-structures.json';", "const URINARY_MANIFEST='./models/urinary-structures.json';\nconst URINARY_STANDARD='./models/urinary-standard.glb';\nconst URINARY_DETAILED='./models/urinary-detailed.glb';\nconst NERVOUS_MANIFEST='./models/nervous-structures.json';")
sub('app.js',"let nervousRoot=null,nervousEntriesList=[],nervousAvailable=false,nervousLoaded=false,nervMetadata=null;", "let nervousRoot=null,nervousEntriesList=[],nervousAvailable=false,nervousLoaded=false,nervMetadata=null;\nconst URINARY_QUALITY_KEY='anatomiq-urinary-geometry-v1';\nlet urinaryGeometry='standard';\ntry{urinaryGeometry=localStorage.getItem(URINARY_QUALITY_KEY)==='detailed'?'detailed':'standard';}catch{}\nlet urinaryRoot=null,urinaryEntriesList=[],urinaryAvailable=false,urinaryLoaded=false,urinaryMetadata=null;")
sub('app.js',"respiratory:false,nervous:false};", "respiratory:false,nervous:false,urinary:false};")
sub('app.js',"if(s.system==='nervous')return layers.nervous && nervousAvailable && !s.mesh.userData?.deferredAsset;", "if(s.system==='nervous')return layers.nervous && nervousAvailable && !s.mesh.userData?.deferredAsset;\n  if(s.system==='urinary')return layers.urinary && urinaryAvailable && !s.mesh.userData?.deferredAsset;")
sub('app.js',"$('mode-nervous').title=nervousAvailable?", "$('mode-urinary').disabled=!urinaryAvailable;\n  $('mode-urinary').title=urinaryAvailable?`${urinaryEntriesList.length} kidney and urinary-tract structures`:'Generate and upload the source-backed urinary models';\n  $('urinary-study-panel').hidden=!teacherMode||!urinaryAvailable||!layers.urinary;\n  if(urinaryAvailable)$('urinary-study-count').textContent=`${urinaryEntriesList.length} verified urinary meshes; renal vessels reused from Cardiovascular`;\n  $('mode-nervous').title=nervousAvailable?")
sub('app.js',"layers.nervous?'Nervous':null].filter(Boolean)","layers.nervous?'Nervous':null,layers.urinary?'Urinary':null].filter(Boolean)")
sub('app.js',"...respiratoryEntriesList,...nervousEntriesList]);", "...respiratoryEntriesList,...nervousEntriesList,...urinaryEntriesList]);")
sub('app.js',"${catalog.nervousCount} nervous meshes;", "${catalog.nervousCount} nervous meshes; ${catalog.urinaryCount} urinary meshes;")
# App: loader and metadata-only catalogue for student links.
sub('app.js',"async function loadHighResolutionSkull(){", """async function loadUrinary(){
  urinaryLoaded=false;urinaryAvailable=false;urinaryEntriesList=[];
  if(urinaryRoot){scene.remove(urinaryRoot);urinaryRoot=null;}
  try{
    const response=await fetch(URINARY_MANIFEST,{cache:'no-cache'});
    if(!response.ok||/text\\/html/i.test(response.headers.get('content-type')||''))return;
    const manifest=validateUrinaryManifest(await response.json());
    const requested=urinaryGeometry==='detailed'?URINARY_DETAILED:URINARY_STANDARD;
    let gltf;
    try{gltf=await new GLTFLoader().loadAsync(requested);}
    catch(error){if(requested===URINARY_STANDARD)throw error;console.warn('Detailed urinary geometry unavailable; using Standard',error);gltf=await new GLTFLoader().loadAsync(URINARY_STANDARD);}
    const entries=urinaryEntries(gltf.scene,manifest);
    const alignment=correctedDetailTransform(sourceRegistration(new THREE.Box3().setFromObject(sceneRoot)));
    gltf.scene.scale.set(...alignment.scale);gltf.scene.position.set(...alignment.position);
    scene.add(gltf.scene);urinaryRoot=gltf.scene;
    for(const entry of entries){
      const mesh=entry.mesh;
      if(mesh.geometry?.attributes?.position&&!mesh.geometry.attributes.normal)mesh.geometry.computeVertexNormals();
      const original=mesh.material;
      mesh.material=new THREE.MeshStandardMaterial({color:urinaryColor(entry),metalness:0,roughness:0.73,side:THREE.DoubleSide});
      applySurfaceFinish(mesh.material,'urinary',surfaceMode);
      if(Array.isArray(original))original.forEach(m=>m?.dispose());else original?.dispose();
      materials.set(mesh,mesh.material);mesh.visible=false;
    }
    urinaryEntriesList=entries;urinaryAvailable=true;urinaryLoaded=true;
    configureAnatomyShadows(urinaryRoot,shadows.profile.enabled);
  }catch(error){
    console.warn('Urinary atlas missing or inconsistent',error);
    if(urinaryRoot){scene.remove(urinaryRoot);urinaryRoot=null;}
  }
}
async function loadHighResolutionSkull(){""")
sub('app.js',"nervMetadata=await readOptionalManifest(NERVOUS_MANIFEST,validateNervousManifest);", "urinaryMetadata=await readOptionalManifest(URINARY_MANIFEST,validateUrinaryManifest);\n  if(urinaryMetadata){urinaryEntriesList=urinaryEntries(asVirtualRoot(urinaryMetadata.structures.map(s=>s.id)),urinaryMetadata);urinaryAvailable=true;}\n  nervMetadata=await readOptionalManifest(NERVOUS_MANIFEST,validateNervousManifest);")
sub('app.js',"s.system==='respiratory'?s.system==='respiratory':s.system==='nervous'", "s.system==='respiratory'?s.system==='respiratory':s.system==='nervous'") if False else None
sub('app.js',"system==='respiratory'?s.system==='respiratory':s.system==='nervous'", "system==='respiratory'?s.system==='respiratory':system==='nervous'?s.system==='nervous':s.system==='urinary'")
sub('app.js',"}else if(kind==='cardiovascular'){", "}else if(kind==='urinary'){\n    if(urinaryLoaded)return;\n    await loadUrinary();\n    if(!urinaryLoaded)throw new Error('Missing urinary models; publish both GLBs and urinary-structures.json.');\n    restoreDeferredReferences('urinary',urinaryEntriesList);\n  }else if(kind==='cardiovascular'){")
sub('app.js',"'cardiovascular','respiratory','nervous'])if(needed[type])", "'cardiovascular','respiratory','nervous','urinary'])if(needed[type])")
sub('app.js',"await loadRespiratory();await loadNervous();", "await loadRespiratory();await loadNervous();await loadUrinary();",2)
sub('app.js',"if(requirements.nervous)await loadNervous();", "if(requirements.nervous)await loadNervous();\n      if(requirements.urinary)await loadUrinary();")
sub('app.js',"system==='respiratory'||system==='nervous'", "system==='respiratory'||system==='nervous'||system==='urinary'")
sub('app.js',"system==='nervous'?'nervous':'cardiovascular'", "system==='nervous'?'nervous':system==='urinary'?'urinary':'cardiovascular'")
sub('app.js',"system==='nervous'?systemLayers.nervous:systemLayers.cardiovascular", "system==='nervous'?systemLayers.nervous:system==='urinary'?systemLayers.urinary:systemLayers.cardiovascular")
sub('app.js',"respiratoryAvailable,nervousAvailable);", "respiratoryAvailable,nervousAvailable,urinaryAvailable);")
sub('app.js',"'respiratory','nervous']){", "'respiratory','nervous','urinary']){")
sub('app.js',"$('settings-nervous-geometry').value=nervousGeometry;\n$('settings-nervous-geometry').addEventListener", "$('settings-nervous-geometry').value=nervousGeometry;\n$('settings-urinary-geometry').value=urinaryGeometry;\n$('settings-urinary-geometry').addEventListener('change',()=>{const next=$('settings-urinary-geometry').value==='detailed'?'detailed':'standard';if(next===urinaryGeometry)return;if(teacherMode)saveDraft(false);try{localStorage.setItem(URINARY_QUALITY_KEY,next);}catch{}location.reload();});\n$('settings-nervous-geometry').addEventListener")
sub('app.js',"nervousMode:nervousGeometry,lessonModels:", "nervousMode:nervousGeometry,urinary:teacherMode&&urinaryAvailable,urinaryMode:urinaryGeometry,lessonModels:")
sub('app.js',"respiratoryGeometry,nervousGeometry}):[]", "respiratoryGeometry,nervousGeometry,urinaryGeometry}):[]")
sub('app.js',"  $('settings-nervous-geometry').value=nervousGeometry;\n  $('settings-installed')", "  $('settings-nervous-geometry').value=nervousGeometry;\n  $('settings-urinary-geometry').value=urinaryGeometry;\n  $('settings-installed')")
sub('app.js',"nv:systemLayers.nervous,ro:respiratoryOpacity", "nv:systemLayers.nervous,ur:systemLayers.urinary,ro:respiratoryOpacity")
sub('app.js',"systemLayers.nervous=saved.nv ?? false;", "systemLayers.nervous=saved.nv ?? false;\n    systemLayers.urinary=saved.ur ?? false;")
sub('app.js',"if(systemLayers.nervous&&!nervousAvailable)", "if(systemLayers.urinary&&!urinaryAvailable)throw new Error('This lesson requires urinary-standard.glb and urinary-structures.json.');\n    if(systemLayers.nervous&&!nervousAvailable)")
# Add one default-state update to the explicit new-lesson reset without perturbing other layers.
sub('app.js',"Object.assign(systemLayers,{skeletal:true,deep:false,superficial:true,digestive:false,cardiovascular:false});", "Object.assign(systemLayers,{skeletal:true,deep:false,superficial:true,digestive:false,cardiovascular:false,respiratory:false,nervous:false,urinary:false});")
sub('app.js',"if(s.system==='respiratory')return ({lung:", "if(s.system==='urinary')return ({kidney:'Filters blood and regulates water, electrolytes and acid-base balance.',ureter:'Carries urine from renal pelvis toward the bladder.',bladder:'Stores urine until micturition.',urethra:'Carries urine from the bladder to the exterior.'})[s.organId]||'Urinary system anatomy.';\n  if(s.system==='respiratory')return ({lung:")
sub('app.js',"s.system==='nervous'?({'brain'", "s.system==='urinary'?({'kidney':'Kidneys','ureter':'Ureters','bladder':'Urinary bladder','urethra':'Urethra'}[s.organId]||'Urinary structures'):s.system==='nervous'?({'brain'")
# UI behavior and app-only schematic (no fabricated 3D structures).
sub('app.js',"function applyRespiratoryPreset(preset){", """function applyUrinaryPreset(preset){
  if(!teacherMode||!urinaryAvailable||!Object.hasOwn(URINARY_PRESETS,preset))return;
  if(preset==='vessels'&&!cardioAvailable){showToast('Cardiovascular source meshes are required for renal vessels.');return;}
  mode='systems';Object.assign(systemLayers,{skeletal:false,superficial:false,deep:false,digestive:false,cardiovascular:preset==='vessels',respiratory:false,nervous:false,urinary:true});
  for(const s of urinaryEntriesList){if(urinaryVisibleInPreset(s,preset))hidden.delete(s.mesh);else hidden.add(s.mesh);}
  for(const s of cardioEntries){if(preset==='vessels'&&isRenalVessel(s))hidden.delete(s.mesh);else hidden.add(s.mesh);}
  isolated=false;setSelection(null);updateLayerHeading();updateSystemControls();refreshVisibility();frameVisible('front');queueDraft();showToast(URINARY_PRESETS[preset]+' applied');
}
for(const b of document.querySelectorAll('[data-urinary-preset]'))b.addEventListener('click',()=>applyUrinaryPreset(b.dataset.urinaryPreset));
$('urinary-interior-open').addEventListener('click',()=>{$('kidney-interior-dialog').hidden=false;});
$('kidney-interior-close').addEventListener('click',()=>{$('kidney-interior-dialog').hidden=true;});
$('kidney-interior-dialog').addEventListener('click',e=>{if(e.target===$('kidney-interior-dialog'))e.currentTarget.hidden=true;});
function applyRespiratoryPreset(preset){""")
sub('app.js',"if(!$('help-dialog').hidden)$('help-dialog').hidden=true;", "if(!$('help-dialog').hidden)$('help-dialog').hidden=true;\n    if(!$('kidney-interior-dialog').hidden)$('kidney-interior-dialog').hidden=true;")

# Stable scene layout — urinary goes strictly AFTER nervous; no older IDs shift.
sub('structure-layout.js',"const structures=[...preCardio,...cardiovascular,...respiratory,...nervous];", "const urinary=entries.filter(s=>s.system==='urinary');\n  const structures=[...preCardio,...cardiovascular,...respiratory,...nervous,...urinary];")
sub('structure-layout.js',"nervousCount:nervous.length};", "nervousCount:nervous.length,urinaryCount:urinary.length};")
# Scene serialization remains v1, with one OPTIONAL boolean flag.
sub('scene-codec.js',"'cv','rs','nv']", "'cv','rs','nv','ur']")
# Student asset planner, per chapter and offline.
sub('scene-assets.js',"nervous:chapter.nv===true,", "nervous:chapter.nv===true,\n    urinary:chapter.ur===true,")
sub('scene-assets.js',"nervous:false,skull:false", "nervous:false,urinary:false,skull:false")
sub('scene-assets.js',"nervousGeometry='standard'}={}", "nervousGeometry='standard',urinaryGeometry='standard'}={}")
sub('scene-assets.js',"if(needed.nervous)files.push('models/nervous-structures.json',`models/nervous-${nervousGeometry==='detailed'?'detailed':'standard'}.glb`);", "if(needed.nervous)files.push('models/nervous-structures.json',`models/nervous-${nervousGeometry==='detailed'?'detailed':'standard'}.glb`);\n  if(needed.urinary)files.push('models/urinary-structures.json',`models/urinary-${urinaryGeometry==='detailed'?'detailed':'standard'}.glb`);")
# System layer toggles and legacy modes.
sub('system-layers.js',"nervous:Boolean(raw.nervous)}", "nervous:Boolean(raw.nervous),urinary:Boolean(raw.urinary)}")
sub('system-layers.js',"nervous:false};", "nervous:false,urinary:false};",3)
sub('system-layers.js',"nervous:s.nervous};", "nervous:s.nervous,urinary:s.urinary};")
sub('system-layers.js',"nervousAvailable=false){", "nervousAvailable=false,urinaryAvailable=false){")
sub('system-layers.js',"'respiratory','nervous'].includes", "'respiratory','nervous','urinary'].includes")
sub('system-layers.js',"if(system==='nervous'&&!nervousAvailable)", "if(system==='urinary'&&!urinaryAvailable)throw new Error('Upload urinary-standard.glb, urinary-detailed.glb and urinary-structures.json.');\n  if(system==='nervous'&&!nervousAvailable)")
sub('system-layers.js',"if(system==='nervous')next.nervous=!next.nervous;", "if(system==='nervous')next.nervous=!next.nervous;\n  if(system==='urinary')next.urinary=!next.urinary;")

# Interface: independent urinary tab, presets, quality setting, schematic view, cache refresh.
sub('index.html',"<button id=\"mode-nervous\"", "<button id=\"mode-urinary\" class=\"mode-tab\" type=\"button\" aria-pressed=\"false\" data-system=\"urinary\" disabled>Urinary</button>\n        <button id=\"mode-nervous\"")
sub('index.html',"<section id=\"respiratory-study-panel\"", """<section id="urinary-study-panel" class="systems-panel cardio-study-panel teacher-only" aria-label="Urinary system study views" hidden>
          <div class="systems-header"><span class="eyebrow">URINARY SYSTEM STUDY VIEWS</span><p id="urinary-study-count" class="studio-hint"></p></div>
          <p class="studio-hint">BodyParts3D 4.3 urinary anatomy. Renal vessels appear through the existing Cardiovascular layer. Kidney cortex, medulla, pyramids and calyces are not independently modeled in this source.</p>
          <div class="cardio-presets" role="group" aria-label="Urinary-system study presets">
            <button class="button small" type="button" data-urinary-preset="overview">Urinary overview</button>
            <button class="button small" type="button" data-urinary-preset="kidneys">Kidneys only</button>
            <button class="button small" type="button" data-urinary-preset="tract">Urine drainage pathway</button>
            <button class="button small" type="button" data-urinary-preset="vessels">Urinary &amp; renal vessels</button>
            <button id="urinary-interior-open" class="button small primary" type="button">Kidney interior (schematic)</button>
          </div>
        </section>
        <section id="respiratory-study-panel"""
)
content['index.html'] = content['index.html'].replace('<section id="respiratory-study-panel class="', '<section id="respiratory-study-panel" class="')
sub('index.html',"<div class=\"dialog-backdrop\" id=\"help-dialog\" hidden>", """<div class="dialog-backdrop" id="kidney-interior-dialog" hidden>
    <section class="share-dialog kidney-interior-dialog" role="dialog" aria-modal="true" aria-labelledby="kidney-interior-title">
      <div class="dialog-header"><div><span class="eyebrow">URINARY SYSTEM</span><h2 id="kidney-interior-title">Kidney internal anatomy · schematic</h2></div><button type="button" id="kidney-interior-close" class="icon-button" aria-label="Close kidney schematic">✕</button></div>
      <p class="studio-hint">The 3D kidney is a verified external anatomy mesh. This separately labeled drawing illustrates internal organization and is not patient-specific 3D source geometry.</p>
      <img class="kidney-interior-image" src="./kidney-interior.svg" alt="Kidney section illustrating cortex, medullary pyramids, calyces, renal pelvis and ureter" />
    </section>
  </div>
  <div class="dialog-backdrop" id="help-dialog" hidden>""")
sub('index.html',"<label for=\"settings-nervous-geometry\">", "<label for=\"settings-urinary-geometry\"><strong>Urinary system geometry</strong></label>\n        <select id=\"settings-urinary-geometry\" class=\"text-input\" aria-label=\"Urinary geometry quality\"><option value=\"standard\">Standard — Chromebook optimized</option><option value=\"detailed\">Detailed — refined kidney and urinary tract surfaces</option></select>\n        <label for=\"settings-nervous-geometry\">")
sub('index.html',"<option value=\"nervous\">Nervous — catalog, Standard and Detailed models</option>", "<option value=\"nervous\">Nervous — catalog, Standard and Detailed models</option>\n          <option value=\"urinary\">Urinary — catalog, Standard and Detailed models</option>")
regex_sub('index.html',r'<span class="version">STUDIO [^<]+</span>', '<span class="version">STUDIO 2.1.0</span>')
sub('index.html','Explore skeletal, muscular, digestive, cardiovascular, respiratory, and nervous systems', 'Explore skeletal, muscular, digestive, cardiovascular, respiratory, nervous, and urinary systems')
content['styles.css']+='\n/* AnatomIQ 2.1 urinary schematic; separate educational illustration, not source 3D geometry. */\n.kidney-interior-dialog{width:min(780px,96vw);max-height:90vh;overflow:auto}\n.kidney-interior-image{display:block;width:100%;height:auto;border-radius:12px}\n'

# Service worker: atomic multi-model refresh and offline inclusion.
regex_sub('sw.js',r"const VERSION='anatomy-v[^']+';", "const VERSION='anatomy-v2.1.0';")
sub('sw.js',"'./nervous-model.js'", "'./nervous-model.js','./urinary-model.js','./kidney-interior.svg'")
sub('sw.js',"nervous:['models/nervous-structures.json','models/nervous-standard.glb','models/nervous-detailed.glb'],", "nervous:['models/nervous-structures.json','models/nervous-standard.glb','models/nervous-detailed.glb'],\n  urinary:['models/urinary-structures.json','models/urinary-standard.glb','models/urinary-detailed.glb'],")
sub('sw.js',"scope==='respiratory'||scope==='nervous'", "scope==='respiratory'||scope==='nervous'||scope==='urinary'")
sub('sw.js',"nervous-(?:standard|detailed)|skull-detailed", "nervous-(?:standard|detailed)|urinary-(?:standard|detailed)|skull-detailed")
sub('sw.js',"respiratory|nervous|skull)-structures", "respiratory|nervous|urinary|skull)-structures")
sub('sw.js',"...(event.data.skullDetail?", "...(event.data.urinary?['./models/urinary-structures.json',event.data.urinaryMode==='detailed'?'./models/urinary-detailed.glb':'./models/urinary-standard.glb']:[]),...(event.data.skullDetail?")

# Existing cache/workers from 2.0.4 are upgraded, not reset.
regex_sub('app.js',r"const APP_VERSION = '\d+\.\d+\.\d+';", "const APP_VERSION = '2.1.0';")
regex_sub('app.js',r"pong\.version!=='anatomy-v[^']+'", "pong.version!=='anatomy-v2.1.0'")
data=json.loads(content['version.json'])
data.update(version='2.1.0',published='2026-10-23',notes='New source-backed urinary layer; renal vessels are shared from cardiovascular; kidney interior is explicitly schematic.')
content['version.json']=json.dumps(data,indent=2)+'\n'
# Make sure model files are never edited here. Write only after full preflight.
backup=ROOT/'.urinary-21-backups'/datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
backup.mkdir(parents=True,exist_ok=False)
try:
    for name in content:shutil.copy2(ROOT/name,backup/name)
    for name,data in content.items():
        tmp=ROOT/(name+'.urinary-21-tmp')
        tmp.write_text(data)
        tmp.replace(ROOT/name)
except Exception:
    for name in content:
        p=backup/name
        if p.exists():shutil.copy2(p,ROOT/name)
    raise
print('PASS: AnatomIQ 2.1.0 urinary app integration applied.')
print('Preserved nervous, cardiovascular, digestive, respiratory and skeletal models.')
print('Project backup:',backup)
print('Next: bash tools/install-urinary-21.sh')
