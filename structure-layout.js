import {hashForStructures,readVisibilityBits,makeVisibilityBits} from './scene-codec.js';
const key=s=>`${s.name}|${s.side}|${s.tissue}|${s.mesh.name}`;
const sort=(a,b)=>key(a).localeCompare(key(b));
export function catalogAnatomy(entries){
  const bones=entries.filter(s=>s.system==='skeletal').sort(sort);
  const muscles=entries.filter(s=>s.system==='muscular').sort(sort);
  const digestiveOld=entries.filter(s=>s.system==='digestive'&&s.layer!=='digestive-detail').sort(sort);
  const digestiveNew=entries.filter(s=>s.system==='digestive'&&s.layer==='digestive-detail').sort((a,b)=>a.sourceName.localeCompare(b.sourceName,undefined,{numeric:true}));
  const digestive=[...digestiveOld,...digestiveNew];
  const base=[...bones,...muscles];
  // Cardiovascular indices are appended AFTER every 1.4.1 structure.
  // This preserves older visibility bitmaps, annotation anchors and painted indices.
  const cardiovascular=entries.filter(s=>s.system==='cardiovascular').sort((a,b)=>a.sourceName.localeCompare(b.sourceName,undefined,{numeric:true}));
  const preCardio=[...base,...digestive];
  const structures=[...preCardio,...cardiovascular];
  return {structures,legacyCount:bones.length,legacyFingerprint:hashForStructures(bones.map(key)),
    baseCount:base.length,baseFingerprint:hashForStructures(base.map(key)),
    previousCount:base.length+digestiveOld.length,
    previousFingerprint:hashForStructures([...base,...digestiveOld].map(key)),
    preCardioCount:preCardio.length,preCardioFingerprint:hashForStructures(preCardio.map(key)),
    fullFingerprint:hashForStructures(structures.map(key)),digestiveCount:digestive.length,cardiovascularCount:cardiovascular.length};
}
export function sceneModelCompatible(scene,currentCount,currentFingerprint,oldCount,oldFingerprint,baseCount,baseFingerprint,previousCount,previousFingerprint,preCardioCount,preCardioFingerprint){
  return !!scene && [[currentCount,currentFingerprint],[oldCount,oldFingerprint],[baseCount,baseFingerprint],[previousCount,previousFingerprint],[preCardioCount,preCardioFingerprint]]
    .some(([count,fingerprint])=>Number.isInteger(count)&&scene.n===count&&scene.f===fingerprint);
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
