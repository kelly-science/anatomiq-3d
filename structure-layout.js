import {hashForStructures,readVisibilityBits,makeVisibilityBits} from './scene-codec.js';
const key=s=>`${s.name}|${s.side}|${s.tissue}|${s.mesh.name}`;
const sort=(a,b)=>key(a).localeCompare(key(b));
export function catalogAnatomy(entries){
  const bones=entries.filter(s=>s.system==='skeletal').sort(sort);
  const muscles=entries.filter(s=>s.system==='muscular').sort(sort);
  const digestive=entries.filter(s=>s.system==='digestive').sort(sort);
  const base=[...bones,...muscles];
  const structures=[...base,...digestive];
  return {structures,legacyCount:bones.length,legacyFingerprint:hashForStructures(bones.map(key)),
    baseCount:base.length,baseFingerprint:hashForStructures(base.map(key)),
    fullFingerprint:hashForStructures(structures.map(key)),digestiveCount:digestive.length};
}
export function sceneModelCompatible(scene,currentCount,currentFingerprint,oldCount,oldFingerprint,baseCount,baseFingerprint){
  return !!scene && [[currentCount,currentFingerprint],[oldCount,oldFingerprint],[baseCount,baseFingerprint]]
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
