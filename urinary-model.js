/* BodyParts3D 4.3 urinary system. Only verified source OBJ/GLB structures. */
const IDS=Object.freeze({FJ3145:'Left kidney',FJ3147:'Right kidney',FJ3144:'Left ureter',FJ3146:'Right ureter',FJ3149:'Urinary bladder',FJ3148:'Urethra'});
export const URINARY_PRESETS=Object.freeze({overview:'Urinary overview',kidneys:'Kidneys only',tract:'Urine drainage pathway',vessels:'Urinary & renal circulation'});
export const URINARY_IDS=Object.keys(IDS);
export function urinaryGroup(name){
  if(/\bkidney\b/i.test(name))return 'kidney';
  if(/\bureter\b/i.test(name))return 'ureter';
  if(/\burinary bladder\b/i.test(name))return 'bladder';
  if(/\burethra\b/i.test(name))return 'urethra';
  throw new Error('Unexpected urinary structure: '+name);
}
export function validateUrinaryManifest(data){
  if(!data||data.version!==1||!Array.isArray(data.structures)||data.structures.length!==URINARY_IDS.length)throw Error('Invalid urinary structure manifest; require six source meshes');
  const ids=new Set();
  for(const s of data.structures){
    if(!Object.hasOwn(IDS,s.id)||ids.has(s.id)||s.name!==IDS[s.id]||!Number.isInteger(s.standard_triangles)||s.standard_triangles<1||!Number.isInteger(s.detailed_triangles)||s.detailed_triangles<1)throw Error('Invalid or duplicate urinary source structure '+s.id);
    ids.add(s.id);
  }
  if(ids.size!==URINARY_IDS.length)throw Error('Missing urinary source meshes');
  return data;
}
export function urinaryEntries(root,raw){
  const manifest=validateUrinaryManifest(raw),found=new Map();
  root.traverse(obj=>{
    if(!obj.isMesh)return;
    const match=/(?:^|[^A-Za-z0-9])(FJ\d+[A-Z]?)(?=$|[^A-Za-z0-9])/.exec(obj.name||'');
    if(!match||!Object.hasOwn(IDS,match[1])||found.has(match[1]))throw Error('Unknown or duplicate urinary mesh '+obj.name);
    found.set(match[1],obj);
  });
  if(found.size!==URINARY_IDS.length)throw Error('Urinary GLB/metadata mesh mismatch');
  return manifest.structures.map(s=>({
    mesh:found.get(s.id),name:s.name,sourceName:s.id,
    stableId:'bp43-urinary:'+s.id,system:'urinary',layer:'urinary',
    organId:urinaryGroup(s.name),tissue:'organ',
    side:/\bleft\b/i.test(s.name)?'left':/\bright\b/i.test(s.name)?'right':'midline',fma:s.fma_id||''
  }));
}
export const URINARY_COLORS=Object.freeze({kidney:'#a54f59',ureter:'#d0a078',bladder:'#b57e87',urethra:'#d4aaa1'});
export const urinaryColor=s=>URINARY_COLORS[s.organId]||URINARY_COLORS.kidney;
export function urinaryVisibleInPreset(s,preset){
  if(!Object.hasOwn(URINARY_PRESETS,preset))throw Error('Unknown urinary study preset');
  if(preset==='overview'||preset==='vessels')return true;
  if(preset==='kidneys')return s.organId==='kidney';
  return s.organId==='ureter'||s.organId==='bladder'||s.organId==='urethra';
}
export function isRenalVessel(s){
  return s.system==='cardiovascular' && /\brenal (?:artery|vein)\b/i.test(s.name);
}
