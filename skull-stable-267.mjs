/* AnatomIQ 2.2.67 – approved C1 assembled skull (stable, no calibration UI).
 * All replacement bones are transformed by the SAME rigid+uniform-scale
 * matrix around the existing C1 vertebra. Original mesh identities remain.
 */
export const SKULL_ASSEMBLED_VERSION='2.2.67';
const ASSET='./models/skull-native-266d.glb?rev=skull267';
const REPORT='./models/skull-native-266d-report.json?rev=skull267';
const key=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const skullName=s=>/\b(frontal|parietal|temporal|occipital|ethmoid|sphenoid|lacrimal|nasal|palatine|zygomatic|maxilla|mandible|vomer|concha)\b/i.test(String(s||''));

const clamp=(n,min,max,fallback)=>Number.isFinite(+n)?Math.min(max,Math.max(min,+n)):fallback;
export function safePlacement(x={}) {return {
 enabled:x.enabled===true,tx:clamp(x.tx,-120,120,0),ty:clamp(x.ty,-120,120,0),tz:clamp(x.tz,-120,120,0),
 rx:clamp(x.rx,-35,35,0),ry:clamp(x.ry,-35,35,0),rz:clamp(x.rz,-35,35,0),
 scale:clamp(x.scale,.8,1.2,1),showReference:x.showReference===true,showUnmatched:x.showUnmatched===true,
 skullTone:/^#[0-9a-fA-F]{6}$/.test(x.skullTone||'')?x.skullTone:'#eee0c9',
 boneContrast:['subtle','distinct'].includes(x.boneContrast)?x.boneContrast:'distinct',
 vomerTx:clamp(x.vomerTx,-30,30,0),vomerTy:clamp(x.vomerTy,-30,30,0),vomerTz:clamp(x.vomerTz,-30,30,0),
 vomerRx:clamp(x.vomerRx,-50,50,0),vomerRy:clamp(x.vomerRy,-50,50,0),vomerRz:clamp(x.vomerRz,-50,50,0),
 showVomerReference:x.showVomerReference===true
};}
export function worldTransform(THREE,pivot,placement){
 const p=safePlacement(placement),move=new THREE.Matrix4().makeTranslation(p.tx/1000,p.ty/1000,p.tz/1000);
 const back=new THREE.Matrix4().makeTranslation(pivot.x,pivot.y,pivot.z);
 const rot=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(p.rx*Math.PI/180,p.ry*Math.PI/180,p.rz*Math.PI/180,'XYZ'));
 const scale=new THREE.Matrix4().makeScale(p.scale,p.scale,p.scale);
 const forward=new THREE.Matrix4().makeTranslation(-pivot.x,-pivot.y,-pivot.z);
 return move.multiply(back).multiply(rot).multiply(scale).multiply(forward);
}
// Vomer-only tweak after the common skull registration. Its pivot is the
// replacement VOMER's own world-space geometric center, not C1, so a rotation
// cannot drag the entire skull out of alignment. Translation uses world mm.
export function vomerWorldCorrection(THREE,pivot,p){
 const v=safePlacement(p);
 const T=new THREE.Matrix4().makeTranslation(v.vomerTx/1000,v.vomerTy/1000,v.vomerTz/1000);
 const A=new THREE.Matrix4().makeTranslation(pivot.x,pivot.y,pivot.z);
 const R=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(
  v.vomerRx*Math.PI/180,v.vomerRy*Math.PI/180,v.vomerRz*Math.PI/180,'XYZ'));
 const B=new THREE.Matrix4().makeTranslation(-pivot.x,-pivot.y,-pivot.z);
 return T.multiply(A).multiply(R).multiply(B);
}
// Flat STL facets lack the original Écorché texture UVs. Instead of trying to
// remap the unrelated atlas, build a low-cost, UV-free bone finish. There are no
// extra triangles, texture requests, or draw calls.
const PALETTE=['#f7ead5','#e1c9a9','#f1ddc3','#ead6b9','#f6e6d0','#d9c5ab','#efdfca','#e5d1b6'];
export const boneHash=name=>{let h=2166136261;for(const c of String(name).toLowerCase()){h=Math.imul(h^c.charCodeAt(0),16777619)}return h>>>0};
export function boneColor(name,tone,contrast,THREE){
 const base=new THREE.Color(tone),variant=new THREE.Color(PALETTE[boneHash(name)%PALETTE.length]);
 return base.lerp(variant,contrast==='distinct'?.78:.24);
}
export function enhanceBoneGeometry(src,THREE){
 const geo=src.clone();
 let normal=geo.getAttribute('normal');
 if(!normal){geo.computeVertexNormals();normal=geo.getAttribute('normal');}
 const pos=geo.getAttribute('position');const groups=new Map(), count=pos.count;
 // Smooth coincident triangle vertices *within a bone only*, retaining sharp
 // anatomical changes at angles exceeding 60 degrees.
 for(let i=0;i<count;i++){
  const key=[pos.getX(i),pos.getY(i),pos.getZ(i)].map(v=>Math.round(v*1e6)).join('/');
  let group=groups.get(key);if(!group)groups.set(key,group=[]);group.push(i);
 }
 const original=Float32Array.from(normal.array),out=new Float32Array(original);
 for(const group of groups.values()){
  if(group.length<2||group.length>80)continue;
  for(const i of group){let nx=0,ny=0,nz=0;const a=i*3;
   const al=Math.hypot(original[a],original[a+1],original[a+2])||1;
   for(const j of group){const b=j*3,bl=Math.hypot(original[b],original[b+1],original[b+2])||1;
    const dot=(original[a]*original[b]+original[a+1]*original[b+1]+original[a+2]*original[b+2])/(al*bl);
    if(dot>=.50){nx+=original[b]/bl;ny+=original[b+1]/bl;nz+=original[b+2]/bl;}
   }
   const length=Math.hypot(nx,ny,nz)||1;out[a]=nx/length;out[a+1]=ny/length;out[a+2]=nz/length;
  }
 }
 for(let i=0;i<count;i++)normal.setXYZ(i,out[i*3],out[i*3+1],out[i*3+2]);
 normal.needsUpdate=true;
 // Natural-looking broad surface grain, in linear vertex-color space. Because
 // coincident vertices share coordinates, grains do not create seam flicker.
 const colors=new Float32Array(count*3);
 for(let i=0;i<count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
  const grain=.98+.017*Math.sin(x*237+y*81+z*105)+.012*Math.sin(x*51-y*133+z*187);
  colors[i*3]=grain;colors[i*3+1]=grain*.997;colors[i*3+2]=grain*.986;
 }
 geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
 return geo;
}
// Approved positions are baked into this production module, not stored in
// localStorage and not read from the removed teacher calibration workbench.
export const APPROVED_SKULL_PLACEMENT=Object.freeze({"tx":0,"ty":-2,"tz":2,"rx":0.5,"ry":0,"rz":0,"scale":1.07,"vomerTx":1,"vomerTy":-6,"vomerTz":1,"vomerRx":14.5,"vomerRy":2,"vomerRz":0,"enabled":true,"skullTone":"#eee0c9","boneContrast":"distinct","showReference":false,"showUnmatched":false,"showVomerReference":false});

/** Activates skull replacements ONLY in global Detailed skeletal mode.
 * Existing mesh objects (selection IDs, metadata) remain authoritative.
 * All native skull bones share a single C1-anchored transform, with the exported
 * vomer-only correction applied after the shared placement.
 */
export function createStableSkull(structures,THREE,{
 invalidate=()=>{}, loaderFactory, originalMaterialFor,
 applyMaterial=()=>{}
}={}){
 let mode='standard', loaded=null, pending=null, lastError='',active=0,serial=0;
 const originals=new Map(),candidates=new Map(),unmatched=new Map();
 const ownedGeometries=new Map(),materials=new Map();
 let anchorWorld=null;
 function keepOriginal(mesh,entry){
   if(!originals.has(mesh))originals.set(mesh,{geometry:mesh.geometry,material:originalMaterialFor?.(mesh)||mesh.material,visible:mesh.visible,entry});
 }
 function restore(){
   for(const [mesh,old] of originals){
     mesh.geometry=old.geometry;mesh.visible=old.visible;
     applyMaterial(old.entry,old.material);
   }
   active=0;invalidate(3);
 }
 async function prepare(){
   if(loaded)return loaded;
   if(pending)return pending;
   pending=(async()=>{
     const response=await fetch(REPORT,{cache:'no-cache'});
     if(!response.ok||/text\/html/i.test(response.headers.get('content-type')||''))throw Error('Approved skull manifest missing');
     const report=await response.json();
     if(report.version!=='2.2.66d'||report.candidate_count!==20||!String(report.method).includes('no per-bone alignment'))throw Error('Unexpected native assembled skull manifest');
     const loader=loaderFactory?loaderFactory():new (await import('three/addons/loaders/GLTFLoader.js')).GLTFLoader();
     const gltf=await new Promise((resolve,reject)=>loader.load(ASSET,resolve,undefined,reject));
     const nodes=new Map();
     gltf.scene.traverse(obj=>{if(!obj.isMesh)return;const k=key(obj.userData?.name||obj.name);nodes.set(k,nodes.has(k)?null:obj.geometry)});
     const targets=new Map();
     for(const structure of structures)if(structure.system==='skeletal'&&structure.mesh?.geometry&&skullName(structure.name)){
       const k=key(structure.name);targets.set(k,targets.has(k)?null:structure);
     }
     const atlas=structures.find(s=>s.system==='skeletal'&&key(s.name)==='atlas'&&s.mesh?.geometry);
     if(!atlas)throw Error('Atlas/C1 missing; cannot install assembled skull');
     atlas.mesh.updateWorldMatrix(true,false);
     const atlasBox=new THREE.Box3().setFromObject(atlas.mesh);
     if(atlasBox.isEmpty())throw Error('C1 bounding box unavailable');
     anchorWorld=atlasBox.getCenter(new THREE.Vector3());
     const found=[];
     for(const row of report.rows||[]){
       if(row.status!=='native')continue;
       const k=key(row.name),target=targets.get(k),geometry=nodes.get(k);
       if(!target||!geometry)continue;
       const originalCount=Math.floor((target.mesh.geometry.index?.count||target.mesh.geometry.attributes.position.count)/3);
       const sourceCount=Math.floor((geometry.index?.count||geometry.attributes.position.count)/3);
       if(originalCount!==row.old_triangles||sourceCount!==row.source_triangles)continue;
       found.push([k,row,target,geometry]);
     }
     // Require the exact approved 20-bone cohort: never ship a partial gray or
     // misregistered skull silently when caches or models are stale.
     if(found.length!==20)throw Error(`Approved skull coverage differs: ${found.length}/20; keeping original skull`);
     for(const [k,structure] of targets)if(structure){keepOriginal(structure.mesh,structure);if(!found.some(item=>item[0]===k))unmatched.set(k,structure)}
     const common=worldTransform(THREE,anchorWorld,APPROVED_SKULL_PLACEMENT);
     for(const [k,row,target,geometry] of found){
       const mesh=target.mesh;
       mesh.updateWorldMatrix(true,false);
       const world=mesh.matrixWorld.clone(),local=world.clone().invert().multiply(common).multiply(world);
       const transformed=enhanceBoneGeometry(geometry,THREE);
       transformed.applyMatrix4(local);
       if(k==='vomer'){
         transformed.computeBoundingBox();
         const centerWorld=transformed.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(world);
         const vomerLocal=world.clone().invert().multiply(vomerWorldCorrection(THREE,centerWorld,APPROVED_SKULL_PLACEMENT)).multiply(world);
         transformed.applyMatrix4(vomerLocal);
       }
       transformed.computeBoundingBox();transformed.computeBoundingSphere();
       ownedGeometries.set(mesh,transformed);candidates.set(k,{row,target});
       const material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.83,metalness:0,flatShading:false});
       material.color.copy(boneColor(k,APPROVED_SKULL_PLACEMENT.skullTone,APPROVED_SKULL_PLACEMENT.boneContrast,THREE));
       materials.set(mesh,material);
     }
     loaded={report};return loaded;
   })();
   try{return await pending}catch(error){pending=null;throw error}
 }
 async function sync(next){
   const request=++serial;
   if(next!=='detailed'){mode='standard';restore();return true}
   mode='detailed';
   try{
     await prepare();
     if(request!==serial||mode!=='detailed')return false;
     for(const {target} of candidates.values()){
       const mesh=target.mesh,old=originals.get(mesh);
       mesh.geometry=ownedGeometries.get(mesh);
       mesh.visible=old.visible;
       applyMaterial(target,materials.get(mesh));
     }
     // Match the user's approved preview: these five unmatched nasal structures
     // are suppressed in Detailed; their original meshes remain in the scene
     // and Standard mode restores their original visibility.
     for(const structure of unmatched.values())structure.mesh.visible=false;
     active=candidates.size;lastError='';invalidate(3);return true;
   }catch(error){
     restore();lastError=String(error?.message||error);
     console.warn('AnatomIQ stable skull: falling back to original skull:',lastError);
     return false;
   }
 }
 return {sync,getStatus:()=>({mode,active,available:candidates.size,unmatched:unmatched.size,error:lastError})};
}
