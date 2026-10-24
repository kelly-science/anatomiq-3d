import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {installSkullGeometry} from './skull-geometry.js';
import {validateSkullManifest} from './skeletal-detail.js';
import {getSkullGeometry,setSkullGeometry} from './skull-preferences.js';
import {digestiveMeshEntries,sourceRegistration,digestiveDefaultColor} from './digestive-model.js';
import {cardiovascularEntries,cardiovascularColor} from './cardiovascular-model.js';
import {respiratoryEntries,validateRespiratoryManifest,respiratoryColor,RESPIRATORY_PRESETS,respiratoryVisibleInPreset,pulmonaryOverlayVisible,respiratoryCoverage} from './respiratory-model.js';
import {nervousEntries,validateNervousManifest,nervousColor,NERVOUS_PRESETS,nervousVisibleInPreset} from './nervous-model.js';
import {CARDIO_PRESETS,cardioVisibleInPreset,cardioPresetCounts,cardioCanApply,cardioIsCavity} from './cardio-presentation.js';
import {classCoreVisible,classCoreCoverage,classCoreCoverageJSON} from './cardio-class-core.js';
import {auditCardiovascular,loadCardioReview,saveCardioReview,cardioAuditExport} from './cardio-vascular-audit.js';
import {detailStructureEntries, shouldPreferDetailedWhenChoosingDigestive, correctedDetailTransform} from './digestive-detail.js';
import { encodeScene, decodeScene, validateScene, validateProject, validatePermissions, STUDY_PERMISSIONS, EXAM_PERMISSIONS, MAX_CHAPTERS, makeVisibilityBits, readVisibilityBits, hashForStructures } from './scene-codec.js';
import {listLessons, getLesson, saveLesson, deleteLesson, prepareBackup, parseBackup, restoreBackup} from './library-store.js';
import {SceneHistory} from './scene-history.js';
import {catalogAnatomy, sceneModelCompatible, upgradeLegacyScene} from './structure-layout.js';
import {normalizeMode, resolveRenderProfile, cappedPixelRatio} from './render-performance.js';
import {normalizeSurfaceMode, applySurfaceFinish, finishSourceAnatomy, installSurfaceLighting} from './surface-lighting.js';
import {normalizeShadowMode,createDynamicShadows,configureAnatomyShadows} from './dynamic-shadows.js';
import {effectiveSystemLayers,activeSystemTabs,toggleAnatomySystem} from './system-layers.js';
import {chapterAssets,assetsForProject,offlineLessonFiles,LEGACY_DIGESTIVE_MESH_NAMES} from './scene-assets.js';
import {validateCardiovascularManifest} from './cardiovascular-model.js';
import {validateDigestiveManifest} from './digestive-detail.js';

// Écorché: https://github.com/Charleeh/ecorche | CC BY-SA 4.0
// A same-origin models/ecorche.glb overrides this hosted fallback when present.
const APP_VERSION = '2.0.1';
const REMOTE_MODEL = 'https://cdn.jsdelivr.net/gh/Charleeh/ecorche@main/model/ecorche.glb';
const MIRROR_MODEL = 'https://charleeh.github.io/ecorche/model/ecorche.glb';
const SECONDARY_MODEL = 'https://charleeh.github.io/ecorche/model/ecorche.glb';
const LOCAL_MODEL = './models/ecorche.glb';
const SKULL_MANIFEST='./models/skull-structures.json';
const SKULL_HIGH='./models/skull-detailed.glb';
// The legacy v1 detailed preference is intentionally not imported: this
// stabilisation release returns existing devices to the reliable base skull.
let skullGeometry='standard';
try{skullGeometry=getSkullGeometry(window.localStorage);}catch{}
let skullDetailStats=null;

const LOCAL_DIGESTIVE_MODEL='./models/anatomy-organs.glb';
const DETAIL_MANIFEST='./models/digestive-structures.json';
const DETAIL_MODEL_STANDARD='./models/digestive-standard.glb';
const DETAIL_MODEL_SHARP='./models/digestive-detailed.glb';
const CARDIO_MANIFEST='./models/cardiovascular-structures.json';
const CARDIO_STANDARD='./models/cardiovascular-standard.glb';
const CARDIO_DETAILED='./models/cardiovascular-detailed.glb';
const RESP_MANIFEST='./models/respiratory-structures.json';
const RESP_STANDARD='./models/respiratory-standard.glb';
const RESP_DETAILED='./models/respiratory-detailed.glb';
const NERVOUS_MANIFEST='./models/nervous-structures.json';
const NERVOUS_STANDARD='./models/nervous-standard.glb';
const NERVOUS_DETAILED='./models/nervous-detailed.glb';
const NERVOUS_QUALITY_KEY='anatomiq-nervous-geometry-v1';
let nervousGeometry='standard';
try{nervousGeometry=localStorage.getItem(NERVOUS_QUALITY_KEY)==='detailed'?'detailed':'standard';}catch{}
let nervousRoot=null,nervousEntriesList=[],nervousAvailable=false,nervousLoaded=false,nervMetadata=null;
const RESP_QUALITY_KEY='anatomiq-respiratory-geometry-v1';
let respiratoryGeometry='standard';
try{respiratoryGeometry=localStorage.getItem(RESP_QUALITY_KEY)==='detailed'?'detailed':'standard';}catch{}
let respiratoryRoot=null,respiratoryEntriesList=[],respiratoryAvailable=false,respiratoryLoaded=false;
let respiratoryOpacity=1;
const CARDIO_QUALITY_KEY='anatomy-studio-cardio-geometry-v1';
let cardioGeometry='standard';
try{cardioGeometry=localStorage.getItem(CARDIO_QUALITY_KEY)==='detailed'?'detailed':'standard';}catch{}
let cardioRoot=null,cardioEntries=[],cardioAvailable=false;
let cardioLoadError='';
let teacherCoreTreeOnly=false;
let cardioReviews={};try{cardioReviews=loadCardioReview(window.localStorage);}catch{}
let cardioAuditFilter='action';
let cardioPreviewIDs=null,cardioPreviewCamera=null; // transient review-only view; never serialized into student scenes.

let preCardioStructureCount=0,preCardioFingerprint='';
let originalCardioStructureCount=0,originalCardioFingerprint='';
const DIGESTIVE_QUALITY_KEY='anatomy-studio-digestive-geometry-v1';
let digestiveGeometry='standard';
try{digestiveGeometry=localStorage.getItem(DIGESTIVE_QUALITY_KEY)==='detailed'?'detailed':'standard';}catch{}
let detailAvailable=false, detailEnabled=false, detailRoot=null, detailEntries=[];
let detailLayerExplicitlyChanged=false; // Respect the teacher's deliberate choice when switching views.
let previousStructureCount=0,previousFingerprint='';
let digestiveAvailable=false;
let digestiveRoot=null;
let legacyLoaded=false,detailLoaded=false,cardioLoaded=false;
let studentProjectAtStartup=null;
let studentAssetBusy=false;
let digestMetadata=null,cardioMetadata=null,respMetadata=null,legacyPresent=false;
let digestiveSourceEntries=[];
let baseStructureCount=0,baseFingerprint='';
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
let legacyStructureCount = 0;
let legacyFingerprint = '';
const systemLayers = {skeletal:true,deep:false,superficial:true,digestive:false,cardiovascular:false,respiratory:false,nervous:false};
const materials = new Map(); // Model-authored original material(s) for each anatomical structure.
const paintedMaterials = new Map(); // Cloned materials owned by the editor (never mutate the GLB originals).
const bonePaint = new Map(); // Stable structure index → #RRGGBB, scoped to the active chapter.
let paintMode = false;
let paintColor = '#e45d58';
let selectedHighlight = null;
let activePreset = 'front';
let currentModelURL = LOCAL_MODEL;
let offlineReady = false;
const teacherMode = !location.hash.startsWith('#scene=');
const embeddedMode = !teacherMode && new URLSearchParams(location.search).get('embed') === '1';
document.body.classList.toggle('embed-mode',embeddedMode);
let publishPermissions = {...STUDY_PERMISSIONS};
let studentPermissions = {...STUDY_PERMISSIONS};
function studentAllowed(key){ return teacherMode || studentPermissions[key]; }
function applyStudentPermissions(){
  if(teacherMode)return;
  const b=document.body;
  b.classList.toggle('student-search',studentPermissions.ss);
  b.classList.toggle('student-tree',studentPermissions.st);
  b.classList.toggle('student-names',studentPermissions.sn);
  b.classList.toggle('student-explore-enabled',studentExplore);
  elements.search.disabled=!studentPermissions.ss;
  if(!studentPermissions.ss)elements.search.value='';
  if(!studentPermissions.sn)setSelection(null);
  document.querySelector('.viewer-tip').textContent=studentPermissions.sn
    ? 'Drag to rotate · Scroll to zoom · Click bones to identify'
    : 'Drag to rotate · Scroll or pinch to zoom';
  $('details-toggle').hidden=!studentPermissions.sn;
  // Schoology embeds and assessment views should dedicate the available space to the model.
  if(!studentPermissions.ss && !studentPermissions.st)elements.sidebar.classList.remove('open');
  renderList();
  resize();
}
document.body.classList.toggle('student-mode', !teacherMode);
$('student-badge').hidden = teacherMode;
let sceneFingerprint = '';
let labels = [];
let labelSequence = 0;
let placingLabel = false;
let restoringScene = false;
let draftTimeout = 0;
const DRAFT_KEY = 'anatomy-studio-project-v2';
const OLD_DRAFT_KEY = 'anatomy-studio-project-v1';
let chapters = [];
let activeChapter = 0;
const markers = new Map();
const labelSVG = $('label-lines');
const labelContainer = $('label-markers');
let sharedLink = '';
let libraryLessonId = null; // Active library entry; never included in student share links.
let lastLibrarySnapshot = null;
let libraryRows = [];
let libraryBusy = false;
let labelMode = 'shown';
let studentExplore = false;
const editHistory = new SceneHistory(50);
let historyTimeout = 0;
let applyingHistory = false;
let openMenuName = null;
let menuRequestId = 0;
const round = (n,places=4) => Number(n.toFixed(places));
const treeExpanded = new Map();


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.001, 60);
camera.position.set(0, 1.7, 0.85);
// Keep quality specific to this device/profile; shared lessons remain visually identical
// in content but can render at different resolutions on slower Chromebooks.
const RENDER_MODE_KEY='anatomy-studio-render-quality-v1';
const SURFACE_MODE_KEY='anatomiq-surface-lighting-v1';
const SHADOW_MODE_KEY='anatomiq-dynamic-shadows-v1';
let shadowMode='auto';
try{shadowMode=normalizeShadowMode(localStorage.getItem(SHADOW_MODE_KEY));}catch{}
let surfaceMode='studio';
try{surfaceMode=normalizeSurfaceMode(localStorage.getItem(SURFACE_MODE_KEY));}catch{}
let savedRenderMode='auto';
try{savedRenderMode=normalizeMode(localStorage.getItem(RENDER_MODE_KEY));}catch{}
let renderProfile=resolveRenderProfile(savedRenderMode,navigator);
const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setClearColor(0x000000,0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(cappedPixelRatio(window.devicePixelRatio,renderProfile.dprCap));
elements.stage.appendChild(renderer.domElement);
function setRenderQuality(mode){
  renderProfile=resolveRenderProfile(mode,navigator);
  try{localStorage.setItem(RENDER_MODE_KEY,renderProfile.requested);}catch{}
  $('view-quality').value=renderProfile.requested;
  $('settings-render-quality').value=renderProfile.requested;
  $('settings-quality-explanation').textContent=`${renderProfile.effective[0].toUpperCase()+renderProfile.effective.slice(1)} mode · ${cappedPixelRatio(window.devicePixelRatio,renderProfile.dprCap).toFixed(2)}x resolution · rendering only when the view changes`;
  renderer.setPixelRatio(cappedPixelRatio(window.devicePixelRatio,renderProfile.dprCap));
  shadows.setQuality(shadowMode,renderProfile.effective);
  for(const root of [sceneRoot,digestiveRoot,detailRoot,cardioRoot,respiratoryRoot,nervousRoot])configureAnatomyShadows(root,shadows.profile.enabled);
  // WebGLRenderer.setPixelRatio reconfigures its drawing buffer at the current size.
  invalidate(2);
}
$('view-quality').value=renderProfile.requested;
$('settings-render-quality').value=renderProfile.requested;
$('view-quality').addEventListener('change',e=>setRenderQuality(e.target.value));
$('settings-render-quality').addEventListener('change',e=>setRenderQuality(e.target.value));
// One consistent light rig for every anatomical system. Lighting is a per-device
// appearance choice and is deliberately never embedded in shared lessons.
const studioLighting=installSurfaceLighting(THREE,scene,renderer,surfaceMode);
const shadows=createDynamicShadows(THREE,renderer,studioLighting.key,{mode:shadowMode,quality:renderProfile.effective});
$('settings-surface-lighting').value=surfaceMode;
$('settings-shadow-mode').value=shadowMode;
$('settings-surface-lighting').addEventListener('change',()=>{
  const next=normalizeSurfaceMode($('settings-surface-lighting').value);
  if(next===surfaceMode)return;
  if(teacherMode&&sceneRoot)saveDraft(false);
  try{localStorage.setItem(SURFACE_MODE_KEY,next);}catch{}
  location.reload();
});
$('settings-shadow-mode').addEventListener('change',()=>{
  const next=normalizeShadowMode($('settings-shadow-mode').value);
  if(next===shadowMode)return;
  if(teacherMode&&sceneRoot)saveDraft(false);
  try{localStorage.setItem(SHADOW_MODE_KEY,next);}catch{}
  location.reload();
});
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
let updatingControls=false;
let stageWidth=0,stageHeight=0;
function invalidate(frames=1){
  shadows.markDirty();
  drawFrames=Math.max(drawFrames,frames);
  if(!document.hidden && !frameRequest)frameRequest=requestAnimationFrame(draw);
}
function draw(){
  frameRequest=0;
  if(document.hidden)return;
  updatingControls=true;
  // OrbitControls.update() reports whether damping actually moved the camera.
  // A change fired *inside* this update must not restart the render loop.
  let moved=false;
  try { moved=controls.update(); } finally {updatingControls=false;}
  shadows.update(camera,controls.target,moved);
  renderer.render(scene,camera);
  updateAnnotationPositions();
  drawFrames=Math.max(0,drawFrames-1);
  if(moved || drawFrames>0)frameRequest=requestAnimationFrame(draw);
}
controls.addEventListener('change',()=>{if(!updatingControls)invalidate(2);});
// Wait for the user to finish orbiting before serializing the scene and undo history.
controls.addEventListener('end',()=>{if(!cardioPreviewIDs)queueDraft();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)invalidate(2);});
function resize(){
  const w=Math.max(1,elements.stage.clientWidth),h=Math.max(1,elements.stage.clientHeight);
  if(w===stageWidth && h===stageHeight)return;
  stageWidth=w;stageHeight=h;
  camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);invalidate(2);
}
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
function layerEnabled(s){
  const layers=effectiveSystemLayers(mode,systemLayers);
  if(s.system==='digestive')return layers.digestive &&
    (s.layer==='digestive-detail' ? detailAvailable && detailEnabled : digestiveAvailable && !detailEnabled) && !s.mesh.userData?.deferredAsset;
  if(s.system==='cardiovascular')return layers.cardiovascular && cardioAvailable && !s.mesh.userData?.deferredAsset;
  if(s.system==='respiratory')return layers.respiratory && respiratoryAvailable && !s.mesh.userData?.deferredAsset;
  if(s.system==='nervous')return layers.nervous && nervousAvailable && !s.mesh.userData?.deferredAsset;
  if(s.system==='muscular')return s.layer==='deep muscles'?layers.deep:layers.superficial;
  if(s.system==='skeletal')return layers.skeletal && (mode!=='skull'||s.skull);
  return false;
}
function currentStructures(){return structures.filter(layerEnabled);}
function persistCardioReviews(){
  try{cardioReviews=saveCardioReview(cardioReviews,localStorage);}catch(error){showToast('Browser storage unavailable; export your review notes.');}
}
function endCardioPreview(restoreCamera=true){
  if(!cardioPreviewIDs)return;
  cardioPreviewIDs=null;
  if(restoreCamera&&cardioPreviewCamera){
    camera.position.fromArray(cardioPreviewCamera.slice(0,3));
    controls.target.fromArray(cardioPreviewCamera.slice(3,6));controls.update();invalidate(2);
  }
  cardioPreviewCamera=null;
  refreshVisibility(true);
  renderCardioInspector();
}
function startCardioPreview(targetID){
  const target=auditCardiovascular(cardioEntries,cardioReviews).targets.find(t=>t.id===targetID);
  if(!target?.meshes.length){showToast('No selectable mesh for this requirement; use a custom label.');return;}
  if(!cardioPreviewCamera)cardioPreviewCamera=[...camera.position.toArray(),...controls.target.toArray()];
  cardioPreviewIDs=new Set(target.meshes.map(m=>m.id));
  isolated=false;setSelection(null);
  refreshVisibility(true);
  const matched=cardioEntries.filter(s=>cardioPreviewIDs.has(s.sourceName));
  const box=boxFor(matched);
  if(!box.isEmpty())fitBox(box,activePreset,2.2,true);
  renderCardioInspector();
}
function renderCardioInspector(){
  if(!teacherMode||!cardioAvailable)return;
  const report=auditCardiovascular(cardioEntries,cardioReviews);
  const summary=$('cardio-audit-summary'),rows=$('cardio-audit-list');
  if(!summary||!rows)return;
  summary.textContent=`${report.meshCount} meshes · ${report.pending} requirements await review · ${report.labelOnly} label-only targets`;
  const filter=$('cardio-audit-filter');if(filter)filter.value=cardioAuditFilter;
  rows.replaceChildren();
  for(const t of report.targets){
    if(cardioAuditFilter==='action'&&(t.labelOnly||t.status==='represented'&&t.reviewed==='verified'))continue;
    if(cardioAuditFilter==='paired'&&(!t.bilateral||t.labelOnly))continue;
    if(cardioAuditFilter==='reviewed'&&t.reviewed==='unreviewed')continue;
    const item=document.createElement('div');item.className='cardio-audit-item';item.dataset.targetId=t.id;
    const header=document.createElement('div');header.className='cardio-audit-head';
    const name=document.createElement('strong');name.textContent=t.name;header.append(name);
    const state=document.createElement('span');state.className='cardio-audit-state';
    state.textContent=t.labelOnly?'Teacher label':t.reviewed==='unreviewed'?t.status:t.reviewed;
    header.append(state);item.append(header);
    const context=document.createElement('p');context.className='studio-hint';context.textContent=t.evidence+` · ${t.meshes.length} mesh${t.meshes.length===1?'':'es'}`;item.append(context);
    const actions=document.createElement('div');actions.className='cardio-audit-actions';
    const preview=document.createElement('button');preview.type='button';preview.className='button small';
    preview.dataset.auditAction='preview';preview.textContent=cardioPreviewIDs&&t.meshes.some(m=>cardioPreviewIDs.has(m.id))?'Previewing':'Inspect in 3D';preview.disabled=!t.meshes.length;actions.append(preview);
    if(!t.labelOnly){
      const choose=document.createElement('select');choose.className='cardio-audit-select';choose.setAttribute('aria-label','Verification for '+t.name);choose.dataset.auditAction='status';
      for(const [val,label] of [['unreviewed','Not reviewed'],['verified','Verified'],['incomplete','Incomplete'],['incorrect','Incorrect']]){
        const option=document.createElement('option');option.value=val;option.textContent=label;choose.append(option);
      }
      choose.value=t.reviewed;actions.append(choose);
    }
    item.append(actions);
    const details=document.createElement('details');details.className='cardio-audit-meshes';
    const title=document.createElement('summary');title.textContent=`${t.meshes.length} exact source IDs`;
    details.append(title);
    const ids=document.createElement('div');ids.textContent=t.meshes.map(m=>`${m.id} — ${m.name}`).join('\n')||'No mesh';ids.style.whiteSpace='pre-line';details.append(ids);
    item.append(details);
    if(!t.labelOnly){
      const note=document.createElement('textarea');note.rows=2;note.className='cardio-audit-note';note.placeholder='What is missing, disconnected, or mislabeled?';note.value=t.note;note.dataset.auditAction='note';note.setAttribute('aria-label','Notes for '+t.name);item.append(note);
    }
    rows.append(item);
  }
}
if(teacherMode){
  $('cardio-audit-filter').addEventListener('change',e=>{cardioAuditFilter=e.target.value;renderCardioInspector();});
  $('cardio-audit-restore').addEventListener('click',()=>endCardioPreview());
  $('cardio-audit-export').addEventListener('click',()=>{
    const blob=new Blob([cardioAuditExport(cardioEntries,cardioReviews)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;
    anchor.download='Anatomy-Studio-Cardiovascular-Review.json';document.body.append(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  $('cardio-audit-list').addEventListener('click',e=>{
    const button=e.target.closest('[data-audit-action="preview"]');
    if(button)startCardioPreview(button.closest('[data-target-id]').dataset.targetId);
  });
  $('cardio-audit-list').addEventListener('change',e=>{
    const id=e.target.closest('[data-target-id]')?.dataset.targetId;if(!id)return;
    const target=auditCardiovascular(cardioEntries,cardioReviews).targets.find(t=>t.id===id);
    if(!target)return;
    const record={...(cardioReviews[id]||{}),signature:target.signature};
    if(e.target.dataset.auditAction==='status')record.status=e.target.value;
    if(e.target.dataset.auditAction==='note')record.note=e.target.value;
    cardioReviews[id]=record;persistCardioReviews();renderCardioInspector();
  });
}
function updateSystemControls(){
  const layers=effectiveSystemLayers(mode,systemLayers);
  $('system-superficial').checked=layers.superficial;
  $('system-deep').checked=layers.deep;
  $('systems-panel').hidden=!(layers.superficial||layers.deep);
  $('layer-description').textContent='Select which muscle layers are visible.';
  const on=activeSystemTabs(mode,systemLayers);
  for(const tab of document.querySelectorAll('.mode-tab')){
    const active=Boolean(on[tab.dataset.system]);
    tab.classList.toggle('active',active);
    tab.setAttribute('aria-pressed',String(active));
  }
  $('mode-digestive').disabled=!detailAvailable;
  $('mode-digestive').title=detailAvailable?`${detailEntries.length} selectable digestive structures`:'Detailed digestive assets are not installed';
  $('mode-cardiovascular').disabled=!cardioAvailable;
  $('mode-cardiovascular').title=cardioAvailable?`${cardioEntries.length} selectable heart and vessel structures`:'Run tools/install-cardiovascular-43.sh to add cardiovascular anatomy';
  $('mode-respiratory').disabled=!respiratoryAvailable;
  $('mode-respiratory').title=respiratoryAvailable?`${respiratoryEntriesList.length} lung and airway structures`:'Run tools/install-respiratory-43.sh';
  $('mode-nervous').disabled=!nervousAvailable;
  $('mode-nervous').title=nervousAvailable?`${nervousEntriesList.length} brain, spinal cord and nerve structures`:'Install the AnatomIQ 2.0 nervous-system model files';
  $('nervous-study-panel').hidden=!teacherMode||!nervousAvailable||!layers.nervous;
  if(nervousAvailable){
    const counts=Object.fromEntries(['brain','spinal_cord','peripheral'].map(k=>[k,nervousEntriesList.filter(s=>s.organId===k).length]));
    $('nervous-study-count').textContent=`${nervousEntriesList.length} source meshes · ${counts.brain} brain · ${counts.spinal_cord} spinal cord · ${counts.peripheral} cranial and peripheral nerve segments`;
  }
  $('respiratory-study-panel').hidden=!teacherMode||!respiratoryAvailable||!layers.respiratory;
  if(respiratoryAvailable){const coverage=respiratoryCoverage(respiratoryEntriesList,cardioEntries);
    $('respiratory-study-count').textContent=`${coverage.respiratory_meshes} respiratory meshes · ${coverage.groups.lung} lung segments · ${coverage.groups.airway+coverage.groups.trachea} named airway meshes · ${coverage.pulmonary_vessel_meshes} pulmonary-vessel meshes in existing cardiovascular layer`;}
  // The editor has chapter-specific cardiac study views, not a separate model.
  $('cardio-study-panel').hidden=!teacherMode||!cardioAvailable||!layers.cardiovascular;
  if(cardioAvailable){
    renderCardioInspector();
    const core=classCoreCoverage(cardioEntries);
    $('cardio-core-summary').textContent=`${core.represented} fully represented · ${core.partial} partially represented · ${core.missing} missing out of ${core.required} required curriculum targets (${core.matchedMeshes} matching meshes).`;
    const missing=core.targets.filter(t=>t.status!=='represented');
    const list=$('cardio-core-gaps');
    list.replaceChildren();
    for(const t of missing){
      const li=document.createElement('li');
      li.textContent=`${t.status==='missing'?'Missing':'Partial'}: ${t.name}${t.status==='partial'&&t.bilateral?' (check left/right coverage)':''}`;
      list.append(li);
    }
    const counts=cardioPresetCounts(cardioEntries);
    $('cardio-study-count').textContent=`${cardioEntries.length} selectable structures · ${counts.interior} interior structures · ${counts.chambers} chamber-space volumes · some vessel segments may be absent from the source atlas`+(cardioEntries.length<=15?' · Expanded model not yet installed':'');
    $('cardio-core-list-only').addEventListener('change',event=>{teacherCoreTreeOnly=event.target.checked;renderList();});
$('cardio-core-export').addEventListener('click',()=>{
  if(!cardioAvailable)return;
  const blob=new Blob([classCoreCoverageJSON(cardioEntries)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');
  a.href=url;a.download='Anatomy-Studio-Cardiovascular-Class-Coverage.json';
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
for(const button of document.querySelectorAll('[data-cardio-preset]')){
      const preset=button.dataset.cardioPreset;
      button.disabled=!cardioCanApply(cardioEntries,preset);
      button.title=button.disabled?'Required meshes not included in installed model':`${counts[preset]} cardiovascular structures`;
    }
  }
}
function currentlyVisible(){return currentStructures().filter(s=>s.mesh.visible);}
function refreshVisibility(transient=false){
  for(const s of structures){
    const inspecting=Boolean(cardioPreviewIDs && s.system==='cardiovascular');
    s.mesh.visible = layerEnabled(s) && tissueVisible(s)
      && (inspecting ? cardioPreviewIDs.has(s.sourceName) : !hidden.has(s.mesh))
      && (!isolated||s===selected);
  }
  renderList();
  invalidate(2);
  if(!transient)queueDraft();
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
const muscleDescriptions = [
  [/deltoid/i,'Shoulder muscle with anterior, middle and posterior portions; important for lifting and positioning the arm.'],
  [/biceps brachii/i,'Anterior arm muscle that flexes the elbow and supinates the forearm.'],
  [/triceps brachii/i,'Posterior arm muscle responsible for extending the elbow.'],
  [/pectoralis major/i,'Large anterior chest muscle that adducts, flexes and medially rotates the humerus.'],
  [/trapezius/i,'Superficial back and neck muscle that moves and stabilizes the scapula.'],
  [/latissimus dorsi/i,'Broad back muscle that extends, adducts and medially rotates the humerus.'],
  [/supraspinatus/i,'Rotator cuff muscle that helps initiate shoulder abduction and stabilize the glenohumeral joint.'],
  [/infraspinatus/i,'Rotator cuff muscle that externally rotates the humerus and stabilizes the shoulder.'],
  [/subscapularis/i,'Rotator cuff muscle on the anterior scapula; internally rotates the humerus.'],
  [/teres minor/i,'Rotator cuff muscle that externally rotates the humerus and helps stabilize the shoulder.'],
  [/rectus abdominis/i,'Vertical anterior abdominal muscle that helps flex the trunk and stabilize the abdomen.'],
  [/external oblique/i,'Superficial abdominal muscle involved in trunk rotation, lateral flexion and abdominal compression.'],
  [/gluteus maximus/i,'Large hip extensor important for rising, climbing and powerful lower-limb movement.'],
  [/gastrocnemius/i,'Superficial calf muscle that plantarflexes the ankle and helps flex the knee.'],
  [/soleus/i,'Deep calf muscle that plantarflexes the ankle and contributes to standing posture.'],
  [/tibialis anterior/i,'Anterior leg muscle that dorsiflexes and inverts the foot.']
];
function descriptionFor(s){
  if(s.system==='nervous')return ({brain:'A named brain region; this atlas subdivides the cerebral surface into identifiable regions.',spinal_cord:'The central nervous system pathway between the brainstem and spinal nerves.',peripheral:'A named cranial or peripheral nerve segment carrying sensory, motor, or mixed fibers.'})[s.organId]||'Nervous-system anatomy.';
  if(s.system==='respiratory')return ({lung:'Lung tissue, including bronchopulmonary segments when individually available.',airway:'An air-conducting bronchial structure.',trachea:'Air passage from the larynx toward the two main bronchi.',larynx:'Protects the airway and supports phonation.',upper:'Passage involved in conducting inspired air.',associated:'A neighboring structure involved in ventilation.'})[s.organId]||'Respiratory anatomy.';
  if(s.system==='cardiovascular')return ({'heart-internal':'A named cardiac structure such as a valve leaflet, chamber cavity or papillary muscle; select Heart interior to hide the exterior walls.',coronary:'Vessel involved in the heart’s own blood supply or drainage.',heart:'Part of the heart wall, which contributes to coordinated pumping of blood.',pulmonary:'Major vessel carrying blood between the heart and lungs.',artery:'Artery carrying blood away from the heart, including pulmonary arteries.',vein:'Vein returning blood toward the heart, including pulmonary veins.',other:'A named cardiovascular structure.'})[s.organId] || 'A named cardiovascular structure.';
  if(s.system==='digestive')return ({liver:'Processes absorbed nutrients, produces bile and supports metabolism.',stomach:'Mixes food with gastric acid and enzymes to begin protein digestion.',intestines:'Digestive and absorptive tract; the small and large intestines have different functions.',esophagus:'Transports swallowed food from the pharynx to the stomach.',gallbladder:'Stores and concentrates bile before its release into the small intestine.',pancreas:'Produces digestive enzymes and bicarbonate, as well as hormones.',duodenum:'First part of the small intestine; receives bile and pancreatic enzymes.',jejunum:'Middle portion of the small intestine; absorbs nutrients.',ileum:'Final portion of the small intestine; absorbs bile salts and vitamin B12.',colon:'Absorbs water and electrolytes and moves fecal matter.',cecum:'Blind pouch at the beginning of the large intestine.',appendix:'Small blind-ended tube arising from the cecum.',rectum:'Stores feces prior to elimination.'})[s.organId] || 'An identifiable segment of the digestive tract.';
  if(s.system==='muscular')return muscleDescriptions.find(([rx])=>rx.test(s.name))?.[1] || 'Skeletal muscle. Explore its position and relationships to adjacent muscles and bones.';
  const d=descriptions.find(([rx])=>rx.test(s.name));
  return d ? d[1] : s.system==='muscular' ? 'Skeletal muscle. Explore its position and relationships to adjacent muscles and bones.' : 'An identifiable structure in the human skeletal system. Rotate the model to examine its shape and anatomical relationships.';
}
function disposeMaterial(material){
  if(Array.isArray(material))material.forEach(m=>m?.dispose());
  else material?.dispose();
}
function displayMaterial(s){return paintedMaterials.get(s.mesh)||materials.get(s.mesh);}
function makePaintedMaterial(original,hex){
  const paintOne=m=>{
    const copy=m.clone();
    // A solid bone tint should not inherit colored model textures or vertex color multipliers.
    if(copy.color?.isColor)copy.color.set(hex);
    if('map' in copy)copy.map=null;
    if('vertexColors' in copy)copy.vertexColors=false;
    if(copy.emissive?.isColor)copy.emissive.set('#000000');
    if('emissiveMap' in copy)copy.emissiveMap=null;
    return copy;
  };
  return Array.isArray(original)?original.map(paintOne):paintOne(original);
}
function updateBoneMaterial(s){
  if(!s)return;
  if(selected===s){
    disposeMaterial(selectedHighlight);
    selectedHighlight=null;
  }
  const old=paintedMaterials.get(s.mesh);
  if(bonePaint.has(s.index)){
    paintedMaterials.set(s.mesh,makePaintedMaterial(materials.get(s.mesh),bonePaint.get(s.index)));
  }else paintedMaterials.delete(s.mesh);
  if(old)disposeMaterial(old);
  s.mesh.material=displayMaterial(s);
  if(selected===s)highlightSelection(s);
  invalidate(3);
}
function highlightSelection(s){
  const source=displayMaterial(s);
  const accent=m=>{
    const copy=m.clone();
    if(copy.emissive?.isColor){copy.emissive.set('#20bcc6');copy.emissiveIntensity=0.34;}
    return copy;
  };
  selectedHighlight=Array.isArray(source)?source.map(accent):accent(source);
  s.mesh.material=selectedHighlight;
}
function updatePaintControls(){
  if(!teacherMode)return;
  const canSelect=Boolean(selected);
  $('paint-selected').disabled=!canSelect;
  $('erase-selected').disabled=!canSelect||!bonePaint.has(selected.index);
  $('erase-all').disabled=bonePaint.size===0;
  $('paint-status').textContent=`${bonePaint.size} painted structure${bonePaint.size===1?'':'s'} in this chapter`;
  $('paint-mode').classList.toggle('placing',paintMode);
  $('paint-mode').setAttribute('aria-pressed',String(paintMode));
  $('paint-mode').textContent=paintMode?'✓ Painting structures — click to color':'◉ Paint mode — click structures';
  document.querySelectorAll('.paint-swatch').forEach(button=>button.classList.toggle('active',button.dataset.color===paintColor));
}
function setBoneColor(s,hex){
  if(!teacherMode||!s)return;
  if(hex)bonePaint.set(s.index,hex.toLowerCase());else bonePaint.delete(s.index);
  updateBoneMaterial(s);updatePaintControls();renderList();queueDraft();
}
function restoreBonePaint(entries=[]){
  const changed=new Set(bonePaint.keys());
  bonePaint.clear();
  for(const [index,hex] of entries){bonePaint.set(index,hex.toLowerCase());changed.add(index);}
  for(const index of changed)if(structures[index])updateBoneMaterial(structures[index]);
  updatePaintControls();
}
function cancelPainting(){
  paintMode=false;elements.stage.style.cursor='';
  $('place-hint').textContent='Click the structure where you want the label to point. Esc cancels.';
  $('place-hint').hidden=true;
  updatePaintControls();
}
function setSelection(s){
  if(selected){
    selected.mesh.material=displayMaterial(selected);
    disposeMaterial(selectedHighlight);
    selectedHighlight=null;
  }
  selected=s;
  $('isolate-selected').textContent='◈   Isolate structure';
  if(s){
    if(displayMaterial(s))highlightSelection(s);
    elements.noSelection.hidden=true;
    elements.selectionContent.hidden=false;
    elements.selName.textContent=s.name;
    elements.selSide.textContent=(s.side==='midline'?'Midline':s.side[0].toUpperCase()+s.side.slice(1)+' side')+' · '+s.tissue;
    elements.selCategory.textContent=s.system==='cardiovascular'?'CARDIOVASCULAR SYSTEM':s.system==='respiratory'?'RESPIRATORY SYSTEM':s.system==='nervous'?'NERVOUS SYSTEM':s.system==='digestive'?'DIGESTIVE SYSTEM':s.system==='muscular'?(s.layer==='deep muscles'?'DEEP MUSCULAR SYSTEM':'SUPERFICIAL MUSCULAR SYSTEM'):s.tissue==='tooth'?'DENTAL ANATOMY':s.tissue==='cartilage'?'CARTILAGE':'SKELETAL SYSTEM';
    elements.selDesc.textContent=descriptionFor(s);
  }else{
    elements.noSelection.hidden=false;
    elements.selectionContent.hidden=true;
  }
  refreshVisibility();
  updatePaintControls();
  if (s && matchMedia('(max-width:850px)').matches && !placingLabel && !paintMode) openDetails(true);
}
function updateLayerHeading(){
  const layers=effectiveSystemLayers(mode,systemLayers);
  const enabled=[layers.skeletal?'Skeletal':null,layers.superficial||layers.deep?'Muscular':null,layers.digestive?'Digestive':null,layers.cardiovascular?'Cardiovascular':null,layers.respiratory?'Respiratory':null,layers.nervous?'Nervous':null].filter(Boolean);
  const name=mode==='skull'?'Skull':mode==='skeleton'?'Skeletal system':enabled.length?enabled.join(' + '):'No layers selected';
  elements.title.textContent=name;
  elements.subtitle.textContent=mode==='skull'?'Cranial and facial structures':mode==='skeleton'?'Full skeletal system':'Click system buttons to show or hide layers independently.';
  elements.context.textContent=name;
  elements.tip.textContent='Toggle systems without changing the camera. Click structures to identify, label or paint.';
}
function setMode(newMode){
  if(cardioPreviewIDs)endCardioPreview();
  if(!sceneRoot)return;
  if(newMode==='digestive' && !digestiveAvailable && !detailAvailable){showToast('Digestive detailed model missing. Upload models/digestive-standard.glb and digestive-structures.json.');return;}
  // A newly selected Digestive view should display the expanded dataset when present.
  // Restoring existing published chapters must NEVER change their saved visibility.
  if(shouldPreferDetailedWhenChoosingDigestive({teacherMode,restoringScene,detailAvailable,
    previousMode:mode,nextMode:newMode,detailLayerExplicitlyChanged})) detailEnabled=true;
  if(newMode==='digestive')systemLayers.digestive=true;
  mode=newMode;
  openDetails(false);
  isolated=false;
  hidden.clear();
  setSelection(null);
  const display={
    skull:['Skull','Explore cranial and facial bones, cartilage, and teeth.'],
    skeleton:['Skeletal system','Explore the axial and appendicular skeleton.'],
    muscular:['Muscular system','Explore superficial and deep muscles, independently.'],
    digestive:['Digestive system','Explore individual digestive structures and accessory organs.'],
    systems:['Combined systems','Combine skeleton, muscles, digestive organs and cardiovascular anatomy layer by layer.']
  }[mode];
  if(!display)throw new Error('Unknown anatomical system.');
  updateLayerHeading();
  updateSystemControls();
  elements.search.value='';
  elements.clearSearch.hidden=true;
  refreshVisibility();
  frameVisible('front');
}
function fitBox(box,view='front',padding=1.35,transient=false){
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
  invalidate(2);
  if(!transient)queueDraft();
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
  controls.update();setPresetActive(view);invalidate(2);queueDraft();
}
function focusSelected(){if(selected)fitBox(boxFor([selected]),activePreset,2.15);}
function renderList(){
  const text=teacherMode || studentPermissions.ss ? elements.search.value.trim().toLowerCase() : '';
  document.body.classList.toggle('student-has-query',!teacherMode && Boolean(text));
  const available=currentStructures().filter(s=>tissueVisible(s) && (!teacherMode||!teacherCoreTreeOnly||s.system!=='cardiovascular'||classCoreVisible(s)));
  const found=available.filter(s=>s.name.toLowerCase().includes(text) && (teacherMode || studentExplore || s.mesh.visible));
  elements.count.textContent=found.length;
  elements.clearSearch.hidden=!elements.search.value;
  const frag=document.createDocumentFragment();
  if(!teacherMode && !studentPermissions.st && !text){
    const p=document.createElement('p');p.className='empty-list';p.textContent='Search for a structure above.';frag.appendChild(p);
  }else if(!found.length){
    const p=document.createElement('p');p.className='empty-list';p.textContent='No matching structures found.';frag.appendChild(p);
  }
  const createBoneButton=s=>{
    const b=document.createElement('button');b.className='bone-item'+(selected===s?' active':'');
    b.setAttribute('aria-pressed',String(selected===s));
    const t=document.createElement('span');t.textContent=studentAllowed('sn') ? s.name : `Structure ${s.index+1}`;b.appendChild(t);
    if(bonePaint.has(s.index)){
      const chip=document.createElement('span');chip.className='paint-list-dot';
      chip.style.backgroundColor=bonePaint.get(s.index);chip.setAttribute('aria-label',`Painted ${bonePaint.get(s.index)}`);
      chip.title=`Bone color: ${bonePaint.get(s.index)}`;b.appendChild(chip);
    }
    b.addEventListener('click',()=>{
      if(teacherMode||studentExplore)hidden.delete(s.mesh);
      isolated=false;
      if(studentAllowed('sn')){setSelection(s);focusSelected();}
      else {setSelection(null);fitBox(boxFor([s]),activePreset,2.2);}
      if(innerWidth<630)elements.sidebar.classList.remove('open');
    });
    return b;
  };
  if(!teacherMode && studentPermissions.st && !text){
    // Hierarchical student explorer, grouped by tissue then left/right/midline.
    // Each anatomical name remains governed by the separate 'identify' permission.
    const tissueGroups=new Map();
    for(const s of found){
      const tissue=s.system==='cardiovascular'?({'heart-internal':'Heart: valves & cavities',heart:'Heart walls',pulmonary:'Pulmonary circulation',coronary:'Coronary circulation',systemic:'Systemic vessels',nonvascular:'Nonvascular source anatomy'}[s.cardioGroup]||'Cardiovascular structures'):s.system==='respiratory'?({'lung':'Lung segments','airway':'Bronchi & airways','trachea':'Trachea','larynx':'Larynx','upper':'Upper respiratory','associated':'Respiratory-associated structures'}[s.organId]||'Respiratory structures'):s.system==='nervous'?({'brain':'Brain regions','spinal_cord':'Spinal cord','peripheral':'Cranial and peripheral nerves'}[s.organId]||'Nervous system'):s.system==='digestive'?'Digestive organs':s.system==='muscular'?(s.layer==='deep muscles'?'Deep muscles':'Superficial muscles'):s.tissue==='tooth'?'Teeth':s.tissue==='cartilage'?'Cartilage':'Bones';
      if(!tissueGroups.has(tissue))tissueGroups.set(tissue,new Map());
      const sides=tissueGroups.get(tissue);const side=s.side==='left'?'Left':s.side==='right'?'Right':'Midline';
      if(!sides.has(side))sides.set(side,[]);
      sides.get(side).push(s);
    }
    for(const [tissue,sides] of tissueGroups){
      const group=document.createElement('details');group.className='bone-tree-group';group.open=treeExpanded.get(tissue) ?? true;group.addEventListener('toggle',()=>treeExpanded.set(tissue,group.open));
      const summary=document.createElement('summary');summary.textContent=`${tissue} (${[...sides.values()].reduce((n,a)=>n+a.length,0)})`;group.append(summary);
      for(const [side,bones] of sides){
        const inner=document.createElement('details');inner.className='bone-tree-subgroup';const nodeKey=`${tissue}/${side}`;inner.open=treeExpanded.get(nodeKey) ?? true;inner.addEventListener('toggle',()=>treeExpanded.set(nodeKey,inner.open));
        const label=document.createElement('summary');label.textContent=`${side} (${bones.length})`;inner.append(label);
        const branch=document.createElement('div');branch.className='bone-tree-items';
        for(const bone of bones)branch.append(createBoneButton(bone));
        inner.append(branch);group.append(inner);
      }
      frag.append(group);
    }
  }else if(teacherMode || studentPermissions.st || text){
    if(teacherMode&&teacherCoreTreeOnly&&mode==='systems'&&systemLayers.cardiovascular){
      // Group exact duplicate cardiovascular names without merging mesh IDs.
      const groups=new Map();
      for(const bone of found){
        const key=bone.system==='cardiovascular'?bone.name+' / '+bone.side:'single:'+bone.index;
        if(!groups.has(key))groups.set(key,[]);
        groups.get(key).push(bone);
      }
      for(const [key,items] of groups){
        if(items.length===1){frag.append(createBoneButton(items[0]));continue;}
        const group=document.createElement('details');group.className='cardio-mesh-group';
        const summary=document.createElement('summary');summary.textContent=items[0].name+' ('+items.length+' separate meshes)';group.append(summary);
        for(const bone of items)group.append(createBoneButton(bone));frag.append(group);
      }
    }else for(const bone of found)frag.append(createBoneButton(bone));
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
  if(!hit || (!teacherMode && !studentPermissions.sn))return;
  const s=structures.find(x=>x.mesh===hit.object);
  if(!s)return;
  if(paintMode && teacherMode){
    setBoneColor(s,paintColor);isolated=false;setSelection(s);
  } else if(placingLabel && teacherMode){
    const text=$('new-label-text').value.trim();
    if(!text){showToast('Enter label text first.');cancelPlacing();return;}
    const local=hit.object.worldToLocal(hit.point.clone());
    labels.push({id:++labelSequence,s:s.index,p:local.toArray().map(n=>round(n,5)),t:text,dx:24,dy:-31});
    $('new-label-text').value='';cancelPlacing();setSelection(s);renderAnnotations();renderLabelEditor();queueDraft();
    showToast('Label anchored. Drag its callout to reposition it.');
  } else {isolated=false;setSelection(s);} 
});
function prepareStructures(root){
  const found=[];
  root.traverse(obj=>{
    if(!obj.isMesh)return;
    const meta=obj.userData||{};
    if(!['skeleton','deep muscles','superficial muscles'].includes(meta.layer)){
      obj.visible=false;return;
    }
    const system=meta.layer==='skeleton'?'skeletal':'muscular';
    const tissue=system==='muscular'?'muscle':(meta.tissue||'bone');
    if(tissue==='eye'){obj.visible=false;return;}
    const name=(meta.name||obj.name||'Unnamed structure').trim();
    found.push({mesh:obj,name,side:meta.side||'midline',tissue,
      system,layer:meta.layer,skull:system==='skeletal'&&isSkull(name,tissue)});
    materials.set(obj,obj.material);
  });
  // Append muscles AFTER the exact legacy skeleton ordering. This preserves
  // label/paint structure indices from 0.3–0.9 and permits older shared scenes.
  const catalog=catalogAnatomy([...found,...digestiveSourceEntries,...detailEntries,...cardioEntries,...respiratoryEntriesList,...nervousEntriesList]);
  structures=catalog.structures;
  legacyStructureCount=catalog.legacyCount;
  legacyFingerprint=catalog.legacyFingerprint;
  baseStructureCount=catalog.baseCount;
  baseFingerprint=catalog.baseFingerprint;
  previousStructureCount=catalog.previousCount;
  previousFingerprint=catalog.previousFingerprint;
  preCardioStructureCount=catalog.preCardioCount;preCardioFingerprint=catalog.preCardioFingerprint;
  originalCardioStructureCount=catalog.originalCardioCount;originalCardioFingerprint=catalog.originalCardioFingerprint;
  sceneFingerprint=catalog.fullFingerprint;
  structures.forEach((entry,i)=>entry.index=i);
  console.info(`Anatomy Studio: ${legacyStructureCount} skeletal structures; ${baseStructureCount-legacyStructureCount} muscles, ${catalog.digestiveCount} digestive meshes; ${catalog.cardiovascularCount} cardiovascular meshes; ${catalog.respiratoryCount} respiratory meshes; ${catalog.nervousCount} nervous meshes; ${structures.filter(x=>x.skull).length} skull structures`);
  if(legacyStructureCount<100 || structures.filter(x=>x.skull).length<12 || baseStructureCount-legacyStructureCount<250)
    throw new Error('The model did not contain the expected separate bones and muscle meshes.');
}
function loadingProgress(ev){
  if(ev.total){const p=Math.min(100,Math.round(ev.loaded/ev.total*100));elements.progress.style.width=p+'%';elements.loadText.textContent=p+'% downloaded';}
  else if(ev.loaded){elements.loadText.textContent=(ev.loaded/1024/1024).toFixed(1)+' MB downloaded';elements.progress.style.width='48%';}
}
function loadGLB(url){return new Promise((resolve,reject)=>{const loader=new GLTFLoader();loader.load(url,resolve,loadingProgress,reject);});}
// Retained internally ONLY to preserve previously published 1.2/1.3 links and old
// locally saved lessons. The basic model is not exposed as a choice in 1.4.
async function loadDigestiveModel(){
  digestiveAvailable=false;digestiveSourceEntries=[];
  if(digestiveRoot){scene.remove(digestiveRoot);digestiveRoot=null;}
  // Core skeleton always functions if this optional file is absent. No CDN fallback.
  let response;
  try{response=await fetch(LOCAL_DIGESTIVE_MODEL,{method:'HEAD'});}catch{return;}
  if(!response.ok||/text\/html/i.test(response.headers.get('content-type')||''))return;
  let draco=null;
  try{
    const {DRACOLoader}=await import('three/addons/loaders/DRACOLoader.js');
    draco=new DRACOLoader().setDecoderPath('./vendor/three/examples/jsm/libs/draco/gltf/');
    const loader=new GLTFLoader().setDRACOLoader(draco);
    const gltf=await loader.loadAsync(LOCAL_DIGESTIVE_MODEL);
    const entries=digestiveMeshEntries(gltf.scene);
    const bodyBox=new THREE.Box3().setFromObject(sceneRoot),alignment=sourceRegistration(bodyBox);
    gltf.scene.scale.setScalar(alignment.scale);
    gltf.scene.position.set(alignment.x,alignment.y,alignment.z);
    scene.add(gltf.scene);
    digestiveRoot=gltf.scene;
    digestiveSourceEntries=entries;
    for(const entry of entries){applyOrganAppearance(entry);entry.mesh.visible=false;}
    configureAnatomyShadows(digestiveRoot,shadows.profile.enabled);
    digestiveAvailable=true;legacyLoaded=true;
    console.info(`Anatomy Studio: loaded ${entries.length} digestive structures from self-hosted BodyParts3D asset.`);
  }catch(e){console.warn('Digestive model unavailable; skeletal lessons still work.',e);}
  finally{draco?.dispose();}
}
function applyOrganAppearance(entry){
  const obj=entry.mesh;
  // Flat gray upstream materials are replaced, but teacher colors still override this material.
  if(obj.geometry?.attributes?.position && !obj.geometry.attributes.normal){obj.geometry.computeVertexNormals();}
  const color=digestiveDefaultColor(entry.name);
  const original=obj.material;
  obj.material=new THREE.MeshStandardMaterial({color,roughness:0.79,metalness:0,side:THREE.DoubleSide});
  applySurfaceFinish(obj.material,'digestive',surfaceMode);
  if(Array.isArray(original))original.forEach(m=>m?.dispose());else original?.dispose();
  materials.set(obj,obj.material);
}
async function loadDetailedDigestive(){
  detailAvailable=false; detailEntries=[];
  const preferred=digestiveGeometry==='detailed'?DETAIL_MODEL_SHARP:DETAIL_MODEL_STANDARD;
  // Data stays optional: no background CDN; older lessons continue to load normally.
  try{
    const response=await fetch(DETAIL_MANIFEST);
    if(!response.ok || /text\/html/i.test(response.headers.get('content-type')||''))return;
    const metadata=await response.json();
    let gltf;
    try{gltf=await new GLTFLoader().loadAsync(preferred);}catch(error){
      if(preferred===DETAIL_MODEL_STANDARD)throw error;
      console.warn('High-detail GLB missing, loading Standard geometry.',error);
      gltf=await new GLTFLoader().loadAsync(DETAIL_MODEL_STANDARD);
    }
    const entries=detailStructureEntries(gltf.scene,metadata);
    const alignment=sourceRegistration(new THREE.Box3().setFromObject(sceneRoot));
    // 1.3 exports retained +Y depth when converting Z-up -> Y-up.
    // Correct only the detailed 4.3 anatomy. Preserve the registered mid-plane,
    // the original GLB mesh-local coordinates, and all saved label anchors.
    const corrected=correctedDetailTransform(alignment);
    gltf.scene.scale.set(...corrected.scale);
    gltf.scene.position.set(...corrected.position);
    scene.add(gltf.scene);detailRoot=gltf.scene;
    for(const entry of entries){applyOrganAppearance(entry);entry.mesh.visible=false;}
    configureAnatomyShadows(detailRoot,shadows.profile.enabled);
    detailEntries=entries;detailAvailable=true;detailLoaded=true;detailEnabled=true;
    console.info(`Anatomy Studio: ${entries.length} BodyParts3D 4.3 digestive structures loaded (${digestiveGeometry}).`);
  }catch(error){
    console.warn('Detailed digestive model unavailable. New digestive scenes require locally hosted detailed assets.',error);
    if(detailRoot){scene.remove(detailRoot);detailRoot=null;}
  }
}
async function loadCardiovascular(){
  cardioAvailable=false;cardioEntries=[];cardioLoadError='';
  if(cardioRoot){scene.remove(cardioRoot);cardioRoot=null;}
  try{
    const response=await fetch(CARDIO_MANIFEST,{cache:'no-cache'});
    if(!response.ok)throw new Error(`Cardiovascular catalog HTTP ${response.status}`);
    if(/text\/html/i.test(response.headers.get('content-type')||''))throw new Error('Cardiovascular catalog is HTML, not JSON');
    const metadata=validateCardiovascularManifest(await response.json());
    const requested=cardioGeometry==='detailed'?CARDIO_DETAILED:CARDIO_STANDARD;
    let gltf;
    try{gltf=await new GLTFLoader().loadAsync(requested);}
    catch(error){if(requested===CARDIO_STANDARD)throw error;
      console.warn('Detailed cardiovascular GLB unavailable; using standard geometry.',error);
      gltf=await new GLTFLoader().loadAsync(CARDIO_STANDARD);
    }
    const entries=cardiovascularEntries(gltf.scene,metadata);
    const alignment=sourceRegistration(new THREE.Box3().setFromObject(sceneRoot));
    // The cardiovascular and digestive models use the same BodyParts3D 4.3
    // skin-normalized source frame. Correct depth ONLY for this secondary root.
    const corrected=correctedDetailTransform(alignment);
    gltf.scene.scale.set(...corrected.scale);
    gltf.scene.position.set(...corrected.position);
    scene.add(gltf.scene);cardioRoot=gltf.scene;
    for(const entry of entries){
      const obj=entry.mesh;
      if(obj.geometry?.attributes?.position&&!obj.geometry.attributes.normal)obj.geometry.computeVertexNormals();
      const original=obj.material;
      // A chamber *cavity* is empty space, not cardiac tissue. Keep it a
      // very faint reference volume, so valves and chordae are not occluded.
      const chamberVolume=cardioIsCavity(entry);
      obj.material=new THREE.MeshStandardMaterial({
        color:chamberVolume?'#b5cde4':cardiovascularColor(entry.name),
        roughness:0.77,metalness:0,
        transparent:chamberVolume,opacity:chamberVolume?0.12:1,
        depthWrite:!chamberVolume,side:chamberVolume?THREE.BackSide:THREE.DoubleSide
      });
      applySurfaceFinish(obj.material,chamberVolume?'cardio-cavity':'cardiovascular',surfaceMode);
      obj.userData.cardioChamberSpace=chamberVolume;
      if(Array.isArray(original))original.forEach(m=>m?.dispose());else original?.dispose();
      materials.set(obj,obj.material);obj.visible=false;
    }
    configureAnatomyShadows(cardioRoot,shadows.profile.enabled);
    cardioEntries=entries;cardioAvailable=true;cardioLoaded=true;
    console.info(`Anatomy Studio: ${entries.length} cardiovascular structures loaded (${cardioGeometry}).`);
  }catch(error){
    cardioLoaded=false;cardioLoadError=String(error?.message||error);
    console.warn('Self-hosted cardiovascular layer not installed; existing anatomy remains available.',error);
    if(cardioRoot){scene.remove(cardioRoot);cardioRoot=null;}
  }
}
function applyRespiratoryOpacity(){
 for(const e of respiratoryEntriesList){
  if(e.organId!=='lung')continue;
  e.mesh.material.transparent=respiratoryOpacity<0.995;
  e.mesh.material.opacity=respiratoryOpacity;
  e.mesh.material.depthWrite=respiratoryOpacity>=0.995;
  e.mesh.castShadow=respiratoryOpacity>=0.995;
  e.mesh.material.needsUpdate=true;
 }
 if($('respiratory-opacity'))$('respiratory-opacity').value=String(respiratoryOpacity);
 invalidate(2);
}
async function loadRespiratory(){
 respiratoryLoaded=false;respiratoryAvailable=false;respiratoryEntriesList=[];
 if(respiratoryRoot){scene.remove(respiratoryRoot);respiratoryRoot=null;}
 try{
  const response=await fetch(RESP_MANIFEST,{cache:'no-cache'});
  if(!response.ok||/text\/html/i.test(response.headers.get('content-type')||''))return;
  const metadata=validateRespiratoryManifest(await response.json());
  const requested=respiratoryGeometry==='detailed'?RESP_DETAILED:RESP_STANDARD;
  let gltf;
  try{gltf=await new GLTFLoader().loadAsync(requested);}
  catch(error){if(requested===RESP_STANDARD)throw error;gltf=await new GLTFLoader().loadAsync(RESP_STANDARD);}
  const entries=respiratoryEntries(gltf.scene,metadata);
  const alignment=correctedDetailTransform(sourceRegistration(new THREE.Box3().setFromObject(sceneRoot)));
  gltf.scene.scale.set(...alignment.scale);gltf.scene.position.set(...alignment.position);
  scene.add(gltf.scene);respiratoryRoot=gltf.scene;
  for(const entry of entries){
   const mesh=entry.mesh;
   if(mesh.geometry?.attributes?.position&&!mesh.geometry.attributes.normal)mesh.geometry.computeVertexNormals();
   const old=mesh.material;
   mesh.material=new THREE.MeshStandardMaterial({color:respiratoryColor(entry),metalness:0,roughness:0.73,side:THREE.DoubleSide});
   applySurfaceFinish(mesh.material,'respiratory',surfaceMode);
   if(Array.isArray(old))old.forEach(m=>m?.dispose());else old?.dispose();
   materials.set(mesh,mesh.material);mesh.visible=false;
  }
  respiratoryEntriesList=entries;respiratoryAvailable=true;respiratoryLoaded=true;
  applyRespiratoryOpacity();configureAnatomyShadows(respiratoryRoot,shadows.profile.enabled);
 }catch(error){
  console.warn('Optional respiratory source models missing or inconsistent',error);
  if(respiratoryRoot){scene.remove(respiratoryRoot);respiratoryRoot=null;}
 }
}
async function loadNervous(){
  nervousLoaded=false;nervousAvailable=false;nervousEntriesList=[];
  if(nervousRoot){scene.remove(nervousRoot);nervousRoot=null;}
  try{
    const response=await fetch(NERVOUS_MANIFEST,{cache:'no-cache'});
    if(!response.ok||/text\/html/i.test(response.headers.get('content-type')||''))return;
    const manifest=validateNervousManifest(await response.json());
    let gltf;const requested=nervousGeometry==='detailed'?NERVOUS_DETAILED:NERVOUS_STANDARD;
    try{gltf=await new GLTFLoader().loadAsync(requested);}
    catch(error){if(requested===NERVOUS_STANDARD)throw error;console.warn('Detailed nervous geometry unavailable; using Standard.',error);gltf=await new GLTFLoader().loadAsync(NERVOUS_STANDARD);}
    const entries=nervousEntries(gltf.scene,manifest);
    const alignment=correctedDetailTransform(sourceRegistration(new THREE.Box3().setFromObject(sceneRoot)));
    gltf.scene.scale.set(...alignment.scale);gltf.scene.position.set(...alignment.position);
    scene.add(gltf.scene);nervousRoot=gltf.scene;
    for(const entry of entries){
      const mesh=entry.mesh;
      if(mesh.geometry?.attributes?.position&&!mesh.geometry.attributes.normal)mesh.geometry.computeVertexNormals();
      const original=mesh.material;
      mesh.material=new THREE.MeshStandardMaterial({color:nervousColor(entry),metalness:0,roughness:0.72,side:THREE.DoubleSide});
      applySurfaceFinish(mesh.material,'nervous',surfaceMode);
      if(Array.isArray(original))original.forEach(m=>m?.dispose());else original?.dispose();
      materials.set(mesh,mesh.material);mesh.visible=false;
    }
    nervousEntriesList=entries;nervousAvailable=true;nervousLoaded=true;
    configureAnatomyShadows(nervousRoot,shadows.profile.enabled);
  }catch(error){
    console.warn('Optional nervous-system model missing or inconsistent',error);
    if(nervousRoot){scene.remove(nervousRoot);nervousRoot=null;}
  }
}
async function loadHighResolutionSkull(){
  skullDetailStats=null;
  if(skullGeometry!=='detailed')return;
  try{
    const response=await fetch(SKULL_MANIFEST,{cache:'no-cache'});
    if(!response.ok||/text\/html/i.test(response.headers.get('content-type')||''))throw new Error(`Metadata HTTP ${response.status}`);
    const metadata=validateSkullManifest(await response.json());
    const gltf=await new GLTFLoader().loadAsync(SKULL_HIGH);
    const alignment=sourceRegistration(new THREE.Box3().setFromObject(sceneRoot));
    const corrected=correctedDetailTransform(alignment);
    gltf.scene.scale.set(...corrected.scale);gltf.scene.position.set(...corrected.position);
    sceneRoot.updateWorldMatrix(true,true);
    gltf.scene.updateWorldMatrix(true,true);
    const stats=installSkullGeometry(THREE,gltf.scene,metadata,structures,(structure,newMaterial)=>{
      // The paint/selection system caches source materials separately from the
      // mesh. Keep that cache in sync when replacing a bone's textured material.
      applySurfaceFinish(newMaterial,'skeletal',surfaceMode);
      materials.set(structure.mesh,newMaterial);
    });
    skullDetailStats=stats;
    console.info(`Anatomy Studio: high-resolution skull upgraded ${stats.upgraded}/${stats.total} bones.`,stats);
    if(!stats.upgraded)console.warn('No higher-detail skull meshes safely matched the original skeleton. Check source registration.');
  }catch(error){
    skullDetailStats={total:0,upgraded:0,error:String(error?.message||error)};
    console.warn('Optional high-resolution skull unavailable; original bones remain usable.',error);
  }
  invalidate(3);
}
// Lightweight metadata keeps published model indices stable while optional GLBs
// are deferred. No 3D geometry is fetched by this step.
async function readOptionalManifest(path,validate){
  try{
    const response=await fetch(path);
    if(!response.ok||/text\/html/i.test(response.headers.get('content-type')||''))return null;
    return validate(await response.json());
  }catch(error){console.warn('Optional anatomy manifest unavailable:',path,error);return null;}
}
function virtualMesh(name){
  const mesh=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial());
  mesh.name=name;mesh.visible=false;mesh.userData.deferredAsset=true;
  return mesh;
}
function asVirtualRoot(names){
  const nodes=names.map(virtualMesh);
  return {traverse(visitor){for(const mesh of nodes)visitor(mesh);}};
}
async function createDeferredCatalog(){
  // The 1.2 organ asset is kept only to preserve original scene indices.
  try{
    const response=await fetch(LOCAL_DIGESTIVE_MODEL,{method:'HEAD'});
    legacyPresent=response.ok&&!/text\/html/i.test(response.headers.get('content-type')||'');
  }catch{legacyPresent=false;}
  if(legacyPresent){
    digestiveSourceEntries=digestiveMeshEntries(asVirtualRoot(LEGACY_DIGESTIVE_MESH_NAMES));
    digestiveAvailable=true;
  }
  digestMetadata=await readOptionalManifest(DETAIL_MANIFEST,validateDigestiveManifest);
  if(digestMetadata){
    detailEntries=detailStructureEntries(asVirtualRoot(digestMetadata.structures.map(s=>s.id)),digestMetadata);
    detailAvailable=true;
  }
  cardioMetadata=await readOptionalManifest(CARDIO_MANIFEST,validateCardiovascularManifest);
  if(cardioMetadata){
    cardioEntries=cardiovascularEntries(asVirtualRoot(cardioMetadata.structures.map(s=>s.id)),cardioMetadata);
    cardioAvailable=true;
  }
  respMetadata=await readOptionalManifest(RESP_MANIFEST,validateRespiratoryManifest);
  if(respMetadata){
    respiratoryEntriesList=respiratoryEntries(asVirtualRoot(respMetadata.structures.map(s=>s.id)),respMetadata);
    respiratoryAvailable=true;
  }
  nervMetadata=await readOptionalManifest(NERVOUS_MANIFEST,validateNervousManifest);
  if(nervMetadata){
    nervousEntriesList=nervousEntries(asVirtualRoot(nervMetadata.structures.map(s=>s.id)),nervMetadata);
    nervousAvailable=true;
  }
}
function restoreDeferredReferences(system,realEntries){
  // Do not rebuild or reorder the structures array: indices are used by every
  // published annotation, visibility bitmap and paint override.
  const existing=structures.filter(s=>system==='legacy'?s.system==='digestive'&&s.layer!=='digestive-detail':system==='detailed'?s.layer==='digestive-detail':system==='cardiovascular'?s.system==='cardiovascular':system==='respiratory'?s.system==='respiratory':s.system==='nervous');
  const id=(s)=>s.sourceName;
  const replacements=new Map(realEntries.map(s=>[id(s),s]));
  if(existing.length!==realEntries.length||new Set(existing.map(id)).size!==realEntries.length)
    throw new Error(`The ${system} model does not match this lesson's anatomical catalog.`);
  for(const old of existing){
    const fresh=replacements.get(id(old));
    if(!fresh||fresh.name!==old.name||fresh.mesh.name!==old.mesh.name)
      throw new Error(`Anatomical structure changed: ${id(old)}. Refresh the lesson catalog.`);
  }
  for(const old of existing){
    const mesh=replacements.get(id(old)).mesh;
    old.mesh.geometry?.dispose();old.mesh.material?.dispose();
    old.mesh=mesh;
  }
  invalidate(2);
}
async function loadNeededAsset(kind){
  if(kind==='legacyDigestive'){
    if(legacyLoaded)return;
    await loadDigestiveModel();
    if(!legacyLoaded)throw new Error('Unable to load the legacy digestive model required by this chapter.');
    restoreDeferredReferences('legacy',digestiveSourceEntries);
  }else if(kind==='detailedDigestive'){
    if(detailLoaded)return;
    await loadDetailedDigestive();
    if(!detailLoaded)throw new Error('Unable to load the detailed digestive model required by this chapter.');
    restoreDeferredReferences('detailed',detailEntries);
  }else if(kind==='respiratory'){
    if(respiratoryLoaded)return;
    await loadRespiratory();
    if(!respiratoryLoaded)throw new Error('Unable to load the respiratory models for this chapter. Upload respiratory GLBs and metadata.');
    restoreDeferredReferences('respiratory',respiratoryEntriesList);
  }else if(kind==='nervous'){
    if(nervousLoaded)return;
    await loadNervous();
    if(!nervousLoaded)throw new Error('Unable to load nervous-standard.glb and nervous-structures.json for this chapter.');
    restoreDeferredReferences('nervous',nervousEntriesList);
  }else if(kind==='cardiovascular'){
    if(cardioLoaded)return;
    await loadCardiovascular();
    if(!cardioLoaded)throw new Error('Unable to load the cardiovascular model required by this chapter.');
    restoreDeferredReferences('cardiovascular',cardioEntries);
  }
}
async function ensureChapterAssets(chapter){
  if(teacherMode)return;
  const needed=chapterAssets(chapter);
  for(const type of ['legacyDigestive','detailedDigestive','cardiovascular','respiratory','nervous'])if(needed[type])await loadNeededAsset(type);
  if(needed.skull && skullGeometry==='detailed' && !skullDetailStats)await loadHighResolutionSkull();
}
async function loadAnatomy(){
  elements.loader.hidden=false;elements.retry.hidden=true;elements.loadTitle.textContent='Preparing the anatomy viewer';
  elements.loadDesc.textContent='Loading anatomy for this lesson. Additional systems load when needed.';
  elements.loadText.textContent='Connecting to model source…';elements.progress.style.width='3%';
  setStatus(navigator.onLine?'Loading model':'Offline',navigator.onLine?'':'error');
  try{
    // Parse the published lesson before fetching GLBs. A malformed link can
    // now fail immediately without downloading anatomy assets.
    if(!teacherMode)studentProjectAtStartup=await decodeScene(location.hash.slice('#scene='.length));
    let localAvailable=false;
    try{const response=await fetch(LOCAL_MODEL,{method:'HEAD'});localAvailable=response.ok && /model|octet-stream|binary|application/i.test(response.headers.get('content-type')||'application/octet-stream');}catch{}
    const urls=localAvailable?[LOCAL_MODEL,REMOTE_MODEL,SECONDARY_MODEL]:[REMOTE_MODEL,SECONDARY_MODEL];
    let loaded=null,lastError;
    for(const url of urls){
      try{loaded=await loadGLB(url);currentModelURL=url;break;}catch(e){lastError=e;console.warn('Model source unavailable:',url,e);}
    }
    if(!loaded)throw lastError||new Error('The 3D model could not be loaded.');
    if(sceneRoot)scene.remove(sceneRoot);
    sceneRoot=loaded.scene;scene.add(sceneRoot);
    // Adjust the original GLB's shared bone material without generating a
    // unique material for every anatomical mesh or altering paint overrides.
    finishSourceAnatomy(sceneRoot,surfaceMode);
    configureAnatomyShadows(sceneRoot,shadows.profile.enabled);
    if(teacherMode){
      // Teacher editing retains all systems for editing and publishing.
      await loadDigestiveModel();await loadDetailedDigestive();await loadCardiovascular();await loadRespiratory();await loadNervous();
    }else{
      await createDeferredCatalog();
      const start=studentProjectAtStartup.v===1?studentProjectAtStartup:studentProjectAtStartup.chapters[studentProjectAtStartup.start];
      const requirements=chapterAssets(start);
      if(requirements.legacyDigestive)await loadDigestiveModel();
      if(requirements.detailedDigestive)await loadDetailedDigestive();
      if(requirements.cardiovascular)await loadCardiovascular();
      if(requirements.respiratory)await loadRespiratory();
      if(requirements.nervous)await loadNervous();
    }
    prepareStructures(sceneRoot);
    if(!teacherMode){
      // The published schema has not changed; metadata-only meshes must
      // reproduce its exact original fingerprint. Fall back safely on older
      // atlas variants instead of assigning labels to incorrect structures.
      const sample=studentProjectAtStartup.v===1?studentProjectAtStartup:studentProjectAtStartup.chapters[0];
      if(!sceneModelCompatible(sample,structures.length,sceneFingerprint,legacyStructureCount,legacyFingerprint,baseStructureCount,baseFingerprint,previousStructureCount,previousFingerprint,preCardioStructureCount,preCardioFingerprint,originalCardioStructureCount,originalCardioFingerprint,structures)){
        console.warn('Deferred catalog differs from published lesson; verifying real anatomy files for backward compatibility.');
        await loadDigestiveModel();await loadDetailedDigestive();await loadCardiovascular();await loadRespiratory();await loadNervous();
        prepareStructures(sceneRoot);
      }
    }
    if(teacherMode||(skullGeometry==='detailed' && chapterAssets(studentProjectAtStartup.v===1?studentProjectAtStartup:studentProjectAtStartup.chapters[studentProjectAtStartup.start]).skull))await loadHighResolutionSkull();
    elements.loader.hidden=true;
    await initializeStudioScene();
    setStatus(teacherMode?'Studio ready':'Student view');
    elements.offlineButton.hidden=false;
    if(teacherMode)cacheOffline(); // Student offline prep is opt-in, never a hidden whole-lesson download.
    else elements.offlineButton.textContent='Save lesson offline';
  }catch(err){
    console.error(err);
    elements.loader.hidden=false;elements.loadTitle.textContent='Unable to open anatomy scene';
    elements.loadDesc.textContent=(!teacherMode&&sceneRoot)
      ? 'This lesson requires anatomy assets that could not be loaded. Check your connection or ask the teacher to verify their GitHub files.'
      : 'Check your internet connection for the first visit. The PWA can use its cached model offline afterward.';
    elements.loadText.textContent=String(err?.message||'3D model unavailable');
    elements.progress.style.width='0%';elements.retry.hidden=false;
    setStatus('Model unavailable','error');
  }
}

// Independent visibility toggles. Keep the camera, labels, colors, and hidden-mesh edits intact.
async function changeSystemLayer(system){
  if(!sceneRoot||studentAssetBusy||(!teacherMode&&!studentExplore))return;
  if(!teacherMode && (system==='digestive' || system==='cardiovascular'||system==='respiratory'||system==='nervous')){
    const type=system==='digestive'?'detailedDigestive':system==='respiratory'?'respiratory':system==='nervous'?'nervous':'cardiovascular';
    const active=system==='digestive'?systemLayers.digestive:system==='respiratory'?systemLayers.respiratory:system==='nervous'?systemLayers.nervous:systemLayers.cardiovascular;
    if(!active){
      studentAssetBusy=true;
      setStatus('Loading '+system+' model');
      try{await loadNeededAsset(type);}
      catch(error){showToast(error.message);setStatus('Student view');return;}
      finally{studentAssetBusy=false;}
      setStatus('Student view');
    }
  }
  let next;
  try{next=toggleAnatomySystem(mode,systemLayers,system,detailAvailable,cardioAvailable,respiratoryAvailable,nervousAvailable);}catch(e){showToast(e.message);return;}
  const priorCount=currentlyVisible().length;
  Object.assign(systemLayers,next);
  mode='systems'; // New scenes use independent layers; legacy presets are read-only compatibility modes.
  if(system==='digestive'&&systemLayers.digestive){detailEnabled=true;detailLayerExplicitlyChanged=true;}
  if(selected&&!layerEnabled(selected))setSelection(null);
  isolated=false;
  updateLayerHeading();
  updateSystemControls();
  refreshVisibility();
  // Frame the scene only when turning on the first system; otherwise don't move the camera.
  if(priorCount===0&&currentlyVisible().length)frameVisible(activePreset||'front');
}
for(const system of ['skeletal','muscular','digestive','cardiovascular','respiratory','nervous']){
  $('mode-'+system).addEventListener('click',()=>changeSystemLayer(system));
}
for(const [id,layer] of [['system-deep','deep'],['system-superficial','superficial']]){
  $(id).addEventListener('change',()=>{
    if(!teacherMode)return;
    Object.assign(systemLayers,effectiveSystemLayers(mode,systemLayers));
    mode='systems';
    systemLayers[layer]=$(id).checked;
    updateLayerHeading();updateSystemControls();refreshVisibility();
  });
}
$('settings-digestive-geometry').value=digestiveGeometry;
$('settings-cardio-geometry').value=cardioGeometry;
$('settings-respiratory-geometry').value=respiratoryGeometry;
$('settings-nervous-geometry').value=nervousGeometry;
$('settings-nervous-geometry').addEventListener('change',()=>{
 const next=$('settings-nervous-geometry').value==='detailed'?'detailed':'standard';
 if(next===nervousGeometry)return;
 if(teacherMode)saveDraft(false);
 nervousGeometry=next;try{localStorage.setItem(NERVOUS_QUALITY_KEY,next);}catch{}
 location.reload();
});
$('settings-respiratory-geometry').addEventListener('change',()=>{
 const next=$('settings-respiratory-geometry').value==='detailed'?'detailed':'standard';
 if(next===respiratoryGeometry)return;
 if(teacherMode)saveDraft(false);
 try{localStorage.setItem(RESP_QUALITY_KEY,next);}catch{}
 location.reload();
});
$('settings-skull-geometry').value=skullGeometry;
$('settings-skull-geometry').addEventListener('change',()=>{
  const next=$('settings-skull-geometry').value==='detailed'?'detailed':'standard';
  if(next===skullGeometry)return;
  if(teacherMode)saveDraft(false);
  try{setSkullGeometry(window.localStorage,next);}catch{}
  location.reload();
});
$('settings-cardio-geometry').addEventListener('change',()=>{
 const next=$('settings-cardio-geometry').value==='detailed'?'detailed':'standard';
 if(next===cardioGeometry)return;
 if(teacherMode)saveDraft(false);
 cardioGeometry=next;
 try{localStorage.setItem(CARDIO_QUALITY_KEY,next);}catch{}
 location.reload();
});
$('settings-digestive-geometry').addEventListener('change',()=>{
  const next=$('settings-digestive-geometry').value==='detailed'?'detailed':'standard';
  if(next===digestiveGeometry)return;
  // Preserve current work before reloading the renderer and its model assets.
  if(teacherMode)saveDraft(false);
  digestiveGeometry=next;
  try{localStorage.setItem(DIGESTIVE_QUALITY_KEY,next);}catch{}
  location.reload();
});
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
$('zoom-in').addEventListener('click',()=>{camera.position.lerp(controls.target,0.18);controls.update();invalidate(2);queueDraft();});
$('zoom-out').addEventListener('click',()=>{camera.position.sub(controls.target).multiplyScalar(1.22).add(controls.target);controls.update();invalidate(2);queueDraft();});
$('menu-toggle').addEventListener('click',()=>{openDetails(false);elements.sidebar.classList.toggle('open');});
elements.detailsToggle.addEventListener('click',()=>{elements.sidebar.classList.remove('open');openDetails(!elements.infoSidebar.classList.contains('open'));});
elements.retry.addEventListener('click',loadAnatomy);
window.addEventListener('keydown',event=>{if(event.key==='Escape'&&(placingLabel||paintMode)){if(placingLabel)cancelPlacing();if(paintMode)cancelPainting();return;}if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(event.key.toLowerCase()==='f')orient('front');if(event.key.toLowerCase()==='b')orient('back');if(event.key==='Escape'){isolated=false;setSelection(null);elements.sidebar.classList.remove('open');openDetails(false);}});

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
    registration.active?.postMessage({type,model:currentModelURL,renderer:window.__ANATOMY_RENDERER_SOURCE||'external',organs:teacherMode&&digestiveAvailable,detail:teacherMode&&detailAvailable,detailMode:digestiveGeometry,cardio:teacherMode&&cardioAvailable,cardioMode:cardioGeometry,skullDetail:skullGeometry==='detailed'&&Boolean(skullDetailStats?.upgraded),respiratory:teacherMode&&respiratoryAvailable,respiratoryMode:respiratoryGeometry,nervous:teacherMode&&nervousAvailable,nervousMode:nervousGeometry,lessonModels:!teacherMode?offlineLessonFiles(studentProjectAtStartup,{digestiveGeometry,cardioGeometry,skullGeometry,respiratoryGeometry,nervousGeometry}):[]});
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
  scheduleHistoryCommit();
  draftTimeout=setTimeout(()=>{
    saveDraft(false);
    if(libraryLessonId && lastLibrarySnapshot && hasUnsavedLibraryChanges())
      noteLibraryState('● Unsaved changes · File → Save to Library to update.');
  },650);
}
function snapshotScene(){
  if(!sceneRoot)throw new Error('Model not loaded.');
  const visible=structures.map(s=>cardioPreviewIDs&&s.system==='cardiovascular' ? layerEnabled(s)&&tissueVisible(s)&&!hidden.has(s.mesh) : s.mesh.visible);
  const pc=[...bonePaint.entries()].sort((a,b)=>a[0]-b[0]);
  return validateScene({
    v:1,m:mode,n:structures.length,f:sceneFingerprint,
    b:makeVisibilityBits(visible),t:$('scene-title').value.trim()||'Untitled anatomy scene',
    lm:$('student-label-mode').value,x:$('student-explore').checked,
    te:elements.teeth.checked,ca:elements.cartilage.checked,
    sb:systemLayers.skeletal,dm:systemLayers.deep,sm:systemLayers.superficial,dg:systemLayers.digestive,cv:systemLayers.cardiovascular,rs:systemLayers.respiratory,nv:systemLayers.nervous,ro:respiratoryOpacity,hd:detailEnabled && (mode==='digestive'||(mode==='systems' && systemLayers.digestive)),
    cam:(cardioPreviewCamera||[...camera.position.toArray(),...controls.target.toArray()]).map(n=>round(n,5)),
    labels:labels.map(l=>({s:l.s,p:l.p.map(n=>round(n,5)),t:l.t.trim(),dx:round(l.dx,1),dy:round(l.dy,1)})),
    ...(pc.length?{pc}:{})
  });
}
function updateHistoryButtons(){
  if(!teacherMode)return;
  $('edit-undo').disabled=!editHistory.canUndo;
  $('edit-redo').disabled=!editHistory.canRedo;
}
function commitHistory(){
  if(!teacherMode||applyingHistory||restoringScene||!sceneRoot)return;
  clearTimeout(historyTimeout);
  try{editHistory.record(JSON.stringify(snapshotProject()));updateHistoryButtons();}
  catch(err){console.warn('Could not record editor history:',err);}
}
function scheduleHistoryCommit(){
  if(!teacherMode||applyingHistory||restoringScene||!sceneRoot)return;
  clearTimeout(historyTimeout);
  historyTimeout=setTimeout(commitHistory,430);
}
function resetHistory(){
  clearTimeout(historyTimeout);
  if(teacherMode && sceneRoot){editHistory.reset(JSON.stringify(snapshotProject()));updateHistoryButtons();}
}
async function navigateHistory(direction){
  if(!teacherMode||!sceneRoot||applyingHistory)return;
  commitHistory();
  const target=direction==='undo'?editHistory.undo():editHistory.redo();
  if(!target)return;
  applyingHistory=true;
  clearTimeout(draftTimeout);clearTimeout(historyTimeout);cancelPlacing();cancelPainting();
  try{
    await loadProject(JSON.parse(target));
    saveDraft(false);
    noteLibraryState(libraryLessonId?'● Restored an earlier edit · Save to Library to keep it.':'Working draft edited · Save to Library to keep it.');
    showToast(direction==='undo'?'Edit undone.':'Edit redone.');
  }catch(error){
    showToast('Unable to restore edit: '+error.message);
  }finally{applyingHistory=false;updateHistoryButtons();}
}
function snapshotProject(){
  if (!sceneRoot) throw new Error('Model not loaded.');
  const current = snapshotScene();
  if (!chapters.length) chapters = [current];
  chapters[activeChapter] = current;
  return validateProject({v:2,t:$('project-title').value.trim()||current.t,start:activeChapter,chapters:chapters.map(c=>structuredClone(c)),sp:{...publishPermissions}});
}
function verifyProjectModel(project){
  const sample = project.v === 1 ? project : project.chapters[0];
  if(!sceneModelCompatible(sample,structures.length,sceneFingerprint,legacyStructureCount,legacyFingerprint,baseStructureCount,baseFingerprint,previousStructureCount,previousFingerprint,preCardioStructureCount,preCardioFingerprint,originalCardioStructureCount,originalCardioFingerprint,structures))
    throw new Error(sample?.m==='digestive'?'Digestive model unavailable. Upload models/anatomy-organs.glb and the local Draco decoder before opening this lesson.':'This lesson uses an incompatible anatomical model.');
}
function renderChapterUI(){
  const count=chapters.length;
  if(!count)return;
  const nav=$('chapter-nav');nav.hidden=count<2;
  $('chapter-count').textContent=`${count} chapter${count===1?'':'s'}`;
  $('chapter-progress').textContent=`CHAPTER ${activeChapter+1} OF ${count}`;
  $('previous-chapter').disabled=activeChapter===0;
  $('next-chapter').disabled=activeChapter===count-1;
  const tabs=$('chapter-tabs');tabs.replaceChildren();
  chapters.forEach((ch,i)=>{
    const b=document.createElement('button');b.type='button';b.className='chapter-tab'+(i===activeChapter?' active':'');
    b.textContent=ch.t;b.title=ch.t;b.setAttribute('aria-current',i===activeChapter?'step':'false');
    b.addEventListener('click',()=>switchChapter(i));tabs.append(b);
  });
  if(!teacherMode)return;
  const list=$('teacher-chapter-list');list.replaceChildren();
  chapters.forEach((ch,i)=>{
    const row=document.createElement('div');row.className='teacher-chapter-row'+(i===activeChapter?' active':'');
    const choose=document.createElement('button');choose.type='button';choose.className='chapter-choose';
    choose.textContent=`${i+1}. ${ch.t}`;choose.title=`Edit ${ch.t}`;
    choose.setAttribute('aria-current',i===activeChapter?'step':'false');choose.addEventListener('click',()=>switchChapter(i));
    row.append(choose);
    const up=document.createElement('button');up.type='button';up.textContent='↑';up.title='Move chapter up';up.setAttribute('aria-label',`Move ${ch.t} up`);up.disabled=i===0;
    up.addEventListener('click',()=>moveChapter(i,-1));row.append(up);
    const down=document.createElement('button');down.type='button';down.textContent='↓';down.title='Move chapter down';down.setAttribute('aria-label',`Move ${ch.t} down`);down.disabled=i===count-1;
    down.addEventListener('click',()=>moveChapter(i,1));row.append(down);
    const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.title='Delete chapter';remove.setAttribute('aria-label',`Delete ${ch.t}`);remove.disabled=count===1;
    remove.addEventListener('click',()=>deleteChapter(i));row.append(remove);
    list.append(row);
  });
  $('add-chapter').disabled=count>=MAX_CHAPTERS;
  $('duplicate-chapter').disabled=count>=MAX_CHAPTERS;
}
async function switchChapter(index){
  if(!sceneRoot || studentAssetBusy || index<0 || index>=chapters.length || index===activeChapter)return;
  if(teacherMode){try{chapters[activeChapter]=snapshotScene();}catch(error){showToast(error.message);return;}}
  clearTimeout(draftTimeout);cancelPlacing();cancelPainting();
  if(!teacherMode){
    studentAssetBusy=true;
    setStatus(`Loading chapter ${index+1}…`);
    try{await ensureChapterAssets(chapters[index]);}
    catch(error){showToast(error.message);setStatus('Student view');return;}
    finally{studentAssetBusy=false;}
  }
  activeChapter=index;
  await applyScene(chapters[activeChapter]);
  renderChapterUI();
  if(teacherMode)queueDraft();else setStatus('Student view');
}
function createChapter(duplicate){
  if(!teacherMode || !sceneRoot)return;
  if(chapters.length>=MAX_CHAPTERS){showToast(`Maximum ${MAX_CHAPTERS} chapters per lesson.`);return;}
  try{
    chapters[activeChapter]=snapshotScene();
    const fresh=structuredClone(chapters[activeChapter]);
    fresh.t=`Chapter ${chapters.length+1}`;
    if(!duplicate)fresh.labels=[];
    chapters.splice(activeChapter+1,0,fresh);
    clearTimeout(draftTimeout);cancelPlacing();cancelPainting();
    activeChapter++;
    applyScene(fresh).then(()=>{renderChapterUI();queueDraft();$('scene-title').focus();$('scene-title').select();showToast('Chapter added. Rename it and customize its view.');});
  }catch(error){showToast('Could not add chapter: '+error.message);}
}
function moveChapter(index,step){
  if(!teacherMode || index+step<0 || index+step>=chapters.length)return;
  try{chapters[activeChapter]=snapshotScene();}catch(error){showToast(error.message);return;}
  [chapters[index],chapters[index+step]]=[chapters[index+step],chapters[index]];
  if(activeChapter===index)activeChapter=index+step;
  else if(activeChapter===index+step)activeChapter=index;
  renderChapterUI();queueDraft();
}
async function deleteChapter(index){
  if(!teacherMode || chapters.length===1 || !confirm(`Delete chapter "${chapters[index].t}"? This removes its labels and bone settings from this draft.`))return;
  try{chapters[activeChapter]=snapshotScene();}catch(error){showToast(error.message);return;}
  chapters.splice(index,1);
  if(activeChapter>index)activeChapter--;
  else if(activeChapter===index)activeChapter=Math.min(index,chapters.length-1);
  await applyScene(chapters[activeChapter]);renderChapterUI();queueDraft();
}
function saveDraft(explicit=true){
  if(!teacherMode || !sceneRoot)return;
  try {
    localStorage.setItem(DRAFT_KEY,JSON.stringify(snapshotProject()));
    $('draft-status').textContent=explicit?'Draft saved on this Chromebook.':'Draft autosaved on this Chromebook.';
    if(explicit)showToast('Draft saved locally.');
  } catch(err) {$('draft-status').textContent='Could not save draft: '+err.message;}
}
// --- Local Scene Library (IndexedDB; separate from the autosaved working draft) ---
function noteLibraryState(message){
  $('library-status').textContent=message;
  $('menubar-context').textContent=message;
}
function hasUnsavedLibraryChanges(){
  if (!sceneRoot) return false;
  try{return JSON.stringify(snapshotProject()) !== lastLibrarySnapshot;}
  catch{return true;}
}
function protectCurrentEdits(action='open another lesson'){
  if (!hasUnsavedLibraryChanges()) return true;
  return confirm(`Your current lesson has changes that are not saved in the Scene Library. ${action.charAt(0).toUpperCase()+action.slice(1)} anyway?\n\nSelect Cancel, then use Save to Library to keep the latest edits. Your current autosaved draft is not a permanent library backup.`);
}
function triggerJSONDownload(data, filename){
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function safeFilename(name){return (name||'anatomy-lesson').replace(/[^a-z0-9_-]+/gi,'-').slice(0,50)||'anatomy-lesson';}
function formatLibraryDate(value){
  try {return new Date(value).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});}
  catch{return 'Date unavailable';}
}
function sceneMetrics(project){
  const parts=project.v===1?[project]:project.chapters;
  const labelCount=parts.reduce((sum,c)=>sum+c.labels.length,0);
  return `${parts.length} chapter${parts.length===1?'':'s'} · ${labelCount} label${labelCount===1?'':'s'}`;
}
function createLibraryButton(title, callback, extra=''){
  const b=document.createElement('button');b.type='button';b.className=`button small ${extra}`.trim();
  b.textContent=title;b.addEventListener('click',callback);return b;
}
function renderLibraryRows(){
  const query=$('library-search').value.trim().toLocaleLowerCase();
  const matches=libraryRows.filter(rec=>{
    const ch=rec.project.v===1?[rec.project]:rec.project.chapters;
    return [rec.title,...ch.map(c=>c.t)].some(t=>t.toLocaleLowerCase().includes(query));
  });
  $('library-count').textContent=`${libraryRows.length} saved lesson${libraryRows.length===1?'':'s'}${query?` · ${matches.length} matching`:''}`;
  const container=$('library-items');container.replaceChildren();
  if(!matches.length){
    const el=document.createElement('div');el.className='library-empty';
    el.textContent=libraryRows.length?'No lessons match this search.':'Your library is empty. Customize a lesson and choose Save to Library.';
    container.append(el);return;
  }
  for(const rec of matches){
    const item=document.createElement('div');item.className='library-item'+(rec.id===libraryLessonId?' library-item-current':'');
    const info=document.createElement('div');info.className='library-item-info';
    const name=document.createElement('div');name.className='library-item-title';name.textContent=rec.title;
    const detail=document.createElement('div');detail.className='library-item-subtitle';
    detail.textContent=`${sceneMetrics(rec.project)} · Updated ${formatLibraryDate(rec.updatedAt)}${rec.id===libraryLessonId?' · Currently editing':''}`;
    info.append(name,detail);
    const controls=document.createElement('div');controls.className='library-item-buttons';
    controls.append(
      createLibraryButton('Open',()=>openLibraryLesson(rec.id),'primary'),
      createLibraryButton('Duplicate',()=>duplicateLibraryLesson(rec.id)),
      createLibraryButton('Export',()=>{triggerJSONDownload(rec.project,safeFilename(rec.title)+'.json');showToast('Lesson JSON downloaded.');},'subtle'),
      createLibraryButton('Delete',()=>removeLibraryLesson(rec),'library-delete')
    );
    item.append(info,controls);container.append(item);
  }
}
async function refreshLibrary(){
  libraryRows=await listLessons();renderLibraryRows();
}
async function openLibrary(){
  if(!teacherMode)return;
  $('library-dialog').hidden=false;
  $('library-message').textContent='';
  try{await refreshLibrary();}catch(err){$('library-message').textContent=err.message;showToast(err.message);}
  $('library-search').focus();
}
function closeLibrary(){$('library-dialog').hidden=true;}
async function saveToLibrary(asNew=false){
  if(!teacherMode || !sceneRoot || libraryBusy)return;
  libraryBusy=true;
  const buttons=[$('save-library'),$('save-library-as')];buttons.forEach(b=>b.disabled=true);
  try{
    const project=snapshotProject();
    const record=await saveLesson(project,asNew?null:libraryLessonId);
    libraryLessonId=record.id;lastLibrarySnapshot=JSON.stringify(record.project);
    saveDraft(false);
    noteLibraryState(`✓ Saved: ${record.title} · ${formatLibraryDate(record.updatedAt)}`);
    showToast(asNew?'Saved as a new library lesson.':'Lesson saved in your local library.');
    if(!$('library-dialog').hidden) await refreshLibrary();
    if(openMenuName==='library') await refreshMenuLibrary();
  }catch(error){noteLibraryState('Save failed: '+error.message);showToast('Could not save to library: '+error.message);}
  finally{libraryBusy=false;buttons.forEach(b=>b.disabled=false);}
}
async function openLibraryLesson(id){
  if(libraryBusy || !sceneRoot)return showToast('Finish loading the 3D model before opening a lesson.');
  if(id===libraryLessonId && !hasUnsavedLibraryChanges()){closeLibrary();return;}
  if(id!==libraryLessonId && !protectCurrentEdits('open this saved lesson'))return;
  libraryBusy=true;
  try{
    const record=await getLesson(id);
    if(!record)throw new Error('This lesson is no longer in the library.');
    verifyProjectModel(record.project); // Don't discard current state for incompatible model.
    clearTimeout(draftTimeout);cancelPlacing();cancelPainting();
    await loadProject(structuredClone(record.project));
    resetHistory();
    libraryLessonId=id;lastLibrarySnapshot=JSON.stringify(record.project);
    noteLibraryState(`✓ Editing: ${record.title} · Saved ${formatLibraryDate(record.updatedAt)}`);
    saveDraft(false);closeLibrary();showToast(`Opened ${record.title}`);
  }catch(err){showToast('Could not open lesson: '+err.message);}
  finally{libraryBusy=false;}
}
async function duplicateLibraryLesson(id){
  if(libraryBusy)return;
  libraryBusy=true;
  try{
    const old=await getLesson(id);if(!old)throw new Error('Original lesson not found.');
    const project=structuredClone(old.project);
    const newTitle=(old.title.slice(0,83)+' (copy)').slice(0,90);
    project.t=newTitle;
    const record=await saveLesson(project,null);
    $('library-message').textContent=`Created a copy of “${old.title}”.`;
    await refreshLibrary();showToast(`Duplicated as ${record.title}`);
  }catch(err){showToast('Could not duplicate lesson: '+err.message);}
  finally{libraryBusy=false;}
}
async function removeLibraryLesson(rec){
  if(libraryBusy || !confirm(`Delete “${rec.title}” from the Scene Library?\n\nThis cannot be undone unless you have a JSON backup. Already-shared student links will still work.`))return;
  libraryBusy=true;
  try{
    await deleteLesson(rec.id);
    if(rec.id===libraryLessonId){libraryLessonId=null;lastLibrarySnapshot=null;noteLibraryState('Removed from library. Your open working draft remains editable.');}
    await refreshLibrary();showToast('Lesson removed from local library.');
  }catch(err){showToast('Could not delete lesson: '+err.message);}
  finally{libraryBusy=false;}
}
$('library-open-top').addEventListener('click',openLibrary);
$('library-close').addEventListener('click',closeLibrary);
$('library-dialog').addEventListener('click',e=>{if(e.target===$('library-dialog'))closeLibrary();});
$('library-search').addEventListener('input',renderLibraryRows);
$('save-library').addEventListener('click',()=>saveToLibrary(false));
$('save-library-as').addEventListener('click',()=>saveToLibrary(true));
$('library-backup').addEventListener('click',async()=>{
  try{
    const all=await listLessons();if(!all.length)return showToast('Save a lesson before exporting your library.');
    triggerJSONDownload(prepareBackup(all),`anatomy-studio-library-${new Date().toISOString().slice(0,10)}.json`);
    $('library-message').textContent=`Exported ${all.length} saved lessons.`;
  }catch(err){showToast('Library backup failed: '+err.message);}
});
$('library-import').addEventListener('click',()=>$('library-import-file').click());
$('library-import-file').addEventListener('change',async()=>{
  const file=$('library-import-file').files?.[0];if(!file)return;
  try{
    if(file.size>16*1024*1024)throw new Error('Backup is larger than 16 MB.');
    const projects=parseBackup(await file.text());
    if(!projects.length)return showToast('This backup contains no lessons.');
    const imported=await restoreBackup(projects);
    await refreshLibrary();
    $('library-message').textContent=`Imported ${imported.length} lessons as new copies.`;
    showToast(`Added ${imported.length} lessons to your library.`);
  }catch(err){showToast('Import failed: '+err.message);}
  finally{$('library-import-file').value='';}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape' && !$('library-dialog').hidden){e.stopPropagation();closeLibrary();}
});

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
    marker.setAttribute('aria-label',!teacherMode && labelMode==='hidden' ? `Annotation ${i+1} hidden` : `Anatomical annotation ${i+1}: ${label.t}`);
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
  // The scene renderer already updates matrices; avoid a second full traversal
  // of hundreds of muscle meshes for each annotation refresh.
  const width=stageWidth,height=stageHeight;
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
    const x=(at.x+1)*width/2,y=(1-at.y)*height/2;
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
  if(cardioPreviewIDs)endCardioPreview();
  validateScene(saved);
  if(!sceneModelCompatible(saved,structures.length,sceneFingerprint,legacyStructureCount,legacyFingerprint,baseStructureCount,baseFingerprint,previousStructureCount,previousFingerprint,preCardioStructureCount,preCardioFingerprint,originalCardioStructureCount,originalCardioFingerprint,structures)){
    throw new Error(saved?.m==='digestive'?'This digestive scene requires the locally hosted digestive GLB and Draco decoder.':'The anatomical model has changed since this scene was published.');
  }
  restoringScene=true;
  try{
    systemLayers.skeletal=saved.sb ?? true;
    systemLayers.deep=saved.dm ?? false;
    systemLayers.superficial=saved.sm ?? true;
    systemLayers.digestive=saved.dg ?? false;
    systemLayers.cardiovascular=saved.cv ?? false;
    systemLayers.respiratory=saved.rs ?? false;
    systemLayers.nervous=saved.nv ?? false;
    respiratoryOpacity=saved.ro ?? 1;
    applyRespiratoryOpacity();
    if(systemLayers.respiratory&&!respiratoryAvailable)throw new Error('This lesson requires respiratory-standard.glb and respiratory-structures.json.');
    if(systemLayers.nervous&&!nervousAvailable)throw new Error('This lesson requires nervous-standard.glb and nervous-structures.json.');
    if(systemLayers.cardiovascular&&!cardioAvailable)throw new Error('This lesson needs the locally hosted cardiovascular GLB and metadata.');
    detailEnabled=Boolean(saved.hd);
    if(detailEnabled&&!detailAvailable && (saved.m==='digestive'||saved.m==='systems'&&saved.dg))throw new Error('This lesson requires the detailed digestive assets: models/digestive-standard.glb and digestive-structures.json. Ask the teacher to upload the generated files.');
    setMode(saved.m);
    elements.teeth.checked=saved.te;
    elements.cartilage.checked=saved.ca;
    $('scene-title').value=saved.t;
    $('student-label-mode').value=saved.lm;
    $('student-explore').checked=saved.x;
    labelMode=saved.lm;
    studentExplore=teacherMode ? saved.x : (studentPermissions.ex && saved.x || studentPermissions.ex);
    if(!teacherMode && !studentPermissions.sl)labelMode='hidden';
    document.body.classList.toggle('student-explore-enabled',!teacherMode&&studentExplore);
    isolated=false;
    hidden.clear();
    restoreBonePaint(saved.pc||[]);
    const visible=readVisibilityBits(saved.b,saved.n);
    structures.forEach((s,i)=>{
      // Older scenes may lack muscles or organs; new indices stay hidden unless enabled.
      if(i>=saved.n)return;
      if(!visible[i] && layerEnabled(s) && (s.tissue!=='tooth'||saved.te) && (s.tissue!=='cartilage'||saved.ca))hidden.add(s.mesh);
    });
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
async function loadProject(data){
  const project=validateProject(data);
  verifyProjectModel(project);
  // v1 scene links and v1 saved drafts are automatically treated as one-chapter lessons.
  chapters=(project.v===1?[project]:project.chapters).map(ch=>upgradeLegacyScene(ch,structures.length,sceneFingerprint));
  activeChapter=project.v===1?0:project.start;
  publishPermissions=project.v===2 && project.sp ? {...project.sp} : {...STUDY_PERMISSIONS};
  if(!teacherMode)studentPermissions={...publishPermissions};
  $('project-title').value=project.t;
  await applyScene(chapters[activeChapter]);
  renderChapterUI();
  if(!teacherMode)applyStudentPermissions();
  document.title=project.t+' • Anatomy Studio';
}
async function initializeStudioScene(){
  if(!teacherMode){
    const fragment=location.hash.slice('#scene='.length);
    await loadProject(await decodeScene(fragment));
  }else{
    const draft=localStorage.getItem(DRAFT_KEY)||localStorage.getItem(OLD_DRAFT_KEY);
    if(draft){
      try{
        await loadProject(JSON.parse(draft));
        $('draft-status').textContent='Restored your last locally saved lesson.';
        if(!localStorage.getItem(DRAFT_KEY))saveDraft(false);
      }catch(err){
        console.warn('Ignoring outdated local draft:',err);setMode(mode);
        $('draft-status').textContent='Saved draft could not be restored; a new lesson is ready.';
      }
    }else setMode(mode);
    if(!chapters.length){chapters=[snapshotScene()];activeChapter=0;}
    renderChapterUI();renderLabelEditor();resetHistory();
  }
}
// --- Publishing: one link with explicit lesson-wide student permissions. ---
const PUBLISH_KEYS={ss:'publish-search',st:'publish-tree',sn:'publish-names',sl:'publish-labels',ex:'publish-explore'};
let embedLink='';
function showPublishPermissions(permissions){
  validatePermissions(permissions);
  for(const [key,id] of Object.entries(PUBLISH_KEYS))$(id).checked=permissions[key];
  const exact=(preset)=>Object.keys(PUBLISH_KEYS).every(k=>permissions[k]===preset[k]);
  $('publish-preset').value=exact(STUDY_PERMISSIONS)?'study':exact(EXAM_PERMISSIONS)?'exam':'custom';
}
function currentPublishPermissions(){
  return validatePermissions(Object.fromEntries(Object.entries(PUBLISH_KEYS).map(([key,id])=>[key,$(id).checked])));
}
$('publish-preset').addEventListener('change',()=>{
  const choice=$('publish-preset').value;
  if(choice==='study')showPublishPermissions(STUDY_PERMISSIONS);
  if(choice==='exam')showPublishPermissions(EXAM_PERMISSIONS);
  $('publish-results').hidden=true;
});
for(const id of Object.values(PUBLISH_KEYS))$(id).addEventListener('change',()=>{
  $('publish-preset').value='custom';$('publish-results').hidden=true;
});
function publishScene(){
  if(!teacherMode || !sceneRoot)return;
  showPublishPermissions(publishPermissions);
  $('publish-results').hidden=true;
  $('share-feedback').textContent='Choose student controls and click Generate student links.';
  $('share-dialog').hidden=false;
  $('publish-preset').focus();
}
async function generateStudentLink(){
  if(!teacherMode || !sceneRoot)return;
  const button=$('generate-student-link');button.disabled=true;button.textContent='Preparing links…';
  try{
    publishPermissions={...currentPublishPermissions()};
    const encoded=await encodeScene(snapshotProject());
    const base=new URL(location.href);base.search='';base.hash='scene='+encoded;
    sharedLink=base.href;
    base.searchParams.set('embed','1');embedLink=base.href;
    const escaped=embedLink.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
    $('share-url').value=sharedLink;
    $('embed-url').value=embedLink;
    $('iframe-code').value=`<iframe src="${escaped}" title="Anatomy Studio interactive 3D lesson" loading="lazy" style="width:100%;height:640px;border:0;display:block" allowfullscreen></iframe>`;
    $('publish-results').hidden=false;
    $('share-feedback').textContent=embedLink.length>2000
      ? `Links created (${embedLink.length.toLocaleString()} characters). Schoology may reject unusually long links; test the actual Schoology student view.`
      : 'Student link, Schoology link, and iframe HTML are ready.';
    saveDraft(false);
  }catch(err){$('share-feedback').textContent='Could not generate link: '+err.message;}
  finally{button.disabled=false;button.textContent='Generate student links & embed code';}
}
$('publish-open').addEventListener('click',publishScene);
$('generate-student-link').addEventListener('click',generateStudentLink);
$('close-dialog').addEventListener('click',()=>$('share-dialog').hidden=true);
$('share-dialog').addEventListener('click',ev=>{if(ev.target===$('share-dialog'))$('share-dialog').hidden=true;});
async function copyPublishValue(inputId,label){
  const value=$(inputId).value;if(!value)return;
  try {await navigator.clipboard.writeText(value);$('share-feedback').textContent=`✓ ${label} copied.`;}
  catch {$(inputId).focus();$(inputId).select();$('share-feedback').textContent='Select the highlighted text and copy it.';}
}
$('copy-url').addEventListener('click',()=>copyPublishValue('share-url','Student link'));
$('copy-embed-url').addEventListener('click',()=>copyPublishValue('embed-url','Schoology link'));
$('copy-iframe').addEventListener('click',()=>copyPublishValue('iframe-code','iframe HTML'));
$('preview-url').addEventListener('click',()=>{if(sharedLink)window.open(sharedLink,'_blank','noopener');});
$('preview-embed').addEventListener('click',()=>{if(embedLink)window.open(embedLink,'_blank','noopener');});
$('place-label').addEventListener('click',()=>{
  if(!teacherMode || !sceneRoot)return;
  if(paintMode)cancelPainting();
  if(placingLabel){cancelPlacing();return;}
  if(!$('new-label-text').value.trim()){showToast('Enter label text before placing it.');$('new-label-text').focus();return;}
  if(labels.length>=64){showToast('Maximum 64 annotations per scene.');return;}
  placingLabel=true;openDetails(false);
  $('place-label').textContent='Cancel placing label';$('place-label').classList.add('placing');
  $('place-hint').hidden=false;elements.stage.style.cursor='crosshair';
});
// Teacher paint brush: one click colors a complete anatomical mesh (not surface pixels).
$('paint-color').addEventListener('input',event=>{
  paintColor=event.target.value.toLowerCase();$('paint-hex').textContent=paintColor.toUpperCase();updatePaintControls();
});
for(const swatch of document.querySelectorAll('.paint-swatch'))swatch.addEventListener('click',()=>{
  paintColor=swatch.dataset.color;$('paint-color').value=paintColor;
  $('paint-hex').textContent=paintColor.toUpperCase();updatePaintControls();
});
$('paint-mode').addEventListener('click',()=>{
  if(!teacherMode||!sceneRoot)return;
  if(placingLabel)cancelPlacing();
  paintMode=!paintMode;
  $('place-hint').textContent=paintMode?'PAINT: Click a structure to color its entire mesh. Esc exits Paint mode.':'Click the structure where you want the label to point. Esc cancels.';
  $('place-hint').hidden=!paintMode;
  elements.stage.style.cursor=paintMode?'crosshair':'';
  openDetails(false);updatePaintControls();
});
$('paint-selected').addEventListener('click',()=>setBoneColor(selected,paintColor));
$('erase-selected').addEventListener('click',()=>setBoneColor(selected,null));
$('erase-all').addEventListener('click',()=>{
  if(!teacherMode||!bonePaint.size||!confirm(`Reset colors on all ${bonePaint.size} painted bones in this chapter?`))return;
  restoreBonePaint([]);renderList();queueDraft();showToast('Restored original colors in this chapter.');
});
$('scene-title').addEventListener('input',()=>{if(chapters.length){chapters[activeChapter].t=$('scene-title').value||'Untitled chapter';renderChapterUI();}queueDraft();});
$('project-title').addEventListener('input',queueDraft);
$('previous-chapter').addEventListener('click',()=>switchChapter(activeChapter-1));
$('next-chapter').addEventListener('click',()=>switchChapter(activeChapter+1));
$('add-chapter').addEventListener('click',()=>createChapter(false));
$('duplicate-chapter').addEventListener('click',()=>createChapter(true));
$('student-label-mode').addEventListener('change',()=>{labelMode=$('student-label-mode').value;queueDraft();});
$('student-explore').addEventListener('change',()=>{studentExplore=$('student-explore').checked;queueDraft();});
// Current working lesson continues to autosave as a draft in localStorage.
$('new-project').addEventListener('click',()=>{
  if(!protectCurrentEdits('start a new lesson'))return;
  clearTimeout(draftTimeout);cancelPlacing();cancelPainting();
  restoreBonePaint([]);
  libraryLessonId=null;lastLibrarySnapshot=null;noteLibraryState('Not yet saved to the library.');
  chapters=[];activeChapter=0;
  publishPermissions={...STUDY_PERMISSIONS};labels=[];labelMode='shown';studentExplore=false;$('student-label-mode').value=labelMode;$('student-explore').checked=false;
  $('project-title').value='Skull exploration';$('scene-title').value='Skull: Exterior';
  Object.assign(systemLayers,{skeletal:true,deep:false,superficial:true,digestive:false,cardiovascular:false});
  elements.teeth.checked=true;elements.cartilage.checked=true;setMode('skull');
  renderAnnotations();renderLabelEditor();chapters=[snapshotScene()];renderChapterUI();saveDraft(false);resetHistory();
});
$('export-project').addEventListener('click',()=>{
  try{
    const project=JSON.stringify(snapshotProject(),null,2);
    const blob=new Blob([project],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;
    a.download=($('project-title').value.trim().replace(/[^a-z0-9_-]+/gi,'-').slice(0,50)||'anatomy-lesson')+'.json';
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(err){showToast('Export failed: '+err.message);}
});
$('import-project').addEventListener('click',()=>$('import-file').click());
$('import-file').addEventListener('change',async()=>{
  const file=$('import-file').files?.[0];if(!file)return;
  try{
    if(file.size>160000)throw new Error('JSON lesson is too large.');
    const data=JSON.parse(await file.text());verifyProjectModel(validateProject(data));
    if(!protectCurrentEdits('import this lesson'))return;
    await loadProject(data);libraryLessonId=null;lastLibrarySnapshot=null;noteLibraryState('Imported lesson — use Save to Library to keep it.');
    saveDraft(false);resetHistory();showToast('Lesson imported with all chapters.');
  }catch(err){showToast('Could not import scene: '+err.message);}
  finally{$('import-file').value='';}
});

// --- Chromebook-friendly desktop menu bar ---
function closeStudioMenus(returnFocus=false){
  if(!teacherMode)return;
  const last=openMenuName;
  openMenuName=null;
  for(const group of document.querySelectorAll('.studio-menubar .menu-group')){
    const isOpen=false;
    group.classList.toggle('is-open',isOpen);
    const trigger=group.querySelector('.menu-trigger');
    trigger.setAttribute('aria-expanded','false');
    group.querySelector('.menu-dropdown').hidden=true;
    if(returnFocus && group.dataset.menu===last)trigger.focus();
  }
}
async function refreshMenuLibrary(){
  if(!teacherMode)return;
  const id=++menuRequestId;
  const target=$('menu-library-items');
  target.replaceChildren();
  const waiting=document.createElement('span');waiting.className='menu-empty';waiting.textContent='Loading saved scenes…';target.append(waiting);
  try{
    const entries=await listLessons();
    if(id!==menuRequestId || openMenuName!=='library')return;
    target.replaceChildren();
    if(!entries.length){
      const blank=document.createElement('span');blank.className='menu-empty';blank.textContent='No saved scenes yet. Use File → Save to Library.';
      target.append(blank);return;
    }
    for(const rec of entries.slice(0,12)){
      const button=document.createElement('button');button.type='button';button.className='menu-item menu-scene';button.setAttribute('role','menuitem');
      const title=document.createElement('span');title.textContent=rec.title;title.className='menu-scene-title';
      const meta=document.createElement('span');meta.textContent=sceneMetrics(rec.project);meta.className='menu-scene-meta';
      button.append(title,meta);
      if(rec.id===libraryLessonId)button.classList.add('current');
      button.addEventListener('click',()=>{closeStudioMenus();openLibraryLesson(rec.id);});
      target.append(button);
    }
    if(entries.length>12){const note=document.createElement('span');note.className='menu-empty';note.textContent=`+ ${entries.length-12} more — Open Scene Library to browse all`;target.append(note);}
  }catch(err){
    if(id!==menuRequestId)return;
    target.replaceChildren();const error=document.createElement('span');error.className='menu-empty';error.textContent='Cannot read local library: '+err.message;target.append(error);
  }
}
function showMenu(name,focusFirst=false){
  if(!teacherMode)return;
  closeStudioMenus();
  const group=document.querySelector(`.studio-menubar .menu-group[data-menu="${name}"]`);
  if(!group)return;
  openMenuName=name;
  group.classList.add('is-open');
  group.querySelector('.menu-trigger').setAttribute('aria-expanded','true');
  const dropdown=group.querySelector('.menu-dropdown');dropdown.hidden=false;
  if(focusFirst){dropdown.querySelector('.menu-item:not([disabled])')?.focus();}
  if(name==='library')refreshMenuLibrary();
}
const menuGroups=[...document.querySelectorAll('.studio-menubar .menu-group')];
menuGroups.forEach((group,index)=>{
  const trigger=group.querySelector('.menu-trigger');
  trigger.addEventListener('click',()=>openMenuName===group.dataset.menu?closeStudioMenus():showMenu(group.dataset.menu));
  trigger.addEventListener('keydown',event=>{
    if(event.key==='ArrowDown'){event.preventDefault();showMenu(group.dataset.menu,true);}
    if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
      event.preventDefault();const next=menuGroups[(index+(event.key==='ArrowRight'?1:-1)+menuGroups.length)%menuGroups.length];
      showMenu(next.dataset.menu);next.querySelector('.menu-trigger').focus();
    }
  });
  group.querySelector('.menu-dropdown').addEventListener('keydown',event=>{
    const items=[...group.querySelectorAll('.menu-item:not([disabled])')];const current=items.indexOf(document.activeElement);
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault();items[(current+(event.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();
    }
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeStudioMenus(true);}
  });
});
function applyCardioStudyPreset(preset){
  endCardioPreview(false);
  if(!teacherMode||!sceneRoot||!cardioAvailable)return;
  if(!cardioCanApply(cardioEntries,preset)){
    showToast('This view requires structures not present in your current cardiovascular dataset.');
    return;
  }
  // Never touch bone, muscle or digestive visibility. Teacher can save this
  // filtered cardiovascular layer as a chapter and share it with students.
  systemLayers.cardiovascular=true;
  if(mode!=='systems')mode='systems';
  for(const s of cardioEntries){
    if(cardioVisibleInPreset(s,preset))hidden.delete(s.mesh);
    else hidden.add(s.mesh);
  }
  isolated=false;
  setSelection(null);
  updateLayerHeading();updateSystemControls();refreshVisibility();
  showToast(CARDIO_PRESETS[preset]+' applied to current chapter');
}
for(const button of document.querySelectorAll('[data-cardio-preset]')){
  button.addEventListener('click',()=>applyCardioStudyPreset(button.dataset.cardioPreset));
}
function applyRespiratoryPreset(preset){
 if(!teacherMode||!respiratoryAvailable||!RESPIRATORY_PRESETS[preset])return;
 if(preset==='circulation'&&!cardioAvailable){showToast('Load cardiovascular models to display pulmonary circulation.');return;}
 mode='systems';systemLayers.respiratory=true;
 systemLayers.skeletal=false;systemLayers.deep=false;systemLayers.superficial=false;systemLayers.digestive=false;
 systemLayers.cardiovascular=preset==='circulation';
 respiratoryOpacity=preset==='circulation'?0.3:1;
 applyRespiratoryOpacity();
 for(const s of respiratoryEntriesList){if(respiratoryVisibleInPreset(s,preset))hidden.delete(s.mesh);else hidden.add(s.mesh);}
 for(const s of cardioEntries){
  const heartContext=/^Wall of (?:ventricle|left atrium|right atrium)$/i.test(s.name);
  if(preset==='circulation'&&(pulmonaryOverlayVisible(s)||heartContext))hidden.delete(s.mesh);else hidden.add(s.mesh);
 }
 isolated=false;setSelection(null);
 updateLayerHeading();updateSystemControls();refreshVisibility();frameVisible('front');queueDraft();
 showToast(RESPIRATORY_PRESETS[preset]+' applied');
}
for(const button of document.querySelectorAll('[data-respiratory-preset]'))button.addEventListener('click',()=>applyRespiratoryPreset(button.dataset.respiratoryPreset));
function applyNervousPreset(preset){
 if(!teacherMode||!nervousAvailable||!NERVOUS_PRESETS[preset])return;
 if(mode!=='systems')mode='systems';
 systemLayers.nervous=true;
 for(const s of nervousEntriesList){
   if(nervousVisibleInPreset(s,preset))hidden.delete(s.mesh);else hidden.add(s.mesh);
 }
 isolated=false;setSelection(null);
 updateLayerHeading();updateSystemControls();refreshVisibility();frameVisible('front');queueDraft();
 showToast(NERVOUS_PRESETS[preset]+' applied');
}
for(const button of document.querySelectorAll('[data-nervous-preset]'))button.addEventListener('click',()=>applyNervousPreset(button.dataset.nervousPreset));
$('nervous-focus').addEventListener('click',()=>{
 if(!teacherMode||!nervousAvailable)return;
 Object.assign(systemLayers,{skeletal:false,superficial:false,deep:false,digestive:false,cardiovascular:false,respiratory:false,nervous:true});
 mode='systems';
 for(const s of nervousEntriesList)hidden.delete(s.mesh);
 isolated=false;setSelection(null);updateLayerHeading();updateSystemControls();refreshVisibility();frameVisible('front');queueDraft();
});

$('respiratory-opacity').addEventListener('input',event=>{
 respiratoryOpacity=Number(event.target.value);applyRespiratoryOpacity();queueDraft();
});
$('respiratory-coverage-export').addEventListener('click',()=>{
 const data=respiratoryCoverage(respiratoryEntriesList,cardioEntries);
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
 const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download='respiratory-pulmonary-coverage.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
});
$('studio-menubar').addEventListener('click',event=>{
  const action=event.target.closest('.menu-item');
  if(!action)return;
  const targetId=action.dataset.menuClick;
  const view=action.dataset.menuView;
  const anatomyPreset=action.dataset.anatomyPreset;
  const cardiacPreset=action.dataset.menuCardiac;
  if(targetId){
    const target=$(targetId);
    if(target && !target.disabled)target.click();
  }
  if(view)orient(view);
  if(cardiacPreset && teacherMode)applyCardioStudyPreset(cardiacPreset);
  if(anatomyPreset && teacherMode){
    Object.assign(systemLayers,{skeletal:true,superficial:false,deep:false,digestive:false,cardiovascular:false,respiratory:false,nervous:false});
    setMode(anatomyPreset);
  }
  closeStudioMenus();
});
document.addEventListener('pointerdown',event=>{
  if(openMenuName && !event.target.closest('#studio-menubar'))closeStudioMenus();
});
$('save-draft-action').addEventListener('click',()=>saveDraft(true));
$('edit-undo').addEventListener('click',()=>navigateHistory('undo'));
$('edit-redo').addEventListener('click',()=>navigateHistory('redo'));
// --- Self-hosted App Settings and version checks (also work without loading the anatomy model) ---
const APP_VERSION_URL = './version.json';
const LOCAL_ASSETS = [
  ['./vendor/three/build/three.module.js','Three.js core'],
  ['./vendor/three/examples/jsm/controls/OrbitControls.js','OrbitControls'],
  ['./vendor/three/examples/jsm/loaders/GLTFLoader.js','GLTFLoader'],
  ['./models/ecorche.glb','Écorché model'],
  // High-resolution skull GLB is optional and checked separately in Settings.
  ['./models/anatomy-organs.glb','Legacy scene compatibility'],
  ['./vendor/three/examples/jsm/loaders/DRACOLoader.js','Draco loader'],
  ['./vendor/three/examples/jsm/libs/draco/gltf/draco_decoder.wasm','Draco decoder']
];
let updateAvailable = false;
function displayLocalAssetName(url){
  return new URL(url,location.href).origin===location.origin ? 'Locally hosted' : 'External fallback';
}
async function checkLocalAssets(){
  const display=$('settings-assets');
  display.textContent='Checking…';
  const statuses=await Promise.all(LOCAL_ASSETS.map(async ([path,label])=>{
    try {
      const result=await fetch(path,{method:'HEAD',cache:'no-store'});
      return {label,ok:result.ok && !/text\/html/i.test(result.headers.get('content-type')||'')};
    } catch {return {label,ok:false};}
  }));
  const missing=statuses.filter(x=>!x.ok).map(x=>x.label);
  display.textContent=missing.length ? `${statuses.length-missing.length}/${statuses.length} present — missing: ${missing.join(', ')}` : 'All main assets hosted locally';
  display.classList.toggle('status-success',missing.length===0);
  $('settings-renderer').textContent=window.__ANATOMY_RENDERER_SOURCE==='local'?'Local Three.js 0.169.0':'CDN fallback (Three.js 0.169.0)';
  $('settings-model').textContent=sceneRoot ? displayLocalAssetName(currentModelURL) : 'Not loaded';
  $('settings-skull').textContent=skullGeometry==='detailed'
    ? (skullDetailStats?.upgraded ? `Experimental: ${skullDetailStats.upgraded} skull bones upgraded; original jaw/teeth retained` : `Experimental not active: ${skullDetailStats?.error||'no safely matched replacement bones'}`)
    : 'Standard Écorché geometry (recommended)';
  $('settings-skull').title=skullDetailStats?.skipped?.join('; ')||'';
  $('settings-cardio').textContent=cardioLoadError?`Load failed: ${cardioLoadError}`:cardioAvailable?`${cardioEntries.length} heart and vessel meshes (${cardioGeometry}${!teacherMode&&!cardioLoaded?'; loads when needed':''})`:'Not installed — check cardiovascular manifest and model files';
  $('settings-organs').textContent=detailAvailable?`${detailEntries.length} detailed structures (${digestiveGeometry}; A/P orientation corrected${!teacherMode&&!detailLoaded?'; loads when needed':''})`:digestiveAvailable?'Legacy organ geometry only (install detailed assets)':'Detailed digestive files missing';
}
function openAppSettings(){
  $('settings-dialog').hidden=false;
  $('settings-skull-geometry').value=skullGeometry;
  $('settings-nervous-geometry').value=nervousGeometry;
  $('settings-installed').textContent=APP_VERSION;
  $('settings-render-quality').value=renderProfile.requested;
  $('settings-surface-lighting').value=surfaceMode;
  $('settings-shadow-mode').value=shadowMode;
  $('settings-shadow-explanation').textContent=shadows.profile.enabled?`Active — ${shadows.profile.description}`:'Off — no extra shadow-map rendering';
  $('settings-quality-explanation').textContent=`${renderProfile.effective[0].toUpperCase()+renderProfile.effective.slice(1)} mode · ${cappedPixelRatio(window.devicePixelRatio,renderProfile.dprCap).toFixed(2)}x resolution · rendering only when the view changes`;
  $('settings-performance-stats').textContent=sceneRoot ? `${currentlyVisible().length} visible structures · ${renderer.info.render.calls} draw calls in last rendered frame` : 'Model not loaded';
  $('settings-reload').hidden=!updateAvailable;
  checkLocalAssets().catch(e=>{$('settings-assets').textContent='Could not verify local files';console.warn(e);});
  $('settings-close').focus();
}
function closeAppSettings(){$('settings-dialog').hidden=true;}
function compareVersions(a,b){
  const A=String(a).split('.').map(n=>Number(n)||0),B=String(b).split('.').map(n=>Number(n)||0);
  for(let i=0;i<3;i++)if((A[i]||0)!==(B[i]||0))return (A[i]||0)-(B[i]||0);
  return 0;
}
async function checkAppUpdates(){
  const status=$('settings-check-result');
  const button=$('settings-check-updates');
  openAppSettings();
  status.textContent='Checking the published version on this site…';
  button.disabled=true;
  try {
    const response=await fetch(`${APP_VERSION_URL}?check=${Date.now()}`,{cache:'no-store',headers:{'Cache-Control':'no-cache'}});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const info=await response.json();
    if(!/^\d+\.\d+\.\d+$/.test(info.version||''))throw new Error('Invalid version.json');
    $('settings-published').textContent=info.version;
    updateAvailable=compareVersions(info.version,APP_VERSION)>0;
    if(updateAvailable){
      status.textContent=`Version ${info.version} is published. Reload to install it.`;
      $('settings-reload').hidden=false;
      if('serviceWorker' in navigator){
        const reg=await navigator.serviceWorker.getRegistration();
        await reg?.update();
      }
    }else{
      status.textContent=compareVersions(info.version,APP_VERSION)<0
        ? `This copy is newer than the version published on this website (${info.version}).`
        : `You're running the latest published version (${APP_VERSION}).`;
      $('settings-reload').hidden=true;
    }
  }catch(error){
    status.textContent=`Unable to check for updates. Connect to your GitHub Pages site and try again. (${error.message})`;
  }finally{button.disabled=false;}
}
$('open-app-settings').addEventListener('click',openAppSettings);
$('menu-check-updates').addEventListener('click',checkAppUpdates);
$('settings-check-updates').addEventListener('click',checkAppUpdates);
$('settings-recheck-assets').addEventListener('click',checkLocalAssets);
// Re-download only the selected anatomical model family. Never clear site data:
// drafts and the teacher's IndexedDB scene library live on this same origin.
async function forceRefreshModels(){
  const button=$('settings-force-models'),result=$('settings-model-refresh-result');
  const scope=$('settings-model-refresh-scope').value;
  if(!navigator.onLine){result.textContent='Connect to the internet before refreshing models.';return;}
  if(!('serviceWorker' in navigator)||!('MessageChannel' in window)){
    result.textContent='Offline service worker unavailable in this browser.';return;
  }
  button.disabled=true;
  result.textContent='Checking GitHub Pages and downloading '+scope+' model files…';
  try{
    const registration=await navigator.serviceWorker.ready;
    await registration.update();
    const active=registration.active||registration.waiting;
    if(!active)throw new Error('Service worker not ready');
    // A newly deployed app can momentarily have an old service worker active.
    // Check its protocol first; never hang forever waiting on unsupported code.
    function workerMessage(payload,{timeout=12000,onProgress=()=>{}}={}){
      return new Promise((resolve,reject)=>{
        const channel=new MessageChannel();
        let timer;
        const expire=()=>{
          clearTimeout(timer);
          timer=setTimeout(()=>{
            channel.port1.close();reject(new Error('Service worker did not respond. Close other Anatomy Studio tabs and reopen the site to activate the update.'));
          },timeout);
        };
        expire();
        channel.port1.onmessage=event=>{
          const msg=event.data||{};
          if(msg.type==='MODEL_REFRESH_PROGRESS'){onProgress(msg);expire();return;}
          clearTimeout(timer);channel.port1.close();resolve(msg);
        };
        try{active.postMessage(payload,[channel.port2]);}
        catch(error){clearTimeout(timer);channel.port1.close();reject(error);}
      });
    }
    const pong=await workerMessage({type:'MODEL_REFRESH_PING'});
    if(pong.type!=='MODEL_REFRESH_PONG'||pong.version!=='anatomy-v2.0.1')
      throw new Error('The updated offline worker is not active yet. Close other tabs and reopen Anatomy Studio.');
    const response=await workerMessage({type:'REFRESH_MODELS',scope},{timeout:180000,onProgress:msg=>{
      result.textContent=`Downloaded ${msg.completed}/${msg.total}: ${msg.path}`;
    }});
    if(response.type!=='MODEL_REFRESH_RESULT'||!response.ok)
      throw new Error(response.error||'Model download failed');
    result.textContent='Model files refreshed and checked. Reloading Anatomy Studio…';
    if(teacherMode&&sceneRoot)saveDraft(false);
    // The fresh assets are now in the worker cache; the reload reconstructs
    // geometry from them without deleting drafts, lessons, or preferences.
    location.reload();
  }catch(error){
    result.textContent=`Could not refresh ${scope}: ${String(error?.message||error)}. Existing local lessons were not touched.`;
    button.disabled=false;
    console.warn('Model refresh failed',error);
  }
}
$('settings-force-models').addEventListener('click',forceRefreshModels);

$('settings-reload').addEventListener('click',async()=>{
  try{await (await navigator.serviceWorker?.getRegistration())?.update();}catch(e){console.warn(e);}
  location.reload();
});
$('settings-close').addEventListener('click',closeAppSettings);
$('settings-dialog').addEventListener('click',event=>{if(event.target===$('settings-dialog'))closeAppSettings();});
$('open-menu-help').addEventListener('click',()=>{$('help-dialog').hidden=false;$('help-close').focus();});
$('help-close').addEventListener('click',()=>{$('help-dialog').hidden=true;});
$('help-dialog').addEventListener('click',event=>{if(event.target===$('help-dialog'))$('help-dialog').hidden=true;});
window.addEventListener('keydown',event=>{
  if(!teacherMode)return;
  if(event.key==='Escape'){
    if(openMenuName)closeStudioMenus(true);
    if(!$('help-dialog').hidden)$('help-dialog').hidden=true;
    if(!$('settings-dialog').hidden)closeAppSettings();
    return;
  }
  if(!(event.ctrlKey||event.metaKey)||event.altKey)return;
  const key=event.key.toLowerCase();
  const typing=['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable;
  // Never hijack native text editing; typing Undo/Redo stays in the text field.
  if(typing && (key==='z'||key==='y'))return;
  if(key==='s') {event.preventDefault();saveToLibrary(event.shiftKey);}
  if(key==='o') {event.preventDefault();openLibrary();}
  if(key==='z') {event.preventDefault();navigateHistory(event.shiftKey?'redo':'undo');}
  if(key==='y') {event.preventDefault();navigateHistory('redo');}
});
