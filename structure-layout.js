import {hashForStructures,readVisibilityBits,makeVisibilityBits} from './scene-codec.js';
const key=s=>`${s.name}|${s.side}|${s.tissue}|${s.mesh.name}`;
const sort=(a,b)=>key(a).localeCompare(key(b));
// Fixed, original 1.5.1 cardiovascular structure order. Do not reorder!
export const ORIGINAL_CARDIO_IDS=['FJ1682M','FJ2428','FJ2438','FJ2439','FJ2966','FJ3411','FJ3413','FJ3427','FJ3441','FJ3485','FJ3564','FJ3585','FJ3645','FJ3659','FJ4986'];
export function catalogAnatomy(entries){
  const bones=entries.filter(s=>s.system==='skeletal'&&s.layer!=='triquetrum-extension').sort(sort);
  const skeletalExtension=entries.filter(s=>s.system==='skeletal'&&s.layer==='triquetrum-extension').sort((a,b)=>a.side.localeCompare(b.side)); // ANATOMIQ_TRIQUETRUM_244
  const muscles=entries.filter(s=>s.system==='muscular').sort(sort);
  const digestiveOld=entries.filter(s=>s.system==='digestive'&&s.layer!=='digestive-detail').sort(sort);
  const digestiveNew=entries.filter(s=>s.system==='digestive'&&s.layer==='digestive-detail').sort((a,b)=>a.sourceName.localeCompare(b.sourceName,undefined,{numeric:true}));
  const digestive=[...digestiveOld,...digestiveNew];
  const base=[...bones,...muscles];
  // Cardiovascular indices are appended AFTER every 1.4.1 structure.
  // This preserves older visibility bitmaps, annotation anchors and painted indices.
  const cardioAll=entries.filter(s=>s.system==='cardiovascular');
  const legacyCv=ORIGINAL_CARDIO_IDS.map(id=>cardioAll.find(s=>s.sourceName===id)).filter(Boolean);
  // The GLB manifest is already ordered by the converter: all earlier mesh
  // IDs form an unchanged prefix; ONLY new vessel IDs are appended. Sorting
  // this array again would silently break existing 1.8 scene annotations.
  const additionalCv=cardioAll.filter(s=>!ORIGINAL_CARDIO_IDS.includes(s.sourceName));
  const cardiovascular=[...legacyCv,...additionalCv];
  const preCardio=[...base,...digestive];
  const respiratory=entries.filter(s=>s.system==='respiratory');
  // New 1.9 mesh indices append AFTER all existing cardiovascular structures.
  // Nervous is appended strictly AFTER all 1.9.1 structures; old scene IDs are immutable.
  const nervous=entries.filter(s=>s.system==='nervous');
  const urinary=entries.filter(s=>s.system==='urinary');
  const lymphatic=entries.filter(s=>s.system==='lymphatic');
  const connective=entries.filter(s=>s.system==='connective');
  const ocular=entries.filter(s=>s.system==='ocular');
  const structures=[...preCardio,...cardiovascular,...respiratory,...nervous,...urinary,...lymphatic,...connective,...ocular,...skeletalExtension];
  const originalCardio=[...preCardio,...legacyCv];
  return {structures,legacyCount:bones.length,legacyFingerprint:hashForStructures(bones.map(key)),
    baseCount:base.length,baseFingerprint:hashForStructures(base.map(key)),
    previousCount:base.length+digestiveOld.length,
    previousFingerprint:hashForStructures([...base,...digestiveOld].map(key)),
    preCardioCount:preCardio.length,preCardioFingerprint:hashForStructures(preCardio.map(key)),
    originalCardioCount:legacyCv.length===ORIGINAL_CARDIO_IDS.length?originalCardio.length:undefined,
    originalCardioFingerprint:legacyCv.length===ORIGINAL_CARDIO_IDS.length?hashForStructures(originalCardio.map(key)):undefined,
    fullFingerprint:hashForStructures(structures.map(key)),digestiveCount:digestive.length,cardiovascularCount:cardiovascular.length,respiratoryCount:respiratory.length,nervousCount:nervous.length,urinaryCount:urinary.length,lymphaticCount:lymphatic.length,connectiveCount:connective.length,ocularCount:ocular.length};
}
export function sceneModelCompatible(scene,currentCount,currentFingerprint,oldCount,oldFingerprint,baseCount,baseFingerprint,previousCount,previousFingerprint,preCardioCount,preCardioFingerprint,originalCardioCount,originalCardioFingerprint,appendStructures=null){
  if(!scene)return false;
  const known=[[currentCount,currentFingerprint],[oldCount,oldFingerprint],[baseCount,baseFingerprint],[previousCount,previousFingerprint],[preCardioCount,preCardioFingerprint],[originalCardioCount,originalCardioFingerprint]];
  if(known.some(([count,fingerprint])=>Number.isInteger(count)&&scene.n===count&&scene.f===fingerprint))return true;
  // Additional source-backed vessels are appended. Validate the EXACT saved
  // prefix fingerprint before migrating 1.8 lessons; never accept by count only.
  // ANATOMIQ_TRIQUETRUM_REFINEMENT_245: accept ANY authentic, unchanged
  // historical prefix, including skeletal-only lessons from before the cardio
  // catalog existed. Never accept solely because the count happens to match.
  return Array.isArray(appendStructures)&&Number.isSafeInteger(scene.n)&&
    scene.n>0&&scene.n<=appendStructures.length&&
    scene.f===hashForStructures(appendStructures.slice(0,scene.n).map(key));
}
export function upgradeLegacyScene(scene,currentCount,currentFingerprint){
  if(scene.n===currentCount && scene.f===currentFingerprint)return structuredClone(scene);
  if(scene.n>currentCount)throw new Error('Missing digestive 3D asset needed to open this lesson.');
  const visible=readVisibilityBits(scene.b,scene.n),updated=structuredClone(scene);
  updated.n=currentCount;updated.f=currentFingerprint;
  updated.b=makeVisibilityBits([...visible,...Array(currentCount-scene.n).fill(false)]);
  updated.sb ??= true;updated.dm ??= false;updated.sm ??= true;updated.dg ??= false;
  return updated;
}
