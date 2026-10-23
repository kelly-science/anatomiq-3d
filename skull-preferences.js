/**
 * Anatomy Studio 1.7.2 skull quality preferences.
 * A new key intentionally defaults pre-1.7.2 installs back to Standard:
 * v1's detailed option caused visible dental misregistration on some devices.
 * After this one-time reset, any explicit choice persists in the v2 key.
 * Skull quality is never part of a lesson, chapter, or published URL.
 */
export const SKULL_QUALITY_KEY='anatomy-studio-skull-geometry-v2';
export const LEGACY_SKULL_QUALITY_KEY='anatomy-studio-skull-geometry-v1';
export function normalizeSkullGeometry(value){return value==='detailed'?'detailed':'standard';}
export function getSkullGeometry(storage){
  try{return normalizeSkullGeometry(storage?.getItem(SKULL_QUALITY_KEY));}
  catch{return 'standard';}
}
export function setSkullGeometry(storage,value){
  const chosen=normalizeSkullGeometry(value);
  try{storage?.setItem(SKULL_QUALITY_KEY,chosen);}catch{}
  return chosen;
}
