import {digestiveOrganFamily} from './digestive-model.js';
// Contract shared with tools/build-digestive-detail.py. IDs are BodyParts3D FJ IDs.
const idPattern=/^FJ\d+$/;
export function validateDigestiveManifest(meta){
 if(!meta || meta.version!==1 || !Array.isArray(meta.structures) || !meta.structures.length || meta.structures.length>250)
   throw new Error('Invalid detailed digestive metadata.');
 const used=new Set();
 for(const s of meta.structures){
   if(!idPattern.test(s.id)||!s.name||s.name.length>100||used.has(s.id))throw new Error('Duplicate or invalid digestive structure ID');
   used.add(s.id);
 }
 return meta;
}
export function detailStructureEntries(root,raw){
 const meta=validateDigestiveManifest(raw);
 const found=new Map();
 root.traverse(obj=>{
   if(!obj.isMesh)return;
   const match=/(FJ\d+)/.exec(obj.name||'');
   if(!match || found.has(match[1]))throw new Error('Unexpected or duplicated detailed digestive mesh: '+obj.name);
   found.set(match[1],obj);
 });
 if(found.size!==meta.structures.length)throw new Error('Detailed model count does not match its metadata');
 return meta.structures.map(s=>{
   const mesh=found.get(s.id);
   if(!mesh)throw new Error('Detailed model is missing '+s.id);
   return {mesh,name:s.name,sourceName:s.id,stableId:'bp43:'+s.id,
     side:/^left /i.test(s.name)?'left':/^right /i.test(s.name)?'right':'midline',
     tissue:'organ',system:'digestive',layer:'digestive-detail',organId:digestiveOrganFamily(s.name),fma:s.fma_id||''};
 });
}

/**
 * BodyParts3D 4.3 was converted from Z-up with (x,z,+y).  The Y-to-depth
 * sign is reversed relative to the right-handed (x,z,-y) coordinate basis
 * expected by Three.js.  Older 1.3-generated GLBs must have their Z axis
 * reflected *around the registered body mid-plane*, not the scene origin.
 *
 * This correction is deliberately applied only to 4.3 detailed anatomy;
 * the legacy 1.2 organ asset and the Écorché bones/muscles are unchanged.
 * Returning the registration separately keeps stored mesh coordinates, local
 * annotation anchors and old scene URLs stable.  New source GLBs must retain
 * their current 1.3 coordinate metadata, or introduce a versioned orientation
 * marker before a future converter also makes this correction.
 */
export function correctedDetailTransform(alignment){
 const depthCenter=0.4; // BodyParts3D source frame in digestive-model.js
 const scale=alignment?.scale;
 if(!Number.isFinite(scale)||scale<=0||![alignment.x,alignment.y,alignment.z].every(Number.isFinite))
   throw new Error('Invalid detailed anatomy registration');
 return {
   scale:[scale,scale,-scale],
   position:[alignment.x,alignment.y,alignment.z+2*depthCenter*scale]
 };
}

/** Default to the expanded organs only when the teacher explicitly switches views.
 * Opening a saved/shared scene must always honor its existing layer state. */
export function shouldPreferDetailedWhenChoosingDigestive({teacherMode,restoringScene,detailAvailable,
  previousMode,nextMode,detailLayerExplicitlyChanged}){
  return Boolean(teacherMode && !restoringScene && detailAvailable &&
    !detailLayerExplicitlyChanged && nextMode==='digestive' && previousMode!=='digestive');
}
