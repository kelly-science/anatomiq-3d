/** ANATOMIQ_MUSCLE_EXTENSION_383
 * Append-only BodyParts3D platysma and buccinator extension.
 * Four converted meshes are baked into the reference skeleton's coordinate
 * system at build time. Runtime registration uses tiny landmark JSON, not an
 * extra reference GLB, STL parser, or external network service.
 * BodyParts3D 3.0 (Database Center for Life Science), CC BY-SA 2.1 Japan.
 */
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {fitSimilarity} from './muscle-registration-383.mjs?rev=383';

const DEFINITIONS=Object.freeze([
  ['FMA45739','Right platysma','right','superficial muscles'],
  ['FMA45740','Left platysma','left','superficial muscles'],
  ['FMA46835','Right buccinator','right','deep muscles'],
  ['FMA46836','Left buccinator','left','deep muscles']
]);
const status=(value)=>{if(typeof window!=='undefined')window.__AnatomIQMuscleExtensionStatus={version:'2.2.163',...value};};

function key(name){
  return String(name||'').toLowerCase().normalize('NFKD')
    .replace(/\b(left|lft|lt)\b/g,'left').replace(/\b(right|rgt|rt)\b/g,'right')
    .replace(/[^a-z0-9]+/g,' ')
    .replace(/\b(bone|bones|skeletal|system|mesh|body|part)\b/g,'')
    .replace(/\s+/g,' ').trim();
}
function uniqueCenters(THREE,items){
  const map=new Map();
  for(const item of items){
    const name=key(item.name);if(name.length<4)continue;
    const center=item.mesh ? new THREE.Box3().setFromObject(item.mesh).getCenter(new THREE.Vector3()).toArray() : item.center;
    if(!Array.isArray(center)||center.length!==3||!center.every(Number.isFinite))continue;
    if(map.has(name))map.set(name,null);else map.set(name,center);
  }
  return new Map([...map].filter(([,center])=>center));
}
function asJSON(response,kind){
  if(!response.ok||/text\/html/i.test(response.headers.get('content-type')||''))throw Error(`${kind} missing (HTTP ${response.status}). Publish all 383 muscle extension files.`);
  return response.json();
}
/** Must run before catalog creation, but after the original Écorché root loads. */
export async function loadMuscleExtension383(THREE,scene,materials,applySurfaceFinish,surfaceMode){
  status({ready:false,stage:'loading'});
  const response=await fetch('./models/muscle-landmarks-383.json?rev=383',{cache:'no-cache'});
  const config=await asJSON(response,'Muscle landmark registry');
  if(config.version!==383 || !Array.isArray(config.landmarks)||config.landmarks.length<30 ||
     !Array.isArray(config.ids)||DEFINITIONS.some(([id])=>!config.ids.includes(id)))throw Error('Invalid 383 muscle landmark registry');
  const gltf=await new GLTFLoader().loadAsync('./models/muscle-extension-383.glb?rev=383');
  const byId=new Map();gltf.scene.traverse(obj=>{
    if(!obj.isMesh)return;
    const id=obj.userData?.sourceName;
    if(byId.has(id))throw Error('Duplicate muscle mesh ID: '+id);
    byId.set(id,obj);
  });
  if(byId.size!==4||DEFINITIONS.some(([id])=>!byId.has(id)))throw Error('Incorrect 383 GLB inventory; four named muscles required');
  const root=gltf.scene;root.name='AnatomIQ_Platysma_Buccinator_383';root.visible=false;
  // No atlas UV exists for the added BodyParts3D meshes. Use a single simple
  // shared muscle material; do not apply Écorché's source texture to them.
  const muscleMaterial=new THREE.MeshStandardMaterial({color:0xc1736d,roughness:0.48,metalness:0,side:THREE.DoubleSide});
  applySurfaceFinish(muscleMaterial,'muscular',surfaceMode);
  const entries=DEFINITIONS.map(([id,name,side,layer])=>{
    const mesh=byId.get(id);mesh.name=name;mesh.material=muscleMaterial;
    mesh.userData={...mesh.userData,sourceName:id,name,side,layer,tissue:'muscle',muscleExtension383:true};
    // New meshes are individually addressable and share existing pick/paint logic.
    materials.set(mesh,muscleMaterial);
    return {mesh,name,side,layer,tissue:'muscle',system:'muscular',skull:false,sourceName:id,extension383:true};
  });
  // A retry may reload the atlas within the same page. Never duplicate meshes.
  const previous=scene.getObjectByName('AnatomIQ_Platysma_Buccinator_383');
  if(previous)scene.remove(previous);
  scene.add(root);
  status({ready:false,stage:'awaiting skeletal registration',count:4});
  return {root,entries,landmarks:config.landmarks,registered:false};
}

/** Register after AnatomIQ's detailed skeleton upgrade completes. */
export function registerMuscleExtension383(THREE,extension,structures){
  if(!extension||extension.entries.length!==4)throw Error('Muscle extension not loaded');
  const source=uniqueCenters(THREE,extension.landmarks);
  const native=uniqueCenters(THREE,structures.filter(s=>s.system==='skeletal').map(s=>({name:s.name,mesh:s.mesh})));
  const matches=[];
  for(const [k,x] of source){const y=native.get(k);if(y)matches.push([x,y]);}
  if(matches.length<25)throw Error(`Only ${matches.length} matching bones; cannot safely register new muscles.`);
  const fit=fitSimilarity(matches);
  const targetSize=new THREE.Box3();
  for(const s of structures)if(s.system==='skeletal')targetSize.expandByObject(s.mesh);
  const span=targetSize.getSize(new THREE.Vector3()).length();
  if(!Number.isFinite(span)||span<0.05||fit.used<25||fit.rms>span*0.025){
    throw Error(`Muscle registration failed quality checks: ${fit.used}/${fit.total} bones, RMS=${fit.rms}.`);
  }
  extension.root.matrixAutoUpdate=false;
  extension.root.matrix.fromArray(fit.matrix);
  extension.root.matrixWorldNeedsUpdate=true;
  extension.root.updateMatrixWorld(true);
  extension.root.visible=true;
  extension.registered=true;
  const result={ready:true,stage:'registered',count:4,matchedBones:fit.used,totalMatches:fit.total,
    rms:fit.rms,scale:fit.scale,source:'BodyParts3D 3.0',license:'CC BY-SA 2.1 Japan'};
  status(result);
  return result;
}
