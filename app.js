// ANATOMIQ_GITHUB_PREVIEW_TEACHER_EDIT_235_20261026
// ANATOMIQ_CONNECTIVE_228: append-only source atlas and legacy-safe cartilage classification.
// ANATOMIQ_LABEL_ORDER_242 — label list order only; label occlusion BVH left unchanged.
import {reorderLabels} from './label-reorder-242.js?rev=242';
import {chapterIrisEnabled,chapterCarouselEnabled,createIrisTransition,installChapterTransitionMenus} from './chapter-iris-254.mjs?rev=259';
import {createChapterCarousel,chapterSlideDirection} from './chapter-carousel-255.mjs?rev=261';
import {createLiveChapterCarousel} from './chapter-live-carousel-256.mjs?rev=261'; // ANATOMIQ_CAROUSEL_SPRING_259 // ANATOMIQ_LIVE_CHAPTER_CAROUSEL_256 // ANATOMIQ_CHAPTER_CAROUSEL_255 // ANATOMIQ_CHAPTER_IRIS_254
import * as THREE from 'three';
import {createTriquetrumEntries} from './triquetrum-extension.mjs?rev=245'; // ANATOMIQ_TRIQUETRUM_244
import {createOcclusionIndex} from './label-occlusion-bvh.js?rev=238'; // ANATOMIQ_LABEL_OCCLUSION_BVH_238
import {normalPractical,newPracticalLabelId,practicalCandidates,practicalAttempt,gradePractical} from './practical-quiz.js';
import {smartLabelFacing,smartOrbitDirections} from './smart-label-focus.js';
import {studentLink,parsePublicReference,fetchPublicLesson,resolveLessonMedia,normalizeSlug,lessonRef,verifyPublishingRepository,publishToGitHub} from './lesson-publishing.js';
import {hasRememberedConnection,savedConnectionIdentity,isTabUnlocked,lockRememberedConnection,forgetRememberedConnection,rememberConnection,unlockRememberedConnection} from './github-token-vault.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {installRealisticEyeSurfaces} from './realistic-eye-model.js?rev=2215';
import {installSkullGeometry} from './skull-geometry.js';
import {validateSkullManifest} from './skeletal-detail.js';
import {getSkullGeometry,setSkullGeometry} from './skull-preferences.js';
import {digestiveMeshEntries,sourceRegistration,digestiveDefaultColor} from './digestive-model.js';
import {cardiovascularEntries,cardiovascularColor} from './cardiovascular-model.js';
import {respiratoryEntries,validateRespiratoryManifest,respiratoryColor,RESPIRATORY_PRESETS,respiratoryVisibleInPreset,pulmonaryOverlayVisible,respiratoryCoverage} from './respiratory-model.js';
import {nervousEntries,validateNervousManifest,nervousColor,NERVOUS_PRESETS,nervousVisibleInPreset,nervousMaterialOverrides} from './nervous-model.js';
import {urinaryEntries,validateUrinaryManifest,urinaryColor,URINARY_PRESETS,urinaryVisibleInPreset,isRenalVessel} from './urinary-model.js';
import {connectiveEntries,validateConnectiveManifest,connectiveColor,CONNECTIVE_PRESETS,connectiveVisibleInPreset,isBaseConnective,baseConnectiveVisibleInPreset,recoverLegacyConnectiveHidden,sourceCostalCartilageAppearance} from './connective-model.js?rev=cartilage-20261025';
import {lymphaticEntries,validateLymphaticManifest,lymphaticColor,LYMPHATIC_PRESETS,lymphaticVisibleInPreset} from './lymphatic-model.js';
import {CARDIO_PRESETS,cardioVisibleInPreset,cardioPresetCounts,cardioCanApply,cardioIsCavity} from './cardio-presentation.js';
import {classCoreVisible,classCoreCoverage,classCoreCoverageJSON} from './cardio-class-core.js';
import {auditCardiovascular,loadCardioReview,saveCardioReview,cardioAuditExport} from './cardio-vascular-audit.js';
import {detailStructureEntries, shouldPreferDetailedWhenChoosingDigestive, correctedDetailTransform} from './digestive-detail.js';
import { encodeScene, decodeScene, validateScene, validateProject, validatePermissions, STUDY_PERMISSIONS, EXAM_PERMISSIONS, MAX_CHAPTERS, makeVisibilityBits, readVisibilityBits, hashForStructures } from './scene-codec.js?rev=260';
import {listLessons, getLesson, saveLesson, deleteLesson, prepareBackup, parseBackup, restoreBackup} from './library-store.js';
import {SceneHistory} from './scene-history.js';
import {catalogAnatomy, sceneModelCompatible, upgradeLegacyScene} from './structure-layout.js';
import {normalizeMode, resolveRenderProfile, cappedPixelRatio} from './render-performance.js';
import {normalizeSurfaceMode, applySurfaceFinish, finishSourceAnatomy, installSurfaceLighting} from './surface-lighting.js';
import {normalizeBoneAppearance,createBoneAppearanceController,isAnatomicalBone,BONE_APPEARANCE_STORAGE_KEY} from './bone-appearance.js?rev=natural-bone-approved-detail-v1'; // ANATOMIQ_NATURAL_BONE_PHASE1_20261025
import {normalizeShadowMode,createDynamicShadows,configureAnatomyShadows} from './dynamic-shadows.js';
import {effectiveSystemLayers,activeSystemTabs,toggleAnatomySystem} from './system-layers.js';
import {skeletalDivision,parseStudioVersion,compareStudioVersions} from './skeletal-views-2217.mjs';
import {anatomyPath,buildAnatomyTree,getDivisionNode,divisionCoverage} from './anatomy-divisions-2218.mjs';
import {renderAnatomySidebar,expandToStructure} from './anatomy-sidebar-2219.mjs?rev=2220'; // ANATOMIQ_SINGLE_EXPLORER_2220
import {chapterAssets,assetsForProject,offlineLessonFiles,LEGACY_DIGESTIVE_MESH_NAMES} from './scene-assets.js';
import {validateCardiovascularManifest} from './cardiovascular-model.js';
import {validateDigestiveManifest} from './digestive-detail.js';

// Écorché: https://github.com/Charleeh/ecorche | CC BY-SA 4.0
// A same-origin models/ecorche.glb overrides this hosted fallback when present.
const APP_VERSION = '2.2.63'; // ANATOMIQ_SINGLE_GROUP_LABEL_260 // ANATOMIQ_TRIQUETRUM_REFINEMENT_245
window.__AnatomIQBuildVersion=APP_VERSION; // Runtime source for About dialog

const REMOTE_MODEL = 'https://cdn.jsdelivr.net/gh/Charleeh/ecorche@main/model/ecorche.glb';
const MIRROR_MODEL = 'https://charleeh.github.io/ecorche/model/ecorche.glb';
const SECONDARY_MODEL = 'https://charleeh.github.io/ecorche/model/ecorche.glb';
const LOCAL_MODEL = './models/ecorche.glb';
const REALISTIC_EYE_MODEL = './models/realistic-human-eye.glb?rev=2215';
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
const CONNECTIVE_MANIFEST='./models/connective-structures.json?rev=2211';
const CONNECTIVE_STANDARD='./models/connective-standard.glb?rev=2211';
const CONNECTIVE_DETAILED='./models/connective-detailed.glb?rev=2211';
const LYMPHATIC_MANIFEST='./models/lymphatic-structures.json';
const LYMPHATIC_STANDARD='./models/lymphatic-standard.glb';
const LYMPHATIC_DETAILED='./models/lymphatic-detailed.glb';
const URINARY_MANIFEST='./models/urinary-structures.json';
const URINARY_STANDARD='./models/urinary-standard.glb';
const URINARY_DETAILED='./models/urinary-detailed.glb';
const NERVOUS_MANIFEST='./models/nervous-structures.json';
const NERVOUS_STANDARD='./models/nervous-standard.glb';
const NERVOUS_DETAILED='./models/nervous-detailed.glb';
const NERVOUS_QUALITY_KEY='anatomiq-nervous-geometry-v1';
let nervousGeometry='standard';
try{nervousGeometry=localStorage.getItem(NERVOUS_QUALITY_KEY)==='detailed'?'detailed':'standard';}catch{}
let nervousRoot=null,nervousEntriesList=[],nervousAvailable=false,nervousLoaded=false,nervMetadata=null;
const URINARY_QUALITY_KEY='anatomiq-urinary-geometry-v1';
let urinaryGeometry='standard';
try{urinaryGeometry=localStorage.getItem(URINARY_QUALITY_KEY)==='detailed'?'detailed':'standard';}catch{}
let urinaryRoot=null,urinaryEntriesList=[],urinaryAvailable=false,urinaryLoaded=false,urinaryMetadata=null;
const CONNECTIVE_QUALITY_KEY='anatomiq-connective-geometry-v1';
let connectiveGeometry='standard';
try{connectiveGeometry=localStorage.getItem(CONNECTIVE_QUALITY_KEY)==='detailed'?'detailed':'standard';}catch{}
let connectiveRoot=null,connectiveEntriesList=[],connectiveAvailable=false,connectiveLoaded=false,connectiveMetadata=null;
let connectivePreset='all';
// Older scene snapshots can contain all 14 native meshes as hidden, even though
// the teacher never deliberately hid them (they were not loaded yet).
let legacyConnectiveVisibilityPending=false;
let connectiveLoadError='';
window.__AnatomIQConnectiveStatus={loaded:false,stage:'not started'};
const LYMPHATIC_QUALITY_KEY='anatomiq-lymphatic-geometry-v1';
let lymphaticGeometry='standard';
try{lymphaticGeometry=localStorage.getItem(LYMPHATIC_QUALITY_KEY)==='detailed'?'detailed':'standard';}catch{}
let lymphaticRoot=null,lymphaticEntriesList=[],lymphaticAvailable=false,lymphaticLoaded=false,lymphaticMetadata=null;
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
// ANATOMIQ_MULTI_SELECTION_2217: editor-only, deliberately not serialized.
const multiSelectedIndices=new Set();
const multiSelectionHighlights=new Map();
let multiListAnchor=null;
let isolated = false;
// ANATOMIQ_NATIVE_EYES_2213: preserve embedded Écorché eye meshes in an optional independent layer.
const hidden = new Set();
let structures = [];
let triquetrumEntries = []; // ANATOMIQ_TRIQUETRUM_244
let eyeStructures=[];
let legacyEyeVisibilityPending=true;
let legacyStructureCount = 0;
let legacyFingerprint = '';
const systemLayers = {ocular:false,skeletal:true,deep:false,superficial:true,digestive:false,cardiovascular:false,respiratory:false,nervous:false,urinary:false,lymphatic:false,connective:true};
const materials = new Map(); // Model-authored original material(s) for each anatomical structure.
const paintedMaterials = new Map(); // Cloned materials owned by the editor (never mutate the GLB originals).
const bonePaint = new Map();
const polishFadedIndices=new Set();
const polishFadedMaterials=new Map(); // Stable structure index → #RRGGBB, scoped to the active chapter.
let paintMode = false;
let paintColor = '#e45d58';
let selectedHighlight = null;
let activePreset = 'front';
let currentModelURL = LOCAL_MODEL;
let offlineReady = false;
const teacherMode = !location.hash.startsWith('#scene=') && !location.hash.startsWith('#lesson=');
// ANATOMIQ_STUDENT_READINESS_2216D: a different student URL in a running
// PWA must start a fresh student loader (teacherMode is decided at boot).
const studentRouteAtBoot=location.hash;
window.addEventListener('hashchange',()=>{
  const next=location.hash;
  if(next!==studentRouteAtBoot && (next.startsWith('#lesson=')||next.startsWith('#scene=')||studentRouteAtBoot.startsWith('#lesson=')||studentRouteAtBoot.startsWith('#scene='))){
    location.reload();
  }
});
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
  b.classList.toggle('student-system-toolbar-enabled',studentPermissions.ot!==false); // ANATOMIQ_SELECTION_STUDENT_251
  b.classList.toggle('student-label-list-enabled',!!studentPermissions.sl && !!studentPermissions.ll); // ANATOMIQ_STUDENT_LABEL_LIST_252
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
  if(typeof polishRenderStudentLabels==='function')polishRenderStudentLabels();
  // The sidebar may have been removed entirely: resize canvas after CSS reflow.
  resize();
  requestAnimationFrame(()=>{resize();invalidate(2);});
  window.__AnatomIQStudentShell={search:!!studentPermissions.ss,explorer:!!studentPermissions.st,
    systems:studentPermissions.ot!==false,identification:!!studentPermissions.sn};
}
document.body.classList.toggle('student-mode', !teacherMode);
$('student-badge').hidden = teacherMode;
let sceneFingerprint = '';
let labels = [];
let labelSequence = 0;
let placingLabel = false;
// Single / Group label placement is transient and never stored as scene state.
let labelPlacementMode=null;
let groupPendingAnchors=[];
let restoringScene = false;
let draftTimeout = 0;
const DRAFT_KEY = 'anatomy-studio-project-v2';
const OLD_DRAFT_KEY = 'anatomy-studio-project-v1';
let chapters = [];
let structureNoteOverrides=new Map(); // ANATOMIQ_LESSON_EXPERIENCE_249
let practicalConfig=normalPractical(null),practicalActive=false,practicalState=null,practicalHighlight=null,practicalTargetMarker=null,practicalBusy=false;
let activeChapter = 0;
const markers = new Map();
const labelSVG = $('label-lines');
const labelContainer = $('label-markers');
// ANATOMIQ_INLINE_LABELS_EASE_261: descriptions belong to callouts, not dialogs.
// Keep the original marker's event handlers: clicking still focuses its structure.
function anat261AttachDescription(label, marker){
  // ANATOMIQ_TEACHER_CALLOUT_262: label.d is the teacher-entered annotation
  // description. Never substitute the app-generated structure description.
  // Keep the existing numbered badge and marker click/focus/drag handlers intact.
  const text=marker.querySelector('.callout-text');
  if(!text) return;
  marker.classList.add('anat262-callout');
  // The title and description must be one flex item, not side-by-side items.
  // Moving nodes preserves their text and any attached event handlers.
  const title=document.createElement('span');
  title.className='anat262-label-title';
  while(text.firstChild) title.appendChild(text.firstChild);
  text.appendChild(title);
  const description=typeof label.d==='string' ? label.d.trim() : '';
  if(!description) return; // Title-only labels stay title-only.
  const el=document.createElement('span');
  el.className='anat261-description';
  el.textContent=description;
  // Reveal mode already hides .callout-text until .revealed is applied.
  text.appendChild(el);
}
// The old modal's original close handler still performs any focus/scroll cleanup.
// MutationObserver runs before browser paint, so the description-only popup never flashes.
const anat261LabelDialog=$('polish-label-dialog');
if(anat261LabelDialog){
  const suppress=()=>{
    if(anat261LabelDialog.hidden)return;
    $('polish-label-close')?.click();
    anat261LabelDialog.hidden=true;
  };
  new MutationObserver(suppress).observe(anat261LabelDialog,{attributes:true,attributeFilter:['hidden']});
}

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
let boneAppearance='natural';
try{boneAppearance=normalizeBoneAppearance(localStorage.getItem(BONE_APPEARANCE_STORAGE_KEY));}catch{}
let boneSurfaceController=null;
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
$('settings-bone-appearance').value=boneAppearance;
$('settings-bone-appearance').addEventListener('change',()=>{
  const next=normalizeBoneAppearance($('settings-bone-appearance').value);
  if(next===boneAppearance)return;
  boneAppearance=next;
  try{localStorage.setItem(BONE_APPEARANCE_STORAGE_KEY,next);}catch{}
  if(boneSurfaceController){
    clearMultiHighlights();
    const lookup=new Map(structures.map(s=>[s.mesh,s]));
    boneSurfaceController.setMode(next,(mesh,baseMaterial)=>{
      materials.set(mesh,baseMaterial);
      const s=lookup.get(mesh);
      if(s)updateBoneMaterial(s); // Rebuild teacher paint/fade/highlight from new base.
    });
    syncMultiHighlights();
    console.info('AnatomIQ Bone changed:',window.__AnatomIQBoneStatus?.());
  }
  invalidate(3);
});
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
// ANATOMIQ_LABEL_AUDIT_236 — temporary, opt-in teacher-only profiler; remove after audit.
const __labelAuditOn=teacherMode && new URLSearchParams(location.search).get('labelperf')==='1';
const __labelAudit={
  enabled:__labelAuditOn,mode:'normal',samples:[],lastFrame:0,rayCalls:0,rayMs:0,
  reset(){this.samples=[];this.lastFrame=0;this.rayCalls=0;this.rayMs=0;polishOcclusionAt=0;},
  setMode(mode){
    if(!['normal','legacy-occlusion','no-occlusion','no-labels'].includes(mode))throw new Error('mode must be normal, legacy-occlusion, no-occlusion, or no-labels');
    this.mode=mode;this.reset();
    // These changes are for temporary measurements only. Original occlusion resumes in normal mode.
    if(mode==='no-occlusion'){
      for(const entry of markers.values()){
        entry.marker.dataset.occluded='0';entry.marker.classList.remove('polish-occluded');
        entry.line.style.opacity='1';entry.dot.style.opacity='1';
      }
    }
    invalidate(2);
    return 'Label audit: '+mode+'; rotate the model for 5–10 seconds, then call report()';
  },
  report(){
    const moving=this.samples.filter(s=>s.moved);
    const metrics=rows=>{
      if(!rows.length)return {mean:0,p95:0,max:0};
      const a=rows.slice().sort((x,y)=>x-y),mean=rows.reduce((x,y)=>x+y,0)/rows.length;
      return {mean:+mean.toFixed(2),p95:+a[Math.ceil(a.length*0.95)-1].toFixed(2),max:+a[a.length-1].toFixed(2)};
    };
    const selected=moving.length?moving:this.samples;
    const gaps=selected.filter(s=>s.gap>0 && s.gap<1000).map(s=>s.gap);
    const result={mode:this.mode,labels:labels.length,frames:this.samples.length,movingFrames:moving.length,
      frameIntervalMs:metrics(gaps),approxFPS:gaps.length?+(1000/(gaps.reduce((a,b)=>a+b,0)/gaps.length)).toFixed(1):null,
      orbitControlsMs:metrics(selected.map(s=>s.controls)),shadowUpdateMs:metrics(selected.map(s=>s.shadows)),
      rendererCPUms:metrics(selected.map(s=>s.render)),labelUpdateMs:metrics(selected.map(s=>s.labels)),
      raycasts:this.rayCalls,raycastTotalMs:+this.rayMs.toFixed(2),
      raycastMeanMs:this.rayCalls?+(this.rayMs/this.rayCalls).toFixed(3):0,
      occludingMeshes:polishOccluders.length,
      note:'Renderer CPU is not GPU time. Compare the same rotation in all three modes.'};
    console.table(result);return result;
  }
};
if(__labelAuditOn){
  window.__AnatomIQLabelPerf=Object.freeze({
    mode:name=>__labelAudit.setMode(name),
    reset:()=>__labelAudit.reset(),
    report:()=>__labelAudit.report(),
    help:()=>console.info('Run mode("normal"), rotate 5–10 s, then report(). Repeat with "no-occlusion" and "no-labels". These are diagnostic modes, not app settings.')
  });
  console.info('AnatomIQ label-performance audit enabled. window.__AnatomIQLabelPerf.help()');
  window.__AnatomIQOcclusionStats=()=>polishOcclusionIndex.stats();
}
// END ANATOMIQ_LABEL_AUDIT_236

let __anat256LiveCarousel=null; // ANATOMIQ_LIVE_CHAPTER_CAROUSEL_256
function draw(){
  if(__anat256LiveCarousel?.active){frameRequest=0;return;}
  const __lpStart=__labelAudit.enabled?performance.now():0;
  frameRequest=0;
  if(document.hidden)return;
  updatingControls=true;
  // OrbitControls.update() reports whether damping actually moved the camera.
  // A change fired *inside* this update must not restart the render loop.
  let moved=false;
  try { moved=controls.update(); } finally {updatingControls=false;}
  const __lpC=__labelAudit.enabled?performance.now():0;
  shadows.update(camera,controls.target,moved);
  const __lpS=__labelAudit.enabled?performance.now():0;
  renderer.render(scene,camera);
  const __lpR=__labelAudit.enabled?performance.now():0;
  updateAnnotationPositions();
  if(__labelAudit.enabled){
    const end=performance.now(),last=__labelAudit.lastFrame;
    __labelAudit.samples.push({moved,gap:last?__lpStart-last:0,controls:__lpC-__lpStart,
      shadows:__lpS-__lpC,render:__lpR-__lpS,labels:end-__lpR});
    __labelAudit.lastFrame=__lpStart;
    if(__labelAudit.samples.length>1800)__labelAudit.samples.shift();
  }
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
function tissueVisible(s){return (s.system==='ocular'||s.tissue !== 'eye') && (elements.teeth.checked || s.tissue !== 'tooth') && true;}
// ANATOMIQ_VIEW_POLISH_2216C: Skull Only is an anatomical isolation preset,
// not permission for Connective to leak into the skull view. Does not mutate
// systemLayers, so switching back retains independently selected systems.
function layerEnabled(s){
  if(mode==='skull')return s.system==='skeletal' && !isBaseConnective(s) && Boolean(s.skull);
  const layers=effectiveSystemLayers(mode,systemLayers);
  if(s.system==='digestive')return layers.digestive &&
    (s.layer==='digestive-detail' ? detailAvailable && detailEnabled : digestiveAvailable && !detailEnabled) && !s.mesh.userData?.deferredAsset;
  if(s.system==='cardiovascular')return layers.cardiovascular && cardioAvailable && !s.mesh.userData?.deferredAsset;
  if(s.system==='respiratory')return layers.respiratory && respiratoryAvailable && !s.mesh.userData?.deferredAsset;
  if(s.system==='nervous')return layers.nervous && nervousAvailable && !s.mesh.userData?.deferredAsset;
  if(s.system==='urinary')return layers.urinary && urinaryAvailable && !s.mesh.userData?.deferredAsset;
  if(s.system==='lymphatic')return layers.lymphatic && lymphaticAvailable && !s.mesh.userData?.deferredAsset;
   // ANATOMIQ_EYE_NERVOUS_2215: eye meshes use Nervous visibility, without changing their indices.
  if(s.system==='ocular')return layers.nervous;
  if(s.system==='connective')return layers.connective && connectiveAvailable && !s.mesh.userData?.deferredAsset && connectiveVisibleInPreset(s,connectivePreset);
  if(s.system==='muscular')return s.layer==='deep muscles'?layers.deep:layers.superficial;
  if(s.system==='skeletal')return (isBaseConnective(s)?(layers.connective && baseConnectiveVisibleInPreset(s,connectivePreset)):layers.skeletal) && (mode!=='skull'||s.skull);
  return false;
}
function currentStructures(){return structures.filter(s=>divisionScope?divisionScope.has(s.index):layerEnabled(s));}
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
  // Connective is always available for existing Écorché skeletal cartilage.
  // Native BodyParts3D structures appear after the optional model build.
  $('eye-study-panel').hidden=!teacherMode||!layers.nervous;
  $('eye-study-count').textContent=`${eyeStructures.length} source-native eye meshes · separately selectable`;
  $('mode-connective').disabled=false;
  $('mode-connective').title=connectiveAvailable?`${connectiveEntriesList.length} source-backed connective meshes plus legacy skeletal cartilage`:'Existing skeletal cartilage; build models/connective-* to add 14 nonduplicating source meshes';
  $('connective-study-panel').hidden=!teacherMode||!layers.connective;
  $('connective-study-count').textContent=connectiveAvailable?`${connectiveEntriesList.length} BodyParts3D joints-support meshes + any Écorché cartilage`:(connectiveLoadError?'Native Connective load error: '+connectiveLoadError:'Écorché cartilage available · curated 14-mesh expansion not installed');
  $('mode-lymphatic').disabled=!lymphaticAvailable;
  $('mode-lymphatic').title=lymphaticAvailable?'Verified spleen and thymus models':'Publish lymphatic GLBs and manifest to activate this layer';
  $('lymphatic-study-panel').hidden=!teacherMode||!lymphaticAvailable||!layers.lymphatic;
  if(lymphaticAvailable)$('lymphatic-study-count').textContent=`${lymphaticEntriesList.length} verified source meshes · 1 spleen, 2 thymus lobes`;
  $('mode-urinary').disabled=!urinaryAvailable;
  $('mode-urinary').title=urinaryAvailable?`${urinaryEntriesList.length} kidney and urinary-tract structures`:'Generate and upload the source-backed urinary models';
  $('urinary-study-panel').hidden=!teacherMode||!urinaryAvailable||!layers.urinary;
  if(urinaryAvailable)$('urinary-study-count').textContent=`${urinaryEntriesList.length} verified urinary meshes; renal vessels reused from Cardiovascular`;
  $('mode-nervous').title=nervousAvailable?`${nervousEntriesList.length} brain, spinal cord and nerve structures`:'Install the AnatomIQ 2.0 nervous-system model files';
  $('nervous-study-panel').hidden=!teacherMode||!nervousAvailable||!layers.nervous;
  if(nervousAvailable){
    const counts=Object.fromEntries(['brain','spinal_cord','peripheral','meninges'].map(k=>[k,nervousEntriesList.filter(s=>s.organId===k).length]));
    $('nervous-study-count').textContent=`${nervousEntriesList.length} selectable meshes · ${counts.brain} brain · ${counts.spinal_cord} spinal cord · ${counts.peripheral} nerves · ${counts.meninges} meningeal surfaces`;
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

// ANATOMIQ_DIVISIONS_2218 — reversible browsing, not chapter editing.
let divisionScope=null,divisionBrowsePath=[],divisionStudentAllowed=null,divisionSavedCamera=null;
function divisionCanBrowse(){return teacherMode || (studentPermissions.st && studentPermissions.sn && !(typeof practicalActive!=='undefined'&&practicalActive));}
function divisionTree(){return buildAnatomyTree(structures);}
window.__AnatomIQDivisionCoverage=()=>divisionCoverage(divisionTree());
function divisionNode(path){return getDivisionNode(divisionTree(),path);}
function divisionNavReset(restoreCamera=false){
  if(!divisionScope)return;
  divisionScope=null;divisionBrowsePath=[];divisionStudentAllowed=null;
  if(restoreCamera && divisionSavedCamera){
    camera.position.fromArray(divisionSavedCamera.slice(0,3));
    controls.target.fromArray(divisionSavedCamera.slice(3,6));
    camera.updateProjectionMatrix();controls.update();
  }
  divisionSavedCamera=null;
}
function divisionUnderlyingVisible(s){
  return layerEnabled(s)&&tissueVisible(s)&&!hidden.has(s.mesh)&&(!isolated||s===selected);
}
function divisionOpen(path){
  if(!divisionCanBrowse()||!sceneRoot)return;
  const node=divisionNode(path);if(!node?.entries.length)return;
  if(!divisionScope){
    divisionSavedCamera=[...camera.position.toArray(),...controls.target.toArray()];
    if(!teacherMode)divisionStudentAllowed=new Set(structures.filter(divisionUnderlyingVisible).map(s=>s.index));
  }
  const entries=teacherMode?node.entries:node.entries.filter(s=>divisionStudentAllowed?.has(s.index));
  if(!entries.length){showToast('This division is not visible in the current lesson.');return;}
  isolated=false;
  divisionScope=new Set(entries.map(s=>s.index));
  divisionBrowsePath=path;
  refreshVisibility(true);
  const visible=entries.filter(s=>s.mesh.visible);
  if(visible.length)fitBox(boxFor(visible),activePreset||'front',1.34,true);
}
function divisionClose(){
  divisionNavReset(true);
  refreshVisibility(true);
}
// Breadcrumb code retired in 2.2.20; exact 2.2.19 implementation archived in docs/archive.

function refreshVisibility(transient=false){
  for(const s of structures){
    const inspecting=Boolean(cardioPreviewIDs && s.system==='cardiovascular');
    s.mesh.visible = (divisionScope ? divisionScope.has(s.index) : layerEnabled(s)) && (divisionScope && teacherMode ? true : tissueVisible(s))
      && (divisionScope ? true : (inspecting ? cardioPreviewIDs.has(s.sourceName) : !hidden.has(s.mesh)))
      && (!isolated||(teacherMode?multiSelectedIndices.has(s.index):s===selected));
  }
  renderList();
  invalidate(2);
  if(!transient){queueDraft();if(!teacherMode)studentHistoryQueue();}
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
  if(s.system==='ocular')return 'External eyeball surface, part of the special sense of vision. The cornea and sclera are separately selectable.';
  if(s.system==='nervous'){
    const n=(s.name||'').toLowerCase();
    if(/dura mater|falx cerebri|tentorium cerebelli/.test(n))return 'A protective fold or covering of the brain’s dura mater.';
    if(/ventricle|cerebral aqueduct|interventricular foramen/.test(n))return 'Part of the cerebrospinal-fluid ventricular system.';
    if(/hypothalam/.test(n))return 'Diencephalic region involved in autonomic and endocrine regulation.';
    if(/thalam/.test(n))return 'Diencephalic region involved in relaying and processing information.';
    if(/caudate|putamen|globus pallidus/.test(n))return 'A basal ganglia component involved in motor circuits.';
    if(/amygdala/.test(n))return 'A limbic structure involved in emotion and memory.';
    if(/fornix/.test(n))return 'A limbic white-matter pathway connecting regions including the hippocampus.';
    if(s.organId==='spinal_cord')return 'The central nervous system pathway between brainstem and peripheral nerves.';
    if(s.organId==='peripheral')return 'A named peripheral or cranial nerve carrying sensory, motor or mixed signals.';
    return 'A named structure of the central nervous system.';
  }
  if(s.system==='lymphatic')return s.organId==='spleen'?'Filters blood, removes aging red blood cells and supports immune surveillance.':'Primary lymphoid organ where T lymphocytes mature.';
  if(s.system==='urinary')return ({kidney:'Filters blood and regulates water, electrolytes and acid-base balance.',ureter:'Carries urine from renal pelvis toward the bladder.',bladder:'Stores urine until micturition.',urethra:'Carries urine from the bladder to the exterior.'})[s.organId]||'Urinary system anatomy.';
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
function displayMaterial(s){return polishFadedMaterials.get(s.mesh)||paintedMaterials.get(s.mesh)||materials.get(s.mesh);}
function polishRefreshFade(s){
  const old=polishFadedMaterials.get(s.mesh);
  polishFadedMaterials.delete(s.mesh);
  if(old)disposeMaterial(old);
  const base=paintedMaterials.get(s.mesh)||materials.get(s.mesh);
  if(polishFadedIndices.has(s.index) && base){
    const dim=m=>{const copy=m.clone();copy.transparent=true;copy.opacity=Math.min(Number(m.opacity??1),0.26);copy.depthWrite=false;copy.needsUpdate=true;return copy;};
    polishFadedMaterials.set(s.mesh,Array.isArray(base)?base.map(dim):dim(base));
  }
}
// ANATOMIQ_FADE_DETAILS_239_20261026 — right-panel Fade uses existing saved/student history state.
function syncFadeDetailsControl(){
  const button=$('fade-selected');
  if(!button)return;
  const allowed=teacherMode||studentExplore;
  const targets=multiTargets();
  const allFaded=targets.length>0&&targets.every(s=>polishFadedIndices.has(s.index));
  button.hidden=!allowed;
  button.disabled=!allowed||!targets.length;
  button.textContent=allFaded?'◐   Restore structure':'◐   Fade structure';
  button.setAttribute('aria-pressed',String(allFaded));
  button.title=allFaded?'Restore full opacity to the selected structure':'Fade selected structure to 26% opacity';
}
function polishRestoreFade(indices=[]){
  const changed=new Set([...polishFadedIndices,...indices]);
  polishFadedIndices.clear();
  for(const i of indices)if(Number.isInteger(i)&&structures[i])polishFadedIndices.add(i);
  for(const i of changed)if(structures[i])updateBoneMaterial(structures[i]);
  syncFadeDetailsControl();
}
function polishToggleSelectedFade(){
  if((!teacherMode && !studentExplore) || !multiTargets().length){
    showToast(!teacherMode && !studentExplore?'This lesson does not allow structure editing.':'Select a structure to fade.');
    return;
  }
  const targets=multiTargets(),allFaded=targets.every(s=>polishFadedIndices.has(s.index));
  clearMultiHighlights();
  for(const s of targets){
    if(allFaded)polishFadedIndices.delete(s.index);
    else polishFadedIndices.add(s.index);
    updateBoneMaterial(s);
  }
  renderList();syncMultiHighlights();syncFadeDetailsControl();
  if(teacherMode)queueDraft();else studentHistoryQueue();
  showToast(`${targets.length} structure${targets.length===1?'':'s'} ${allFaded?'restored':'faded to 26%'}.`);
}

// ANATOMIQ_VIEW_FADE_237_20261026: menu commands use existing chapter fade and student history.
window.addEventListener('anatomiq:toggle-selected-fade',()=>polishToggleSelectedFade());

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
  polishRefreshFade(s);
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
  const canSelect=Boolean(multiTargets().length);
  $('paint-selected').disabled=!canSelect;
  $('erase-selected').disabled=!canSelect||!multiTargets().some(s=>bonePaint.has(s.index));
  $('erase-all').disabled=bonePaint.size===0;
  $('paint-status').textContent=`${bonePaint.size} painted structure${bonePaint.size===1?'':'s'} in this chapter`;
  $('paint-mode').classList.toggle('placing',paintMode);
  $('paint-mode').setAttribute('aria-pressed',String(paintMode));
  $('paint-mode').textContent=paintMode?'✓ Painting structures — click to color':'◉ Paint mode — click structures';
  document.querySelectorAll('.paint-swatch').forEach(button=>button.classList.toggle('active',button.dataset.color===paintColor));
}
function setBoneColor(s,hex,batch=false){
  if(!teacherMode||!s)return;
  if(hex)bonePaint.set(s.index,hex.toLowerCase());else bonePaint.delete(s.index);
  updateBoneMaterial(s);if(!batch){updatePaintControls();renderList();queueDraft();}
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
  $('place-hint').textContent='Click any structure to create its label. Esc cancels.';
  $('place-hint').hidden=true;
  updatePaintControls();
}

// Multi-selection is deliberately transient; hidden/fade/paint remain chapter-level.
function multiTargets(){
  if(!teacherMode)return selected?[selected]:[];
  const result=[...multiSelectedIndices].map(i=>structures[i]).filter(Boolean);
  return result.length?result:(selected?[selected]:[]);
}
function clearMultiHighlights(){
  for(const [mesh,material] of multiSelectionHighlights){
    const s=structures.find(item=>item.mesh===mesh);
    if(s)mesh.material=displayMaterial(s);
    disposeMaterial(material);
  }
  multiSelectionHighlights.clear();
}
function syncMultiHighlights(){
  clearMultiHighlights();
  if(!teacherMode||multiSelectedIndices.size<2)return;
  for(const s of multiTargets()){
    if(s===selected||!s.mesh.visible)continue;
    const base=displayMaterial(s);
    if(!base)continue;
    const make=m=>{const copy=m.clone();if(copy.emissive?.isColor){copy.emissive.set('#20bcc6');copy.emissiveIntensity=0.4;}return copy;};
    const highlight=Array.isArray(base)?base.map(make):make(base);
    multiSelectionHighlights.set(s.mesh,highlight);
    s.mesh.material=highlight;
  }
  invalidate(2);
}
function pickMultiSelection(s,event,origin){
  if(!teacherMode||!s)return;
  const additive=event.metaKey||event.ctrlKey;
  if(event.shiftKey&&origin==='list'){
    const ordered=[...elements.boneList.querySelectorAll('button.bone-item[data-structure-index]')]
      .filter(b=>b.getClientRects().length>0) // range-select only expanded, actually visible list rows
      .map(b=>Number(b.dataset.structureIndex)).filter(Number.isInteger);
    const anchor=ordered.indexOf(multiListAnchor)>=0?multiListAnchor:selected?.index;
    const first=ordered.indexOf(anchor),last=ordered.indexOf(s.index);
    if(!additive)multiSelectedIndices.clear();
    if(first>=0&&last>=0)for(let i=Math.min(first,last);i<=Math.max(first,last);i++)multiSelectedIndices.add(ordered[i]);
    else multiSelectedIndices.add(s.index);
  }else if(additive){
    if(multiSelectedIndices.has(s.index))multiSelectedIndices.delete(s.index);
    else multiSelectedIndices.add(s.index);
    multiListAnchor=s.index;
  }else{
    multiSelectedIndices.add(s.index); // Shift-click in the 3D scene adds one mesh.
    multiListAnchor=s.index;
  }
  const current=multiSelectedIndices.has(s.index)?s:multiTargets().find(t=>multiSelectedIndices.has(t.index))||
    [...multiSelectedIndices].map(i=>structures[i]).filter(Boolean).at(-1)||null;
  setSelection(current,true);
}
function paintMultiSelection(hex){
  if(!teacherMode||!multiTargets().length)return;
  const targets=multiTargets();clearMultiHighlights();
  for(const s of targets)setBoneColor(s,hex,true);
  updatePaintControls();renderList();syncMultiHighlights();queueDraft();
  showToast(`${targets.length} structure${targets.length===1?'':'s'} ${hex?'painted':'restored'}.`);
}
function hideMultiSelection(){
  for(const s of multiTargets())hidden.add(s.mesh);
  isolated=false;setSelection(null);queueDraft();
}
function applySkeletonDivision(division){
  if(!teacherMode||!sceneRoot||!['axial','appendicular'].includes(division))return;
  Object.assign(systemLayers,Object.fromEntries(Object.keys(systemLayers).map(key=>[key,key==='skeletal'])));
  setMode('skeleton'); // Reset to Skeletal-only, never enable Connective.
  for(const s of structures)if(s.system==='skeletal'&&!isBaseConnective(s)&&skeletalDivision(s)!==division)hidden.add(s.mesh);
  refreshVisibility();frameVisible('front');
  showToast(division==='axial'?'Axial skeleton only':'Appendicular skeleton only');
}
window.addEventListener('anatomiq:skeletal-preset',event=>applySkeletonDivision(event.detail?.division));

function setSelection(s,preserveMulti=false){
  clearMultiHighlights();
  if(!preserveMulti){multiSelectedIndices.clear();if(teacherMode&&s)multiSelectedIndices.add(s.index);multiListAnchor=null;}
  if(selected){
    selected.mesh.material=displayMaterial(selected);
    disposeMaterial(selectedHighlight);
    selectedHighlight=null;
  }
  selected=s;
  document.dispatchEvent(new CustomEvent('anatomiq:selection-change',{detail:{index:s?.index??null}}));
  $('isolate-selected').textContent='◈   Isolate structure';
  if(s){
    if(displayMaterial(s))highlightSelection(s);
    elements.noSelection.hidden=true;
    elements.selectionContent.hidden=false;
    elements.selName.textContent=teacherMode&&multiSelectedIndices.size>1?`${multiSelectedIndices.size} structures selected`:s.name;
    elements.selSide.textContent=(s.side==='midline'?'Midline':s.side[0].toUpperCase()+s.side.slice(1)+' side')+' · '+s.tissue;
    elements.selCategory.textContent=s.system==='ocular'?'SPECIAL SENSES · EYE':(s.system==='connective'||isBaseConnective(s))?'CONNECTIVE TISSUE':s.system==='cardiovascular'?'CARDIOVASCULAR SYSTEM':s.system==='respiratory'?'RESPIRATORY SYSTEM':s.system==='nervous'?'NERVOUS SYSTEM':s.system==='digestive'?'DIGESTIVE SYSTEM':s.system==='muscular'?(s.layer==='deep muscles'?'DEEP MUSCULAR SYSTEM':'SUPERFICIAL MUSCULAR SYSTEM'):s.tissue==='tooth'?'DENTAL ANATOMY':s.tissue==='cartilage'?'CARTILAGE':'SKELETAL SYSTEM';
    elements.selDesc.textContent=anat249Description(s);
  }else{
    elements.noSelection.hidden=false;
    elements.selectionContent.hidden=true;
  }
  refreshVisibility();
  updatePaintControls();
  syncMultiHighlights();syncFadeDetailsControl();
  if (s && matchMedia('(max-width:850px)').matches && !placingLabel && !paintMode) openDetails(true);
}
// ANATOMIQ_TEACHER_BOX_SELECTION_240 — teacher-only transient selection; no lesson serialization.
window.addEventListener('anatomiq:teacher-box-select',event=>{
  if(!teacherMode||!sceneRoot)return;
  const d=event.detail||{};
  if(![d.x0,d.x1,d.y0,d.y1].every(Number.isFinite))return;
  const x0=Math.max(0,Math.min(1,d.x0)),x1=Math.max(0,Math.min(1,d.x1));
  const y0=Math.max(0,Math.min(1,d.y0)),y1=Math.max(0,Math.min(1,d.y1));
  camera.updateMatrixWorld();sceneRoot.updateMatrixWorld(true);
  const picked=[];
  if(d.point){
    const target=new THREE.Vector2((x0+x1)-1,1-(y0+y1));
    raycaster.setFromCamera(target,camera);
    const hit=raycaster.intersectObjects(currentlyVisible().filter(s=>s.mesh.visible).map(s=>s.mesh),false)[0];
    const one=hit&&structures.find(s=>s.mesh===hit.object);
    if(one)picked.push(one);
  }else{
    const pt=new THREE.Vector3();
    for(const s of currentlyVisible()){
      const mesh=s.mesh,geo=mesh.geometry;
      if(!mesh.visible||!geo?.attributes?.position)continue;
      if(!geo.boundingBox)geo.computeBoundingBox();
      if(!geo.boundingBox||geo.boundingBox.isEmpty())continue;
      mesh.updateWorldMatrix(true,false);
      const b=geo.boundingBox;
      let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,front=0;
      for(const xx of [b.min.x,b.max.x])for(const yy of [b.min.y,b.max.y])for(const zz of [b.min.z,b.max.z]){
        pt.set(xx,yy,zz).applyMatrix4(mesh.matrixWorld).project(camera);
        if(pt.z< -1||pt.z>1)continue;
        front++;
        const xp=(pt.x+1)/2,yp=(1-pt.y)/2;
        minX=Math.min(minX,xp);maxX=Math.max(maxX,xp);minY=Math.min(minY,yp);maxY=Math.max(maxY,yp);
      }
      if(!front||maxX<x0||minX>x1||maxY<y0||minY>y1)continue;
      if(d.contained){
        if(minX>=x0&&maxX<=x1&&minY>=y0&&maxY<=y1)picked.push(s);
        continue;
      }
      // Geometry samples reduce false positives from large oriented mesh bounds.
      // This is intentionally a single pointer-up computation, never animation-frame work.
      const position=geo.attributes.position,count=position.count,stride=Math.max(1,Math.ceil(count/384));
      let touches=false;
      for(let i=0;i<count;i+=stride){
        pt.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld).project(camera);
        if(pt.z>=-1&&pt.z<=1&&(pt.x+1)/2>=x0&&(pt.x+1)/2<=x1&&(1-pt.y)/2>=y0&&(1-pt.y)/2<=y1){touches=true;break;}
      }
      if(!touches){
        // Include broad surfaces that completely enclose a small drag region.
        const cx=(x0+x1)/2,cy=(y0+y1)/2;
        touches=cx>=minX&&cx<=maxX&&cy>=minY&&cy<=maxY;
      }
      if(touches)picked.push(s);
    }
  }
  if(!d.additive)multiSelectedIndices.clear();
  for(const s of picked)multiSelectedIndices.add(s.index);
  const current=picked.at(-1)||[...multiSelectedIndices].map(i=>structures[i]).find(Boolean)||null;
  isolated=false;setSelection(current,true);renderList();
  if(picked.length)showToast(`${multiSelectedIndices.size} structure${multiSelectedIndices.size===1?'':'s'} selected.`);
});

function updateLayerHeading(){
  const layers=effectiveSystemLayers(mode,systemLayers);
  const enabled=[layers.skeletal?'Skeletal':null,layers.superficial||layers.deep?'Muscular':null,layers.digestive?'Digestive':null,layers.cardiovascular?'Cardiovascular':null,layers.respiratory?'Respiratory':null,layers.nervous?'Nervous':null,layers.urinary?'Urinary':null,layers.lymphatic?'Lymphatic':null,layers.connective?'Connective':null,null].filter(Boolean);
  const name=mode==='skull'?'Skull':mode==='skeleton'?'Skeletal system':enabled.length?enabled.join(' + '):'No layers selected';
  elements.title.textContent=name;
  elements.subtitle.textContent=mode==='skull'?'Cranial and facial structures':mode==='skeleton'?'Full skeletal system':'Click system buttons to show or hide layers independently.';
  elements.context.textContent=name;
  elements.tip.textContent='Toggle systems without changing the camera. Click structures to identify, label or paint.';
}
function setMode(newMode){
  divisionNavReset(false);
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
// ANATOMIQ_STUDIO_POLISH_20261024: cancellable, reduced-motion-aware camera transitions.
let polishCameraToken=0;
function polishCancelCamera(){polishCameraToken++;}
renderer.domElement.addEventListener('pointerdown',polishCancelCamera,{passive:true});
renderer.domElement.addEventListener('wheel',polishCancelCamera,{passive:true});
function polishMoveCamera(destination,target,{duration=700,save=true}={}){
  const id=++polishCameraToken;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches || !sceneRoot){
    camera.position.copy(destination);controls.target.copy(target);controls.update();invalidate(3);
    if(save)queueDraft();return;
  }
  const p0=camera.position.clone(),t0=controls.target.clone();
  const p1=destination.clone(),t1=target.clone();
  const v0=p0.sub(t0),v1=p1.sub(t1);
  const r0=Math.max(0.001,v0.length()),r1=Math.max(0.001,v1.length());
  const startDir=v0.normalize(),endDir=v1.normalize();
  const turn=new THREE.Quaternion();
  if(startDir.dot(endDir)<-0.999)turn.setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI);
  else turn.setFromUnitVectors(startDir,endDir);
  const began=performance.now();
  const tick=now=>{
    if(id!==polishCameraToken || document.hidden)return;
    const k=Math.min(1,(now-began)/duration);
    const ease=k<0.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
    const aim=t0.clone().lerp(t1,ease);
    const q=new THREE.Quaternion().slerp(turn,ease);
    const direction=startDir.clone().applyQuaternion(q);
    const radius=r0+(r1-r0)*ease;
    controls.target.copy(aim);
    camera.position.copy(aim).addScaledVector(direction,radius);
    camera.updateProjectionMatrix();controls.update();invalidate(2);
    if(k<1)requestAnimationFrame(tick);
    else if(save)queueDraft();
  };
  requestAnimationFrame(tick);
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
  const destination=center.clone().addScaledVector(direction,d);
  camera.near=Math.max(0.002,d/300);
  camera.far=Math.max(12,d*60);
  if(restoringScene){polishCancelCamera();controls.target.copy(center);camera.position.copy(destination);controls.update();invalidate(2);}
  else polishMoveCamera(destination,center,{save:!transient});
  setPresetActive(view);
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
  const destination=controls.target.clone().add(new THREE.Vector3(...direction).multiplyScalar(distance));
  polishMoveCamera(destination,controls.target.clone());setPresetActive(view);
}
function focusSelected(){const targets=multiTargets();if(targets.length)fitBox(boxFor(targets),activePreset,2.15);}
let anatomyExplorerFilter='all';
let lastExplorerSelectedIndex=null;
function chapterStructureVisible(s){
  // Ignores temporary division masking: report the chapter's actual visibility settings.
  return layerEnabled(s) && tissueVisible(s) && !hidden.has(s.mesh) && !s.mesh.userData?.deferredAsset;
}
function toggleExplorerStructure(s){
  if(!teacherMode)return;
  if(divisionScope)divisionClose();
  if(!layerEnabled(s)||!tissueVisible(s)){
    showToast('Enable this anatomy system in View before showing its structures.');return;
  }
  if(hidden.has(s.mesh))hidden.delete(s.mesh);
  else if(s.mesh.visible)hidden.add(s.mesh);
  else {isolated=false;hidden.delete(s.mesh);}
  refreshVisibility();
}
function renderList(){
  const text=teacherMode || studentPermissions.ss ? elements.search.value.trim().toLowerCase() : '';
  document.body.classList.toggle('student-has-query',!teacherMode && Boolean(text));
  // Teachers can browse all loaded systems, including chapters that currently hide them.
  // Student visibility and identification permissions remain exactly as before.
  const trackSelectedInExplorer=Boolean(teacherMode && selected && selected.index!==lastExplorerSelectedIndex);
  if(trackSelectedInExplorer){
    // Find hidden selections too: adjust the filter before computing matching entries.
    expandToStructure(treeExpanded,selected);
    if(anatomyExplorerFilter==='visible'&&!chapterStructureVisible(selected))anatomyExplorerFilter='all';
    lastExplorerSelectedIndex=selected.index;
  }else if(teacherMode&&!selected){lastExplorerSelectedIndex=null;}
  const available=teacherMode ? structures : currentStructures().filter(s=>tissueVisible(s));
  const found=available.filter(s=>s.name.toLowerCase().includes(text)
    && (teacherMode ? (anatomyExplorerFilter==='all'||chapterStructureVisible(s)) : (studentExplore||s.mesh.visible)));
  elements.count.textContent=found.length;
  elements.clearSearch.hidden=!elements.search.value;
  const frag=document.createDocumentFragment();
  if(teacherMode){
    const toolbar=document.createElement('div');toolbar.className='anat-explorer-toolbar';
    const title=document.createElement('span');title.textContent='Browse';title.className='anat-explorer-title';
    const filter=document.createElement('select');filter.className='anat-explorer-filter';filter.setAttribute('aria-label','Anatomical structures filter');
    for(const [value,label] of [['all','All Structures'],['visible','Visible in Chapter']]){
      const option=document.createElement('option');option.value=value;option.textContent=label;filter.append(option);
    }
    filter.value=anatomyExplorerFilter;
    filter.addEventListener('change',()=>{anatomyExplorerFilter=filter.value;renderList();});
    toolbar.append(title,filter);
    if(divisionScope){
      const restore=document.createElement('button');restore.type='button';restore.className='anat-explorer-restore';
      restore.textContent='Show original view';restore.addEventListener('click',divisionClose);toolbar.append(restore);
    }
    frag.append(toolbar);
  }else if(divisionScope && divisionCanBrowse()){
    // Students who can navigate divisions must retain a way out after retiring the top breadcrumb.
    const restore=document.createElement('button');restore.type='button';restore.className='anat-explorer-restore';
    restore.textContent='Show original view';restore.addEventListener('click',divisionClose);
    frag.append(restore);
  }
  if(!teacherMode && !studentPermissions.st && !text){
    const p=document.createElement('p');p.className='empty-list';p.textContent='Search for a structure above.';frag.appendChild(p);
  }else if(!found.length){
    const p=document.createElement('p');p.className='empty-list';p.textContent='No matching structures found.';frag.appendChild(p);
  }
  const createBoneButton=s=>{
    const b=document.createElement('button');b.dataset.structureIndex=s.index;b.className='bone-item'+(selected===s?' active':'')+(teacherMode&&multiSelectedIndices.has(s.index)?' multi-selected':'');
    b.setAttribute('aria-pressed',String(teacherMode?multiSelectedIndices.has(s.index):selected===s));
    const t=document.createElement('span');t.textContent=studentAllowed('sn') ? s.name : `Structure ${s.index+1}`;b.appendChild(t);
    if(teacherMode){
      const displayStatus=document.createElement('span');displayStatus.className='anat-explorer-status'+(chapterStructureVisible(s)?' is-visible':' is-hidden');
      displayStatus.textContent=chapterStructureVisible(s)?'Visible':'Hidden';b.append(displayStatus);
    }
    if(bonePaint.has(s.index)){
      const chip=document.createElement('span');chip.className='paint-list-dot';
      chip.style.backgroundColor=bonePaint.get(s.index);chip.setAttribute('aria-label',`Painted ${bonePaint.get(s.index)}`);
      chip.title=`Bone color: ${bonePaint.get(s.index)}`;b.appendChild(chip);
    }
    b.addEventListener('click',event=>{
      if(teacherMode&&(event.shiftKey||event.metaKey||event.ctrlKey)){
        event.preventDefault();isolated=false;pickMultiSelection(s,event,'list');return;
      }
      if(!teacherMode&&studentExplore)hidden.delete(s.mesh);
      if(teacherMode)multiListAnchor=s.index;
      isolated=false;
      if(studentAllowed('sn')){setSelection(s);if(teacherMode)multiListAnchor=s.index;focusSelected();}
      else {setSelection(null);fitBox(boxFor([s]),activePreset,2.2);}
      if(innerWidth<630)elements.sidebar.classList.remove('open');
    });
    if(!teacherMode)return b;
    const row=document.createElement('div');row.className='anat-explorer-row';
    row.append(b);
    const eye=document.createElement('button');eye.type='button';eye.className='anat-explorer-eye';
    const canShow=layerEnabled(s)&&tissueVisible(s)&&!s.mesh.userData?.deferredAsset;
    const isShown=chapterStructureVisible(s);
    eye.textContent=isShown?'◉':'○';eye.disabled=!canShow;
    eye.title=!canShow?'Enable this structure’s system in View first':isShown?'Hide structure in chapter':'Show structure in chapter';
    eye.setAttribute('aria-label',eye.title);eye.setAttribute('aria-pressed',String(isShown));
    eye.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();toggleExplorerStructure(s);});
    row.append(eye);
    return row;
  };
  if((teacherMode || (studentPermissions.st && studentPermissions.sn)) && found.length){
    // ANATOMIQ_SINGLE_EXPLORER_2220: sidebar is the only full anatomy hierarchy.
    // View isolates temporarily; visibility button edits the chapter explicitly.
    renderAnatomySidebar(frag,found,{
      createItem:createBoneButton,
      onView:path=>divisionOpen(path),
      expanded:treeExpanded,
      selected,
      activePath:divisionScope?divisionBrowsePath:[],
      searching:Boolean(text),
      document
    });
  }else if(!teacherMode && studentPermissions.st && !text){
    // Compatibility: teacher can permit student tree browsing without revealing structure names.
    // Keep the older anonymous tissue/side hierarchy whenever studentPermissions.sn is false.
    // Each anatomical name remains governed by the separate 'identify' permission.
    const tissueGroups=new Map();
    for(const s of found){
      const tissue=s.system==='ocular'?'Nervous · Special Senses — Eyes':(s.system==='connective'||isBaseConnective(s))?({'cartilage':'Costal cartilage','joint_ligament':'Ligaments','tendon_retinaculum':'Tendons & retinacula','membrane_fascia':'Interosseous membranes'}[s.organId]||'Cartilage / connective'):s.system==='cardiovascular'?({'heart-internal':'Heart: valves & cavities',heart:'Heart walls',pulmonary:'Pulmonary circulation',coronary:'Coronary circulation',systemic:'Systemic vessels',nonvascular:'Nonvascular source anatomy'}[s.cardioGroup]||'Cardiovascular structures'):s.system==='respiratory'?({'lung':'Lung segments','airway':'Bronchi & airways','trachea':'Trachea','larynx':'Larynx','upper':'Upper respiratory','associated':'Respiratory-associated structures'}[s.organId]||'Respiratory structures'):s.system==='lymphatic'?({'spleen':'Spleen','thymus':'Thymus'}[s.organId]||'Lymphatic structures'):s.system==='urinary'?({'kidney':'Kidneys','ureter':'Ureters','bladder':'Urinary bladder','urethra':'Urethra'}[s.organId]||'Urinary structures'):s.system==='nervous'?({'brain':'Brain regions','spinal_cord':'Spinal cord','peripheral':'Cranial and peripheral nerves','meninges':'Meninges / dural folds'}[s.organId]||'Nervous system'):s.system==='digestive'?'Digestive organs':s.system==='muscular'?(s.layer==='deep muscles'?'Deep muscles':'Superficial muscles'):s.tissue==='tooth'?'Teeth':s.tissue==='cartilage'?'Cartilage':'Bones';
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
  if(teacherMode && trackSelectedInExplorer){
    requestAnimationFrame(()=>{
      const row=[...elements.boneList.querySelectorAll('button.bone-item[data-structure-index]')].find(b=>Number(b.dataset.structureIndex)===selected?.index);
      row?.scrollIntoView({block:'nearest'});
    });
  }
}

let press={x:0,y:0};
renderer.domElement.addEventListener('pointerdown',event=>{press={x:event.clientX,y:event.clientY};});
renderer.domElement.addEventListener('pointerup',event=>{
  if(!sceneRoot || Math.hypot(event.clientX-press.x,event.clientY-press.y)>6)return;
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
  raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObjects(currentlyVisible().map(s=>s.mesh),false)[0];
  if(!hit){
    // ANATOMIQ_SELECTION_STUDENT_251: empty-canvas click deselects without changing Orbit.
    if(!placingLabel && !paintMode){isolated=false;setSelection(null);}
    return;
  }
  if(!teacherMode && !studentPermissions.sn)return;
  const s=structures.find(x=>x.mesh===hit.object);
  if(!s)return;
  if(teacherMode&&(event.shiftKey||event.metaKey||event.ctrlKey)&&!placingLabel){
    isolated=false;pickMultiSelection(s,event,'model');return;
  }
  if(paintMode && teacherMode){
    setBoneColor(s,paintColor);isolated=false;setSelection(s);
  } else if(placingLabel && teacherMode){
    // Works for every named clickable structure, not just skeletal bones.
    const local=hit.object.worldToLocal(hit.point.clone());
    const anchor={s:s.index,p:local.toArray().map(n=>round(n,5)),...(hit.face?.normal?{ln:hit.face.normal.toArray().map(n=>round(n,5))}:{})};
    if(labelPlacementMode==='group'){
      if(groupPendingAnchors.some(a=>a.s===s.index)){
        showToast(`${s.name} is already in this group.`);return;
      }
      if(groupPendingAnchors.length>=64){showToast('A group can contain up to 64 structures.');return;}
      groupPendingAnchors.push(anchor);
      setSelection(s);updateGroupLabelStatus();
    }else{
      practicalNewLabelExpand=labelSequence+1;
      labels.push({id:++labelSequence,qi:newPracticalLabelId(),...anchor,t:s.name.trim().slice(0,100)||'Unnamed structure',dx:24,dy:-31});
      cancelPlacing();setSelection(s);renderAnnotations();renderLabelEditor();queueDraft();
      showToast('Label created. Edit its name in Custom Labels.');
    }
  } else {isolated=false;setSelection(s);} 
});
// ANATOMIQ_TRIQUETRUM_244 — The only added skeletal assets are two approved triquetra.
async function loadTriquetrumExtension(){
  const r=await fetch('./models/triquetrum-extension.json?rev=245',{cache:'no-cache'});
  if(!r.ok||/text\/html/i.test(r.headers.get('content-type')||''))throw new Error('Missing models/triquetrum-extension.json. Publish this asset with app.js before opening lessons.');
  const data=await r.json();
  triquetrumEntries=createTriquetrumEntries(THREE,scene,data,applySurfaceFinish,surfaceMode,boneSurfaceController,materials);
  if(triquetrumEntries.length!==2)throw new Error('Triquetrum extension did not register both sides.');
  window.__AnatomIQTriquetrumStatus={loaded:true,sourceIds:triquetrumEntries.map(s=>s.sourceName),count:triquetrumEntries.length};
  console.info('AnatomIQ: left/right triquetra registered as append-only skeletal structures.');
}
function prepareStructures(root){
  // Triquetra join the shared catalog at the end, never inside the sorted legacy skeleton.
  const found=[];
  eyeStructures=[];
  root.traverse(obj=>{
    if(!obj.isMesh)return;
    const meta=obj.userData||{};
    if(String(meta.tissue||'').toLowerCase()==='eye'){
      const name=(meta.name||obj.name||'Eye').trim();
      eyeStructures.push({mesh:obj,name,side:meta.side||'midline',tissue:'eye',
        system:'ocular',layer:'eyes',skull:false});
      materials.set(obj,obj.material);obj.visible=false;
      return;
    }
    if(!['skeleton','deep muscles','superficial muscles'].includes(meta.layer)){
      obj.visible=false;return;
    }
    const system=meta.layer==='skeleton'?'skeletal':'muscular';
    const tissue=system==='muscular'?'muscle':(meta.tissue||'bone');
    if(tissue==='eye'){obj.visible=false;return;} // Defensive legacy fallback for malformed metadata
    const name=(meta.name||obj.name||'Unnamed structure').trim();
    found.push({mesh:obj,name,side:meta.side||'midline',tissue,
      system,layer:meta.layer,skull:system==='skeletal'&&isSkull(name,tissue)});
    materials.set(obj,obj.material);
  });
  // Append muscles AFTER the exact legacy skeleton ordering. This preserves
  // label/paint structure indices from 0.3–0.9 and permits older shared scenes.
  const catalog=catalogAnatomy([...found,...digestiveSourceEntries,...detailEntries,...cardioEntries,...respiratoryEntriesList,...nervousEntriesList,...urinaryEntriesList,...lymphaticEntriesList,...connectiveEntriesList,...eyeStructures,...triquetrumEntries]);
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
  window.__AnatomIQEyeStatus={version:'2.2.13',source:'Original Écorché GLB',structures:eyeStructures.length,
    names:eyeStructures.map(s=>s.name),indices:structures.filter(s=>s.system==='ocular').map(s=>s.index)};
  console.info('AnatomIQ Eyes:',eyeStructures.length,'source-native eye structures registered.');
  console.info(`Anatomy Studio: ${legacyStructureCount} skeletal structures; ${baseStructureCount-legacyStructureCount} muscles, ${catalog.digestiveCount} digestive meshes; ${catalog.cardiovascularCount} cardiovascular meshes; ${catalog.respiratoryCount} respiratory meshes; ${catalog.nervousCount} nervous meshes; ${catalog.urinaryCount} urinary meshes; ${catalog.lymphaticCount} lymphatic meshes; ${catalog.connectiveCount} connective meshes; ${structures.filter(x=>x.skull).length} skull structures`);
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
      // New meninges default hidden; older scene visibility/labels stay authoritative on restore.
      if(entry.organId==='meninges')hidden.add(mesh);
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
      const nervousVisualStyle=nervousMaterialOverrides(entry);
      mesh.material=new THREE.MeshStandardMaterial({color:nervousColor(entry),metalness:0,roughness:nervousVisualStyle.roughness,side:THREE.DoubleSide,transparent:nervousVisualStyle.transparent,opacity:nervousVisualStyle.opacity,depthWrite:nervousVisualStyle.depthWrite});
      applySurfaceFinish(mesh.material,'nervous',surfaceMode);
      if(Array.isArray(original))original.forEach(m=>m?.dispose());else original?.dispose();
      materials.set(mesh,mesh.material);mesh.visible=false;
      // New meninges default hidden; older scene visibility/labels stay authoritative on restore.
      if(entry.organId==='meninges')hidden.add(mesh);
    }
    nervousEntriesList=entries;nervousAvailable=true;nervousLoaded=true;
    configureAnatomyShadows(nervousRoot,shadows.profile.enabled);
  }catch(error){
    console.warn('Optional nervous-system model missing or inconsistent',error);
    if(nervousRoot){scene.remove(nervousRoot);nervousRoot=null;}
  }
}
async function loadUrinary(){
  urinaryLoaded=false;urinaryAvailable=false;urinaryEntriesList=[];
  if(urinaryRoot){scene.remove(urinaryRoot);urinaryRoot=null;}
  try{
    const response=await fetch(URINARY_MANIFEST,{cache:'no-cache'});
    if(!response.ok||/text\/html/i.test(response.headers.get('content-type')||''))return;
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
async function loadLymphatic(){
  lymphaticLoaded=false;lymphaticAvailable=false;lymphaticEntriesList=[];
  if(lymphaticRoot){scene.remove(lymphaticRoot);lymphaticRoot=null;}
  try{
    const response=await fetch(LYMPHATIC_MANIFEST,{cache:'no-cache'});
    if(!response.ok||/text\/html/i.test(response.headers.get('content-type')||''))return;
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
async function loadConnective(){
  connectiveLoaded=false;connectiveAvailable=false;connectiveEntriesList=[];connectiveLoadError='';
  window.__AnatomIQConnectiveStatus={loaded:false,stage:'fetching manifest',version:'2.2.11'};
  if(connectiveRoot){scene.remove(connectiveRoot);connectiveRoot=null;}
  try{
    const manifest=await readOptionalManifest(CONNECTIVE_MANIFEST,validateConnectiveManifest);
    if(!manifest)throw new Error('Connective metadata was unavailable or rejected; inspect the Console and the published manifest.');
    const requested=connectiveGeometry==='detailed'?CONNECTIVE_DETAILED:CONNECTIVE_STANDARD;
    let gltf;
    try{gltf=await new GLTFLoader().loadAsync(requested);}
    catch(error){if(requested===CONNECTIVE_STANDARD)throw error;gltf=await new GLTFLoader().loadAsync(CONNECTIVE_STANDARD);}
    window.__AnatomIQConnectiveStatus={loaded:false,stage:'validating GLB',version:'2.2.11',manifestStructures:manifest.structures.length};
    const entries=connectiveEntries(gltf.scene,manifest);
    const alignment=correctedDetailTransform(sourceRegistration(new THREE.Box3().setFromObject(sceneRoot)));
    gltf.scene.scale.set(...alignment.scale);gltf.scene.position.set(...alignment.position);
    scene.add(gltf.scene);connectiveRoot=gltf.scene;
    const costalAppearance=sourceCostalCartilageAppearance(sceneRoot,THREE);
    if(costalAppearance)console.info("AnatomIQ: matched rib 8–10 cartilage appearance to Écorché rib 1–7 (",costalAppearance.sourceMeshSamples,"source vertex samples).");
    for(const entry of entries){
      const mesh=entry.mesh;
      if(mesh.geometry?.attributes?.position&&!mesh.geometry.attributes.normal)mesh.geometry.computeVertexNormals();
      const original=mesh.material;
      mesh.material=new THREE.MeshStandardMaterial({
        color:entry.organId==='cartilage' && costalAppearance ? costalAppearance.color : connectiveColor(entry),
        roughness:entry.organId==='cartilage' && costalAppearance ? costalAppearance.roughness : 0.65,
        metalness:0,side:THREE.DoubleSide
      });
      applySurfaceFinish(mesh.material,'skeletal',surfaceMode);
      if(Array.isArray(original))original.forEach(m=>m?.dispose());else original?.dispose();
      materials.set(mesh,mesh.material);mesh.visible=false;
    }
    connectiveEntriesList=entries;connectiveAvailable=true;connectiveLoaded=true;connectiveLoadError='';
    window.__AnatomIQConnectiveStatus={loaded:true,stage:'complete',version:'2.2.11',structures:entries.length,model:requested};
    console.info('AnatomIQ Connective: successfully loaded',entries.length,'meshes from',requested);
    configureAnatomyShadows(connectiveRoot,shadows.profile.enabled);
  }catch(error){
    connectiveLoadError=String(error?.message||error);
    window.__AnatomIQConnectiveStatus={loaded:false,stage:'failed',version:'2.2.11',error:connectiveLoadError};
    console.error('AnatomIQ Connective: failed to load 14 source meshes:',error);
    if(connectiveRoot){scene.remove(connectiveRoot);connectiveRoot=null;}
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
      if(boneSurfaceController && isAnatomicalBone(structure.mesh))boneSurfaceController.register(structure.mesh,newMaterial);
      materials.set(structure.mesh,structure.mesh.material);
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
  connectiveMetadata=await readOptionalManifest(CONNECTIVE_MANIFEST,validateConnectiveManifest);
  if(connectiveMetadata){connectiveEntriesList=connectiveEntries(asVirtualRoot(connectiveMetadata.structures.map(s=>s.id)),connectiveMetadata);connectiveAvailable=true;}
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
  lymphaticMetadata=await readOptionalManifest(LYMPHATIC_MANIFEST,validateLymphaticManifest);
  if(lymphaticMetadata){lymphaticEntriesList=lymphaticEntries(asVirtualRoot(lymphaticMetadata.structures.map(s=>s.id)),lymphaticMetadata);lymphaticAvailable=true;}
  urinaryMetadata=await readOptionalManifest(URINARY_MANIFEST,validateUrinaryManifest);
  if(urinaryMetadata){urinaryEntriesList=urinaryEntries(asVirtualRoot(urinaryMetadata.structures.map(s=>s.id)),urinaryMetadata);urinaryAvailable=true;}
  nervMetadata=await readOptionalManifest(NERVOUS_MANIFEST,validateNervousManifest);
  if(nervMetadata){
    nervousEntriesList=nervousEntries(asVirtualRoot(nervMetadata.structures.map(s=>s.id)),nervMetadata);
    nervousAvailable=true;
  }
}
function restoreDeferredReferences(system,realEntries){
  // Do not rebuild or reorder the structures array: indices are used by every
  // published annotation, visibility bitmap and paint override.
  const existing=structures.filter(s=>system==='legacy'?s.system==='digestive'&&s.layer!=='digestive-detail':system==='detailed'?s.layer==='digestive-detail':system==='cardiovascular'?s.system==='cardiovascular':system==='respiratory'?s.system==='respiratory':system==='nervous'?s.system==='nervous':system==='lymphatic'?s.system==='lymphatic':system==='connective'?s.system==='connective':s.system==='urinary');
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
  if(kind==='connective'){
    if(connectiveLoaded)return;
    await loadConnective();
    if(!connectiveLoaded)throw new Error('This lesson needs matching connective GLBs and manifest.');
    restoreDeferredReferences('connective',connectiveEntriesList);
  }else if(kind==='legacyDigestive'){
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
  }else if(kind==='lymphatic'){
    if(lymphaticLoaded)return;
    await loadLymphatic();
    if(!lymphaticLoaded)throw new Error('Missing lymphatic models; publish matching GLBs and JSON.');
    restoreDeferredReferences('lymphatic',lymphaticEntriesList);
  }else if(kind==='urinary'){
    if(urinaryLoaded)return;
    await loadUrinary();
    if(!urinaryLoaded)throw new Error('Missing urinary models; publish both GLBs and urinary-structures.json.');
    restoreDeferredReferences('urinary',urinaryEntriesList);
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
  for(const type of ['legacyDigestive','detailedDigestive','cardiovascular','respiratory','nervous','urinary','lymphatic','connective'])if(needed[type])await loadNeededAsset(type);
  if(needed.skull && skullGeometry==='detailed' && !skullDetailStats)await loadHighResolutionSkull();
}
let studentStartupAttempts=0;
async function loadAnatomy(){
  if(!teacherMode){
    window.__AnatomIQStudentReadiness={stage:'loading',attempt:studentStartupAttempts+1,maxAttempts:3};
  }
  elements.loader.hidden=false;elements.retry.hidden=true;elements.loadTitle.textContent='Preparing the anatomy viewer';
  elements.loadDesc.textContent='Loading anatomy for this lesson. Additional systems load when needed.';
  elements.loadText.textContent='Connecting to model source…';elements.progress.style.width='3%';
  setStatus(navigator.onLine?'Loading model':'Offline',navigator.onLine?'':'error');
  try{
    // Parse the published lesson before fetching GLBs. A malformed link can
    // now fail immediately without downloading anatomy assets.
    if(!teacherMode && !studentProjectAtStartup){
      if(location.hash.startsWith('#lesson=')){
        activeLiveLessonRef=parsePublicReference(location.hash);
        elements.loadDesc.textContent='Checking the latest published lesson on GitHub…';
        const live=await fetchPublicLesson(activeLiveLessonRef);
        studentProjectAtStartup=live.project;
        if(live.offline)elements.loadDesc.textContent='Offline: using the most recently cached published lesson.';
      }else studentProjectAtStartup=await decodeScene(location.hash.slice('#scene='.length));
    }
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
    boneSurfaceController=createBoneAppearanceController(sceneRoot,THREE,boneAppearance);
    window.__AnatomIQBoneStatus=()=>boneSurfaceController?.status?.()||{ready:false};
    console.info('AnatomIQ Natural Bone satin v3 status:',window.__AnatomIQBoneStatus()); // ANATOMIQ_NATURAL_BONE_SATIN_20261025 // ANATOMIQ_BONE_SATIN_SELECTOR_REPAIR_R4 // ANATOMIQ_NATURAL_BONE_PROMOTED_V1
    configureAnatomyShadows(sceneRoot,shadows.profile.enabled);
    if(teacherMode){
      // Teacher editing retains all systems for editing and publishing.
      await loadDigestiveModel();await loadDetailedDigestive();await loadCardiovascular();await loadRespiratory();await loadNervous();await loadUrinary();await loadLymphatic();await loadConnective();
    }else{
      await createDeferredCatalog();
      const start=studentProjectAtStartup.v===1?studentProjectAtStartup:studentProjectAtStartup.chapters[studentProjectAtStartup.start];
      const requirements=chapterAssets(start);
      if(requirements.legacyDigestive)await loadDigestiveModel();
      if(requirements.detailedDigestive)await loadDetailedDigestive();
      if(requirements.cardiovascular)await loadCardiovascular();
      if(requirements.respiratory)await loadRespiratory();
      if(requirements.nervous)await loadNervous();
      if(requirements.urinary)await loadUrinary();
      if(requirements.lymphatic)await loadLymphatic();
       if(requirements.connective)await loadConnective();
    }
    await loadTriquetrumExtension();
    prepareStructures(sceneRoot);
    if(!teacherMode){
      // The published schema has not changed; metadata-only meshes must
      // reproduce its exact original fingerprint. Fall back safely on older
      // atlas variants instead of assigning labels to incorrect structures.
      const sample=studentProjectAtStartup.v===1?studentProjectAtStartup:studentProjectAtStartup.chapters[0];
      if(!sceneModelCompatible(sample,structures.length,sceneFingerprint,legacyStructureCount,legacyFingerprint,baseStructureCount,baseFingerprint,previousStructureCount,previousFingerprint,preCardioStructureCount,preCardioFingerprint,originalCardioStructureCount,originalCardioFingerprint,structures)){
        console.warn('Deferred catalog differs from published lesson; verifying real anatomy files for backward compatibility.');
        await loadDigestiveModel();await loadDetailedDigestive();await loadCardiovascular();await loadRespiratory();await loadNervous();await loadUrinary();await loadLymphatic();await loadConnective();
        prepareStructures(sceneRoot);
      }
    }
    if(teacherMode||(skullGeometry==='detailed' && chapterAssets(studentProjectAtStartup.v===1?studentProjectAtStartup:studentProjectAtStartup.chapters[studentProjectAtStartup.start]).skull))await loadHighResolutionSkull();
    // ANATOMIQ_REALISTIC_EYES_2214: update visual surfaces of the original
    // four selectable eye anchors, without altering mesh identity or catalog IDs.
    // If the optional external texture cannot load, native gray eyes remain.
    if(eyeStructures.length){
      try{
        const eyeInfo=await installRealisticEyeSurfaces(THREE,
          ()=>new GLTFLoader().loadAsync(REALISTIC_EYE_MODEL),eyeStructures,materials);
        window.__AnatomIQEyeStatus={...window.__AnatomIQEyeStatus,
          ...eyeInfo,version:'2.2.15',rendering:'polished external eyes · Nervous / special senses',system:'nervous'};
        console.info('AnatomIQ Eyes: realistic textures applied to existing 4 native anchors.',eyeInfo);
      }catch(error){
        window.__AnatomIQEyeStatus={...window.__AnatomIQEyeStatus,
          version:'2.2.15',rendering:'original native eyes',system:'nervous',realisticLoaded:false,
          realisticError:String(error?.message||error)};
        console.warn('Realistic eyes unavailable; retaining native eye surfaces.',error);
      }
    }
    await initializeStudioScene();
    if(!sceneRoot||!structures.length)throw new Error('3D anatomy is not yet ready.');
    if(!teacherMode){
      window.__AnatomIQStudentReadiness={stage:'ready',attempt:studentStartupAttempts+1,maxAttempts:3,structures:structures.length};
      // Two animation frames when foregrounded, or a short timeout when the
      // PWA is backgrounded. Do not strand an iPad on an infinite spinner.
      await Promise.race([
        new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))),
        new Promise(resolve=>setTimeout(resolve,450))
      ]);
    }
    elements.loader.hidden=true;
    studentStartupAttempts=0;
    setStatus(teacherMode?'Studio ready':'Student view');
    elements.offlineButton.hidden=false;
    if(teacherMode)cacheOffline(); // Student offline prep is opt-in, never a hidden whole-lesson download.
    else elements.offlineButton.textContent='Save lesson offline';
  }catch(err){
    console.warn('AnatomIQ startup attempt failed',err);
    const message=String(err?.message||err||'');
    const permanent=/invalid (?:live |published )?lesson|incompatible anatomical model|anatomical structure changed|malformed live lesson|missing owner|invalid branch|exceeds 160|not a live lesson|could not retrieve github lesson: this lesson has not been published/i.test(message);
    if(!teacherMode && navigator.onLine!==false && !permanent && studentStartupAttempts<2){
      studentStartupAttempts++;
      window.__AnatomIQStudentReadiness={stage:'retrying',attempt:studentStartupAttempts+1,maxAttempts:3};
      elements.loader.hidden=false;
      elements.retry.hidden=true;
      elements.loadTitle.textContent='Preparing your anatomy lesson';
      elements.loadDesc.textContent='Waiting for the 3D models to become available. No action needed.';
      elements.loadText.textContent=`Checking anatomy files · attempt ${studentStartupAttempts+1} of 3`;
      elements.progress.style.width='12%';
      setStatus('Preparing student lesson');
      await new Promise(resolve=>setTimeout(resolve,600*studentStartupAttempts));
      return loadAnatomy();
    }
    console.error('AnatomIQ student startup failed',err);
    if(!teacherMode){
      window.__AnatomIQStudentReadiness={stage:'error',attempt:studentStartupAttempts+1,maxAttempts:3,error:message};
    }
    elements.loader.hidden=false;elements.loadTitle.textContent='Unable to open anatomy scene';
    elements.loadDesc.textContent=(!teacherMode&&sceneRoot)
      ? 'This lesson requires anatomy assets that could not be loaded. Check your connection or ask the teacher to verify their GitHub files.'
      : 'Check your internet connection for the first visit. The PWA can use its cached model offline afterward.';
    elements.loadText.textContent=String(err?.message||'3D model unavailable');
    elements.progress.style.width='0%';elements.retry.hidden=false;
    setStatus('Model unavailable','error');
  }
}

// ANATOMIQ_CONNECTIVE_2211_VISIBILITY: recover a stale legacy snapshot only on an explicit teacher action.
// NEVER clear the global hidden set: other systems and authored exclusions remain.
function revealStaleConnectiveOnTeacherAction(){
  if(!teacherMode||!legacyConnectiveVisibilityPending||!connectiveLoaded||!connectiveAvailable)return;
  // Recover only the unmistakable all-native-hidden case. A partially hidden
  // Connective selection may be an intentional teacher-created practical.
  const restored=recoverLegacyConnectiveHidden(hidden,connectiveEntriesList);
  legacyConnectiveVisibilityPending=false;
  if(restored)console.info('AnatomIQ: restored',restored,'previously hidden native Connective structures from an older draft.');
}
// Native-connective study presets, retaining skeletal context if the teacher wishes.
for(const button of document.querySelectorAll('[data-connective-preset]'))button.addEventListener('click',()=>{
  if(!teacherMode)return;
  connectivePreset=button.dataset.connectivePreset;
  mode='systems';systemLayers.connective=true;
  revealStaleConnectiveOnTeacherAction();
  updateLayerHeading();updateSystemControls();refreshVisibility();
  frameVisible('front');queueDraft();
});
// Exactly one Connective quality listener (outside recurring settings refreshes).
$('settings-connective-geometry').addEventListener('change',()=>{
 const next=$('settings-connective-geometry').value==='detailed'?'detailed':'standard';
 if(next===connectiveGeometry)return;
 if(teacherMode)saveDraft(false);
 try{localStorage.setItem(CONNECTIVE_QUALITY_KEY,next);}catch{}
 location.reload();
});
// Focus just the source-native eyes without changing current anatomy visibility.
$('eye-focus').addEventListener('click',()=>{
  if(!teacherMode||!eyeStructures.length)return;
  const items=structures.filter(s=>s.system==='ocular'&&s.mesh.visible);
  if(!items.length){showToast('Enable Nervous to focus on the eyes.');return;}
  fitBox(boxFor(items),'front',2.15);
});
// Independent visibility toggles. Keep the camera, labels, colors, and hidden-mesh edits intact.
async function changeSystemLayer(system){
  divisionNavReset(false);
  if(!sceneRoot||studentAssetBusy||(!teacherMode&&!studentExplore&&studentPermissions.ot===false))return;
  if(!teacherMode && (system==='digestive' || system==='cardiovascular'||system==='respiratory'||system==='nervous'||system==='urinary'||system==='lymphatic'||system==='connective')){
    const type=system==='digestive'?'detailedDigestive':system==='respiratory'?'respiratory':system==='nervous'?'nervous':system==='urinary'?'urinary':system==='lymphatic'?'lymphatic':system==='connective'?'connective':'cardiovascular';
    const active=system==='digestive'?systemLayers.digestive:system==='respiratory'?systemLayers.respiratory:system==='nervous'?systemLayers.nervous:system==='urinary'?systemLayers.urinary:system==='lymphatic'?systemLayers.lymphatic:system==='connective'?systemLayers.connective:systemLayers.cardiovascular;
    if(!active && (system!=='connective'||connectiveAvailable)){
      studentAssetBusy=true;
      setStatus('Loading '+system+' model');
      try{await loadNeededAsset(type);}
      catch(error){showToast(error.message);setStatus('Student view');return;}
      finally{studentAssetBusy=false;}
      setStatus('Student view');
    }
  }
  let next;
  try{next=toggleAnatomySystem(mode,systemLayers,system,detailAvailable,cardioAvailable,respiratoryAvailable,nervousAvailable,urinaryAvailable,lymphaticAvailable,true);}catch(e){showToast(e.message);return;}
  const priorCount=currentlyVisible().length;
  const enablingConnective=system==='connective' && next.connective && !effectiveSystemLayers(mode,systemLayers).connective;
  // Earlier scenes have no eye visibility bits; only restore the unmistakable
  // all-hidden original-eye case, never a teacher's partial eye selection.
  if(system==='nervous'&&next.nervous&&!systemLayers.nervous&&legacyEyeVisibilityPending){
    const originals=structures.filter(entry=>entry.system==='ocular');
    if(originals.length&&originals.every(entry=>hidden.has(entry.mesh))){
      for(const entry of originals)hidden.delete(entry.mesh);
    }
    legacyEyeVisibilityPending=false;
  }
  Object.assign(systemLayers,next);
  mode='systems';
  if(enablingConnective)revealStaleConnectiveOnTeacherAction(); // New scenes use independent layers; legacy presets are read-only compatibility modes.
  if(system==='digestive'&&systemLayers.digestive){detailEnabled=true;detailLayerExplicitlyChanged=true;}
  if(selected&&!layerEnabled(selected))setSelection(null);
  isolated=false;
  updateLayerHeading();
  updateSystemControls();
  refreshVisibility();
  // Frame the scene only when turning on the first system; otherwise don't move the camera.
  if(priorCount===0&&currentlyVisible().length)frameVisible(activePreset||'front');
}
for(const system of ['skeletal','muscular','digestive','cardiovascular','respiratory','nervous','urinary','lymphatic','connective']){
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
$('settings-lymphatic-geometry').value=lymphaticGeometry;
$('settings-connective-geometry').value=connectiveGeometry;
$('settings-lymphatic-geometry').addEventListener('change',()=>{const next=$('settings-lymphatic-geometry').value==='detailed'?'detailed':'standard';if(next===lymphaticGeometry)return;if(teacherMode)saveDraft(false);try{localStorage.setItem(LYMPHATIC_QUALITY_KEY,next);}catch{}location.reload();});
$('settings-urinary-geometry').value=urinaryGeometry;
$('settings-urinary-geometry').addEventListener('change',()=>{const next=$('settings-urinary-geometry').value==='detailed'?'detailed':'standard';if(next===urinaryGeometry)return;if(teacherMode)saveDraft(false);try{localStorage.setItem(URINARY_QUALITY_KEY,next);}catch{}location.reload();});
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
$('restore-all').addEventListener('click',()=>{divisionNavReset(false);if(!teacherMode&&!studentExplore)return;hidden.clear();isolated=false;refreshVisibility();frameVisible('front');});
$('focus-selected').addEventListener('click',focusSelected);
$('fade-selected').addEventListener('click',polishToggleSelectedFade);
$('isolate-selected').addEventListener('click',()=>{if((!teacherMode&&!studentExplore)||!selected)return;isolated=!isolated;refreshVisibility();$('isolate-selected').textContent=isolated?'◈   Show all structures':'◈   Isolate structure';if(isolated)focusSelected();else frameVisible('front');});
$('hide-selected').addEventListener('click',()=>{if((!teacherMode&&!studentExplore)||!selected)return;if(teacherMode){hideMultiSelection();return;}hidden.add(selected.mesh);isolated=false;setSelection(null);});
$('clear-selection').addEventListener('click',()=>{isolated=false;setSelection(null);});
for(const b of document.querySelectorAll('.preset'))b.addEventListener('click',()=>orient(b.dataset.view));
$('zoom-in').addEventListener('click',()=>{camera.position.lerp(controls.target,0.18);controls.update();invalidate(2);queueDraft();});
$('zoom-out').addEventListener('click',()=>{camera.position.sub(controls.target).multiplyScalar(1.22).add(controls.target);controls.update();invalidate(2);queueDraft();});
$('menu-toggle').addEventListener('click',()=>{openDetails(false);elements.sidebar.classList.toggle('open');});
elements.detailsToggle.addEventListener('click',()=>{elements.sidebar.classList.remove('open');openDetails(!elements.infoSidebar.classList.contains('open'));});
elements.retry.addEventListener('click',()=>{studentStartupAttempts=0;void loadAnatomy();});
window.addEventListener('keydown',event=>{if(event.key==='Escape'&&(placingLabel||paintMode)){if(placingLabel)cancelPlacing();if(paintMode)cancelPainting();return;}if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(!event.metaKey&&!event.ctrlKey&&!event.altKey&&event.key.toLowerCase()==='f')orient('front');if(!event.metaKey&&!event.ctrlKey&&!event.altKey&&event.key.toLowerCase()==='b')orient('back');if(event.key==='Escape'){isolated=false;setSelection(null);elements.sidebar.classList.remove('open');openDetails(false);}});

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
    registration.active?.postMessage({type,model:currentModelURL,renderer:window.__ANATOMY_RENDERER_SOURCE||'external',organs:teacherMode&&digestiveAvailable,detail:teacherMode&&detailAvailable,detailMode:digestiveGeometry,cardio:teacherMode&&cardioAvailable,cardioMode:cardioGeometry,skullDetail:skullGeometry==='detailed'&&Boolean(skullDetailStats?.upgraded),respiratory:teacherMode&&respiratoryAvailable,respiratoryMode:respiratoryGeometry,nervous:teacherMode&&nervousAvailable,nervousMode:nervousGeometry,urinary:teacherMode&&urinaryAvailable,urinaryMode:urinaryGeometry,lymphatic:teacherMode&&lymphaticAvailable,lymphaticMode:lymphaticGeometry,lessonModels:!teacherMode?offlineLessonFiles(studentProjectAtStartup,{digestiveGeometry,cardioGeometry,skullGeometry,respiratoryGeometry,nervousGeometry,urinaryGeometry,lymphaticGeometry,connectiveGeometry}):[]});
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

window.addEventListener('keydown',event=>{
  const typing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable;
  const dialogOpen=[...document.querySelectorAll('.dialog-backdrop:not([hidden])')].some(el=>!el.hidden);
  if(typing||dialogOpen)return;
  if((event.metaKey||event.ctrlKey)&&!event.altKey&&event.shiftKey&&event.key.toLowerCase()==='f'){
    if(!teacherMode && !studentPermissions.ss)return;
    event.preventDefault();elements.sidebar.classList.add('open');elements.search.focus();elements.search.select();
  }else if(teacherMode && !event.metaKey && !event.ctrlKey && !event.altKey &&
           (event.key==='Backspace'||event.key==='Delete') && selected){
    event.preventDefault();hideMultiSelection();
  }else if(teacherMode && (event.metaKey||event.ctrlKey) && !event.altKey &&
           event.shiftKey&&event.key.toLowerCase()==='i' && selected){
    event.preventDefault();$('isolate-selected').click();
  }else if(teacherMode && (event.metaKey||event.ctrlKey) && !event.altKey &&
           event.shiftKey && (event.key==='-'||event.key==='_') && selected){
    event.preventDefault();polishToggleSelectedFade();
  }
},true);

// Added editor and share-link workflow below.
loadAnatomy();

// --- Teacher Studio / published student scenes ------------------------------
function showToast(message){
  const toast=$('app-toast');toast.textContent=message;toast.hidden=false;
  clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.hidden=true,3200);
}
function cancelPlacing(){
  placingLabel=false;
  labelPlacementMode=null;
  groupPendingAnchors=[];
  $('place-label').textContent='⊕ Single Label';
  $('place-label').classList.remove('placing');
  $('group-label').textContent='⊕ Group Label';
  $('group-label').classList.remove('placing');
  $('group-label-actions').hidden=true;
  $('group-label-stage-done').hidden=true;
  $('group-label-status').textContent='';
  $('place-hint').hidden=true;
  elements.stage.style.cursor='';
}
function groupLabelNumber(){
  const used=new Set(labels.filter(l=>Array.isArray(l.g)).map(l=>l.gn).filter(Number.isInteger));
  let n=1;while(used.has(n))n++;
  return n;
}
function updateGroupLabelStatus(){
  if(!placingLabel||labelPlacementMode!=='group')return;
  const names=groupPendingAnchors.map(a=>structures[a.s]?.name||`Structure ${a.s+1}`);
  const count=names.length;
  $('group-label-status').textContent=count?`${count} selected: ${names.join(', ')}`:'Select two or more structures in the 3D viewer.';
  $('place-hint').textContent=`GROUP LABEL: ${count} structure${count===1?'':'s'} selected. Click more structures, then Done.`;
  $('group-label-done').disabled=count<2;
  $('group-label-stage-done').disabled=count<2;
}
function beginLabelPlacement(mode){
  if(!teacherMode||!sceneRoot)return;
  if(paintMode)cancelPainting();
  if(placingLabel){cancelPlacing();}
  if(labels.length>=64){showToast('Maximum 64 annotations per scene.');return;}
  labelPlacementMode=mode;placingLabel=true;groupPendingAnchors=[];
  openDetails(false);
  $('place-label').classList.toggle('placing',mode==='single');
  $('group-label').classList.toggle('placing',mode==='group');
  $('place-label').textContent=mode==='single'?'Cancel Single Label':'⊕ Single Label';
  $('group-label').textContent=mode==='group'?'Cancel Group Label':'⊕ Group Label';
  $('group-label-actions').hidden=mode!=='group';
  $('group-label-stage-done').hidden=mode!=='group';
  $('place-hint').hidden=false;
  $('place-hint').textContent=mode==='single'?'SINGLE LABEL: Click any anatomical structure. Esc cancels.':'GROUP LABEL: Select at least two structures, then Done.';
  elements.stage.style.cursor='crosshair';
  updateGroupLabelStatus();
}
function finishGroupLabel(){
  if(!placingLabel||labelPlacementMode!=='group'||!teacherMode)return;
  if(groupPendingAnchors.length<2){showToast('Select at least two different structures.');return;}
  if(labels.length>=64){cancelPlacing();showToast('Maximum 64 annotations per scene.');return;}
  const [first,...additional]=groupPendingAnchors;
  const gn=groupLabelNumber();
  practicalNewLabelExpand=labelSequence+1;
  labels.push({id:++labelSequence,qi:newPracticalLabelId(),...first,g:additional,gn,t:`Group ${gn}`,dx:24,dy:-31});
  cancelPlacing();renderAnnotations();renderLabelEditor();queueDraft();
  showToast(`Group ${gn} created with ${1+additional.length} structures. Rename it in Custom Labels.`);
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
// ANATOMIQ_CHAPTER_START_263 — an explicit per-chapter starting view.
// Reuse the existing scene.cam field so shared links, library saves and offline
// lessons do not require a new format or a new API.
function anat263ReadCamera(){
  return [...camera.position.toArray(),...controls.target.toArray()].map(n=>round(n,5));
}
function anat263StartForScene(){
  // A capture is persistent. Orbiting/zooming later must not silently change it.
  const stored=teacherMode&&chapters[activeChapter]?.cam;
  return Array.isArray(stored)&&stored.length===6&&stored.every(Number.isFinite)
    ? stored.slice() : anat263ReadCamera();
}
async function anat263AnimateChapterRestore(from,to){
  if(!Array.isArray(from)||!Array.isArray(to)||from.length!==6||to.length!==6||
    ![...from,...to].every(Number.isFinite))return;
  polishCancelCamera();
  const set=(c)=>{
    camera.position.fromArray(c.slice(0,3));
    controls.target.fromArray(c.slice(3,6));
    camera.updateProjectionMatrix();controls.update();invalidate(2);
  };
  if(from.every((n,i)=>Math.abs(n-to[i])<0.00001)){
    set(to);return;
  }
  if(document.hidden||window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    set(to);return;
  }
  // Restore the incoming viewpoint before the next paint after applyScene().
  set(from);
  const token=++polishCameraToken;
  const startPoint=new THREE.Vector3(...from.slice(0,3));
  const startTarget=new THREE.Vector3(...from.slice(3,6));
  const endPoint=new THREE.Vector3(...to.slice(0,3));
  const endTarget=new THREE.Vector3(...to.slice(3,6));
  const startVector=startPoint.clone().sub(startTarget);
  const endVector=endPoint.clone().sub(endTarget);
  const r0=Math.max(0.001,startVector.length()),r1=Math.max(0.001,endVector.length());
  const d0=startVector.normalize(),d1=endVector.normalize();
  const turn=new THREE.Quaternion();
  if(d0.dot(d1)<-0.999)turn.setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI);
  else turn.setFromUnitVectors(d0,d1);
  const duration=700;
  await new Promise(resolve=>{
    const began=performance.now();
    const tick=now=>{
      if(token!==polishCameraToken||document.hidden){resolve();return;}
      const k=Math.min(1,(now-began)/duration);
      // Identical cubic in/out to polishMoveCamera (label focus); no overshoot.
      const ease=k<0.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
      const aim=startTarget.clone().lerp(endTarget,ease);
      const orientation=new THREE.Quaternion().slerp(turn,ease);
      const heading=d0.clone().applyQuaternion(orientation);
      controls.target.copy(aim);
      camera.position.copy(aim).addScaledVector(heading,r0+(r1-r0)*ease);
      camera.updateProjectionMatrix();controls.update();invalidate(2);
      if(k<1)requestAnimationFrame(tick);
      else {set(to);resolve();}
    };
    requestAnimationFrame(tick);
  });
}
function anat263CaptureStartingPosition(){
  if(!teacherMode||!sceneRoot||restoringScene||__anat254IrisBusy)return;
  if(divisionScope||cardioPreviewIDs){
    showToast('Close the temporary inspection view before capturing the chapter start.');
    return;
  }
  const chapter=chapters[activeChapter];
  if(!chapter)return;
  chapter.cam=anat263ReadCamera();
  queueDraft();
  showToast('Starting position captured for this chapter. Save your lesson to publish it.');
}
function anat263RestoreStartingPosition(){
  if(!teacherMode||!sceneRoot||restoringScene||__anat254IrisBusy)return;
  const target=chapters[activeChapter]?.cam;
  if(!target){showToast('Capture a starting position first.');return;}
  void anat263AnimateChapterRestore(anat263ReadCamera(),target);
}
function anat263InstallChapterCommands(){
  if(!teacherMode)return;
  $('capture-chapter-start')?.addEventListener('click',anat263CaptureStartingPosition);
  $('restore-chapter-start')?.addEventListener('click',anat263RestoreStartingPosition);
}
// Existing DOM is ready by the time the module runs.
anat263InstallChapterCommands();

function snapshotScene(){
  if(!sceneRoot)throw new Error('Model not loaded.');
  const visible=structures.map(s=>divisionScope ? divisionUnderlyingVisible(s) : (cardioPreviewIDs&&s.system==='cardiovascular' ? layerEnabled(s)&&tissueVisible(s)&&!hidden.has(s.mesh) : s.mesh.visible));
  const pc=[...bonePaint.entries()].sort((a,b)=>a[0]-b[0]);
  return validateScene({
    v:1,m:mode,n:structures.length,f:sceneFingerprint,
    b:makeVisibilityBits(visible),t:$('scene-title').value.trim()||'Untitled anatomy scene',
    lm:$('student-label-mode').value,x:$('student-explore').checked,
    te:elements.teeth.checked,ca:elements.cartilage.checked,
    sb:systemLayers.skeletal,dm:systemLayers.deep,sm:systemLayers.superficial,dg:systemLayers.digestive,cv:systemLayers.cardiovascular,rs:systemLayers.respiratory,nv:systemLayers.nervous,ur:systemLayers.urinary,ly:systemLayers.lymphatic,cn:systemLayers.connective,cm:connectiveAvailable,ey:systemLayers.nervous,ci:!legacyConnectiveVisibilityPending,ro:respiratoryOpacity,hd:detailEnabled && (mode==='digestive'||(mode==='systems' && systemLayers.digestive)),
    cam:(teacherMode ? anat263StartForScene() : (cardioPreviewCamera||(divisionScope&&divisionSavedCamera?divisionSavedCamera:[...camera.position.toArray(),...controls.target.toArray()]))).map(n=>round(n,5)),
    labels:labels.map(l=>({s:l.s,qi:l.qi|| (l.qi=newPracticalLabelId()),p:l.p.map(n=>round(n,5)),t:l.t.trim(),dx:round(l.dx,1),dy:round(l.dy,1),...(l.d?{d:l.d.trim()}:{}),...(l.u?{u:l.u.trim()}:{} ),...(l.ln?{ln:l.ln.map(n=>round(n,5))}:{}),
      ...(Array.isArray(l.g)?{g:l.g.map(a=>({s:a.s,p:a.p.map(n=>round(n,5)),...(a.ln?{ln:a.ln.map(n=>round(n,5))}:{})})),gn:l.gn}:{}),...(l.fv?{fv:l.fv.map(n=>round(n,5)),fd:round(l.fd,5),...(l.ft?{ft:l.ft.map(n=>round(n,5))}:{})}:{})})),
    ...(polishFadedIndices.size?{fa:[...polishFadedIndices].sort((a,b)=>a-b)}:{}),
     ...(structureNoteOverrides.size?{sd:[...structureNoteOverrides.entries()].sort((a,b)=>a[0]-b[0]).map(([i,v])=>[i,v.location,v.notes])}:{}),
    ...(pc.length?{pc}:{})
  });
}


// ANATOMIQ_LESSON_EXPERIENCE_249: browser menus call existing 3D/lesson APIs.
let anat249Activated=false;
for(const eventName of ['pointerdown','keydown'])document.addEventListener(eventName,()=>{anat249Activated=true;},{capture:true,passive:true});
window.addEventListener('beforeunload',event=>{
  // Chromium controls the actual wording/display and requires prior user activation.
  if(!sceneRoot||!anat249Activated)return;
  if(teacherMode&&!hasUnsavedLibraryChanges()&&!document.querySelector('.anat-project-dot:not(:empty)'))return;
  event.preventDefault();event.returnValue='';
});
function anat249Description(s){
  const override=structureNoteOverrides.get(s.index);
  if(!override)return descriptionFor(s);
  return [override.location||descriptionFor(s),override.notes?'Notes: '+override.notes:''].filter(Boolean).join('\n\n');
}
window.__AnatomIQ249={
  get teacher(){return teacherMode;},
  getSelected(){
    if(!teacherMode||!selected||!sceneRoot)return null;
    const entry=structureNoteOverrides.get(selected.index)||{};
    return {index:selected.index,name:selected.name,location:entry.location||'',notes:entry.notes||''};
  },
  updateSelected(locationText,notesText){
    if(!teacherMode||!selected||!sceneRoot)throw new Error('Select one structure in Teacher View.');
    if(multiSelectedIndices.size>1)throw new Error('Location and Notes can only be edited for one structure at a time.');
    const locationValue=String(locationText).trim(),noteValue=String(notesText).trim();
    if(locationValue.length>1200||noteValue.length>2000)throw new Error('Location or Notes exceeds the character limit.');
    if(!locationValue&&!noteValue)structureNoteOverrides.delete(selected.index);
    else structureNoteOverrides.set(selected.index,{location:locationValue,notes:noteValue});
    elements.selDesc.textContent=anat249Description(selected);
    queueDraft();showToast('Location & Notes saved to this chapter draft.');
  },
  async preview(){
    if(!teacherMode||!sceneRoot)throw new Error('Teacher View must be loaded to preview a lesson.');
    // Open synchronously from the click handler to avoid popup blockers.
    const tab=window.open('about:blank','_blank');
    if(!tab)throw new Error('Chrome blocked the new tab. Allow popups for AnatomIQ.');
    try{
      const project=snapshotProject();
      const encoded=await encodeScene(project);
      const url=new URL(location.href);url.search='';url.hash='scene='+encoded;
      tab.location.replace(url.href);
    }catch(e){tab.close();throw new Error('Could not build student preview: '+e.message);}
  },
  async screenshot(){
    if(!sceneRoot)throw new Error('3D model is not ready.');
    const stage=elements.stage, rect=stage.getBoundingClientRect();
    if(rect.width<10||rect.height<10)throw new Error('Viewer is not visible.');
    renderer.render(scene,camera);
    const scale=Math.min(2,Math.max(1,window.devicePixelRatio||1));
    const canvas=document.createElement('canvas');
    canvas.width=Math.round(rect.width*scale);canvas.height=Math.round(rect.height*scale);
    const ctx=canvas.getContext('2d');ctx.scale(scale,scale);
    ctx.fillStyle='#1a2935';ctx.fillRect(0,0,rect.width,rect.height);
    ctx.drawImage(renderer.domElement,0,0,rect.width,rect.height);
    // Preserve visible annotation lines and callouts in the saved image.
    const svg=$('label-lines');
    const screenshotMarkers=[...labelContainer.querySelectorAll('.anatomy-label')];
    const markerVisible=marker=>{if(!marker||marker.hidden)return false;const st=getComputedStyle(marker);return st.display!=='none'&&st.visibility!=='hidden'&&Number(st.opacity)>=0.08;};
    if(svg&&!svg.hidden){
      const svgBox=svg.getBoundingClientRect(),offsetX=svgBox.left-rect.left,offsetY=svgBox.top-rect.top;
      ctx.strokeStyle='rgba(95,204,220,.85)';ctx.lineWidth=1.5;
      for(const [i,line] of [...svg.querySelectorAll('line')].entries()){
        if(!markerVisible(screenshotMarkers[i]))continue;
        const x1=Number(line.getAttribute('x1')),y1=Number(line.getAttribute('y1'));
        const x2=Number(line.getAttribute('x2')),y2=Number(line.getAttribute('y2'));
        if([x1,y1,x2,y2].every(Number.isFinite)){ctx.beginPath();ctx.moveTo(offsetX+x1,offsetY+y1);ctx.lineTo(offsetX+x2,offsetY+y2);ctx.stroke();}
      }
    }
    for(const marker of screenshotMarkers){
      if(!markerVisible(marker))continue;
      const r=marker.getBoundingClientRect(),x=r.left-rect.left,y=r.top-rect.top;
      if(x>rect.width||y>rect.height||x+r.width<0||y+r.height<0)continue;
      ctx.fillStyle='#102e3d';ctx.strokeStyle='#4ab3c2';ctx.lineWidth=1.1;
      ctx.beginPath();ctx.roundRect(x,y,r.width,r.height,7);ctx.fill();ctx.stroke();
      ctx.fillStyle='#dffaff';ctx.font='500 12px system-ui';ctx.textBaseline='middle';
      const words=String(marker.innerText??'').replace(/\s+/g,' ').trim();
      const limit=Math.max(4,Math.floor((r.width-17)/6.3));
      ctx.fillText(words.length>limit?words.slice(0,limit-1)+'…':words,x+9,y+r.height/2);
    }
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(new Error('Unable to generate PNG')),'image/png'));
    const link=document.createElement('a'),url=URL.createObjectURL(blob);
    const title=($('scene-title')?.value||$('project-title')?.value||'AnatomIQ').replace(/[^\w-]+/g,'-').slice(0,60);
    link.href=url;link.download=`${title||'AnatomIQ'}-screenshot.png`;
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
    invalidate(2);
  }
};

// 2.2.22: transient Student View history. Nothing is written into teacher lessons.
// Student changes can be undone within the current chapter; chapter reset restores the
// original immutable published snapshot, not the teacher's working draft.
let studentHistoryEntries=[];
let studentHistoryIndex=-1;
let studentHistoryChapter=-1;
let studentHistoryTimer=0;
let studentHistoryApplying=false;
function studentHistoryNotify(){
  const ready=!teacherMode&&!!sceneRoot&&studentHistoryIndex>=0&&!studentHistoryApplying;
  const state={ready,chapter:activeChapter,canUndo:ready&&studentHistoryIndex>0,
    canRedo:ready&&studentHistoryIndex<studentHistoryEntries.length-1};
  window.__AnatomIQStudentHistoryStatus=state;
  window.dispatchEvent(new CustomEvent('anatomiq:student-history-state',{detail:state}));
}
function studentHistoryBegin(){
  clearTimeout(studentHistoryTimer);
  studentHistoryTimer=0;
  if(teacherMode||!sceneRoot)return;
  studentHistoryEntries=[JSON.stringify(snapshotScene())];
  studentHistoryIndex=0;studentHistoryChapter=activeChapter;
  studentHistoryNotify();
}
function studentHistoryPush(){
  clearTimeout(studentHistoryTimer);studentHistoryTimer=0;
  if(teacherMode||studentHistoryApplying||restoringScene||!sceneRoot||studentHistoryIndex<0)return;
  if(studentHistoryChapter!==activeChapter){studentHistoryBegin();return;}
  let state;
  try{state=JSON.stringify(snapshotScene());}
  catch(error){console.warn('Student history snapshot unavailable:',error);return;}
  if(state===studentHistoryEntries[studentHistoryIndex])return;
  studentHistoryEntries=studentHistoryEntries.slice(0,studentHistoryIndex+1);
  studentHistoryEntries.push(state);
  if(studentHistoryEntries.length>40)studentHistoryEntries.shift();
  studentHistoryIndex=studentHistoryEntries.length-1;
  studentHistoryNotify();
}
function studentHistoryQueue(){
  if(teacherMode||studentHistoryApplying||restoringScene||!sceneRoot||studentHistoryIndex<0)return;
  clearTimeout(studentHistoryTimer);
  studentHistoryTimer=setTimeout(studentHistoryPush,65);
}
async function studentHistoryCommand(action){
  if(teacherMode||studentHistoryApplying||!sceneRoot||studentAssetBusy||studentHistoryIndex<0)return;
  if(studentHistoryChapter!==activeChapter){studentHistoryBegin();return;}
  if(action!=='reset')studentHistoryPush();
  let target;
  if(action==='reset')target=chapters[activeChapter];
  else if(action==='undo'&&studentHistoryIndex>0)target=JSON.parse(studentHistoryEntries[--studentHistoryIndex]);
  else if(action==='redo'&&studentHistoryIndex<studentHistoryEntries.length-1)target=JSON.parse(studentHistoryEntries[++studentHistoryIndex]);
  else return;
  studentHistoryApplying=true;
  clearTimeout(studentHistoryTimer);studentHistoryTimer=0;
  try{
    const __anat263From=action==='reset'?anat263ReadCamera():null;
    await applyScene(target);
    if(action==='reset'){
      await anat263AnimateChapterRestore(__anat263From,target.cam);
      studentHistoryBegin();
    }
    showToast(action==='reset'?'Chapter restored to its original view.':action==='undo'?'Undone.':'Redone.');
  }catch(error){
    // If a history restore failed, fall back to the published chapter scene.
    console.warn('Student history action failed:',error);
    showToast('Could not restore the view: '+error.message);
  }finally{
    studentHistoryApplying=false;
    studentHistoryNotify();
  }
}
window.addEventListener('anatomiq:student-history-command',event=>{
  const action=event.detail?.action;
  if(['undo','redo','reset'].includes(action))void studentHistoryCommand(action);
});

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
  if(teacherMode)publishPermissions={...currentPublishPermissions()};
  return validateProject({v:2,t:$('project-title').value.trim()||current.t,start:activeChapter,chapters:chapters.map(c=>structuredClone(c)),sp:{...publishPermissions},practical:normalPractical(practicalConfig)});
}
function verifyProjectModel(project){
  // ANATOMIQ_TRIQUETRUM_REFINEMENT_245: Every historical chapter must be an
  // exact index-prefix match before it is upgraded. Never migrate by count alone.
  const scenes=project.v===1?[project]:project.chapters;
  for(const sample of scenes){
    if(!sceneModelCompatible(sample,structures.length,sceneFingerprint,legacyStructureCount,legacyFingerprint,baseStructureCount,baseFingerprint,previousStructureCount,previousFingerprint,preCardioStructureCount,preCardioFingerprint,originalCardioStructureCount,originalCardioFingerprint,structures)){
      console.warn('AnatomIQ lesson catalog fingerprint mismatch',{
        savedCount:sample.n,savedFingerprint:sample.f,currentCount:structures.length,
        prefixFingerprint:sample.n<=structures.length?hashForStructures(structures.slice(0,sample.n).map(s=>`${s.name}|${s.side}|${s.tissue}|${s.mesh.name}`)):null
      });
      throw new Error('This lesson uses a different anatomical structure catalog. Your original is preserved; open a matching older AnatomIQ version or provide its JSON for safe migration.');
    }
  }
}
// ANATOMIQ_LESSON_RENAME_250 — inline chapter title, no changes to chapter identity.
function anat250EditChapterTitle(index,button){
  if(!teacherMode||index<0||index>=chapters.length||!button?.isConnected)return;
  const before=chapters[index].t;
  const editor=document.createElement('input');
  editor.type='text';editor.className='anat250-chapter-input';editor.maxLength=90;
  editor.value=before;editor.setAttribute('aria-label',`Rename chapter ${index+1}`);
  button.replaceWith(editor);editor.focus();editor.select();
  let finished=false;
  const finish=(save)=>{
    if(finished)return;finished=true;
    const next=editor.value.trim();
    if(save&&next&&next!==before){
      chapters[index].t=next;
      if(index===activeChapter)$('scene-title').value=next;
      renderChapterUI();queueDraft();
    }else renderChapterUI();
  };
  editor.addEventListener('keydown',event=>{
    if(event.key==='Enter'){event.preventDefault();event.stopPropagation();finish(true);}
    else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish(false);}
  });
  editor.addEventListener('blur',()=>finish(true),{once:true});
}

function renderChapterUI(){
  const count=chapters.length;
  if(!count)return;
  const nav=$('chapter-nav');nav.hidden=count<2 && !(practicalConfig.on&&!teacherMode);
  $('chapter-count').textContent=`${count} chapter${count===1?'':'s'}${practicalConfig.on?' + practical':''}`;
  $('chapter-progress').textContent=practicalActive?`PRACTICAL · FINAL CHAPTER`:`CHAPTER ${activeChapter+1} OF ${count+(practicalConfig.on&&!teacherMode?1:0)}`;
  $('previous-chapter').disabled=activeChapter===0&&!practicalActive;
  $('next-chapter').disabled=(activeChapter===count-1&&(teacherMode||!practicalConfig.on))||practicalActive;
  const tabs=$('chapter-tabs');tabs.replaceChildren();
  chapters.forEach((ch,i)=>{
    const b=document.createElement('button');b.type='button';b.className='chapter-tab'+(i===activeChapter?' active':'');
    b.textContent=ch.t;b.title=ch.t;b.setAttribute('aria-current',i===activeChapter?'step':'false');
    b.addEventListener('click',()=>switchChapter(i));tabs.append(b);
  });
  if(!teacherMode&&practicalConfig.on){
    const tab=document.createElement('button');tab.className='chapter-tab practical-chapter-tab'+(practicalActive?' active':'');tab.type='button';
    tab.textContent='Practical';tab.setAttribute('aria-current',practicalActive?'step':'false');tab.addEventListener('click',()=>{if(!practicalActive)void startPractical();});tabs.append(tab);
  }
  if(teacherMode)renderPracticalEditor();
  if(!teacherMode)return;
  const list=$('teacher-chapter-list');list.replaceChildren();
  chapters.forEach((ch,i)=>{
    const row=document.createElement('div');row.className='teacher-chapter-row'+(i===activeChapter?' active':'');
    const choose=document.createElement('button');choose.type='button';choose.className='chapter-choose';choose.textContent=`${i+1}.`;choose.title=`Open chapter ${i+1}: ${ch.t}`;
    choose.setAttribute('aria-label',`Open chapter ${i+1}: ${ch.t}`);
    choose.setAttribute('aria-current',i===activeChapter?'step':'false');
    choose.addEventListener('click',()=>switchChapter(i));row.append(choose);
    const rename=document.createElement('button');rename.type='button';rename.className='anat250-chapter-name';
    rename.textContent=ch.t;rename.title=`Rename ${ch.t}`;
    rename.setAttribute('aria-label',`Rename chapter ${i+1}: ${ch.t}`);
    rename.addEventListener('click',()=>anat250EditChapterTitle(i,rename));row.append(rename);
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
function polishCaptureChapter(){
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return null;
  const stage=elements.stage;
  const width=Math.min(1100,stageWidth),height=Math.min(1100,stageHeight);
  if(!width||!height)return null;
  try{
    renderer.render(scene,camera);
    const image=document.createElement('canvas');image.width=width;image.height=height;
    image.getContext('2d').drawImage(renderer.domElement,0,0,width,height);
    const layer=document.createElement('div');layer.className='polish-chapter-snapshot';
    layer.style.backgroundImage=`url("${image.toDataURL('image/png')}")`; // ANATOMIQ_CHAPTER_CROSSFADE_253: retain alpha, never flatten background to black
    stage.appendChild(layer);
    return layer;
  }catch(error){console.warn('Chapter snapshot unavailable:',error);return null;}
}
function polishRevealChapter(layer){
  if(!layer)return;
  renderer.render(scene,camera);invalidate(3);
  requestAnimationFrame(()=>{layer.classList.add('is-fading');});
  setTimeout(()=>layer.remove(),580);
}
 let __anat254IrisBusy=false;
 installChapterTransitionMenus();

async function switchChapter(index){
  if(__anat254IrisBusy || !sceneRoot || studentAssetBusy || index<0 || index>=chapters.length || index===activeChapter)return;
  if(teacherMode){try{chapters[activeChapter]=snapshotScene();}catch(error){showToast(error.message);return;}}
  clearTimeout(draftTimeout);cancelPlacing();cancelPainting();
  if(!teacherMode){
    studentAssetBusy=true;
    setStatus(`Loading chapter ${index+1}…`);
    try{await ensureChapterAssets(chapters[index]);}
    catch(error){showToast(error.message);setStatus('Student view');return;}
    finally{studentAssetBusy=false;}
  }
  const iris=chapterIrisEnabled()?createIrisTransition(elements.stage):null;
  const __anat256Direction=chapterSlideDirection(activeChapter,index,chapters.length);
  let liveCarousel=null;
  if(chapterCarouselEnabled()){
    try{
      // Synchronize outgoing camera/light before snapshotting the live scene.
      shadows.update(camera,controls.target,true);
      liveCarousel=createLiveChapterCarousel({
        THREE,scene,camera,renderer,stage:elements.stage,direction:__anat256Direction,
        onSettled:()=>{
          // Restore the normal full-size render BEFORE showing annotations.
          shadows.update(camera,controls.target,true);
          renderer.render(scene,camera);
          updateAnnotationPositions();
        }
      }); // ANATOMIQ_CAROUSEL_LIGHT_LABEL_257
    }
    catch(error){console.warn('Live chapter carousel unavailable; using snapshot animation',error);}
  }
  const carousel=chapterCarouselEnabled()?(liveCarousel||createChapterCarousel(elements.stage,renderer.domElement,__anat256Direction)):null; // ANATOMIQ_LIVE_CHAPTER_CAROUSEL_256
  const __anat256WasOrbitEnabled=controls.enabled;
  if(liveCarousel){controls.enabled=false;__anat256LiveCarousel=liveCarousel;}
  if(iris || carousel)__anat254IrisBusy=true;
  let polishSnapshot=null;
  try{
    if(iris)await iris.close();
    else if(!carousel)polishSnapshot=polishCaptureChapter();
  try{
    polishCancelCamera();
    activeChapter=index;
    await applyScene(chapters[activeChapter]);
    renderChapterUI();
    if(!teacherMode)studentHistoryBegin();
  }finally{
    if(iris){renderer.render(scene,camera);invalidate(3);await iris.open();}
    else if(carousel){
      if(liveCarousel){
         // applyScene changes both camera target and visible meshes. Normally
         // draw() updates the shadow frustum, but draw() is paused mid-carousel.
         shadows.update(camera,controls.target,true);
         await liveCarousel.play(scene,camera);
       }
      else {renderer.render(scene,camera);invalidate(3);await carousel.play(renderer.domElement);}
    }
    else polishRevealChapter(polishSnapshot);
  }
  }finally{
    if(liveCarousel){
      liveCarousel.remove();
      __anat256LiveCarousel=null;
      controls.enabled=__anat256WasOrbitEnabled;
      renderer.render(scene,camera);invalidate(3);
    }
    __anat254IrisBusy=false;
  }
  if(teacherMode)queueDraft();else setStatus('Student view');
}
function createChapter(duplicate){
  if(!teacherMode || !sceneRoot)return;
  if(chapters.length>=MAX_CHAPTERS){showToast(`Maximum ${MAX_CHAPTERS} chapters per lesson.`);return;}
  try{
    chapters[activeChapter]=snapshotScene();
    const fresh=structuredClone(chapters[activeChapter]);
    if(!duplicate)fresh.cam=anat263ReadCamera();
    fresh.t=`Chapter ${chapters.length+1}`;
    if(!duplicate)fresh.labels=[];
    chapters.splice(activeChapter+1,0,fresh);
    if(Array.isArray(practicalConfig.chapters)){const at=activeChapter;practicalConfig.chapters=practicalConfig.chapters.map(i=>i>at?i+1:i);if(duplicate&&practicalConfig.chapters.includes(at))practicalConfig.chapters.push(at+1);}
    clearTimeout(draftTimeout);cancelPlacing();cancelPainting();
    activeChapter++;
    applyScene(fresh).then(()=>{renderChapterUI();queueDraft();$('scene-title').focus();$('scene-title').select();showToast('Chapter added. Rename it and customize its view.');});
  }catch(error){showToast('Could not add chapter: '+error.message);}
}
function moveChapter(index,step){
  if(!teacherMode || index+step<0 || index+step>=chapters.length)return;
  try{chapters[activeChapter]=snapshotScene();}catch(error){showToast(error.message);return;}
  [chapters[index],chapters[index+step]]=[chapters[index+step],chapters[index]];
  if(Array.isArray(practicalConfig.chapters))practicalConfig.chapters=practicalConfig.chapters.map(i=>i===index?index+step:i===index+step?index:i);
  if(activeChapter===index)activeChapter=index+step;
  else if(activeChapter===index+step)activeChapter=index;
  renderChapterUI();queueDraft();
}
async function deleteChapter(index){
  if(!teacherMode || chapters.length===1 || !confirm(`Delete chapter "${chapters[index].t}"? This removes its labels and bone settings from this draft.`))return;
  try{chapters[activeChapter]=snapshotScene();}catch(error){showToast(error.message);return;}
  chapters.splice(index,1);
  if(Array.isArray(practicalConfig.chapters))practicalConfig.chapters=practicalConfig.chapters.filter(i=>i!==index).map(i=>i>index?i-1:i);
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
    queueMicrotask(()=>window.__AnatomIQWorkspaceTabs?.syncActive?.());
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
// ANATOMIQ_GITHUB_PREVIEW_TEACHER_EDIT_235: load public JSON into the existing teacher editor.
async function editPublishedGitHubLesson(input){
  const finish=(ok,message)=>document.dispatchEvent(new CustomEvent('anatomiq:github-edit-result',{detail:{ok,message}}));
  if(!teacherMode){finish(false,'Editing is available only in Teacher View.');return;}
  if(libraryBusy || !sceneRoot){finish(false,'Wait for the current lesson and anatomy model to finish loading.');return;}
  let ref;
  try{ref=lessonRef(input?.owner,input?.repo,input?.branch,input?.slug);}
  catch(error){finish(false,error.message);return;}
  if(!protectCurrentEdits('edit this GitHub lesson')){finish(false,'Edit cancelled. Your current lesson was preserved.');return;}
  libraryBusy=true;
  try{
    const live=await fetchPublicLesson(ref);
    if(live.offline)throw new Error('Cannot edit an offline cached lesson. Reconnect and refresh the published version.');
    verifyProjectModel(live.project);
    clearTimeout(draftTimeout);clearTimeout(historyTimeout);
    cancelPlacing();cancelPainting();
    await loadProject(structuredClone(live.project));
    resetHistory();
    // Treat this as an unsaved local working copy, not an IndexedDB lesson.
    libraryLessonId=null;
    lastLibrarySnapshot=JSON.stringify(snapshotProject());
    githubEditingRef=ref;
    saveDraft(false);
    const target=`${ref.owner}/${ref.repo}/lessons/${ref.slug}.json`;
    noteLibraryState(`Editing published lesson: ${target} · Not yet republished`);
    closeLibrary();
    showToast('GitHub lesson opened for editing. Publish explicitly to update student links.');
    finish(true,`Editing ${target} in Teacher View.`);
  }catch(error){
    console.warn('Could not open published lesson for editing:',error);
    finish(false,`Could not edit GitHub lesson: ${error.message}`);
    showToast('Could not edit GitHub lesson: '+error.message);
  }finally{libraryBusy=false;}
}
document.addEventListener('anatomiq:edit-github-lesson',event=>{void editPublishedGitHubLesson(event.detail);});

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
    githubEditingRef=null;libraryLessonId=id;lastLibrarySnapshot=JSON.stringify(record.project);
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

// ANATOMIQ_STUDIO_POLISH_20261024: per-chapter labels + student inspector.
let polishStudentLabelsVisible=true;
const polishOcclusionRay=new THREE.Raycaster();
let polishOcclusionAt=0,polishOccluders=[];
const polishOcclusionIndex=createOcclusionIndex(THREE); // ANATOMIQ_LABEL_OCCLUSION_BVH_238
function polishShowLabelDetails(label){
  if(!label?.d && !label?.u)return;
  const dialog=$('polish-label-dialog');if(!dialog)return;
  $('polish-label-title').textContent=label.t;
  $('polish-label-description').textContent=label.d||'';
  $('polish-label-description').hidden=!label.d;
  const photo=$('polish-label-image');photo.hidden=!label.u;
  if(label.u){photo.src=(activeLiveLessonRef||githubEditingRef)?resolveLessonMedia(activeLiveLessonRef||githubEditingRef,label.u):label.u;photo.alt='Reference image: '+label.t;}
  dialog.hidden=false;
}
// ANATOMIQ_SMART_LABEL_FOCUS_20261024: orient label clicks by their real surface.
const smartFocusRay=new THREE.Raycaster();
const smartFocusGhosts=new Map();
function smartLabelAnchor(label){
  const structure=structures[label.s];
  if(!structure?.mesh)return null;
  structure.mesh.updateWorldMatrix(true,false);
  return structure.mesh.localToWorld(new THREE.Vector3(...label.p));
}
function smartFocusClearGhosts(){
  for(const [mesh,info] of smartFocusGhosts){
    clearTimeout(info.timer);
    if(mesh.material===info.ghost)mesh.material=info.original;
    for(const material of (Array.isArray(info.ghost)?info.ghost:[info.ghost]))material.dispose();
    delete mesh.userData.smartLabelGhost;
  }
  smartFocusGhosts.clear();polishOcclusionAt=0;
}
function smartFocusGhost(mesh){
  if(!mesh||smartFocusGhosts.has(mesh)||(!teacherMode&&!studentExplore))return;
  const original=mesh.material;
  if(!original)return;
  const dim=material=>{
    const copy=material.clone();
    copy.transparent=true;copy.depthWrite=false;copy.opacity=Math.min(0.16,Number(material.opacity??1));
    copy.needsUpdate=true;return copy;
  };
  const ghost=Array.isArray(original)?original.map(dim):dim(original);
  mesh.material=ghost;mesh.userData.smartLabelGhost=true;
  const info={original,ghost,timer:0};smartFocusGhosts.set(mesh,info);
  info.timer=setTimeout(()=>{
    if(smartFocusGhosts.get(mesh)!==info)return;
    if(mesh.material===ghost)mesh.material=original;
    for(const material of (Array.isArray(ghost)?ghost:[ghost]))material.dispose();
    delete mesh.userData.smartLabelGhost;
    smartFocusGhosts.delete(mesh);polishOcclusionAt=0;invalidate(3);
  },2700);
  polishOcclusionAt=0;invalidate(3);
}
function smartFocusCamera(label){
  const structure=structures[label.s];
  const mesh=structure?.mesh;
  if(!mesh || !mesh.visible)return false;
  smartFocusClearGhosts();
  const anchor=smartLabelAnchor(label);
  const bounds=boxFor([structure]);
  if(!anchor || bounds.isEmpty())return false;
  const center=bounds.getCenter(new THREE.Vector3());
  const aim=center.clone().lerp(anchor,0.63);
  const size=bounds.getSize(new THREE.Vector3());
  const vfov=THREE.MathUtils.degToRad(camera.fov);
  const hfov=2*Math.atan(Math.tan(vfov/2)*Math.max(0.2,camera.aspect));
  const fit=Math.max(size.x/(2*Math.tan(hfov/2)),size.y/(2*Math.tan(vfov/2)),size.z/(2*Math.tan(vfov/2)));
  const distance=Math.max(0.065,fit*2.4,anchor.distanceTo(aim)*2.1);
  // The optional teacher view saves a world-facing direction and camera-to-label
  // distance. It overrides the automatic geometry/occlusion heuristic exactly.
  const custom=Array.isArray(label.fv)&&label.fv.length===3&&label.fv.every(Number.isFinite)&&
    label.fv.some(n=>Math.abs(n)>0.05)&&Number.isFinite(label.fd)&&label.fd>0;
  let direction;
  let chosenDistance=distance;
  if(custom){
    direction=new THREE.Vector3(...label.fv).normalize();
    chosenDistance=Math.max(0.04,label.fd);
    if(Array.isArray(label.ft)&&label.ft.length===3&&label.ft.every(Number.isFinite))
      aim.copy(anchor).add(new THREE.Vector3(...label.ft));
  }else{
    // Older lessons do not have a saved face normal. Infer front/back from
    // the label's world location relative to the whole anatomical reference.
    sceneRoot.updateWorldMatrix(true,true);
    const bodyCenter=new THREE.Box3().setFromObject(sceneRoot).getCenter(new THREE.Vector3());
    const normal=Array.isArray(label.ln)&&label.ln.length===3
      ? new THREE.Vector3(...label.ln).applyMatrix3(new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld)).normalize().toArray()
      : null;
    const radial=smartLabelFacing(anchor.toArray(),bodyCenter.toArray(),normal);
    const candidates=smartOrbitDirections(radial);
    const meshes=structures.filter(s=>s!==structure && s.mesh.visible && !s.mesh.userData.smartLabelGhost).map(s=>s.mesh);
    let bestScore=Infinity,blocked=null;
    for(let i=0;i<candidates.length;i++){
      const candidate=new THREE.Vector3(...candidates[i]);
      const from=aim.clone().addScaledVector(candidate,distance);
      const toward=anchor.clone().sub(from);const span=toward.length();
      smartFocusRay.set(from,toward.normalize());
      smartFocusRay.near=0;smartFocusRay.far=Math.max(0.001,span-Math.max(0.003,span*0.01));
      const hits=smartFocusRay.intersectObjects(meshes,false);
      const score=(hits.length?100:0)+i*1.3;
      if(score<bestScore){bestScore=score;direction=candidate;blocked=hits[0]?.object||null;}
      if(!hits.length && i===0)break;
    }
    if(blocked && (teacherMode||studentExplore))smartFocusGhost(blocked);
    direction=direction||new THREE.Vector3(...radial);
  }
  const destination=(custom?anchor:aim).clone().addScaledVector(direction,chosenDistance);
  camera.near=Math.max(0.002,chosenDistance/300);
  camera.far=Math.max(12,chosenDistance*60);camera.updateProjectionMatrix();
  // Keep the same cancellable, reduced-motion-aware camera animation used by
  // all other orientation buttons. Do not store navigation as scene edits.
  polishMoveCamera(destination,aim,{duration:1000,save:teacherMode});
  setPresetActive('');
  return true;
}
function smartSaveFocusView(label){
  if(!teacherMode)return;
  const anchor=smartLabelAnchor(label);
  if(!anchor)return showToast('The label structure is unavailable.');
  const outward=camera.position.clone().sub(anchor);
  const distance=outward.length();
  if(!Number.isFinite(distance)||distance<0.03)return showToast('Move the camera away from the label before saving.');
  label.fv=outward.normalize().toArray().map(n=>round(n,5));
  label.fd=round(distance,5);
  // Save the actual camera target as well: a custom teaching view preserves
  // precise framing, not just direction and approximate magnification.
  label.ft=controls.target.clone().sub(anchor).toArray().map(n=>round(n,5));
  renderLabelEditor();queueDraft();showToast('Focus View saved for this label.');
}

function polishFocusLabel(label,index){
  const s=structures[label.s];
  if(!s || !s.mesh.visible){showToast('This label’s structure is not visible in the current chapter.');return;}
  // Label focus is camera-only: no anatomy selection/highlight.
  if(!smartFocusCamera(label))return;
  const marker=markers.get(label.id)?.marker;
  marker?.classList.add('revealed');
  if(!teacherMode)polishShowLabelDetails(label);
}
let studentLabelListExpanded=window.innerWidth>900;
$('anat-student-label-list-button')?.addEventListener('click',()=>{
  studentLabelListExpanded=!studentLabelListExpanded;
  polishRenderStudentLabels();
});
$('anat-student-label-list-close')?.addEventListener('click',()=>{
  studentLabelListExpanded=false;
  polishRenderStudentLabels();
});
function polishRenderStudentLabels(){
  const panel=$('polish-student-labels'),list=$('polish-student-label-list'),toggle=$('polish-label-toggle');
  if(!panel||!list||!toggle)return;
  const annotationsAllowed=!teacherMode && studentPermissions.sl && labelMode!=='hidden' && labels.length>0;
  const listAllowed=annotationsAllowed && !!studentPermissions.ll;
  const listButton=$('anat-student-label-list-button');
  if(listButton){listButton.hidden=!listAllowed;listButton.setAttribute('aria-expanded',String(listAllowed&&studentLabelListExpanded));}
  panel.hidden=!listAllowed || !studentLabelListExpanded;
  toggle.hidden=!annotationsAllowed;
  toggle.textContent=polishStudentLabelsVisible?'Labels: On':'Labels: Off';
  toggle.setAttribute('aria-pressed',String(polishStudentLabelsVisible));
  list.replaceChildren();
  if(!listAllowed || !studentLabelListExpanded)return;
  labels.forEach((label,i)=>{
    const item=document.createElement('button');item.type='button';item.className='polish-student-label-item';
    item.textContent=`${i+1}. ${labelMode==='reveal'?'Label '+(i+1):label.t}${label.d||label.u?'  ⓘ':''}`;
    item.title='Focus this label'+(label.d||label.u?' and open its details':'');
    item.addEventListener('click',()=>polishFocusLabel(label,i));
    list.appendChild(item);
  });
}
$('polish-label-toggle')?.addEventListener('click',()=>{
  polishStudentLabelsVisible=!polishStudentLabelsVisible;
  renderAnnotations();
});
$('polish-label-close')?.addEventListener('click',()=>{$('polish-label-dialog').hidden=true;});
$('polish-label-dialog')?.addEventListener('click',event=>{
  if(event.target===$('polish-label-dialog'))event.currentTarget.hidden=true;
});

let practicalNewLabelExpand=null;
let anatDraggedLabelId=null;
function renderLabelEditor(){
  const list=$('label-list');list.replaceChildren();
  if(!labels.length){const p=document.createElement('p');p.className='studio-hint';p.textContent='No labels yet. Add your first callout above.';list.appendChild(p);return;}
  labels.forEach((label,i)=>{
    const row=document.createElement('details');row.className='label-editor-row';row.open=label.id===practicalNewLabelExpand;row.dataset.anatLabelId=String(label.id);
    const summary=document.createElement('summary');summary.className='label-editor-summary';
    const anatTitle=document.createElement('span');anatTitle.className='anat-label-title';anatTitle.textContent=label.t||`Label ${i+1}`;
    const grip=document.createElement('span');grip.className='anat-label-grip';grip.textContent='⠿';
    grip.draggable=true;grip.tabIndex=0;grip.setAttribute('role','button');
    grip.dataset.anatGrip=String(label.id);
    grip.setAttribute('aria-label',`Reorder label ${i+1}. Drag, or use Up and Down arrow keys.`);
    grip.title='Drag to reorder labels (or use ↑ and ↓)';
    summary.append(grip,anatTitle);
    const moveLabel=(targetId,after=false)=>{
      if(!teacherMode||targetId===label.id)return false;
      const result=reorderLabels(labels,label.id,targetId,after);
      if(!result.changed)return false;
      labels=result.items;
      renderLabelEditor();renderAnnotations();queueDraft();
      return true;
    };
    grip.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();});
    grip.addEventListener('pointerdown',event=>event.stopPropagation());
    grip.addEventListener('dragstart',event=>{
      if(!teacherMode){event.preventDefault();return;}
      anatDraggedLabelId=label.id;
      event.dataTransfer.effectAllowed='move';
      event.dataTransfer.setData('text/plain',String(label.id));
      row.classList.add('anat-label-dragging');
    });
    grip.addEventListener('dragend',()=>{
      anatDraggedLabelId=null;
      document.querySelectorAll('#label-list .anat-label-dragover,#label-list .anat-label-dragging')
        .forEach(el=>el.classList.remove('anat-label-dragover','anat-label-dragging'));
    });
    row.addEventListener('dragover',event=>{
      if(!teacherMode||anatDraggedLabelId==null||anatDraggedLabelId===label.id)return;
      event.preventDefault();event.dataTransfer.dropEffect='move';row.classList.add('anat-label-dragover');
    });
    row.addEventListener('dragleave',event=>{if(!row.contains(event.relatedTarget))row.classList.remove('anat-label-dragover');});
    row.addEventListener('drop',event=>{
      if(!teacherMode||anatDraggedLabelId==null)return;
      event.preventDefault();event.stopPropagation();
      const src=anatDraggedLabelId;anatDraggedLabelId=null;
      if(src===label.id){row.classList.remove('anat-label-dragover');return;}
      const box=row.getBoundingClientRect(),after=event.clientY>=box.top+box.height/2;
      const result=reorderLabels(labels,src,label.id,after);
      row.classList.remove('anat-label-dragover');
      if(!result.changed)return;
      labels=result.items;renderLabelEditor();renderAnnotations();queueDraft();
    });
    grip.addEventListener('keydown',event=>{
      if(!teacherMode||!['ArrowUp','ArrowDown'].includes(event.key))return;
      event.preventDefault();event.stopPropagation();
      const pos=labels.findIndex(x=>x.id===label.id);
      const next=pos+(event.key==='ArrowUp'?-1:1);
      if(next<0||next>=labels.length)return;
      const nextId=labels[next].id;
      if(moveLabel(nextId,event.key==='ArrowDown')){
        [...document.querySelectorAll('#label-list .anat-label-grip')]
          .find(el=>el.dataset.anatGrip===String(label.id))?.focus();
      }
    });
    const number=document.createElement('span');number.textContent=`${i+1}.`;number.className='label-index';
    const input=document.createElement('input');input.type='text';input.maxLength=100;input.value=label.t;input.setAttribute('aria-label',`Edit label ${i+1}`);
    input.addEventListener('input',()=>{label.t=input.value;anatTitle.textContent=input.value||`Label ${i+1}`;renderAnnotations();queueDraft();});
    const remove=document.createElement('button');remove.textContent='×';remove.className='icon-button';remove.title='Remove label';remove.setAttribute('aria-label',`Remove label ${i+1}`);
    remove.addEventListener('click',()=>{labels=labels.filter(l=>l.id!==label.id);renderAnnotations();renderLabelEditor();queueDraft();});
    const more=document.createElement('div');more.className='polish-label-fields';
    // Group members remain editable after creation; do not split into independent labels.
    if(Array.isArray(label.g)){
      const members=document.createElement('div');members.className='anat-group-members';
      for(const [idx,anchor] of [{s:label.s,p:label.p},...label.g].entries()){
        const chip=document.createElement('span');chip.className='anat-group-member';
        const text=document.createElement('span');text.textContent=structures[anchor.s]?.name||`Structure ${anchor.s+1}`;
        chip.append(text);
        if(label.g.length){
          const removeMember=document.createElement('button');removeMember.type='button';removeMember.textContent='×';
          removeMember.setAttribute('aria-label',`Remove ${text.textContent} from group`);
          removeMember.addEventListener('click',()=>{
            if(idx===0){const next=label.g.shift();label.s=next.s;label.p=next.p;label.ln=next.ln;}
            else label.g.splice(idx-1,1);
            if(!label.g.length){delete label.g;delete label.gn;}
            renderLabelEditor();renderAnnotations();queueDraft();
          });chip.append(removeMember);
        }
        members.append(chip);
      }
      more.append(members);
    }
    const desc=document.createElement('textarea');desc.rows=2;desc.maxLength=1200;
    desc.placeholder='Optional description for students';desc.value=label.d||'';
    desc.setAttribute('aria-label',`Description for label ${i+1}`);
    desc.addEventListener('input',()=>{label.d=desc.value;queueDraft();});
    const photo=document.createElement('input');photo.type='text';photo.maxLength=500;
    photo.placeholder='Photo URL or ./media/photo.jpg';photo.value=label.u||'';
    photo.setAttribute('aria-label',`Photo URL for label ${i+1}`);
    photo.addEventListener('change',()=>{
      const value=photo.value.trim();
      if(value && !/^(https:\/\/|\.\/|media\/|images\/)/i.test(value)){
        showToast('Use an HTTPS photo URL or a path such as ./media/image.jpg.');photo.value=label.u||'';return;
      }
      label.u=value;queueDraft();
    });
    const focusActions=document.createElement('div');focusActions.className='smart-focus-actions';
    const saveView=document.createElement('button');saveView.type='button';saveView.className='button small';
    saveView.textContent=label.fv?'Update Focus View':'Save Focus View';
    saveView.title='Save this camera angle and zoom for students focusing this label';
    saveView.addEventListener('click',()=>smartSaveFocusView(label));
    const preview=document.createElement('button');preview.type='button';preview.className='button small';
    preview.textContent='Preview Focus';preview.addEventListener('click',()=>polishFocusLabel(label,i));
    focusActions.append(saveView,preview);
    if(label.fv){
      const clear=document.createElement('button');clear.type='button';clear.className='button small subtle';
      clear.textContent='Use Automatic';clear.title='Remove the saved focus view; infer facing from anatomy instead';
      clear.addEventListener('click',()=>{delete label.fv;delete label.fd;delete label.ft;renderLabelEditor();queueDraft();showToast('Automatic label focus restored.');});
      focusActions.append(clear);
    }
    more.append(desc,photo,focusActions);
    const inner=document.createElement('div');inner.className='label-editor-inside';inner.append(number,input,remove,more);
    row.append(summary,inner);list.appendChild(row);
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
    const lines=[],dots=[];
    for(const anchor of [{s:label.s,p:label.p},...(label.g||[])]){
      const line=document.createElementNS('http://www.w3.org/2000/svg','line');
      line.setAttribute('class','leader-line');labelSVG.appendChild(line);lines.push(line);
      const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');
      dot.setAttribute('r','2.5');dot.setAttribute('class','leader-dot');labelSVG.appendChild(dot);dots.push(dot);
    }
    const line=lines[0],dot=dots[0];
    const visibility=teacherMode?'shown':labelMode;
    if(visibility==='reveal'){
      marker.classList.add('reveal');
      marker.addEventListener('click',()=>{marker.classList.toggle('revealed');});
    }
    if(visibility==='hidden')marker.hidden=true;
    if(!teacherMode){
      marker.addEventListener('click',()=>{
        if(labelMode==='reveal' && !marker.classList.contains('revealed'))return;
        polishFocusLabel(label,i);
      });
    }
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
    markers.set(label.id,{marker,line,dot,lines,dots});
    anat261AttachDescription(label,marker);
  });
  polishRenderStudentLabels();
  invalidate(2);
}
function updateAnnotationPositions(){
  if(__labelAudit.enabled && __labelAudit.mode==='no-labels')return;
  if(document.body.classList.contains('anat-labels-hidden'))return;
  if(!sceneRoot || !labels.length)return;
  const width=stageWidth,height=stageHeight;
  const refreshOcclusion=performance.now()>polishOcclusionAt && !(__labelAudit.enabled && __labelAudit.mode==='no-occlusion');
  if(refreshOcclusion){
    polishOcclusionAt=performance.now()+110;
    polishOccluders=structures.filter(s=>s.mesh.visible && !polishFadedIndices.has(s.index) && !s.mesh.userData.smartLabelGhost).map(s=>s.mesh);
    polishOcclusionIndex.update(polishOccluders);
  }
  for(const label of labels){
    const nodes=markers.get(label.id);if(!nodes)continue;
    const anchors=[{s:label.s,p:label.p},...(label.g||[])];
    const projected=[];
    const hiddenByMode=!teacherMode&&(labelMode==='hidden'||!polishStudentLabelsVisible);
    for(let i=0;i<anchors.length;i++){
      const a=anchors[i],s=structures[a.s],line=nodes.lines[i],dot=nodes.dots[i];
      if(hiddenByMode||!s?.mesh.visible){line.setAttribute('visibility','hidden');dot.setAttribute('visibility','hidden');continue;}
      const world=s.mesh.localToWorld(new THREE.Vector3(...a.p));
      const at=world.clone().project(camera);
      if(at.z< -1||at.z>1||Math.abs(at.x)>1.15||Math.abs(at.y)>1.15){
        line.setAttribute('visibility','hidden');dot.setAttribute('visibility','hidden');continue;
      }
      const x=(at.x+1)*width/2,y=(1-at.y)*height/2;
      if(refreshOcclusion){
        const delta=world.clone().sub(camera.position),distance=delta.length();
        polishOcclusionRay.set(camera.position,delta.normalize());
        polishOcclusionRay.far=Math.max(0.001,distance-Math.max(0.004,distance*0.006));
        const start=__labelAudit.enabled?performance.now():0;
        const blocked=(__labelAudit.enabled&&__labelAudit.mode==='legacy-occlusion')
          ?polishOcclusionRay.intersectObjects(polishOccluders,false).length>0
          :polishOcclusionIndex.isOccluded(polishOcclusionRay);
        if(__labelAudit.enabled){__labelAudit.rayCalls++;__labelAudit.rayMs+=performance.now()-start;}
        line.dataset.occluded=blocked?'1':'0';
      }
      projected.push({x,y,line,dot,blocked:line.dataset.occluded==='1'});
    }
    if(!projected.length){
      nodes.marker.hidden=true;
      continue;
    }
    const reference=projected.find(p=>!p.blocked)||projected[0];
    const bx=reference.x+label.dx,by=reference.y+label.dy;
    nodes.marker.hidden=false;
    const allOccluded=projected.every(p=>p.blocked);
    nodes.marker.dataset.occluded=allOccluded?'1':'0';
    nodes.marker.classList.toggle('polish-occluded',allOccluded);
    nodes.marker.style.left=bx+'px';nodes.marker.style.top=by+'px';
    for(const p of projected){
      p.line.style.opacity=p.blocked?'0':'1';p.dot.style.opacity=p.blocked?'0':'1';
      p.line.setAttribute('visibility','visible');p.dot.setAttribute('visibility','visible');
      p.line.setAttribute('x1',String(p.x));p.line.setAttribute('y1',String(p.y));
      p.line.setAttribute('x2',String(bx+10));p.line.setAttribute('y2',String(by+13));
      p.dot.setAttribute('cx',String(p.x));p.dot.setAttribute('cy',String(p.y));
    }
  }
}
async function applyScene(saved){
  divisionNavReset(false);
  smartFocusClearGhosts();
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
    systemLayers.urinary=saved.ur ?? false;
    systemLayers.lymphatic=saved.ly ?? false;
    // Old scenes had no connective field: preserve former Skeletal cartilage visibility.
    systemLayers.connective=saved.cn ?? (saved.sb ?? true);
    // Legacy lessons may have enabled Eyes separately. Merge that flag into Nervous.
    systemLayers.ocular=false;
    if(saved.ey===true)systemLayers.nervous=true;
    legacyEyeVisibilityPending=saved.ey===undefined;
    legacyConnectiveVisibilityPending=teacherMode && saved.ci!==true;
    respiratoryOpacity=saved.ro ?? 1;
    applyRespiratoryOpacity();
    if(systemLayers.respiratory&&!respiratoryAvailable)throw new Error('This lesson requires respiratory-standard.glb and respiratory-structures.json.');
    if(systemLayers.lymphatic&&!lymphaticAvailable)throw new Error('This lesson requires lymphatic-standard.glb and lymphatic-structures.json.');
    if(systemLayers.urinary&&!urinaryAvailable)throw new Error('This lesson requires urinary-standard.glb and urinary-structures.json.');
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
    polishRestoreFade(saved.fa||[]);
    structureNoteOverrides=new Map((saved.sd||[]).map(([i,location,notes])=>[i,{location,notes}]));
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
    labels=saved.labels.map(l=>({...l,id:++labelSequence,qi:l.qi||newPracticalLabelId()}));
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
  activeChapter=!teacherMode?0:(project.v===1?0:project.start);
  practicalConfig=normalPractical(project.v===2?project.practical:null);
  publishPermissions=project.v===2 && project.sp ? {...project.sp} : {...STUDY_PERMISSIONS};
  if(!teacherMode){
    // Old lessons have no 'ot' field: retain the legacy exploration-dependent toolbar.
    studentPermissions={...publishPermissions,ot:publishPermissions.ot??publishPermissions.ex,ll:publishPermissions.ll??Boolean(publishPermissions.sl&&(publishPermissions.st||publishPermissions.ss))};
    // Apply layout permissions before restoring the scene; avoid a sidebar-layout flash.
    const body=document.body;
    body.classList.toggle('student-search',studentPermissions.ss);
    body.classList.toggle('student-tree',studentPermissions.st);
    body.classList.toggle('student-names',studentPermissions.sn);
    body.classList.toggle('student-system-toolbar-enabled',studentPermissions.ot);
  }
  else showPublishPermissions(publishPermissions);
  $('project-title').value=project.t;
  await applyScene(chapters[activeChapter]);
  renderChapterUI();
  if(!teacherMode){applyStudentPermissions();studentHistoryBegin();}
  document.title=project.t+' • AnatomIQ Studio';
}
async function initializeStudioScene(){
  if(!teacherMode){
    await loadProject(studentProjectAtStartup);
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
    renderChapterUI();renderLabelEditor();resetHistory();window.__AnatomIQWorkspaceBootReady=true;
  }
}
// ANATOMIQ_GITHUB_PUBLISHING_20261024 — teacher-owned, no server or embedded secrets.
const CLOUD_PREFS_KEY='anatomiq-cloud-publisher-settings-v1';
const CLOUD_TARGETS_KEY='anatomiq-cloud-lesson-targets-v1';
let cloudToken=''; // Memory only. Never written to localStorage, URLs, lessons or a file.
let cloudVerified=null;
let cloudBusy=false;
let activeLiveLessonRef=null;
let githubEditingRef=null; // Current published source, held in memory only.
function cloudSavedPreferences(){
  try{return JSON.parse(localStorage.getItem(CLOUD_PREFS_KEY)||'{}')||{};}catch{return {};}
}
function cloudSavedTargets(){
  try{return JSON.parse(localStorage.getItem(CLOUD_TARGETS_KEY)||'{}')||{};}catch{return {};}
}
function cloudSetStatus(message,bad=false){
  const el=$('cloud-publish-status');if(!el)return;
  el.textContent=message;el.classList.toggle('error',bad);
}
function cloudCurrentLessonSlug(){
  const target=libraryLessonId?cloudSavedTargets()[libraryLessonId]:null;
  try{return githubEditingRef?.slug||target?.slug||normalizeSlug($('project-title').value||'lesson');}catch{return 'anatomy-lesson';}
}
function cloudOpenPublishing(){
  const preferences=cloudSavedPreferences();
  $('cloud-owner').value=githubEditingRef?.owner||cloudVerified?.owner||preferences.owner||'';
  $('cloud-repo').value=githubEditingRef?.repo||cloudVerified?.repo||preferences.repo||'';
  $('cloud-branch').value=githubEditingRef?.branch||cloudVerified?.branch||preferences.branch||'main';
  $('cloud-slug').value=cloudCurrentLessonSlug();
  $('cloud-token').value='';
  $('cloud-publish-results').hidden=true;
  const mismatch=githubEditingRef && cloudVerified &&
      (githubEditingRef.owner.toLowerCase()!==cloudVerified.owner.toLowerCase() ||
       githubEditingRef.repo.toLowerCase()!==cloudVerified.repo.toLowerCase() ||
       githubEditingRef.branch!==cloudVerified.branch);
  cloudSetStatus(mismatch?'Published lesson source differs from connected repository. Disconnect and connect to its repository before publishing.':
    githubEditingRef?'Editing a published lesson. Publishing to the same slug will ask before replacing the live copy.':
    cloudVerified?'Connected and ready to publish.':'Choose a public repository and connect using your fine-grained token.');
  $('cloud-connect').textContent=cloudVerified?'Connected ✓':'Connect GitHub';
  $('cloud-disconnect').hidden=!cloudVerified;
  cloudUpdateCredentialControls();
  if(!cloudVerified)void cloudRestoreRemembered();
}
function cloudSetBusy(active){
  cloudBusy=active;
  for(const id of ['cloud-connect','cloud-disconnect','cloud-publish','cloud-export-json','cloud-unlock','cloud-forget-saved'])$(id).disabled=active;
}
$('cloud-connect').addEventListener('click',async()=>{
  if(cloudBusy)return;
  if(cloudVerified){cloudSetStatus('Already connected. Disconnect to change the repository.');return;}
  const typed=$('cloud-token').value.trim();
  const wantsRemember=$('cloud-remember').checked;
  const vaultPassphrase=$('cloud-remember-password').value;
  if(wantsRemember && vaultPassphrase.length<12){cloudSetStatus('A remembered connection requires an encryption passphrase of at least 12 characters.',true);return;}
  cloudSetBusy(true);cloudSetStatus('Verifying repository and token…');
  try{
    const verified=await verifyPublishingRepository({owner:$('cloud-owner').value,repo:$('cloud-repo').value,token:typed});
    let vaultWarning='';
    if(wantsRemember){
      try{await rememberConnection({token:typed,passphrase:vaultPassphrase,scope:verified});}
      catch(error){vaultWarning=` Connection was NOT saved: ${error.message}`;}
    }else forgetRememberedConnection(); // Do not retain a previous remembered token after a new one is connected.
    cloudToken=typed;cloudVerified=verified;
    $('cloud-owner').value=verified.owner;$('cloud-repo').value=verified.repo;$('cloud-branch').value=verified.branch;
    localStorage.setItem(CLOUD_PREFS_KEY,JSON.stringify({owner:verified.owner,repo:verified.repo,branch:verified.branch}));
    cloudSetStatus(`Connected: ${verified.fullName} (${verified.branch}). ${wantsRemember&&!vaultWarning?'Encrypted credential saved on this device.':'Connected for this tab only.'}${vaultWarning}`,Boolean(vaultWarning));
    $('cloud-connect').textContent='Connected ✓';$('cloud-disconnect').hidden=false;
  }catch(error){cloudToken='';cloudVerified=null;cloudSetStatus(error.message,true);}
  finally{$('cloud-token').value='';$('cloud-remember-password').value='';cloudSetBusy(false);cloudUpdateCredentialControls();}
});
$('cloud-disconnect').addEventListener('click',()=>{
  cloudToken='';cloudVerified=null;$('cloud-token').value='';
  forgetRememberedConnection();
  $('cloud-remember').checked=false;
  $('cloud-connect').textContent='Connect GitHub';$('cloud-disconnect').hidden=true;
  cloudUpdateCredentialControls();
  cloudSetStatus('Disconnected. Removed the remembered GitHub credential from this browser.');
});
$('cloud-export-json').addEventListener('click',()=>{
  try{
    publishPermissions={...currentPublishPermissions()};
    const project=snapshotProject();
    triggerJSONDownload(project,normalizeSlug($('cloud-slug').value)+'.json');
    cloudSetStatus('Local lesson JSON downloaded. Commit it to lessons/ using GitHub Desktop if preferred.');
  }catch(error){cloudSetStatus(error.message,true);}
});
$('cloud-publish').addEventListener('click',async()=>{
  if(cloudBusy)return;
  if(!teacherMode||!sceneRoot)return;
  if(!cloudVerified||!cloudToken){cloudSetStatus('Connect or unlock your GitHub publishing credential first.',true);return;}
  cloudSetBusy(true);cloudSetStatus('Checking the existing lesson on GitHub…');
  try{
    const r=lessonRef($('cloud-owner').value,$('cloud-repo').value,$('cloud-branch').value,$('cloud-slug').value);
    if(r.owner.toLowerCase()!==cloudVerified.owner.toLowerCase()||r.repo.toLowerCase()!==cloudVerified.repo.toLowerCase()||r.branch!==cloudVerified.branch)
      throw new Error('Repository settings changed. Disconnect and reconnect before publishing.');
    publishPermissions={...currentPublishPermissions()};
    const project=snapshotProject();
    const known=libraryLessonId?cloudSavedTargets()[libraryLessonId]:null;
    const safeUpdate=known && known.owner.toLowerCase()===r.owner.toLowerCase() && known.repo.toLowerCase()===r.repo.toLowerCase() && known.branch===r.branch && known.slug===r.slug;
    const result=await publishToGitHub({ref:r,token:cloudToken,project,
      confirmOverwrite:()=>safeUpdate||confirm(`This will replace the currently published lesson at ${r.owner}/${r.repo}/lessons/${r.slug}.json. Existing student links will immediately point to your NEW lesson contents. Continue?`)});
    if(result.cancelled){cloudSetStatus('Publication cancelled. Nothing was changed.');return;}
    githubEditingRef=r;
    // Save local lesson identity so a later update can safely reuse its URL even if renamed.
    try{
      const saved=await saveLesson(project,libraryLessonId);
      libraryLessonId=saved.id;lastLibrarySnapshot=JSON.stringify(saved.project);saveDraft(false);
      const targets=cloudSavedTargets();targets[saved.id]=r;
      localStorage.setItem(CLOUD_TARGETS_KEY,JSON.stringify(targets));
      noteLibraryState(`✓ Saved and published: ${project.t}`);
    }catch(error){console.warn('GitHub publish succeeded; local library save failed:',error);}
    const link=studentLink(location.href,r);
    $('cloud-student-url').value=link;
    $('cloud-embed-url').value=studentLink(location.href,r,{embed:true});
    $('cloud-publish-results').hidden=false;
    cloudSetStatus(`✓ ${result.updated?'Updated':'Published'} on GitHub. Existing student links remain unchanged. Commit ${result.commit.slice(0,8)}. Students may need to refresh (GitHub raw CDN propagation can take a moment).`);
  }catch(error){cloudSetStatus(error.message,true);}
  finally{cloudSetBusy(false);}
});
$('cloud-copy-url').addEventListener('click',async()=>{
  const input=$('cloud-student-url');
  try{await navigator.clipboard.writeText(input.value);cloudSetStatus('Student link copied.');}
  catch{input.select();cloudSetStatus('Copy the selected student URL.');}
});
$('cloud-preview').addEventListener('click',()=>{
  const url=$('cloud-student-url').value;
  if(url)window.open(url,'_blank','noopener');
});
$('cloud-copy-embed').addEventListener('click',async()=>{
  const input=$('cloud-embed-url');
  try{await navigator.clipboard.writeText(input.value);cloudSetStatus('Schoology embed link copied.');}
  catch{input.select();cloudSetStatus('Copy the selected Schoology URL.');}
});


// ANATOMIQ_REMEMBER_GITHUB_20261024 — encrypted browser-only GitHub connection.
// User-controlled vault; never send vault passphrase to GitHub or save a raw PAT.
function cloudUpdateCredentialControls(){
  const saved=hasRememberedConnection();
  $('cloud-remember-password-fields').hidden=!$('cloud-remember').checked||Boolean(cloudVerified);
  $('cloud-forget-saved').hidden=!saved;
  $('cloud-unlock-panel').hidden=!saved||Boolean(cloudVerified);
  $('cloud-disconnect').hidden=!cloudVerified;
}
$('cloud-remember').addEventListener('change',cloudUpdateCredentialControls);
$('cloud-forget-saved').addEventListener('click',()=>{
  forgetRememberedConnection();
  // Explicitly disconnect too, so the teacher is never left with a live credential.
  cloudToken='';cloudVerified=null;
  $('cloud-token').value='';$('cloud-remember-password').value='';$('cloud-unlock-password').value='';
  $('cloud-remember').checked=false;
  $('cloud-connect').textContent='Connect GitHub';
  cloudUpdateCredentialControls();
  cloudSetStatus('Saved GitHub credential deleted from this browser. Disconnected.');
});
async function cloudRestoreRemembered(passphrase=null){
  if(cloudBusy||cloudVerified||!hasRememberedConnection())return;
  if(passphrase===null&&!isTabUnlocked()){
    cloudUpdateCredentialControls();
    cloudSetStatus('Saved connection found. Enter your vault passphrase once to unlock this tab.');
    return;
  }
  cloudSetBusy(true);cloudSetStatus('Restoring your saved GitHub connection…');
  try{
    const saved=await unlockRememberedConnection({passphrase});
    const verified=await verifyPublishingRepository({owner:saved.scope.owner,repo:saved.scope.repo,token:saved.token});
    if(verified.branch!==saved.scope.branch)throw new Error('The GitHub repository default branch changed. Reconnect with a new token.');
    cloudToken=saved.token;cloudVerified=verified;
    $('cloud-owner').value=verified.owner;$('cloud-repo').value=verified.repo;$('cloud-branch').value=verified.branch;
    $('cloud-connect').textContent='Connected ✓';
    cloudSetStatus(`✓ Reconnected securely to ${verified.fullName}. Publishing is ready.`);
    $('cloud-unlock-password').value='';
  }catch(error){
    cloudToken='';cloudVerified=null;
    lockRememberedConnection();
    cloudSetStatus(error.message,true);
  }finally{cloudSetBusy(false);cloudUpdateCredentialControls();}
}
$('cloud-unlock').addEventListener('click',async()=>{
  const passphrase=$('cloud-unlock-password').value;
  try{await cloudRestoreRemembered(passphrase);}finally{$('cloud-unlock-password').value='';}
});
$('cloud-unlock-password').addEventListener('keydown',e=>{
  if(e.key==='Enter'){e.preventDefault();$('cloud-unlock').click();}
});

// --- Publishing: one link with explicit lesson-wide student permissions. ---
const PUBLISH_KEYS={ss:'publish-search',st:'publish-tree',sn:'publish-names',sl:'publish-labels',ll:'publish-label-list',ex:'publish-explore',ot:'publish-system-toolbar'}; // ANATOMIQ_SELECTION_STUDENT_251 ANATOMIQ_STUDENT_LABEL_LIST_252
let embedLink='';
function studentPublishPermission(permissions,key){
  if(key==='ot')return permissions.ot??permissions.ex;
  // Legacy lessons had the label list inside the explorer. Preserve its effective access.
  if(key==='ll')return permissions.ll??Boolean(permissions.sl&&(permissions.st||permissions.ss));
  return permissions[key];
}
function showPublishPermissions(permissions){
  validatePermissions(permissions);
  for(const [key,id] of Object.entries(PUBLISH_KEYS))$(id).checked=studentPublishPermission(permissions,key);
  const exact=(preset)=>Object.keys(PUBLISH_KEYS).every(k=>studentPublishPermission(permissions,k)===preset[k]);
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
  publishPermissions={...currentPublishPermissions()};
  $('publish-results').hidden=true;
  $('share-feedback').textContent='Choose student controls and click Generate student links.';
  $('share-dialog').hidden=false;
  cloudOpenPublishing();
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
    $('iframe-code').value=`<iframe src="${escaped}" title="AnatomIQ Studio interactive 3D lesson" loading="lazy" style="width:100%;height:640px;border:0;display:block" allowfullscreen></iframe>`;
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
  if(placingLabel&&labelPlacementMode==='single'){cancelPlacing();return;}
  beginLabelPlacement('single');
});
$('group-label').addEventListener('click',()=>{
  if(placingLabel&&labelPlacementMode==='group'){cancelPlacing();return;}
  beginLabelPlacement('group');
});
$('group-label-done').addEventListener('click',finishGroupLabel);
$('group-label-stage-done').addEventListener('click',finishGroupLabel);
$('group-label-cancel').addEventListener('click',cancelPlacing);
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
  $('place-hint').textContent=paintMode?'PAINT: Click a structure to color its entire mesh. Esc exits Paint mode.':'Click any structure to create its label. Esc cancels.';
  $('place-hint').hidden=!paintMode;
  elements.stage.style.cursor=paintMode?'crosshair':'';
  openDetails(false);updatePaintControls();
});
$('paint-selected').addEventListener('click',()=>paintMultiSelection(paintColor));
$('erase-selected').addEventListener('click',()=>paintMultiSelection(null));
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
$('polish-publish-controls')?.appendChild(document.querySelector('.publish-options'));
$('polish-student-sharing')?.addEventListener('click',()=>{ $('publish-open')?.click(); });
$('student-label-mode').addEventListener('change',()=>{labelMode=$('student-label-mode').value;queueDraft();});
$('student-explore').addEventListener('change',()=>{studentExplore=$('student-explore').checked;queueDraft();});
// Current working lesson continues to autosave as a draft in localStorage.
$('new-project').addEventListener('click',()=>{
  if(!protectCurrentEdits('start a new lesson'))return;
  clearTimeout(draftTimeout);cancelPlacing();cancelPainting();
  restoreBonePaint([]);polishRestoreFade([]);structureNoteOverrides.clear();
  githubEditingRef=null;libraryLessonId=null;lastLibrarySnapshot=null;noteLibraryState('Not yet saved to the library.');
  chapters=[];activeChapter=0;practicalConfig=normalPractical(null);practicalNewLabelExpand=null;
  publishPermissions={...STUDY_PERMISSIONS};showPublishPermissions(publishPermissions);labels=[];labelMode='shown';studentExplore=false;$('student-label-mode').value=labelMode;$('student-explore').checked=false;
  $('project-title').value='Skull exploration';$('scene-title').value='Skull: Exterior';
  Object.assign(systemLayers,{skeletal:true,deep:false,superficial:true,digestive:false,cardiovascular:false,respiratory:false,nervous:false,urinary:false,lymphatic:false,connective:true,ocular:false});
   legacyEyeVisibilityPending=false;
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
    await loadProject(data);githubEditingRef=null;libraryLessonId=null;lastLibrarySnapshot=null;noteLibraryState('Imported lesson — use Save to Library to keep it.');
    saveDraft(false);resetHistory();showToast('Lesson imported with all chapters.');
  }catch(err){showToast('Could not import scene: '+err.message);}
  finally{$('import-file').value='';}
});

/* ANATOMIQ_WORKSPACE_BRIDGE_241: access only existing validated Teacher project workflows. */
window.__AnatomIQWorkspaceBridge={
  ready:()=>teacherMode && !!sceneRoot && !!window.__AnatomIQWorkspaceBootReady && !libraryBusy,
  capture:()=>({
    project:structuredClone(snapshotProject()),
    libraryLessonId:libraryLessonId??null,
    lastLibrarySnapshot:lastLibrarySnapshot??null,
    githubEditingRef:githubEditingRef?structuredClone(githubEditingRef):null,
    libraryStatus:$('library-status')?.textContent||'Working draft · Not saved to library'
  }),
  async activate(state){
    if(!teacherMode || !sceneRoot || !state?.project || libraryBusy)throw new Error('Workspace not ready.');
    verifyProjectModel(state.project);
    clearTimeout(draftTimeout);clearTimeout(historyTimeout);
    cancelPlacing();cancelPainting();
    await loadProject(structuredClone(state.project));
    githubEditingRef=state.githubEditingRef?structuredClone(state.githubEditingRef):null;
    libraryLessonId=state.libraryLessonId??null;
    lastLibrarySnapshot=state.lastLibrarySnapshot??null;
    noteLibraryState(state.libraryStatus||'Working draft · Not saved to library');
    resetHistory();saveDraft(false);
  },
  blank(){
    if(!teacherMode||!sceneRoot||libraryBusy)throw new Error('Workspace not ready.');
    clearTimeout(draftTimeout);clearTimeout(historyTimeout);
    cancelPlacing();cancelPainting();
    restoreBonePaint([]);polishRestoreFade([]);structureNoteOverrides.clear();
    githubEditingRef=null;libraryLessonId=null;lastLibrarySnapshot=null;
    noteLibraryState('Not yet saved to the library.');
    chapters=[];activeChapter=0;practicalConfig=normalPractical(null);practicalNewLabelExpand=null;
    publishPermissions={...STUDY_PERMISSIONS};showPublishPermissions(publishPermissions);
    labels=[];labelMode='shown';studentExplore=false;
    $('student-label-mode').value=labelMode;$('student-explore').checked=false;
    $('project-title').value='New lesson';$('scene-title').value='Chapter 1';
    Object.assign(systemLayers,{skeletal:true,deep:false,superficial:true,digestive:false,cardiovascular:false,respiratory:false,nervous:false,urinary:false,lymphatic:false,connective:true,ocular:false});
    legacyEyeVisibilityPending=false;
    elements.teeth.checked=true;elements.cartilage.checked=true;setMode('skull');
    renderAnnotations();renderLabelEditor();chapters=[snapshotScene()];renderChapterUI();
    resetHistory();saveDraft(false);
    document.title='New lesson • AnatomIQ Studio';
    return this.capture();
  },
  get title(){return $('project-title')?.value.trim()||'Untitled lesson';},
  isDirty:()=>hasUnsavedLibraryChanges()
};

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
    const items=[...group.querySelectorAll('.menu-item:not([disabled])')].filter(item=>item.getClientRects().length);const current=items.indexOf(document.activeElement);
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
function applyLymphaticPreset(preset){
  if(!teacherMode||!lymphaticAvailable||!Object.hasOwn(LYMPHATIC_PRESETS,preset))return;
  mode='systems';Object.assign(systemLayers,{skeletal:false,superficial:false,deep:false,digestive:false,cardiovascular:false,respiratory:false,nervous:false,urinary:false,lymphatic:true});
  for(const s of lymphaticEntriesList){if(lymphaticVisibleInPreset(s,preset))hidden.delete(s.mesh);else hidden.add(s.mesh);}
  isolated=false;setSelection(null);updateLayerHeading();updateSystemControls();refreshVisibility();frameVisible('front');queueDraft();showToast(LYMPHATIC_PRESETS[preset]+' applied');
}
for(const b of document.querySelectorAll('[data-lymphatic-preset]'))b.addEventListener('click',()=>applyLymphaticPreset(b.dataset.lymphaticPreset));
$('lymphatic-diagram-open').addEventListener('click',()=>{$('lymphatic-diagram-dialog').hidden=false;});
$('lymphatic-diagram-close').addEventListener('click',()=>{$('lymphatic-diagram-dialog').hidden=true;});
$('lymphatic-diagram-dialog').addEventListener('click',e=>{if(e.target===$('lymphatic-diagram-dialog'))e.currentTarget.hidden=true;});
function applyUrinaryPreset(preset){
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
 for(const s of nervousEntriesList){if(nervousVisibleInPreset(s,'all'))hidden.delete(s.mesh);else hidden.add(s.mesh);}
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
    Object.assign(systemLayers,Object.fromEntries(Object.keys(systemLayers).map(key=>[key,key==='skeletal'])));
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
  $('settings-lymphatic-geometry').value=lymphaticGeometry;
$('settings-connective-geometry').value=connectiveGeometry;
  $('settings-urinary-geometry').value=urinaryGeometry;
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
function compareVersions(a,b){return compareStudioVersions(a,b);}

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
    if(!parseStudioVersion(info.version))throw new Error('Invalid version.json');
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
    if(pong.type!=='MODEL_REFRESH_PONG'||pong.version!=='anatomy-v2.2.5-smart-focus')
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
    if(!$('kidney-interior-dialog').hidden)$('kidney-interior-dialog').hidden=true;
    if(!$('lymphatic-diagram-dialog').hidden)$('lymphatic-diagram-dialog').hidden=true;
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

// Enter the generated final chapter through existing Next navigation.
$('next-chapter')?.addEventListener('click',event=>{
  if(!teacherMode&&practicalConfig.on&&!practicalActive&&activeChapter===chapters.length-1){
    event.preventDefault();event.stopImmediatePropagation();void startPractical();
  }
},true);
$('previous-chapter')?.addEventListener('click',event=>{
  if(practicalActive){event.preventDefault();event.stopImmediatePropagation();practicalLeave(true);}
},true);

// ANATOMIQ_PRACTICAL_2216 — lesson-level teacher editor and student 3D practical.
function practicalPool(){
  if(!sceneRoot)return [];
  const current=teacherMode ? snapshotScene() : chapters[activeChapter];
  return practicalCandidates(chapters.map((ch,i)=>teacherMode&&i===activeChapter?current:ch),structures);
}
// A displayed question may represent several left/right anatomy IDs. The
// teacher uses one checkbox to enable/disable the complete answer group.
function practicalKeysOf(item){
  return Array.isArray(item.memberKeys)&&item.memberKeys.length?item.memberKeys:[item.key];
}
function practicalInChapter(item,chapter){
  return chapter==='all'||(Array.isArray(item.chapters)&&item.chapters.includes(Number(chapter)))||item.chapter===Number(chapter);
}
let practicalSearch='',practicalFilter='all';

function anat249PracticalChapterChoices(){
  let field=$('anat249-chapter-selection');
  if(!field){
    field=document.createElement('fieldset');field.id='anat249-chapter-selection';field.className='anat249-practical-chapters';
    const legend=document.createElement('legend');legend.textContent='Chapters included in Practical';
    const list=document.createElement('div');list.className='anat249-practical-chapters-list';field.append(legend,list);
    $('practical-search')?.before(field);
  }
  const list=field.querySelector('.anat249-practical-chapters-list');list.replaceChildren();
  chapters.forEach((ch,index)=>{
    const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';
    input.checked=!Array.isArray(practicalConfig.chapters)||practicalConfig.chapters.includes(index);
    input.setAttribute('aria-label','Include chapter '+(index+1)+' '+ch.t);
    input.addEventListener('change',()=>{
      const choices=[...list.querySelectorAll('input')].map((box,i)=>box.checked?i:null).filter(Number.isInteger);
      practicalConfig.chapters=choices.length===chapters.length?null:choices;
      renderPracticalEditor();queueDraft();
    });
    const text=document.createElement('span');text.textContent=`${index+1}. ${ch.t}`;
    label.append(input,text);list.append(label);
  });
}

function renderPracticalEditor(){
  if(!teacherMode||!sceneRoot)return;
  const enabled=$('practical-enabled');if(!enabled)return;
  enabled.checked=practicalConfig.on;
  anat249PracticalChapterChoices();
  const pool=practicalPool(),off=new Set(practicalConfig.off);
  const eligible=pool.filter(q=>q.variants?.some(v=>(!Array.isArray(practicalConfig.chapters)||practicalConfig.chapters.includes(v.chapter))&&!off.has(v.key)));
  const opts=$('practical-editor-options');opts.hidden=!practicalConfig.on;
  $('practical-eligible-count').textContent=`${eligible.length} of ${pool.length} eligible targets`;
  $('practical-question-count').value=String(practicalConfig.count);
  $('practical-question-count').max=String(Math.max(1,Math.min(60,eligible.length)));
  $('practical-question-count').disabled=!eligible.length;
  $('practical-warning').textContent=!eligible.length?'Select at least one visible structure or label before publishing a practical.':practicalConfig.count>eligible.length?`Only ${eligible.length} eligible questions; the practical will use all of them.`:'Questions are randomized on every attempt. Labels must identify their anchored structure.';
  $('practical-search').value=practicalSearch;
  const select=$('practical-chapter-filter');
  const prior=practicalFilter;select.replaceChildren();
  const all=document.createElement('option');all.value='all';all.textContent='All chapters';select.append(all);
  chapters.forEach((ch,i)=>{const opt=document.createElement('option');opt.value=String(i);opt.textContent=`${i+1}. ${ch.t}`;select.append(opt);});
  if(prior!=='all'&&Number(prior)>=chapters.length)practicalFilter='all';
  select.value=practicalFilter;
  const list=$('practical-candidate-list');list.replaceChildren();
  const match=pool.filter(q=>(!Array.isArray(practicalConfig.chapters)||q.variants?.some(v=>practicalConfig.chapters.includes(v.chapter))) && practicalInChapter(q,practicalFilter) &&
    `${q.name} ${q.system} ${q.tissue}`.toLowerCase().includes(practicalSearch.toLowerCase()));
  for(const item of match.slice(0,140)){
    const row=document.createElement('label');row.className='practical-candidate';
    const input=document.createElement('input');input.type='checkbox';input.checked=practicalKeysOf(item).some(key=>!off.has(key));
    input.addEventListener('change',()=>{
      const disabled=new Set(practicalConfig.off);
      for(const key of practicalKeysOf(item)){if(input.checked)disabled.delete(key);else disabled.add(key);}
      practicalConfig.off=[...disabled];renderPracticalEditor();queueDraft();
    });
    const name=document.createElement('span');name.textContent=item.name;
    const detail=document.createElement('small');
    const sourceChapters=Array.isArray(item.chapters)?item.chapters:[item.chapter];
    detail.textContent=`Chapter${sourceChapters.length>1?'s':''} ${sourceChapters.map(n=>n+1).join(', ')} · ${item.type==='label'?'Teacher label':'Anatomical mesh'} · ${item.system}${practicalKeysOf(item).length>1?' · bilateral/common answer':''}`;
    const text=document.createElement('span');text.className='practical-candidate-text';text.append(name,detail);
    row.append(input,text);list.append(row);
  }
  const footer=$('practical-candidate-footer');footer.textContent=match.length>140?`Showing 140 of ${match.length} matches. Search or filter to narrow the list.`:`${match.length} matching targets`;
}
function practicalBulk(enable){
  const pool=practicalPool();const off=new Set(practicalConfig.off);
  for(const q of pool){
    if(!practicalInChapter(q,practicalFilter))continue;
    if(!`${q.name} ${q.system} ${q.tissue}`.toLowerCase().includes(practicalSearch.toLowerCase()))continue;
    for(const key of practicalKeysOf(q)){if(enable)off.delete(key);else off.add(key);}
  }
  practicalConfig.off=[...off];renderPracticalEditor();queueDraft();
}
$('practical-enabled')?.addEventListener('change',e=>{practicalConfig.on=e.target.checked;renderPracticalEditor();queueDraft();});
$('practical-question-count')?.addEventListener('change',e=>{
  practicalConfig.count=Math.min(60,Math.max(1,Math.floor(Number(e.target.value)||15)));
  renderPracticalEditor();queueDraft();
});
$('practical-search')?.addEventListener('input',e=>{practicalSearch=e.target.value;renderPracticalEditor();$('practical-search').focus();$('practical-search').setSelectionRange(practicalSearch.length,practicalSearch.length);});
$('practical-chapter-filter')?.addEventListener('change',e=>{practicalFilter=e.target.value;renderPracticalEditor();});
$('practical-select-all')?.addEventListener('click',()=>practicalBulk(true));
$('practical-select-none')?.addEventListener('click',()=>practicalBulk(false));

function practicalClearHighlight(){
  if(practicalHighlight){
    practicalHighlight.mesh.material=practicalHighlight.original;
    for(const material of practicalHighlight.temporary)material.dispose();
    practicalHighlight=null;
  }
  if(practicalTargetMarker){scene.remove(practicalTargetMarker);practicalTargetMarker.geometry.dispose();practicalTargetMarker.material.dispose();practicalTargetMarker=null;}
  invalidate(2);
}
function practicalSetHighlight(question){
  const s=structures[question.s];if(!s?.mesh?.visible||s.mesh.userData?.deferredAsset)throw new Error(`Quiz target not rendered: ${question.name}`);
  const mesh=s.mesh,original=mesh.material;
  const temporary=(Array.isArray(original)?original:[original]).map(material=>{
    const copy=material?.clone?.()||new THREE.MeshStandardMaterial({color:0x4df0b1});
    if(copy.color?.lerp)copy.color.lerp(new THREE.Color(0x68ffd1),0.65);
    if(copy.emissive?.set){copy.emissive.set(0x11b7a8);copy.emissiveIntensity=0.52;}
    copy.depthTest=true;return copy;
  });
  mesh.material=Array.isArray(original)?temporary:temporary[0];
  practicalHighlight={mesh,original,temporary};
  if(question.type==='label'&&Array.isArray(question.anchor)&&question.anchor.length===3){
    mesh.updateWorldMatrix(true,false);
    const anchor=mesh.localToWorld(new THREE.Vector3(...question.anchor));
    const box=new THREE.Box3().setFromObject(mesh);const radius=Math.max(.004,Math.min(.018,box.getSize(new THREE.Vector3()).length()*.035));
    practicalTargetMarker=new THREE.Mesh(new THREE.SphereGeometry(radius,12,10),new THREE.MeshBasicMaterial({color:0xffdb5a,depthTest:false}));
    practicalTargetMarker.position.copy(anchor);practicalTargetMarker.renderOrder=999;
    scene.add(practicalTargetMarker);
  }
  invalidate(3);
}
function practicalPositionCamera(q){
  const mesh=structures[q.s]?.mesh;if(!mesh)return;
  const box=new THREE.Box3().setFromObject(mesh);
  if(box.isEmpty())return;
  const center=box.getCenter(new THREE.Vector3());
  const radius=box.getBoundingSphere(new THREE.Sphere()).radius;
  const c=chapters[q.chapter]?.cam||[];
  const dir=new THREE.Vector3((c[0]||0)-(c[3]||0),(c[1]||0)-(c[4]||0),(c[2]||1)-(c[5]||0));
  if(dir.lengthSq()<0.001)dir.set(0,0,1);
  const distance=Math.max(0.16,Math.min(6,radius*4.3));
  polishMoveCamera(center.clone().addScaledVector(dir.normalize(),distance),center,{duration:340,save:false});
}
async function practicalShowQuestion(){
  if(!practicalActive||!practicalState)return;
  const index=practicalState.index,q=practicalState.questions[index];
  if(!q)return;
  practicalClearHighlight();
  practicalBusy=true;
  const status=$('practical-message');status.textContent='Preparing 3D target…';
  $('practical-next').disabled=true;
  try{
    await ensureChapterAssets(chapters[q.chapter]);
    if(!practicalActive||!practicalState||practicalState.index!==index)return;
    await applyScene(chapters[q.chapter]);
    if(!practicalActive||!practicalState||practicalState.index!==index)return;
    practicalSetHighlight(q);practicalPositionCamera(q);
    $('practical-progress').textContent=`QUESTION ${index+1} OF ${practicalState.questions.length}`;
    status.textContent=q.type==='label'?'Identify the structure indicated by the highlighted marker.':'Identify the highlighted anatomical structure.';
    const options=$('practical-options');options.replaceChildren();
    practicalState.selected=null;
    q.choices.forEach((name,i)=>{
      const button=document.createElement('button');button.type='button';button.className='practical-option';
      const letter=document.createElement('span');letter.className='practical-option-letter';letter.textContent='ABCD'[i]||String(i+1);
      const label=document.createElement('span');label.textContent=name;button.append(letter,label);
      button.addEventListener('click',()=>{
        if(practicalBusy)return;
        practicalState.selected=name;
        for(const b of options.children)b.classList.toggle('chosen',b===button);
        $('practical-next').disabled=false;
      });options.append(button);
    });
    $('practical-next').textContent=index===practicalState.questions.length-1?'Finish practical':'Next question →';
    $('practical-question-content').hidden=false;$('practical-results').hidden=true;
  }catch(error){console.error('AnatomIQ Practical target failed',error);showToast(error.message);practicalLeave(true);}
  finally{practicalBusy=false;}
}
async function startPractical(){
  if(teacherMode||!practicalConfig.on||practicalBusy)return;
  if(divisionScope){divisionNavReset(false);refreshVisibility(true);}
  if(practicalActive){renderChapterUI();return;}
  const qs=practicalAttempt(practicalPool(),structures,practicalConfig);
  if(!qs.length){showToast('This practical has no eligible, identifiable structures. Ask the teacher to configure its questions.');return;}
  practicalActive=true;practicalState={questions:qs,index:0,answers:[],selected:null};
  setSelection(null);
  document.body.classList.add('practical-active');
  $('practical-panel').hidden=false;
  $('practical-question-content').hidden=false;$('practical-results').hidden=true;
  renderChapterUI();await practicalShowQuestion();
}
function practicalLeave(restoreChapter=false){
  practicalClearHighlight();practicalActive=false;practicalState=null;practicalBusy=false;
  document.body.classList.remove('practical-active');$('practical-panel').hidden=true;
  if(restoreChapter&&chapters[activeChapter])void applyScene(chapters[activeChapter]).then(renderChapterUI).catch(console.warn);
  else renderChapterUI();
}
function practicalFinish(){
  if(!practicalState)return;
  practicalClearHighlight();
  const result=gradePractical(practicalState.questions,practicalState.answers);
  $('practical-question-content').hidden=true;$('practical-results').hidden=false;
  $('practical-result-score').textContent=`${result.percent}%`;
  $('practical-result-detail').textContent=`${result.correct} of ${result.total} correct`;
  const missed=$('practical-missed');missed.replaceChildren();
  if(!result.missed.length){const p=document.createElement('p');p.textContent='Excellent — no missed structures!';missed.append(p);}
  else result.missed.forEach(m=>{
    const item=document.createElement('div');item.className='practical-missed-item';
    const heading=document.createElement('strong');heading.textContent=m.name;
    const text=document.createElement('small');text.textContent=`Your choice: ${m.answer} · Chapter ${m.chapter}`;
    item.append(heading,text);missed.append(item);
  });
  $('practical-progress').textContent='PRACTICAL COMPLETE';
  $('practical-message').textContent='Your results are shown only in this browser. A retake will generate a new shuffle.';
}
$('practical-next')?.addEventListener('click',()=>{
  if(!practicalActive||practicalBusy||!practicalState?.selected)return;
  practicalState.answers.push(practicalState.selected);
  if(practicalState.index===practicalState.questions.length-1){practicalFinish();return;}
  practicalState.index++;
  void practicalShowQuestion();
});
$('practical-retake')?.addEventListener('click',async()=>{
  if(!practicalActive||practicalBusy)return;
  practicalClearHighlight();practicalActive=false;practicalState=null;
  await startPractical();
});
$('practical-exit')?.addEventListener('click',()=>{
  if(!practicalActive)return;
  practicalLeave(true);
});

