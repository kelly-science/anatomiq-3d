/* AnatomIQ 2.2 — verified BodyParts3D 4.3 lymphatic/immune organs.
 * This source set does not contain lymph nodes or vessels. The drainage map is schematic. */
const LYM_IDS=Object.freeze({FJ2561:'Spleen',FJ3150:'Left lobe of thymus',FJ3151:'Right lobe of thymus'});
export const LYMPHATIC_PRESETS=Object.freeze({all:'Spleen + thymus',spleen:'Spleen only',thymus:'Thymus only'});
export function validateLymphaticManifest(data){
  if(!data||data.version!==1||!Array.isArray(data.structures)||data.structures.length!==3)throw Error('Lymphatic manifest must have exactly three verified source meshes');
  const ids=new Set();
  for(const s of data.structures){
    if(!Object.hasOwn(LYM_IDS,s.id)||ids.has(s.id)||s.name!==LYM_IDS[s.id]||!Number.isInteger(s.standard_triangles)||s.standard_triangles<1||!Number.isInteger(s.detailed_triangles)||s.detailed_triangles<1)throw Error('Invalid lymphatic source mesh '+String(s.id));
    ids.add(s.id);
  }
  return data;
}
export function lymphaticEntries(root,raw){
  const manifest=validateLymphaticManifest(raw),found=new Map();
  root.traverse(obj=>{
    if(!obj.isMesh)return;
    const match=/(?:^|[^A-Za-z0-9])(FJ\d+[A-Z]?)(?=$|[^A-Za-z0-9])/.exec(obj.name||'');
    if(!match||!Object.hasOwn(LYM_IDS,match[1])||found.has(match[1]))throw Error('Unexpected or duplicate lymphatic mesh '+obj.name);
    found.set(match[1],obj);
  });
  if(found.size!==3)throw Error('Lymphatic GLB/metadata count mismatch');
  return manifest.structures.map(s=>({
    mesh:found.get(s.id),name:s.name,sourceName:s.id,stableId:'bp43-lymph:'+s.id,
    system:'lymphatic',layer:'lymphatic',organId:s.id==='FJ2561'?'spleen':'thymus',tissue:'organ',
    side:/\bleft\b/i.test(s.name)?'left':/\bright\b/i.test(s.name)?'right':'midline',fma:s.fma_id||''
  }));
}
export const LYMPHATIC_COLORS=Object.freeze({spleen:'#93495c',thymus:'#d8a9a4'});
export const lymphaticColor=s=>LYMPHATIC_COLORS[s.organId]||LYMPHATIC_COLORS.spleen;
export function lymphaticVisibleInPreset(s,preset){
  if(!Object.hasOwn(LYMPHATIC_PRESETS,preset))throw Error('Unknown lymphatic study preset');
  return preset==='all'||s.organId===preset;
}
