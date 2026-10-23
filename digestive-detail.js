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
