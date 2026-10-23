/* BodyParts3D / DBCLS v4.3 heart and major vessel layer. No guessed meshes. */
const idPattern=/^FJ\d+$/;
export function validateCardiovascularManifest(meta){
 if(!meta||meta.version!==1||!Array.isArray(meta.structures)||meta.structures.length<5||meta.structures.length>100)throw new Error('Invalid cardiovascular metadata');
 const seen=new Set();
 for(const s of meta.structures){
  if(!idPattern.test(s.id)||typeof s.name!=='string'||!s.name.trim()||seen.has(s.id))throw new Error('Invalid cardiovascular structure identifier');
  seen.add(s.id);
 }
 return meta;
}
export function cardiovascularFamily(name){
 const n=String(name).toLowerCase();
 if(/atri(al|um)|ventric|myocard|heart/.test(n))return 'heart';
 if(/pulmonary (arter|trunk)|pulmonary vein/.test(n))return 'pulmonary';
 if(/aorta|carotid|arter(y|ies)/.test(n))return 'artery';
 if(/vena cava|jugular|vein/.test(n))return 'vein';
 return 'other';
}
export const CARDIO_COLORS=Object.freeze({heart:'#bb6570',artery:'#c45551',pulmonary:'#a96685',vein:'#557eaf',other:'#aa6d70'});
export function cardiovascularColor(name){return CARDIO_COLORS[cardiovascularFamily(name)];}
export function cardiovascularEntries(root,raw){
 const meta=validateCardiovascularManifest(raw),found=new Map();
 root.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const match=/(FJ\d+)/.exec(mesh.name||'');
  if(!match||found.has(match[1]))throw new Error('Unexpected or duplicate cardiovascular mesh: '+mesh.name);
  found.set(match[1],mesh);
 });
 if(found.size!==meta.structures.length)throw new Error('Cardiovascular GLB/metadata count mismatch');
 return meta.structures.map(s=>{
  const mesh=found.get(s.id);if(!mesh)throw new Error('Cardiovascular mesh missing: '+s.id);
  return {mesh,name:s.name,sourceName:s.id,stableId:'bp43:'+s.id,
   side:/^left /i.test(s.name)?'left':/^right /i.test(s.name)?'right':'midline',
   tissue:cardiovascularFamily(s.name)==='heart'?'heart':'vessel',
   system:'cardiovascular',layer:'cardiovascular-detail',organId:cardiovascularFamily(s.name),fma:s.fma_id||''};
 });
}
