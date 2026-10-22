import {hashForStructures,readVisibilityBits,makeVisibilityBits} from './scene-codec.js';
const key=s=>`${s.name}|${s.side}|${s.tissue}|${s.mesh.name}`;
const sort=(a,b)=>key(a).localeCompare(key(b));
export function catalogAnatomy(entries){
  const bones=entries.filter(s=>s.system==='skeletal').sort(sort);
  const muscles=entries.filter(s=>s.system==='muscular').sort(sort);
  const structures=[...bones,...muscles];
  return {
    structures,
    legacyCount:bones.length,
    legacyFingerprint:hashForStructures(bones.map(key)),
    fullFingerprint:hashForStructures(structures.map(key))
  };
}
export function sceneModelCompatible(scene,currentCount,currentFingerprint,oldCount,oldFingerprint){
  return !!scene && ((scene.n===currentCount&&scene.f===currentFingerprint)||
      (scene.n===oldCount&&scene.f===oldFingerprint));
}

// Migrate the saved visibility mask when the user opens a pre-muscular lesson.
// Original bone indices and label/paint positions are not changed.
export function upgradeLegacyScene(scene,currentCount,currentFingerprint){
  if(scene.n===currentCount && scene.f===currentFingerprint)return structuredClone(scene);
  const visible=readVisibilityBits(scene.b,scene.n);
  const updated=structuredClone(scene);
  updated.n=currentCount;
  updated.f=currentFingerprint;
  updated.b=makeVisibilityBits([...visible,...Array(currentCount-scene.n).fill(false)]);
  updated.sb=true;updated.dm=false;updated.sm=true;
  return updated;
}
