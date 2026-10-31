// ANATOMIQ_INVESTIGATIONS_273 — pure validation and model-interaction evidence.
// ANATOMIQ_PAINTED_HOTSPOT_274: Label areas are painted on model surfaces; no target/radius requirement.
// Old reveal/relationship JSON remains valid; no server or tracking.
import {validPaintRegion,validBrush,paintedHitAccepted} from './painted-hotspot-274.mjs?rev=271-hotspot-dissect-carry-278-local';
import {validHotspotAttemptLimit} from './hotspot-attempts-277.mjs?rev=271-hotspot-dissect-carry-278-local'; // ANATOMIQ_HOTSPOT_FEEDBACK_277
export const INVESTIGATION_TYPES=Object.freeze(['reveal','relationship','label','dissect']);
export const INVESTIGATION_ROTATIONS=Object.freeze([0,30,60,90,180]);
export const DEFAULT_INVESTIGATION_ROTATION=30;
export const WORLD_UNITS_PER_APPROX_MM=0.001006058824; // Ecorge body ~1.7103 model units / 1700 mm
export function investigationRotation(a){
  return INVESTIGATION_ROTATIONS.includes(a?.rotationDegrees)?a.rotationDegrees:DEFAULT_INVESTIGATION_ROTATION;
}
export function rotationSatisfied(activity,evidence){
  const required=investigationRotation(activity);
  return required===0 || (Number(evidence?.rotationProgressDeg)||0)>=required-1e-6;
}
export function isStructureIndex(v){return Number.isInteger(v)&&v>=0&&v<2000;}
const goodTriplet=arr=>Array.isArray(arr)&&arr.length===3&&arr.every(v=>Number.isFinite(v)&&Math.abs(v)<1000);
export function validateInvestigation(a){
  if(a.type==='reveal'){
    if(!isStructureIndex(a.targetStructure)||!['hide','isolate'].includes(a.action)||
       (a.targetLabel!==null&&a.targetLabel!==undefined&&
        (typeof a.targetLabel!=='string'||!/^q-[0-9A-Za-z-]{4,62}$/.test(a.targetLabel)))||
       (a.action==='hide'&&(!isStructureIndex(a.obstructionStructure)||a.obstructionStructure===a.targetStructure)))
      throw Error('Reveal & Identify needs a target and a valid, separate obstruction for Hide mode.');
  }else if(a.type==='relationship'){
    if(!isStructureIndex(a.firstStructure)||!isStructureIndex(a.secondStructure)||a.firstStructure===a.secondStructure)
      throw Error('Relationships needs two different structures.');
  }else if(a.type==='label'){
    if(!validPaintRegion(a.paintRegions??[])||!validBrush(a.brushMm??8))
      throw Error('Label contains malformed painted target data. Clear and repaint the target.');
    if(!validHotspotAttemptLimit(a.attemptLimit))
      throw Error('Label attempt limit must be Unlimited or 1–10.');
  }else if(a.type==='dissect'){
    if(!Array.isArray(a.hideStructures)||a.hideStructures.length<1||a.hideStructures.length>64||
       a.hideStructures.some(v=>!isStructureIndex(v))||new Set(a.hideStructures).size!==a.hideStructures.length)
      throw Error('Dissect requires 1–64 different chapter structures.');
    if(a.keepHiddenForNext!==undefined&&typeof a.keepHiddenForNext!=='boolean')
      throw Error('Dissect keep-hidden setting must be on or off.');
  }else throw Error('Unsupported investigation activity.');
  if(!INVESTIGATION_ROTATIONS.includes(a.rotationDegrees))
    throw Error('Choose Off or a valid investigation rotation requirement.');
  return true;
}
export function relationshipPick(selected,index,first,second){
  if(!isStructureIndex(index))return {selected:[...selected],valid:false,done:false};
  if(index!==first&&index!==second)return {selected:[],valid:false,done:false};
  const next=selected.includes(index)?selected:[...selected,index];
  return {selected:next,valid:true,done:next.includes(first)&&next.includes(second)};
}
export function revealReady(activity,evidence){return !!(evidence?.actionDone&&evidence?.targetPicked&&rotationSatisfied(activity,evidence));}
export function relationshipReady(activity,evidence){
  return !!(rotationSatisfied(activity,evidence)&&Array.isArray(evidence?.selectedStructures)&&
    evidence.selectedStructures.includes(activity.firstStructure)&&evidence.selectedStructures.includes(activity.secondStructure));
}
export function paintedHotspotAccepted(activity,index,clickedWorld,resolveWorld,clickedNormal=null){
  return activity?.type==='label'&&paintedHitAccepted(activity.paintRegions,index,clickedWorld,resolveWorld,undefined,clickedNormal);
}
export function labelReady(activity,evidence){return !!(evidence?.hotspotCorrect&&rotationSatisfied(activity,evidence));}
export function dissectionProgress(activity,indices){
  const goals=Array.isArray(activity?.hideStructures)?activity.hideStructures:[];
  const done=new Set(Array.isArray(indices)?indices:[]);
  const found=goals.filter(id=>done.has(id));
  return {completed:found.length,required:goals.length,remaining:goals.filter(id=>!done.has(id)),done:goals.length>0&&found.length===goals.length};
}
export function dissectReady(activity,evidence){return !!(dissectionProgress(activity,evidence?.hiddenIndices).done&&rotationSatisfied(activity,evidence));}
