/** Layer switches are independent of historical view presets.
 * Keep historical scene.m values intact until a teacher edits their layers. */
export function effectiveSystemLayers(mode, raw){
  const s={skeletal:Boolean(raw.skeletal), superficial:Boolean(raw.superficial),deep:Boolean(raw.deep),digestive:Boolean(raw.digestive),cardiovascular:Boolean(raw.cardiovascular),respiratory:Boolean(raw.respiratory),nervous:Boolean(raw.nervous),urinary:Boolean(raw.urinary),lymphatic:Boolean(raw.lymphatic)};
  switch(mode){
    case 'skull': case 'skeleton':return {skeletal:true,superficial:false,deep:false,digestive:false,cardiovascular:false,respiratory:false,nervous:false,urinary:false,lymphatic:false};
    case 'muscular':return {skeletal:false,superficial:s.superficial,deep:s.deep,digestive:false,cardiovascular:false,respiratory:false,nervous:false,urinary:false,lymphatic:false};
    case 'digestive':return {skeletal:false,superficial:false,deep:false,digestive:true,cardiovascular:false,respiratory:false,nervous:false,urinary:false,lymphatic:false};
    case 'systems':return s;
    default:throw new Error('Unsupported anatomical mode');
  }
}
export function activeSystemTabs(mode,raw){
  const s=effectiveSystemLayers(mode,raw);
  return {skeletal:s.skeletal,muscular:s.superficial||s.deep,digestive:s.digestive,cardiovascular:s.cardiovascular,respiratory:s.respiratory,nervous:s.nervous,urinary:s.urinary,lymphatic:s.lymphatic};
}
/** A single click changes one layer, never the others. Muscle layers remain independently configurable. */
export function toggleAnatomySystem(mode,raw,system,detailAvailable,cardioAvailable=false,respiratoryAvailable=false,nervousAvailable=false,urinaryAvailable=false,lymphaticAvailable=false){
  if(!['skeletal','muscular','digestive','cardiovascular','respiratory','nervous','urinary','lymphatic'].includes(system))throw new Error('Unknown anatomical system');
  if(system==='digestive'&&!detailAvailable)throw new Error('Detailed digestive models are required. Upload models/digestive-standard.glb and models/digestive-structures.json.');
  if(system==='cardiovascular'&&!cardioAvailable)throw new Error('Install the self-hosted cardiovascular models first.');
  if(system==='respiratory'&&!respiratoryAvailable)throw new Error('Run tools/install-respiratory-43.sh to add the lung/airway models.');
  if(system==='lymphatic'&&!lymphaticAvailable)throw new Error('Publish matching lymphatic-standard.glb, lymphatic-detailed.glb and lymphatic-structures.json.');
  if(system==='urinary'&&!urinaryAvailable)throw new Error('Upload urinary-standard.glb, urinary-detailed.glb and urinary-structures.json.');
  if(system==='nervous'&&!nervousAvailable)throw new Error('Upload nervous-standard.glb, nervous-detailed.glb and nervous-structures.json.');
  const next=effectiveSystemLayers(mode,raw);
  if(system==='skeletal')next.skeletal=!next.skeletal;
  if(system==='digestive')next.digestive=!next.digestive;
  if(system==='cardiovascular')next.cardiovascular=!next.cardiovascular;
  if(system==='respiratory')next.respiratory=!next.respiratory;
  if(system==='nervous')next.nervous=!next.nervous;
  if(system==='urinary')next.urinary=!next.urinary;
  if(system==='lymphatic')next.lymphatic=!next.lymphatic;
  if(system==='muscular'){
    const on=next.superficial||next.deep;
    next.superficial=!on;
    next.deep=false;
  }
  return next;
}
