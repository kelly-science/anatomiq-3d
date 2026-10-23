/* Anatomy Studio 1.8: cardiovascular views. This classifies actual mesh names,
   never creates substitute geometry. Presets change only existing cardiovascular
   visibility; all bones, muscles, digestive organs and scene structure IDs remain.
*/
export const CARDIO_PRESETS = Object.freeze({
  all:'Show all cardiovascular',
  exterior:'Heart exterior & great vessels',
  interior:'Heart interior',
  coronary:'Coronary circulation',
  pulmonary:'Pulmonary circulation',
  systemic:'Systemic vessels'
});
export function cardiovascularGroup(s){
  const n=String(s.name||'').toLowerCase();
  const c=String(s.cardioGroup||'').toLowerCase();
  if(c==='heart-internal'||/cusp|leaflet|papillary muscle|chordae|septum|cavity of.*(?:ventricle|atrium)/.test(n))return 'heart-internal';
  if(c==='coronary'||/coronary|cardiac vein/.test(n))return 'coronary';
  if(c==='pulmonary'||/pulmonary (?:trunk|artery|vein)/.test(n))return 'pulmonary';
  if(c==='heart'||/wall of (?:ventricle|left atrium|right atrium)/.test(n))return 'heart';
  return 'systemic';
}
export function cardioVisibleInPreset(s,preset){
  const g=cardiovascularGroup(s);
  if(preset==='all')return true;
  if(preset==='exterior')return ['heart','pulmonary','coronary'].includes(g);
  if(preset==='interior')return ['heart-internal','pulmonary'].includes(g);
  if(preset==='coronary')return ['heart','coronary'].includes(g);
  if(preset==='pulmonary')return ['heart','pulmonary'].includes(g);
  if(preset==='systemic')return g==='systemic';
  throw new Error('Unknown cardiovascular view: '+preset);
}
export function cardioPresetCounts(entries){
 const counts=Object.fromEntries(Object.keys(CARDIO_PRESETS).map(k=>[k,entries.filter(s=>cardioVisibleInPreset(s,k)).length]));
 return counts;
}
export function cardioCanApply(entries,preset){
 if(!CARDIO_PRESETS[preset]||!entries.length)return false;
 if(preset==='interior'&&!entries.some(s=>cardiovascularGroup(s)==='heart-internal'))return false;
 if(preset==='coronary'&&!entries.some(s=>cardiovascularGroup(s)==='coronary'))return false;
 if(preset==='systemic'&&!entries.some(s=>cardiovascularGroup(s)==='systemic'))return false;
 return true;
}
