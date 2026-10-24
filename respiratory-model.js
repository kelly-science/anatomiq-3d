/* Anatomiq 1.9.0 — local BodyParts3D 4.3 respiratory models.
   This owns lungs/airways ONLY; pulmonary vessels are reused, never copied. */
const FJ=/^FJ\d+[A-Z]?$/;
export function respiratoryFamily(name){
  const n=String(name||'').toLowerCase();
  if(/(?:segment|parenchyma|lobe)/.test(n) && /(?:lung|pulmonary|(?:(?:right|left) (?:upper|middle|lower) lobe))/.test(n) && !/(?:artery|vein|bronchus|bronchial)/.test(n))return 'lung';
  if(/\b(?:bronchus|bronchi|bronchiole|bronchial tree|carina)\b/.test(n))return 'airway';
  if(/\b(?:trachea|tracheal ring|tracheal cartilage)\b/.test(n))return 'trachea';
  if(/\b(?:larynx|epiglottis|thyroid cartilage|cricoid cartilage|arytenoid|vocal fold|vocal cord)\b/.test(n))return 'larynx';
  if(/\b(?:nasal cavity|nasal concha|pharynx|nasopharynx|oropharynx)\b/.test(n))return 'upper';
  if(/\b(?:diaphragm|pleura)\b/.test(n))return 'associated';
  return 'other';
}
export function validateRespiratoryManifest(meta){
 if(!meta||meta.version!==1||!Array.isArray(meta.structures)||meta.structures.length<1||meta.structures.length>400)throw Error('Invalid respiratory metadata');
 const ids=new Set();
 for(const s of meta.structures){
  if(!FJ.test(s.id)||ids.has(s.id)||typeof s.name!=='string'||!s.name||s.name.length>200)throw Error('Invalid or duplicate respiratory structure');
  ids.add(s.id);
 }
 if(!meta.structures.some(s=>(s.category==='lung'||respiratoryFamily(s.name)==='lung')))throw Error('Respiratory source lacks lung parenchyma');
 return meta;
}
export function respiratoryEntries(root,raw){
 const manifest=validateRespiratoryManifest(raw);const found=new Map();
 root.traverse(obj=>{
  if(!obj.isMesh)return;
  const id=(obj.name||'').match(/FJ\d+[A-Z]?/i)?.[0];
  if(!id||found.has(id))throw Error('Unexpected respiratory GLB mesh: '+obj.name);
  found.set(id,obj);
 });
 if(found.size!==manifest.structures.length)throw Error(`Respiratory GLB/metadata count mismatch (${found.size} vs ${manifest.structures.length})`);
 return manifest.structures.map(s=>{
  const mesh=found.get(s.id);if(!mesh)throw Error('Respiratory GLB missing '+s.id);
  return {mesh,name:s.name,sourceName:s.id,stableId:'bp43-resp:'+s.id,system:'respiratory',layer:'respiratory',
   tissue:'organ',side:/\bleft\b/i.test(s.name)?'left':/\bright\b/i.test(s.name)?'right':'midline',
   organId:s.category==='lung'?'lung':respiratoryFamily(s.name),fma:s.fma_id||''};
 });
}
export const RESPIRATORY_COLORS=Object.freeze({lung:'#c88f9d',airway:'#e5c5b0',trachea:'#ddc5b3',larynx:'#d1b6a6',upper:'#b9aab7',associated:'#bcb4aa',other:'#c1a6a1'});
export function respiratoryColor(entry){return RESPIRATORY_COLORS[entry.organId||respiratoryFamily(entry.name)]||RESPIRATORY_COLORS.other;}
export const RESPIRATORY_PRESETS=Object.freeze({overview:'Respiratory overview',lobes:'Lung lobes & segments',airways:'Airways only',circulation:'Airways + pulmonary circulation'});
export function respiratoryVisibleInPreset(s,preset){
 const family=s.organId||respiratoryFamily(s.name);
 if(preset==='overview'||preset==='circulation')return true;
 if(preset==='lobes')return family==='lung';
 if(preset==='airways')return ['upper','larynx','trachea','airway'].includes(family);
 throw Error('Unknown respiratory preset');
}
export function pulmonaryOverlayVisible(s){
 const n=String(s.name||'').toLowerCase();
 return /\bpulmonary\b.*\b(?:artery|arteries|vein|veins|trunk)\b|\b(?:artery|vein)\b.*\bpulmonary\b|\bpulmonary arterial trunk\b/.test(n) && !/valve|cusp|nerve/.test(n);
}
export function respiratoryCoverage(entries,cardio){
 const groups=Object.fromEntries(['lung','airway','trachea','larynx','upper','associated'].map(key=>[key,entries.filter(s=>(s.organId||respiratoryFamily(s.name))===key).length]));
 const vessels=cardio.filter(pulmonaryOverlayVisible);
 return {respiratory_meshes:entries.length,groups,pulmonary_vessel_meshes:vessels.length,
  pulmonary_artery_meshes:vessels.filter(s=>/arter|trunk/i.test(s.name)).length,
  pulmonary_vein_meshes:vessels.filter(s=>/vein/i.test(s.name)).length,
  warning:'Named geometry does not prove anatomical continuity or that lobar/segmental pulmonary vascular branches exist.'};
}
