import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { encodeScene, decodeScene, validateScene, makeVisibilityBits, readVisibilityBits, hashForStructures } from './scene-codec.js';

// Écorché: https://github.com/Charleeh/ecorche | CC BY-SA 4.0
// A same-origin models/ecorche.glb overrides this hosted fallback when present.
const REMOTE_MODEL = 'https://cdn.jsdelivr.net/gh/Charleeh/ecorche@main/model/ecorche.glb';
const MIRROR_MODEL = 'https://charleeh.github.io/ecorche/model/ecorche.glb';
const SECONDARY_MODEL = 'https://charleeh.github.io/ecorche/model/ecorche.glb';
const LOCAL_MODEL = './models/ecorche.glb';
const $ = id => document.getElementById(id);
const elements = {
  stage:$('canvas-container'), loader:$('loader'), progress:$('progress-bar'), loadTitle:$('loading-title'), loadDesc:$('loading-description'), loadText:$('loading-progress'), retry:$('retry'),
  search:$('search'), clearSearch:$('clear-search'), boneList:$('bone-list'), count:$('list-count'),
  title:$('explorer-title'), subtitle:$('explorer-subtitle'), context:$('context-name'),
  noSelection:$('no-selection'), selectionContent:$('selection-content'), selName:$('selected-name'), selSide:$('selected-side'), selCategory:$('selected-category'), selDesc:$('selected-description'),
  teeth:$('toggle-teeth'), cartilage:$('toggle-cartilage'), connection:$('connectivity'), install:$('install'), offlineButton:$('save-offline'), sidebar:$('left-sidebar'), infoSidebar:$('info-sidebar'), detailsToggle:$('details-toggle'), tip:$('class-tip')
};
let mode = 'skull';
let sceneRoot = null;
let selected = null;
let isolated = false;
const hidden = new Set();
let structures = [];
const materials = new Map();
let activePreset = 'front';
let currentModelURL = REMOTE_MODEL;
let offlineReady = false;
const teacherMode = !location.hash.startsWith('#scene=');
document.body.classList.toggle('student-mode', !teacherMode);
$('student-badge').hidden = teacherMode;
let sceneFingerprint = '';
let labels = [];
let labelSequence = 0;
let placingLabel = false;
let restoringScene = false;
let draftTimeout = 0;
const DRAFT_KEY = 'anatomy-studio-project-v1';
const markers = new Map();
const labelSVG = $('label-lines');
const labelContainer = $('label-markers');
let sharedLink = '';
let labelMode = 'shown';
let studentExplore = false;
const round = (n,places=4) => Number(n.toFixed(places));


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.001, 60);
camera.position.set(0, 1.7, 0.85);
const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
renderer.setClearColor(0x000000,0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
elements.stage.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe9f5ff, 0x556474, 2.3));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.5); keyLight.position.set(3, 5, 5); scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xb6d9f5, 1.2); fillLight.position.set(-3, 2, -4); scene.add(fillLight);
const controls = new OrbitControls(camera,renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.12;
controls.enablePan = true;
controls.minDistance = 0.035;
controls.maxDistance = 9;
controls.zoomSpeed = 0.9;
controls.target.set(0, 1.6, 0);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let drawFrames = 0;
let frameRequest = 0;
function invalidate(frames=20){drawFrames=Math.max(drawFrames,frames);if(!frameRequest)frameRequest=requestAnimationFrame(draw);}
function draw(){frameRequest=0;controls.update();renderer.render(scene,camera);updateAnnotationPositions();if(drawFrames-->0)frameRequest=requestAnimationFrame(draw);}
controls.addEventListener('change',()=>{invalidate();queueDraft();});
function resize(){const w=Math.max(1,elements.stage.clientWidth),h=Math.max(1,elements.stage.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);invalidate(2);}
new ResizeObserver(resize).observe(elements.stage);
window.addEventListener('resize',resize);
resize();

function isSkull(name,tissue){
  const n=name.toLowerCase();
  if(tissue==='tooth')return true;
  return /(?:frontal bone|parietal bone|temporal bone|occipital bone|sphenoid|ethmoid|mandible|maxilla|zygomatic|lacrimal|nasal bone|palatine|vomer|inferior nasal concha|septal nasal cartilage|nasal cartilage)/.test(n);
}
function openDetails(open) {
  elements.infoSidebar.classList.toggle('open',open);
  elements.detailsToggle.setAttribute('aria-expanded',String(open));
}
function tissueVisible(s){return s.tissue !== 'eye' && (elements.teeth.checked || s.tissue !== 'tooth') && (elements.cartilage.checked || s.tissue !== 'cartilage');}
function currentStructures(){return structures.filter(s=>mode==='skeleton'||s.skull);}
function currentlyVisible(){return currentStructures().filter(s=>s.mesh.visible);}
function refreshVisibility(){
  for(const s of structures){
    s.mesh.visible = (mode==='skeleton'||s.skull) && tissueVisible(s) && !hidden.has(s.mesh) && (!isolated||s===selected);
  }
  renderList();
  invalidate(2);
  queueDraft();
}
function setStatus(message,state='ready'){
  elements.connection.className='status '+state;
  elements.connection.innerHTML='<span class="status-dot"></span>'+message;
}
const descriptions = [
  [/frontal bone/i,'Forms the forehead and roof of the eye sockets; part of the anterior cranial vault.'],
  [/parietal bone/i,'One of the paired bones forming the superior and lateral walls of the cranial vault.'],
  [/temporal bone/i,'Forms part of the lateral skull and cranial base; houses structures of the ear.'],
  [/occipital bone/i,'Forms the posterior skull and cranial base; surrounds the foramen magnum.'],
  [/sphenoid/i,'A central bone of the cranial base that articulates with multiple cranial and facial bones.'],
  [/ethmoid/i,'Located between the orbits, contributing to the nasal cavity and anterior cranial floor.'],
  [/mandible/i,'The lower jaw bone, supporting the lower teeth and forming the temporomandibular joints.'],
  [/maxilla/i,'A paired upper jaw bone contributing to the hard palate, nasal cavity and orbit.'],
  [/zygomatic/i,'The cheekbone; helps form the lateral orbital wall and zygomatic arch.'],
  [/nasal bone/i,'One of two small bones that form the bony bridge of the nose.'],
  [/lacrimal/i,'A small bone of the medial wall of the orbit near the lacrimal drainage apparatus.'],
  [/vomer/i,'A thin midline bone forming part of the nasal septum.'],
  [/palatine/i,'A paired facial bone forming portions of the posterior hard palate and nasal cavity.'],
  [/concha/i,'A curved bone of the lateral nasal wall that increases nasal mucosal surface area.'],
  [/tooth/i,'A tooth seated in the alveolar bone; dental crown and roots may be simplified in this teaching model.'],
  [/atlas/i,'The first cervical vertebra (C1), supporting the skull and permitting nodding movements.'],
  [/axis/i,'The second cervical vertebra (C2), whose dens permits head rotation with the atlas.'],
  [/cervical vertebra/i,'Part of the cervical spine, supporting the head and protecting the spinal cord.'],
  [/thoracic vertebra/i,'Part of the thoracic spine; articulates with ribs and supports the thoracic cage.'],
  [/lumbar vertebra/i,'A large vertebra of the lower spine, built for weight bearing.'],
  [/rib/i,'A curved bone of the thoracic cage that helps protect the heart and lungs.'],
  [/sternum|manubrium|xiphoid/i,'A midline structure at the anterior thoracic cage, connecting to ribs through costal cartilage.'],
  [/clavicle/i,'The collarbone, connecting the sternum to the shoulder girdle.'],
  [/scapula/i,'The shoulder blade; provides extensive muscle attachments and forms the glenoid cavity.'],
  [/humerus/i,'The upper arm bone between shoulder and elbow.'],
  [/radius/i,'The lateral forearm bone in anatomical position, on the thumb side.'],
  [/ulna/i,'The medial forearm bone in anatomical position, important at the elbow.'],
  [/femur/i,'The thigh bone, forming the hip joint proximally and knee joint distally.'],
  [/patella/i,'The kneecap, a sesamoid bone within the quadriceps tendon.'],
  [/tibia/i,'The larger, medial shin bone that transmits most weight through the lower leg.'],
  [/fibula/i,'The slender, lateral lower-leg bone that contributes to ankle stability.'],
  [/sacrum/i,'Fused vertebral bone at the posterior pelvis connecting the spine to the pelvic girdle.'],
  [/pelvis|ilium|ischium|pubis|hip bone/i,'Part of the pelvic girdle that transmits body weight and provides attachment surfaces.'],
  [/cartilage|disk/i,'Supportive connective tissue that helps cushion and connect adjacent skeletal structures.'],
  [/phalanx|metacarp|metatars|tars|carpal/i,'One of the small bones contributing to fine hand or foot movement and load distribution.']
];
function descriptionFor(s){
  const d=descriptions.find(([rx])=>rx.test(s.name));
  return d ? d[1] : 'An identifiable structure in the human skeletal system. Rotate the model to examine its shape and anatomical relationships.';
}
function setSelection(s){
  if(selected?.mesh?.material && materials.has(selected.mesh))selected.mesh.material=materials.get(selected.mesh);
  selected=s;
  $('isolate-selected').textContent='◈   Isolate structure';
  if(s){
    const mat=materials.get(s.mesh);
    if(mat){
      const active=mat.clone();
      active.emissive=new THREE.Color(0x21c9d2);
      active.emissiveIntensity=0.48;
      s.mesh.material=active;
    }
    elements.noSelection.hidden=true;
    elements.selectionContent.hidden=false;
    elements.selName.textContent=s.name;
    elements.selSide.textContent=(s.side==='midline'?'Midline':s.side[0].toUpperCase()+s.side.slice(1)+' side')+' · '+s.tissue;
    elements.selCategory.textContent=s.tissue==='tooth'?'DENTAL ANATOMY':s.tissue==='cartilage'?'CARTILAGE':'SKELETAL SYSTEM';
    elements.selDesc.textContent=descriptionFor(s);
  }else{
    elements.noSelection.hidden=false;
    elements.selectionContent.hidden=true;
  }
  refreshVisibility();
  if (s && matchMedia('(max-width:850px)').matches && !placingLabel) openDetails(true);
}
function setMode(newMode){
  if(!sceneRoot)return;
  mode=newMode;
  openDetails(false);
  isolated=false;
  hidden.clear();
  setSelection(null);
  elements.title.textContent=mode==='skull'?'Skull':'Skeletal system';
  elements.subtitle.textContent=mode==='skull'?'Explore individual cranial bones, facial bones, and teeth.':'Explore the axial and appendicular skeleton.';
  elements.context.textContent=mode==='skull'?'Skull':'Skeletal system';
  elements.tip.textContent=mode==='skull'?'Use the side or rear camera presets to compare skull landmarks from multiple perspectives.':'Click a major bone, then focus or isolate it to explore its relationship to nearby structures.';
  for(const tab of document.querySelectorAll('.mode-tab')){const active=tab.dataset.mode===mode;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));}
  elements.search.value='';
  elements.clearSearch.hidden=true;
  refreshVisibility();
  frameVisible('front');
}
function fitBox(box,view='front',padding=1.35){
  if(box.isEmpty())return;
  const center=box.getCenter(new THREE.Vector3());
  const size=box.getSize(new THREE.Vector3());
  const vFov=THREE.MathUtils.degToRad(camera.fov);
  const hFov=2*Math.atan(Math.tan(vFov/2)*Math.max(camera.aspect,0.2));
  const distance=Math.max(size.y/(2*Math.tan(vFov/2)),size.x/(2*Math.tan(hFov/2)),size.z/(2*Math.tan(vFov/2)))*padding;
  const d=Math.max(distance,0.065);
  let direction=new THREE.Vector3(0,0,1);
  if(view==='back')direction.set(0,0,-1);
  if(view==='left')direction.set(-1,0,0);
  if(view==='right')direction.set(1,0,0);
  controls.target.copy(center);
  camera.position.copy(center).addScaledVector(direction,d);
  camera.near=Math.max(0.002,d/300);
  camera.far=Math.max(12,d*60);
  camera.updateProjectionMatrix();
  controls.update();
  setPresetActive(view);
  invalidate(30);
}
function boxFor(list){
  const box=new THREE.Box3();
  for(const s of list){if(s.mesh.visible)box.expandByObject(s.mesh);}
  return box;
}
function frameVisible(view='front'){const visible=currentlyVisible();if(visible.length)fitBox(boxFor(visible),view,mode==='skull'?1.27:1.32);}
function setPresetActive(view){activePreset=view;document.querySelectorAll('.preset').forEach(b=>b.classList.toggle('active',b.dataset.view===view));}
function orient(view){
  if(!sceneRoot)return;
  const distance=camera.position.distanceTo(controls.target);
  const direction={front:[0,0,1],back:[0,0,-1],left:[-1,0,0],right:[1,0,0]}[view];
  if(!direction)return;
  camera.position.copy(controls.target).add(new THREE.Vector3(...direction).multiplyScalar(distance));
  controls.update();setPresetActive(view);invalidate(30);
}
function focusSelected(){if(selected)fitBox(boxFor([selected]),activePreset,2.15);}
function renderList(){
  const text=elements.search.value.trim().toLowerCase();
  const available=currentStructures().filter(s=>tissueVisible(s));
  const found=available.filter(s=>s.name.toLowerCase().includes(text) && (teacherMode || studentExplore || s.mesh.visible));
  elements.count.textContent=found.length;
  elements.clearSearch.hidden=!elements.search.value;
  const frag=document.createDocumentFragment();
  if(!found.length){const p=document.createElement('p');p.className='empty-list';p.textContent='No matching structures found.';frag.appendChild(p);}
  for(const s of found){
    const b=document.createElement('button');b.className='bone-item'+(selected===s?' active':'');
    b.setAttribute('aria-pressed',String(selected===s));
    const t=document.createElement('span');t.textContent=s.name;b.appendChild(t);
    b.addEventListener('click',()=>{if(teacherMode||studentExplore)hidden.delete(s.mesh);isolated=false;setSelection(s);focusSelected();if(innerWidth<630)elements.sidebar.classList.remove('open');});
    frag.appendChild(b);
  }
  elements.boneList.replaceChildren(frag);
}
let press={x:0,y:0};
renderer.domElement.addEventListener('pointerdown',event=>{press={x:event.clientX,y:event.clientY};});
renderer.domElement.addEventListener('pointerup',event=>{
  if(!sceneRoot || Math.hypot(event.clientX-press.x,event.clientY-press.y)>6)return;
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
  raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObjects(currentlyVisible().map(s=>s.mesh),false)[0];
  if(!hit)return;
  const s=structures.find(x=>x.mesh===hit.object);
  if(!s)return;
  if(placingLabel && teacherMode){
    const text=$('new-label-text').value.trim();
    if(!text){showToast('Enter label text first.');cancelPlacing();return;}
    const local=hit.object.worldToLocal(hit.point.clone());
    labels.push({id:++labelSequence,s:s.index,p:local.toArray().map(n=>round(n,5)),t:text,dx:24,dy:-31});
    $('new-label-text').value='';cancelPlacing();setSelection(s);renderAnnotations();renderLabelEditor();queueDraft();
    showToast('Label anchored. Drag its callout to reposition it.');
  } else {isolated=false;setSelection(s);} 
});
function prepareStructures(root){
  structures=[];
  root.traverse(obj=>{
    if(!obj.isMesh)return;
    let meta=obj.userData||{};
    if(meta.layer!=='skeleton'){
      // Only skeletal objects. Upstream also has deep/superficial muscle layers.
      obj.visible=false;return;
    }
    const name=(meta.name||obj.name||'Unnamed structure').trim();
    const tissue=meta.tissue||'bone';
    if(tissue==='eye'){obj.visible=false;return;}
    const entry={mesh:obj,name,side:meta.side||'midline',tissue,skull:isSkull(name,tissue)};
    structures.push(entry);
    materials.set(obj,obj.material);
  });
  // Use a deterministic index and fingerprint so share links cannot silently target the wrong bone.
  structures.sort((a,b)=>(`${a.name}|${a.side}|${a.tissue}|${a.mesh.name}`).localeCompare(`${b.name}|${b.side}|${b.tissue}|${b.mesh.name}`));
  structures.forEach((s,i)=>s.index=i);
  sceneFingerprint=hashForStructures(structures.map(s=>`${s.name}|${s.side}|${s.tissue}|${s.mesh.name}`));
  console.info(`Anatomy Studio: ${structures.length} skeletal structures; ${structures.filter(x=>x.skull).length} skull structures`);
  if(structures.length<100 || structures.filter(x=>x.skull).length<12)throw new Error('The model did not contain the expected separately named bones.');
}
function loadingProgress(ev){
  if(ev.total){const p=Math.min(100,Math.round(ev.loaded/ev.total*100));elements.progress.style.width=p+'%';elements.loadText.textContent=p+'% downloaded';}
  else if(ev.loaded){elements.loadText.textContent=(ev.loaded/1024/1024).toFixed(1)+' MB downloaded';elements.progress.style.width='48%';}
}
function loadGLB(url){return new Promise((resolve,reject)=>{const loader=new GLTFLoader();loader.load(url,resolve,loadingProgress,reject);});}
async function loadAnatomy(){
  elements.loader.hidden=false;elements.retry.hidden=true;elements.loadTitle.textContent='Preparing the anatomy viewer';
  elements.loadDesc.textContent='Loading the 3D skeletal anatomy model. The first visit needs an internet connection.';
  elements.loadText.textContent='Connecting to model source…';elements.progress.style.width='3%';
  setStatus(navigator.onLine?'Loading model':'Offline',navigator.onLine?'':'error');
  try{
    let localAvailable=false;
    try{const response=await fetch(LOCAL_MODEL,{method:'HEAD'});localAvailable=response.ok && /model|octet-stream|binary|application/i.test(response.headers.get('content-type')||'application/octet-stream');}catch{}
    const urls=localAvailable?[LOCAL_MODEL,REMOTE_MODEL,SECONDARY_MODEL]:[REMOTE_MODEL,SECONDARY_MODEL];
    let loaded=null,lastError;
    for(const url of urls){
      try{loaded=await loadGLB(url);currentModelURL=url;break;}catch(e){lastError=e;console.warn('Model source unavailable:',url,e);}
    }
    if(!loaded)throw lastError||new Error('The 3D model could not be loaded.');
    if(sceneRoot)scene.remove(sceneRoot);
    sceneRoot=loaded.scene;
    scene.add(sceneRoot);
    prepareStructures(sceneRoot);
    elements.loader.hidden=true;
    await initializeStudioScene();
    setStatus(teacherMode ? 'Studio ready' : 'Student view');
    elements.offlineButton.hidden=false;
    // The first page load is not necessarily controlled by the new worker.
    // Messaging its active worker directly also prepares offline use on that first visit.
    cacheOffline();
  }catch(err){
    console.error(err);
    elements.loader.hidden=false;
    elements.loadTitle.textContent='Unable to open anatomy scene';
    elements.loadDesc.textContent=(!teacherMode && sceneRoot)
      ? 'The shared link is invalid or was created for a different version of the anatomy model. Ask your teacher for a new link.'
      : 'Check your internet connection for the first visit. After successfully loading once, the PWA can use its cached model offline.';
    elements.loadText.textContent=String(err?.message||'3D model unavailable');
    elements.progress.style.width='0%';elements.retry.hidden=false;
    setStatus('Model unavailable','error');
  }
}

$('mode-skull').addEventListener('click',()=>{if(teacherMode)setMode('skull');});
$('mode-skeleton').addEventListener('click',()=>{if(teacherMode)setMode('skeleton');});
elements.search.addEventListener('input',renderList);
elements.clearSearch.addEventListener('click',()=>{elements.search.value='';renderList();elements.search.focus();});
elements.teeth.addEventListener('change',refreshVisibility);
elements.cartilage.addEventListener('change',refreshVisibility);
$('reset-camera').addEventListener('click',()=>frameVisible('front'));
$('restore-all').addEventListener('click',()=>{if(!teacherMode&&!studentExplore)return;hidden.clear();isolated=false;refreshVisibility();frameVisible('front');});
$('focus-selected').addEventListener('click',focusSelected);
$('isolate-selected').addEventListener('click',()=>{if((!teacherMode&&!studentExplore)||!selected)return;isolated=!isolated;refreshVisibility();$('isolate-selected').textContent=isolated?'◈   Show all structures':'◈   Isolate structure';if(isolated)focusSelected();else frameVisible('front');});
$('hide-selected').addEventListener('click',()=>{if((!teacherMode&&!studentExplore)||!selected)return;hidden.add(selected.mesh);isolated=false;setSelection(null);});
$('clear-selection').addEventListener('click',()=>{isolated=false;setSelection(null);});
for(const b of document.querySelectorAll('.preset'))b.addEventListener('click',()=>orient(b.dataset.view));
$('zoom-in').addEventListener('click',()=>{camera.position.lerp(controls.target,0.18);controls.update();invalidate(30);});
$('zoom-out').addEventListener('click',()=>{camera.position.sub(controls.target).multiplyScalar(1.22).add(controls.target);controls.update();invalidate(30);});
$('menu-toggle').addEventListener('click',()=>{openDetails(false);elements.sidebar.classList.toggle('open');});
elements.detailsToggle.addEventListener('click',()=>{elements.sidebar.classList.remove('open');openDetails(!elements.infoSidebar.classList.contains('open'));});
elements.retry.addEventListener('click',loadAnatomy);
window.addEventListener('keydown',event=>{if(event.key==='Escape'&&placingLabel){cancelPlacing();return;}if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(event.key.toLowerCase()==='f')orient('front');if(event.key.toLowerCase()==='b')orient('back');if(event.key==='Escape'){isolated=false;setSelection(null);elements.sidebar.classList.remove('open');openDetails(false);}});

let installPrompt=null;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;elements.install.hidden=false;});
elements.install.addEventListener('click',async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;elements.install.hidden=true;});
window.addEventListener('appinstalled',()=>{elements.install.hidden=true;});
window.addEventListener('online',()=>{if(sceneRoot)setStatus(offlineReady?'Ready offline':'Viewer ready');});
window.addEventListener('offline',()=>{if(sceneRoot)setStatus(offlineReady?'Offline · ready':'Offline · model loaded');else setStatus('Offline','error');});

async function messageWorker(type) {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({type,model:currentModelURL});
  } catch (error) { console.warn('Offline setup unavailable:',error); }
}
function cacheOffline() {
  if (!sceneRoot) return;
  elements.offlineButton.hidden = false;
  elements.offlineButton.disabled = false;
  elements.offlineButton.textContent = 'Saving offline…';
  setStatus('Preparing offline');
  messageWorker('CACHE_OFFLINE');
}
elements.offlineButton.addEventListener('click',cacheOffline);

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  navigator.serviceWorker.addEventListener('message', event => {
    const msg = event.data || {};
    if (msg.type === 'OFFLINE_PROGRESS' && sceneRoot && !offlineReady) {
      elements.offlineButton.textContent = `Saving ${msg.completed}/${msg.total}`;
    }
    if (msg.type === 'OFFLINE_STATUS' && sceneRoot) {
      offlineReady = !!msg.complete;
      setStatus(offlineReady ? 'Ready offline' : 'Viewer ready');
      elements.offlineButton.textContent = offlineReady ? '✓ Offline ready' : 'Retry offline save';
      elements.offlineButton.disabled = offlineReady;
    }
  });
  navigator.serviceWorker.register('./sw.js').catch(error => {
    console.warn('Service worker registration failed:',error);
    elements.offlineButton.textContent = 'Offline unavailable';
    elements.offlineButton.disabled = true;
  });
}

// Added editor and share-link workflow below.
loadAnatomy();

// --- Teacher Studio / published student scenes ------------------------------
function showToast(message){
  const toast=$('app-toast');toast.textContent=message;toast.hidden=false;
  clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.hidden=true,3200);
}
function cancelPlacing(){
  placingLabel=false;
  $('place-label').textContent='⊕ Place label on bone';
  $('place-label').classList.remove('placing');
  $('place-hint').hidden=true;
  elements.stage.style.cursor='';
}
function queueDraft(){
  if(!teacherMode || restoringScene || !sceneRoot)return;
  clearTimeout(draftTimeout);
  draftTimeout=setTimeout(()=>saveDraft(false),650);
}
function snapshotScene(){
  if(!sceneRoot)throw new Error('Model not loaded.');
  const visible=structures.map(s=>s.mesh.visible);
  return validateScene({
    v:1,m:mode,n:structures.length,f:sceneFingerprint,
    b:makeVisibilityBits(visible),t:$('scene-title').value.trim()||'Untitled anatomy scene',
    lm:$('student-label-mode').value,x:$('student-explore').checked,
    te:elements.teeth.checked,ca:elements.cartilage.checked,
    cam:[...camera.position.toArray(),...controls.target.toArray()].map(n=>round(n,5)),
    labels:labels.map(l=>({s:l.s,p:l.p.map(n=>round(n,5)),t:l.t.trim(),dx:round(l.dx,1),dy:round(l.dy,1)}))
  });
}
function saveDraft(explicit=true){
  if(!teacherMode || !sceneRoot)return;
  try {
    localStorage.setItem(DRAFT_KEY,JSON.stringify(snapshotScene()));
    $('draft-status').textContent=explicit?'Draft saved on this Chromebook.':'Draft autosaved on this Chromebook.';
    if(explicit)showToast('Draft saved locally.');
  } catch(err) {$('draft-status').textContent='Could not save draft: '+err.message;}
}
function renderLabelEditor(){
  const list=$('label-list');list.replaceChildren();
  if(!labels.length){const p=document.createElement('p');p.className='studio-hint';p.textContent='No labels yet. Add your first callout above.';list.appendChild(p);return;}
  labels.forEach((label,i)=>{
    const row=document.createElement('div');row.className='label-editor-row';
    const number=document.createElement('span');number.textContent=`${i+1}.`;number.className='label-index';
    const input=document.createElement('input');input.type='text';input.maxLength=100;input.value=label.t;input.setAttribute('aria-label',`Edit label ${i+1}`);
    input.addEventListener('input',()=>{label.t=input.value;renderAnnotations();queueDraft();});
    const remove=document.createElement('button');remove.textContent='×';remove.className='icon-button';remove.title='Remove label';remove.setAttribute('aria-label',`Remove label ${i+1}`);
    remove.addEventListener('click',()=>{labels=labels.filter(l=>l.id!==label.id);renderAnnotations();renderLabelEditor();queueDraft();});
    row.append(number,input,remove);list.appendChild(row);
  });
}
function renderAnnotations(){
  markers.clear();labelContainer.replaceChildren();labelSVG.replaceChildren();
  labels.forEach((label,i)=>{
    const marker=document.createElement('button');
    marker.className='anatomy-label';marker.type='button';
    marker.setAttribute('aria-label',`Anatomical annotation ${i+1}: ${label.t}`);
    const number=document.createElement('span');number.className='callout-number';number.textContent=String(i+1);
    const caption=document.createElement('span');caption.className='callout-text';caption.textContent=label.t;
    marker.append(number,caption);labelContainer.appendChild(marker);
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('class','leader-line');labelSVG.appendChild(line);
    const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');dot.setAttribute('r','2.5');dot.setAttribute('class','leader-dot');labelSVG.appendChild(dot);
    const visibility=teacherMode?'shown':labelMode;
    if(visibility==='reveal'){
      marker.classList.add('reveal');
      marker.addEventListener('click',()=>{marker.classList.toggle('revealed');});
    }
    if(visibility==='hidden')marker.hidden=true;
    if(teacherMode){
      marker.title='Drag to reposition this label';
      let dragging=null;
      marker.addEventListener('pointerdown',ev=>{
        if(ev.button!==0)return;
        dragging={x:ev.clientX,y:ev.clientY,dx:label.dx,dy:label.dy};
        marker.setPointerCapture(ev.pointerId);
        ev.preventDefault();
      });
      marker.addEventListener('pointermove',ev=>{
        if(!dragging)return;
        label.dx=Math.max(-500,Math.min(500,dragging.dx+ev.clientX-dragging.x));
        label.dy=Math.max(-500,Math.min(500,dragging.dy+ev.clientY-dragging.y));
        invalidate(2);
      });
      const finish=()=>{if(dragging){dragging=null;queueDraft();}};
      marker.addEventListener('pointerup',finish);marker.addEventListener('pointercancel',finish);
    }
    markers.set(label.id,{marker,line,dot});
  });
  invalidate(2);
}
function updateAnnotationPositions(){
  if(!sceneRoot || !labels.length)return;
  const bounds=elements.stage.getBoundingClientRect();
  scene.updateMatrixWorld(true);
  for(const label of labels){
    const nodes=markers.get(label.id);if(!nodes)continue;
    const s=structures[label.s];
    if(!s || !s.mesh.visible || (!teacherMode && labelMode==='hidden')){
      nodes.marker.hidden=true;nodes.line.setAttribute('visibility','hidden');nodes.dot.setAttribute('visibility','hidden');continue;
    }
    const at=s.mesh.localToWorld(new THREE.Vector3(...label.p)).project(camera);
    if(at.z<-1 || at.z>1 || Math.abs(at.x)>1.15 || Math.abs(at.y)>1.15){
      nodes.marker.hidden=true;nodes.line.setAttribute('visibility','hidden');nodes.dot.setAttribute('visibility','hidden');continue;
    }
    const x=(at.x+1)*bounds.width/2,y=(1-at.y)*bounds.height/2;
    const bx=x+label.dx,by=y+label.dy;
    nodes.marker.hidden=false;
    nodes.marker.style.left=bx+'px';nodes.marker.style.top=by+'px';
    nodes.line.setAttribute('visibility','visible');nodes.dot.setAttribute('visibility','visible');
    nodes.line.setAttribute('x1',String(x));nodes.line.setAttribute('y1',String(y));
    nodes.line.setAttribute('x2',String(bx+10));nodes.line.setAttribute('y2',String(by+13));
    nodes.dot.setAttribute('cx',String(x));nodes.dot.setAttribute('cy',String(y));
  }
}
async function applyScene(saved){
  validateScene(saved);
  if(saved.n!==structures.length || saved.f!==sceneFingerprint){
    throw new Error('The anatomical model has changed since this scene was published.');
  }
  restoringScene=true;
  try{
    setMode(saved.m);
    elements.teeth.checked=saved.te;
    elements.cartilage.checked=saved.ca;
    $('scene-title').value=saved.t;
    $('student-label-mode').value=saved.lm;
    $('student-explore').checked=saved.x;
    labelMode=saved.lm;studentExplore=saved.x;
    document.body.classList.toggle('student-explore-enabled',!teacherMode&&studentExplore);
    isolated=false;
    hidden.clear();
    const visible=readVisibilityBits(saved.b,structures.length);
    structures.forEach((s,i)=>{if(!visible[i] && (mode==='skeleton'||s.skull) && (s.tissue!=='tooth'||saved.te) && (s.tissue!=='cartilage'||saved.ca))hidden.add(s.mesh);});
    refreshVisibility();
    const c=saved.cam;
    camera.position.set(c[0],c[1],c[2]);controls.target.set(c[3],c[4],c[5]);
    camera.updateProjectionMatrix();controls.update();setPresetActive('');
    labels=saved.labels.map(l=>({...l,id:++labelSequence}));
    renderLabelEditor();renderAnnotations();
    $('context-name').textContent=saved.t;
    if(!teacherMode){
      $('explorer-title').textContent=saved.t;
      $('explorer-subtitle').textContent='Explore your teacher’s customized anatomy scene.';
      $('hide-selected').hidden=!studentExplore;
      $('isolate-selected').hidden=!studentExplore;
      $('restore-all').hidden=!studentExplore;
    }
  }finally{restoringScene=false;}
}
async function initializeStudioScene(){
  if(!teacherMode){
    const fragment=location.hash.slice('#scene='.length);
    const shared=await decodeScene(fragment);
    await applyScene(shared);
    document.title=shared.t+' • Anatomy Studio';
  }else{
    const draft=localStorage.getItem(DRAFT_KEY);
    if(draft){
      try {await applyScene(JSON.parse(draft));$('draft-status').textContent='Restored your last locally saved draft.';}
      catch(err){console.warn('Ignoring outdated local draft:',err);setMode(mode);$('draft-status').textContent='Saved draft could not be restored; a new scene is ready.';}
    }else setMode(mode);
    renderLabelEditor();
  }
}
async function publishScene(){
  if(!teacherMode || !sceneRoot)return;
  const button=$('publish-open');button.disabled=true;button.textContent='Preparing link…';
  try{
    const encoded=await encodeScene(snapshotScene());
    const link=new URL(location.href);link.hash='scene='+encoded;link.search='';
    sharedLink=link.href;
    $('share-url').value=sharedLink;
    $('share-feedback').textContent=sharedLink.length > 2000
      ? `This link is ${sharedLink.length.toLocaleString()} characters long. Test it in Google Classroom; some systems shorten long URLs.`
      : `Link created (${sharedLink.length} characters). Share it in Google Classroom.`;
    $('share-dialog').hidden=false;$('copy-url').focus();
    saveDraft(false);
  }catch(err){showToast('Could not create link: '+err.message);}
  finally{button.disabled=false;button.textContent='↗ Share student link';}
}
$('publish-open').addEventListener('click',publishScene);
$('close-dialog').addEventListener('click',()=>$('share-dialog').hidden=true);
$('share-dialog').addEventListener('click',ev=>{if(ev.target===$('share-dialog'))$('share-dialog').hidden=true;});
$('copy-url').addEventListener('click',async()=>{
  if(!sharedLink)return;
  try{
    await navigator.clipboard.writeText(sharedLink);
    $('share-feedback').textContent='✓ Student link copied. Paste it into Google Classroom.';
  }catch{
    $('share-url').select();$('share-feedback').textContent='Select and copy the highlighted link.';
  }
});
$('preview-url').addEventListener('click',()=>{if(sharedLink)window.open(sharedLink,'_blank','noopener');});
$('place-label').addEventListener('click',()=>{
  if(!teacherMode || !sceneRoot)return;
  if(placingLabel){cancelPlacing();return;}
  if(!$('new-label-text').value.trim()){showToast('Enter label text before placing it.');$('new-label-text').focus();return;}
  if(labels.length>=64){showToast('Maximum 64 annotations per scene.');return;}
  placingLabel=true;openDetails(false);
  $('place-label').textContent='Cancel placing label';$('place-label').classList.add('placing');
  $('place-hint').hidden=false;elements.stage.style.cursor='crosshair';
});
$('scene-title').addEventListener('input',queueDraft);
$('student-label-mode').addEventListener('change',()=>{labelMode=$('student-label-mode').value;queueDraft();});
$('student-explore').addEventListener('change',()=>{studentExplore=$('student-explore').checked;queueDraft();});
$('save-project').addEventListener('click',()=>saveDraft(true));
$('new-project').addEventListener('click',()=>{
  if(!confirm('Start a new scene? Your saved draft and current labels will be cleared. Previously shared student links will keep working.'))return;
  labels=[];labelMode='shown';studentExplore=false;$('student-label-mode').value=labelMode;$('student-explore').checked=false;
  $('scene-title').value='Skull exploration';elements.teeth.checked=true;elements.cartilage.checked=true;setMode('skull');renderAnnotations();renderLabelEditor();saveDraft(false);
});
$('export-project').addEventListener('click',()=>{
  try{
    const project=JSON.stringify(snapshotScene(),null,2);
    const blob=new Blob([project],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;
    a.download=($('scene-title').value.trim().replace(/[^a-z0-9_-]+/gi,'-').slice(0,50)||'anatomy-scene')+'.json';
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(err){showToast('Export failed: '+err.message);}
});
$('import-project').addEventListener('click',()=>$('import-file').click());
$('import-file').addEventListener('change',async()=>{
  const file=$('import-file').files?.[0];if(!file)return;
  try{
    if(file.size>40000)throw new Error('JSON project is too large.');
    await applyScene(JSON.parse(await file.text()));saveDraft(false);showToast('Scene imported.');
  }catch(err){showToast('Could not import scene: '+err.message);}
  finally{$('import-file').value='';}
});
