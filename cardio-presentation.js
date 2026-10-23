/* Anatomy Studio 1.8.1 — cardiac study presets and chamber-space display.
   BodyParts3D 'cavity' meshes describe EMPTY anatomical spaces. They must never
   be presented as opaque muscle/valves: the default material is a pale ghost,
   and the interior study preset hides the volumes entirely.
*/
export const CARDIO_PRESETS = Object.freeze({
  all:'Show all cardiovascular',
  exterior:'Heart exterior & great vessels',
  interior:'Heart interior — valves & chordae',
  chambers:'Chamber spaces — translucent reference',
  coronary:'Coronary circulation',
  pulmonary:'Pulmonary circulation',
  systemic:'Systemic vessels'
});
export function cardioIsCavity(s){
  return /\bcavit(?:y|ies) of (?:the )?(?:left|right) (?:ventricle|atrium)\b|\b(?:ventricular|atrial) (?:cavity|blood volume)\b/i.test(String(s?.name||''));
}
export function cardiovascularGroup(s){
  const n=String(s.name||'').toLowerCase();
  const c=String(s.cardioGroup||'').toLowerCase();
  if(cardioIsCavity(s))return 'chamber-volume';
  if(c==='heart-internal'||/cusp|leaflet|papillary muscle|chordae|septum/.test(n))return 'heart-internal';
  if(c==='coronary'||/coronary|cardiac vein/.test(n))return 'coronary';
  if(c==='pulmonary'||/pulmonary (?:trunk|artery|vein)/.test(n))return 'pulmonary';
  if(c==='heart'||/wall of (?:ventricle|left atrium|right atrium)/.test(n))return 'heart';
  return 'systemic';
}
export function cardioVisibleInPreset(s,preset){
  const g=cardiovascularGroup(s);
  if(preset==='all')return true; // Chamber volumes remain translucent in this view.
  if(preset==='exterior')return ['heart','pulmonary','coronary'].includes(g);
  if(preset==='interior')return ['heart-internal','pulmonary'].includes(g); // No walls or solid cavities.
  if(preset==='chambers')return g==='chamber-volume';
  if(preset==='coronary')return ['heart','coronary'].includes(g);
  if(preset==='pulmonary')return ['heart','pulmonary'].includes(g);
  if(preset==='systemic')return g==='systemic';
  throw new Error('Unknown cardiovascular view: '+preset);
}
export function cardioPresetCounts(entries){
 return Object.fromEntries(Object.keys(CARDIO_PRESETS).map(k=>[k,entries.filter(s=>cardioVisibleInPreset(s,k)).length]));
}
export function cardioCanApply(entries,preset){
 if(!CARDIO_PRESETS[preset]||!entries.length)return false;
 if(preset==='interior'&&!entries.some(s=>cardiovascularGroup(s)==='heart-internal'))return false;
 if(preset==='chambers'&&!entries.some(s=>cardioIsCavity(s)))return false;
 if(preset==='coronary'&&!entries.some(s=>cardiovascularGroup(s)==='coronary'))return false;
 if(preset==='systemic'&&!entries.some(s=>cardiovascularGroup(s)==='systemic'))return false;
 return true;
}
