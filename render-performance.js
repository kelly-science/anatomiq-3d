// Display-only rendering preferences. Deliberately NOT part of scene links,
// chapters or library files; each student Chromebook can choose its own quality.
export const MODES = Object.freeze(['auto', 'fast', 'balanced', 'sharp']);
export function normalizeMode(value) { return MODES.includes(value) ? value : 'auto'; }
export function resolveRenderProfile(mode, {deviceMemory, hardwareConcurrency} = {}) {
  const requested=normalizeMode(mode);
  const lowSpec=(Number.isFinite(deviceMemory) && deviceMemory<=4)
    || (Number.isFinite(hardwareConcurrency) && hardwareConcurrency<=4);
  const effective=requested==='auto' ? (lowSpec?'fast':'balanced') : requested;
  // Rendering at 1x rather than 1.5x requires ~56% fewer pixels to shade.
  const cap=effective==='fast'?1:effective==='balanced'?1.25:2;
  return {requested,effective,dprCap:cap};
}
export function cappedPixelRatio(dpr,cap){
  return Math.min(Math.max(Number(dpr)||1,0.75),cap);
}
