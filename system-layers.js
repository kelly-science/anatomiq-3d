/** Layer switches are independent of historical view presets.
 * Keep historical scene.m values intact until a teacher edits their layers. */
export function effectiveSystemLayers(mode, raw){
  const s={skeletal:Boolean(raw.skeletal), superficial:Boolean(raw.superficial),deep:Boolean(raw.deep),digestive:Boolean(raw.digestive),cardiovascular:Boolean(raw.cardiovascular)};
  switch(mode){
    case 'skull': case 'skeleton':return {skeletal:true,superficial:false,deep:false,digestive:false,cardiovascular:false};
    case 'muscular':return {skeletal:false,superficial:s.superficial,deep:s.deep,digestive:false,cardiovascular:false};
    case 'digestive':return {skeletal:false,superficial:false,deep:false,digestive:true,cardiovascular:false};
    case 'systems':return s;
    default:throw new Error('Unsupported anatomical mode');
  }
}
export function activeSystemTabs(mode,raw){
  const s=effectiveSystemLayers(mode,raw);
  return {skeletal:s.skeletal,muscular:s.superficial||s.deep,digestive:s.digestive,cardiovascular:s.cardiovascular};
}
/** A single click changes one layer, never the others. Muscle layers remain independently configurable. */
export function toggleAnatomySystem(mode,raw,system,detailAvailable,cardioAvailable=false){
  if(!['skeletal','muscular','digestive','cardiovascular'].includes(system))throw new Error('Unknown anatomical system');
  if(system==='digestive'&&!detailAvailable)throw new Error('Detailed digestive models are required. Upload models/digestive-standard.glb and models/digestive-structures.json.');
  if(system==='cardiovascular'&&!cardioAvailable)throw new Error('Install the self-hosted cardiovascular models first.');
  const next=effectiveSystemLayers(mode,raw);
  if(system==='skeletal')next.skeletal=!next.skeletal;
  if(system==='digestive')next.digestive=!next.digestive;
  if(system==='cardiovascular')next.cardiovascular=!next.cardiovascular;
  if(system==='muscular'){
    const on=next.superficial||next.deep;
    next.superficial=!on;
    next.deep=false;
  }
  return next;
}
