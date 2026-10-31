import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {
  TARGETS,SKULL_SOURCES,MODEL_REFERENCE_MM,LIMIT,UNITS,SCHEMA,LEGACY_SCHEMA,
  emptyOffsets,normalizeOffsets,fromImport,legacyExport,createHandoff,
  skullName,focusedBoneName,describeRegistration,vectorToDisplay
} from './alignment-core.mjs';

const $=id=>document.getElementById(id);
const loader=new GLTFLoader();
const storageKey='anatomiq-standalone-facial-alignment-270-v1';
const modelPath='../../models/ecorche.glb';
const viewport=$('viewport');
let renderer,scene,camera,controls,baseRoot,detailRoot,baseHeight=0,baseSkull=[],detailBones=[],modelSkullBox=null;
let targets=new Map(),current=TARGETS[0],offsets=emptyOffsets(),selectedBox=null,source='native';
let registration={mode:'native-model-transform',previewOnly:false,scale:1,translation:[0,0,0],evaluation:'unverified'};
let lastError='';

function setStatus(title,detail,kind='loading'){
  $('status-title').textContent=title;$('status-detail').textContent=detail;
  $('load-dot').className='dot '+(kind==='ready'?'ok':kind==='error'?'error':'');
  $('footer-status').textContent=title+' · browser-only adjustments';
}
function fail(text,critical=false){
  console.error('[Facial Workbench]',text);
  const el=$('screen-error');el.hidden=false;el.textContent=text;
  setStatus('Attention required',text,'error');lastError=text;
  if(critical){document.querySelectorAll('button,input,select').forEach(e=>e.disabled=true);}
}
function warn(text){
  $('registration-warning').hidden=false;$('registration-warning').textContent=text;
}
function clearWarn(){$('registration-warning').hidden=true;$('registration-warning').textContent='';}
function finite(x){return Number.isFinite(x);}
function nameOf(mesh){return String(mesh.userData?.name||mesh.name||'').trim();}
function isAnatomyMuscle(mesh){
  const layer=String(mesh.userData?.layer||'').toLowerCase();
  return layer==='superficial muscles'||layer==='deep muscles';
}
function vec(v){return vectorToDisplay(v.toArray());}
function toWorldDelta(parent,worldDelta){
  parent.updateWorldMatrix(true,false);
  const start=new THREE.Vector3();
  const finish=worldDelta.clone();
  parent.worldToLocal(start);parent.worldToLocal(finish);
  return finish.sub(start);
}
function download(name,value){
  const blob=new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name;
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function saveLocal(){
  try{localStorage.setItem(storageKey,JSON.stringify({schema:SCHEMA,model:'ecorche.glb',units:UNITS,offsets}));}
  catch(e){console.warn('Local browser save unavailable',e);}
}
function loadLocal(){
  try{const raw=localStorage.getItem(storageKey);if(raw)offsets=fromImport(JSON.parse(raw));}
  catch(e){console.warn('Ignoring incompatible saved offsets',e);}
}
function setControlsEnabled(ready){
  for(const id of ['muscle','axes','reset-target','reset-all','copy-coords','export-complete','export-legacy','import-button']){
    const el=$(id);if(!el)continue;
    if(id==='axes'){for(const child of el.querySelectorAll('input,button'))child.disabled=!ready;}
    else el.disabled=!ready;
  }
}
function initThree(){
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance',preserveDrawingBuffer:false});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.32;
  renderer.shadowMap.enabled=false;
  viewport.append(renderer.domElement);
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(38,1,.001,10000);
  camera.position.set(0,1,3);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;
  controls.minDistance=.01;controls.maxDistance=1000;
  scene.add(new THREE.HemisphereLight(0xdcefff,0x3a5460,2.0));
  const key=new THREE.DirectionalLight(0xffffff,2.7);key.position.set(3,4,7);scene.add(key);
  const rim=new THREE.DirectionalLight(0x85c5e7,1.7);rim.position.set(-5,2,-4);scene.add(rim);
  new ResizeObserver(resize).observe(viewport);
  function draw(){requestAnimationFrame(draw);controls.update();if(selectedBox)selectedBox.update();renderer.render(scene,camera);}
  draw();resize();
}
function resize(){if(!renderer)return;const w=Math.max(100,viewport.clientWidth),h=Math.max(100,viewport.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function allVisibleObjects(){
  const res=[];
  if(detailRoot)detailBones.filter(m=>m.visible).forEach(m=>res.push(m));
  baseSkull.filter(m=>m.visible).forEach(m=>res.push(m));
  for(const [,entry] of targets)if(entry.mesh.visible)res.push(entry.mesh);
  return res;
}
function bboxOf(nodes){const box=new THREE.Box3();for(const m of nodes){if(m)box.expandByObject(m);}return box;}
function boxForHead(){
  const b=bboxOf(allVisibleObjects());return b.isEmpty()?bboxOf([...baseSkull,...[...targets.values()].map(e=>e.mesh)]):b;
}
function aimCamera(side='front'){
  const box=boxForHead();if(box.isEmpty())return;
  const center=box.getCenter(new THREE.Vector3());
  const size=box.getSize(new THREE.Vector3());
  const magnitude=Math.max(.001,size.x,size.y,size.z);
  const aspect=Math.max(.1,camera.aspect);
  const dist=Math.max(magnitude*1.5, (size.y/2)/Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*1.55, (size.x/2)/Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*1.5/aspect);
  const directions={front:[0,0,1],back:[0,0,-1],left:[-1,0,0],right:[1,0,0]};
  const d=directions[side]||directions.front;
  controls.target.copy(center);
  camera.position.set(center.x+d[0]*dist,center.y+d[1]*dist,center.z+d[2]*dist);
  camera.near=Math.max(.00001,dist/1500);camera.far=Math.max(500,dist*30);camera.updateProjectionMatrix();
  controls.update();
}
function setReferenceMaterials(meshes){
  for(const m of meshes){
    const list=Array.isArray(m.material)?m.material:[m.material];
    m.material=list.map(mat=>{
      if(!mat)return new THREE.MeshStandardMaterial({color:0xa9adb0,roughness:.51});
      const cp=mat.clone();if(cp.color)cp.color.set('#d9cbb5');
      if('roughness' in cp)cp.roughness=.46;
      cp.depthWrite=true;cp.transparent=false;return cp;
    });
    if(!Array.isArray(m.material))m.material=m.material[0];
  }
}
function setMuscleMaterials(meshes){
  for(const m of meshes){
    const mats=Array.isArray(m.material)?m.material:[m.material];
    const made=mats.map(mat=>{
      const cp=mat?.clone?.()||new THREE.MeshStandardMaterial();
      if(cp.color)cp.color.set('#ba6875');
      if('metalness' in cp)cp.metalness=.08;
      if('roughness' in cp)cp.roughness=.43;
      if(cp.emissive)cp.emissive.set('#000000');
      return cp;
    });m.material=Array.isArray(m.material)?made:made[0];
  }
}
async function loadBase(){
  setStatus('Loading Écorché anatomy…','Reading models/ecorche.glb. This may take a moment.');
  const loaded=await loader.loadAsync(modelPath);
  baseRoot=loaded.scene;
  const modelBounds=new THREE.Box3().setFromObject(baseRoot);
  baseHeight=modelBounds.getSize(new THREE.Vector3()).y;
  if(!finite(baseHeight)||baseHeight<=0)throw Error('Source model has no valid height.');
  scene.add(baseRoot);
  const names=new Map();
  let allMuscle=[];
  baseRoot.traverse(m=>{
    if(!m.isMesh)return;
    const nm=nameOf(m);const layer=String(m.userData?.layer||'').toLowerCase();
    const target=TARGETS.includes(nm)?nm:null;
    if(target && isAnatomyMuscle(m)){
      if(!names.has(target))names.set(target,[]);
      names.get(target).push(m);allMuscle.push(m);m.visible=true;
    }else if(layer==='skeleton' && (skullName(nm)||String(m.userData?.tissue||'').toLowerCase()==='tooth')){
      baseSkull.push(m);m.visible=true;
    }else m.visible=false;
  });
  if(baseSkull.length<10)throw Error('Skull bones not found in Écorché atlas; cannot calibrate against a reliable reference.');
  setReferenceMaterials(baseSkull);
  setMuscleMaterials(allMuscle);
  for(const name of TARGETS){
    const meshes=names.get(name)||[];
    if(meshes.length!==1){console.warn('Facial alignment target unresolved',name,meshes.length);continue;}
    const mesh=meshes[0];
    mesh.updateWorldMatrix(true,false);
    targets.set(name,{mesh,sourceMeshName:name,baseline:mesh.position.clone(),baseWorldOrigin:vec(mesh.getWorldPosition(new THREE.Vector3()))});
  }
  modelSkullBox=bboxOf(baseSkull);
  if(!targets.size)throw Error('No required muscle meshes found. Check the Écorché model in this repository.');
  if(targets.size!==TARGETS.length)warn('Only '+targets.size+' of '+TARGETS.length+' muscles matched by name. Missing: '+TARGETS.filter(x=>!targets.has(x)).join(', '));
  try{
    const result=await fetch('../../muscle-alignment-270.json',{cache:'no-store'});
    if(result.ok){const old=fromImport(await result.json());offsets=old;}
  }catch(e){console.info('No published alignment file found; starting at original mesh positions.');}
  loadLocal();
  applyOffsets();
  fillMusclePicker();
  updateFocus();
}
function applyOffsets(){
  for(const [name,entry] of targets){
    const delta=new THREE.Vector3(...offsets[name]).multiplyScalar(baseHeight/MODEL_REFERENCE_MM);
    entry.mesh.position.copy(entry.baseline).add(toWorldDelta(entry.mesh.parent,delta));
    entry.mesh.updateWorldMatrix(true,false);
  }
  if(selectedBox)selectedBox.update();
  updateCoordinates();
}
function selectedMuscle(){return targets.get(current);}
function showHelper(){
  if(selectedBox){scene.remove(selectedBox);selectedBox.geometry.dispose();selectedBox.material.dispose();selectedBox=null;}
  const entry=selectedMuscle();if(!entry)return;
  selectedBox=new THREE.BoxHelper(entry.mesh,0x5de5e6);
  selectedBox.renderOrder=300;selectedBox.material.depthTest=false;
  scene.add(selectedBox);
  selectedBox.update();
  for(const [name,e] of targets){
    const list=Array.isArray(e.mesh.material)?e.mesh.material:[e.mesh.material];
    for(const mat of list){if(mat.emissive)mat.emissive.set(name===current?'#274549':'#000000');}
  }
}
function fillMusclePicker(){
  const select=$('muscle');select.replaceChildren();
  for(const name of TARGETS){const opt=document.createElement('option');opt.value=name;opt.textContent=name+(targets.has(name)?'':' — missing');opt.disabled=!targets.has(name);select.append(opt);}
  if(!targets.has(current))current=[...targets.keys()][0];
  select.value=current;
  setControlsEnabled(true);
  updateControls();
}
function applyVisibility(){
  const showAll=$('show-other-muscles').checked;
  const showBase=source==='ecorche'||$('base-skull').checked;
  const onlyFocused=$('only-bones').checked;
  const baseFocusFound=baseSkull.some(m=>focusedBoneName(nameOf(m)));
  const detailFocusFound=detailBones.some(m=>focusedBoneName(nameOf(m)));
  for(const m of baseSkull){m.visible=showBase&&(!onlyFocused||!baseFocusFound||focusedBoneName(nameOf(m)));}
  for(const m of detailBones){m.visible=!onlyFocused||!detailFocusFound||focusedBoneName(nameOf(m));}
  if(onlyFocused&&detailBones.length&&!detailFocusFound){
    warn('This detailed skull has no recognizable frontal/nasal/temporal mesh names. Showing its full skull instead; the bone-only filter cannot be applied reliably.');
  }
  for(const [name,e] of targets)e.mesh.visible=showAll||name===current;
  const opacity=Number($('skull-opacity').value)/100;
  for(const m of [...baseSkull,...detailBones]){
    const mats=Array.isArray(m.material)?m.material:[m.material];
    for(const mat of mats){mat.transparent=opacity<1;mat.opacity=opacity;mat.depthWrite=opacity>=1;mat.needsUpdate=true;}
  }
  $('opacity-value').textContent=Math.round(opacity*100)+'%';
  showHelper();
}
function makeExpandedSkull(root){
  const arr=[];
  root.traverse(m=>{if(!m.isMesh)return;arr.push(m);m.visible=true;});
  return arr;
}
function skullSourceURL(src){return SKULL_SOURCES[src]||SKULL_SOURCES.ecorche;}
function checkReference(){
  if(!detailBones.length){registration.evaluation='base-atlas';return;}
  detailRoot.updateWorldMatrix(true,true);
  const detailBox=bboxOf(detailBones);
  const srcBounds=modelSkullBox;
  const h0=srcBounds.getSize(new THREE.Vector3()).y;
  const h1=detailBox.getSize(new THREE.Vector3()).y;
  const delta=srcBounds.getCenter(new THREE.Vector3()).distanceTo(detailBox.getCenter(new THREE.Vector3()));
  const ratio=h1/h0;
  registration.evaluation=describeRegistration({ratio,centerDistance:delta,baseHeight:h0});
  registration.measuredHeightRatio=Number(ratio.toFixed(6));
  registration.measuredCenterDistanceModelUnits=Number(delta.toFixed(6));
  if(registration.evaluation==='possible-mismatch'){
    warn('The detailed skull does not match Écorché skull bounds. Coordinates against this overlay may not reproduce the main app. Use “Match skull bounding boxes” for a visual preview only and export the registration data.');
    $('register-skull').hidden=false;
  }else $('register-skull').hidden=true;
}
async function loadSkull(){
  const requested=$('skull-source').value;source=requested;
  if(detailRoot){scene.remove(detailRoot);detailRoot=null;detailBones=[];}
  registration={mode:'native-model-transform',previewOnly:false,scale:1,translation:[0,0,0],evaluation:'unverified'};
  clearWarn();$('register-skull').hidden=true;
  if(requested==='ecorche'){
    applyVisibility();setStatus('Ready · Original Écorché skull',`${baseSkull.length} skull meshes · ${targets.size} facial muscle meshes`,'ready');
    $('scene-label').textContent='Original Écorché skull + facial muscles';aimCamera();return;
  }
  const url=skullSourceURL(requested);
  setStatus('Loading skull reference…','Reading '+url);
  try{
    const loaded=await loader.loadAsync(url);
    detailRoot=loaded.scene;scene.add(detailRoot);
    detailBones=makeExpandedSkull(detailRoot);
    if(!detailBones.length)throw Error('Detailed skull GLB contains no meshes.');
    setReferenceMaterials(detailBones);
    checkReference();
    applyVisibility();
    setStatus('Ready · '+(requested==='native'?'New AnatomIQ skull':'Alternate detailed skull'),`${detailBones.length} reference meshes · ${targets.size} target muscle meshes`,'ready');
    $('scene-label').textContent=(requested==='native'?'New AnatomIQ skull':'Alternate detailed skull')+' + Écorché muscles';
    aimCamera();
  }catch(error){
    if(detailRoot){scene.remove(detailRoot);detailRoot=null;detailBones=[];}
    source='ecorche';$('skull-source').value='ecorche';
    applyVisibility();aimCamera();
    warn('Requested skull could not load: '+String(error.message||error)+'. Showing original Écorché skull instead. Measurements against the newer skull are NOT verified.');
    setStatus('Fallback · Écorché skull',`New skull missing or invalid: ${url}`,'error');
    $('scene-label').textContent='Original skull fallback — new skull unavailable';
  }
}
function autoRegister(){
  if(!detailRoot||!detailBones.length)return;
  const box=bboxOf(detailBones);const base=modelSkullBox;
  const h0=base.getSize(new THREE.Vector3()).y;
  const h1=box.getSize(new THREE.Vector3()).y;
  if(h0<=0||h1<=0){warn('Cannot compute skull bounds.');return;}
  const ratio=h0/h1;
  // Preview uses uniform scale and aligns bounding-box centers. This is NOT an AnatomIQ geometry registration.
  detailRoot.scale.multiplyScalar(ratio);
  detailRoot.updateWorldMatrix(true,true);
  const before=bboxOf(detailBones);
  const shift=base.getCenter(new THREE.Vector3()).sub(before.getCenter(new THREE.Vector3()));
  detailRoot.position.add(shift);detailRoot.updateWorldMatrix(true,true);
  registration={mode:'bounding-box-preview',previewOnly:true,scale:Number(detailRoot.scale.x.toFixed(8)),translation:vec(detailRoot.position),evaluation:'preview-only'};
  checkReference();$('register-skull').hidden=true;
  warn('Visual auto-registration applied. It is an approximation and may not match the integrated AnatomIQ skull exactly. Exported coordinates are marked as preview-only.');
  applyVisibility();aimCamera();
}
function setupAxes(){
  const el=$('axes');el.replaceChildren();
  ['X — Left / right','Y — Up / down','Z — Front / back'].forEach((name,i)=>{
    const wrap=document.createElement('div');
    wrap.className='axis-group';
    const header=document.createElement('div');header.className='axis-heading';
    const title=document.createElement('span');title.textContent=name;
    const unit=document.createElement('small');unit.textContent='approx. mm';
    header.append(title,unit);
    const row=document.createElement('div');row.className='axis-controls';
    const minus=document.createElement('button');minus.type='button';minus.className='nudge';minus.textContent='−';minus.setAttribute('aria-label','Decrease '+name);
    const slider=document.createElement('input');slider.type='range';slider.min=-LIMIT;slider.max=LIMIT;slider.step='.5';slider.value='0';slider.dataset.axis=i;
    const numeric=document.createElement('input');numeric.type='number';numeric.min=-LIMIT;numeric.max=LIMIT;numeric.step='.5';numeric.value='0';numeric.dataset.axis=i;numeric.setAttribute('aria-label',name);
    const plus=document.createElement('button');plus.type='button';plus.className='nudge';plus.textContent='+';plus.setAttribute('aria-label','Increase '+name);
    const set=v=>setAxis(i,v);
    minus.addEventListener('click',()=>set(offsets[current][i]-.5));
    plus.addEventListener('click',()=>set(offsets[current][i]+.5));
    slider.addEventListener('input',()=>set(Number(slider.value)));
    numeric.addEventListener('change',()=>set(Number(numeric.value)));
    row.append(minus,slider,numeric,plus);wrap.append(header,row);el.append(wrap);
  });
}
function setAxis(axis,value){
  if(!targets.has(current)||!finite(value))return;
  offsets[current][axis]=Math.max(-LIMIT,Math.min(LIMIT,Math.round(value*2)/2));
  applyOffsets();saveLocal();updateControls();
}
function updateControls(){
  $('muscle').value=current;
  document.querySelectorAll('#axes input[data-axis]').forEach(input=>{
    input.value=String(offsets[current][Number(input.dataset.axis)]);
  });
  showHelper();updateCoordinates();
}
function updateCoordinates(){
  const entry=selectedMuscle();
  $('offset-coords').textContent=offsets[current].map(x=>x.toFixed(1)).join(', ');
  if(entry){entry.mesh.updateWorldMatrix(true,false);$('world-coords').textContent=vec(entry.mesh.getWorldPosition(new THREE.Vector3())).join(', ');$('original-coords').textContent=entry.baseWorldOrigin.join(', ');}
  else{$('world-coords').textContent='Missing muscle mesh';$('original-coords').textContent='—';}
}
function exportAll(){
  const data={};
  for(const name of TARGETS){
    const entry=targets.get(name);
    if(!entry){data[name]=null;continue;}
    const box=new THREE.Box3().setFromObject(entry.mesh);
    data[name]={baseWorldOrigin:entry.baseWorldOrigin,
      adjustedWorldOrigin:vec(entry.mesh.getWorldPosition(new THREE.Vector3())),
      adjustedWorldBounds:{min:vec(box.min),max:vec(box.max)},
      sourceMeshName:entry.sourceMeshName};
  }
  const result=createHandoff({offsets,skullSource:{id:source,file:skullSourceURL(source)},skullRegistration:registration,baseHeight,targets:data,originalModelUrl:modelPath});
  result.generatedAt=new Date().toISOString();
  result.targetMeshCount=targets.size;
  result.newSkullVerifiedForMainApp=false;
  download('AnatomIQ-Facial-Alignment-Coordinates.json',result);
}
function setupListeners(){
  $('skull-source').addEventListener('change',()=>{loadSkull().catch(e=>fail(e.message));});
  $('register-skull').addEventListener('click',autoRegister);
  for(const id of ['only-bones','base-skull','show-other-muscles','skull-opacity'])$(id).addEventListener('input',applyVisibility);
  document.querySelectorAll('[data-camera]').forEach(btn=>btn.addEventListener('click',()=>aimCamera(btn.dataset.camera)));
  $('fit').addEventListener('click',()=>aimCamera());
  $('muscle').addEventListener('change',()=>{current=$('muscle').value;updateControls();applyVisibility();});
  $('reset-target').addEventListener('click',()=>{offsets[current]=[0,0,0];applyOffsets();saveLocal();updateControls();});
  $('reset-all').addEventListener('click',()=>{if(!confirm('Reset all six muscles to their source positions?'))return;offsets=emptyOffsets();applyOffsets();saveLocal();updateControls();});
  $('copy-coords').addEventListener('click',async()=>{
    const s=`${current}\nOffset (approx mm): ${offsets[current].join(', ')}\nCurrent world XYZ: ${$('world-coords').textContent}`;
    try{await navigator.clipboard.writeText(s);$('footer-status').textContent='Selected coordinates copied';}
    catch{window.prompt('Copy these coordinates:',s);}
  });
  $('export-complete').addEventListener('click',exportAll);
  $('export-legacy').addEventListener('click',()=>download('muscle-alignment-270.json',legacyExport(offsets)));
  $('import-button').addEventListener('click',()=>$('import-file').click());
  $('import-file').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    try{offsets=fromImport(JSON.parse(await file.text()));applyOffsets();saveLocal();updateControls();$('footer-status').textContent='Alignment imported locally';}
    catch(error){alert('Cannot import alignment: '+error.message);}
    finally{$('import-file').value='';}
  });
}
async function begin(){
  try{
    setupAxes();setControlsEnabled(false);setupListeners();initThree();
    await loadBase();
    await loadSkull();
  }catch(error){fail('Standalone facial workbench could not start: '+String(error.message||error),true);}
}
begin();
