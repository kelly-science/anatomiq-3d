import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
function draw(){frameRequest=0;controls.update();renderer.render(scene,camera);if(drawFrames-->0)frameRequest=requestAnimationFrame(draw);}
controls.addEventListener('change',()=>invalidate());
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
  if (s && matchMedia('(max-width:850px)').matches) openDetails(true);
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
  const found=available.filter(s=>s.name.toLowerCase().includes(text));
  elements.count.textContent=found.length;
  elements.clearSearch.hidden=!elements.search.value;
  const frag=document.createDocumentFragment();
  if(!found.length){const p=document.createElement('p');p.className='empty-list';p.textContent='No matching structures found.';frag.appendChild(p);}
  for(const s of found){
    const b=document.createElement('button');b.className='bone-item'+(selected===s?' active':'');
    b.setAttribute('aria-pressed',String(selected===s));
    const t=document.createElement('span');t.textContent=s.name;b.appendChild(t);
    b.addEventListener('click',()=>{hidden.delete(s.mesh);isolated=false;setSelection(s);focusSelected();if(innerWidth<630)elements.sidebar.classList.remove('open');});
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
  if(s){isolated=false;setSelection(s);}
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
  structures.sort((a,b)=>a.name.localeCompare(b.name));
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
    setMode(mode);
    setStatus('Viewer ready');
    elements.offlineButton.hidden=false;
    // The first page load is not necessarily controlled by the new worker.
    // Messaging its active worker directly also prepares offline use on that first visit.
    cacheOffline();
  }catch(err){
    console.error(err);
    elements.loadTitle.textContent='Unable to load 3D anatomy';
    elements.loadDesc.textContent='Check your internet connection for the first visit. After successfully loading once, the PWA can use its cached model offline.';
    elements.loadText.textContent=String(err?.message||'3D model unavailable');
    elements.progress.style.width='0%';elements.retry.hidden=false;
    setStatus('Model unavailable','error');
  }
}

$('mode-skull').addEventListener('click',()=>setMode('skull'));
$('mode-skeleton').addEventListener('click',()=>setMode('skeleton'));
elements.search.addEventListener('input',renderList);
elements.clearSearch.addEventListener('click',()=>{elements.search.value='';renderList();elements.search.focus();});
elements.teeth.addEventListener('change',refreshVisibility);
elements.cartilage.addEventListener('change',refreshVisibility);
$('reset-camera').addEventListener('click',()=>frameVisible('front'));
$('restore-all').addEventListener('click',()=>{hidden.clear();isolated=false;refreshVisibility();frameVisible('front');});
$('focus-selected').addEventListener('click',focusSelected);
$('isolate-selected').addEventListener('click',()=>{if(!selected)return;isolated=!isolated;refreshVisibility();$('isolate-selected').textContent=isolated?'◈   Show all structures':'◈   Isolate structure';if(isolated)focusSelected();else frameVisible('front');});
$('hide-selected').addEventListener('click',()=>{if(!selected)return;hidden.add(selected.mesh);isolated=false;setSelection(null);});
$('clear-selection').addEventListener('click',()=>{isolated=false;setSelection(null);});
for(const b of document.querySelectorAll('.preset'))b.addEventListener('click',()=>orient(b.dataset.view));
$('zoom-in').addEventListener('click',()=>{camera.position.lerp(controls.target,0.18);controls.update();invalidate(30);});
$('zoom-out').addEventListener('click',()=>{camera.position.sub(controls.target).multiplyScalar(1.22).add(controls.target);controls.update();invalidate(30);});
$('menu-toggle').addEventListener('click',()=>{openDetails(false);elements.sidebar.classList.toggle('open');});
elements.detailsToggle.addEventListener('click',()=>{elements.sidebar.classList.remove('open');openDetails(!elements.infoSidebar.classList.contains('open'));});
elements.retry.addEventListener('click',loadAnatomy);
window.addEventListener('keydown',event=>{if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(event.key.toLowerCase()==='f')orient('front');if(event.key.toLowerCase()==='b')orient('back');if(event.key==='Escape'){isolated=false;setSelection(null);elements.sidebar.classList.remove('open');openDetails(false);}});

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

loadAnatomy();
