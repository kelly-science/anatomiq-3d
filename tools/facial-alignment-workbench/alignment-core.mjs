// AnatomIQ Facial Alignment Workbench — standalone calibration data, no app.js dependency.
export const TARGETS = Object.freeze([
  'Left temporalis','Right temporalis',
  'Left frontalis','Right frontalis',
  'Left nasalis','Right nasalis'
]);
export const LEGACY_TARGETS = Object.freeze(TARGETS.slice(0,4));
export const SCHEMA = 'anatomiq-facial-alignment-workbench/v1';
export const LEGACY_SCHEMA = 'anatomiq-muscle-alignment/v1';
export const UNITS = 'approx_mm_scaled_to_1700mm_body';
export const LIMIT = 30;
export const MODEL_REFERENCE_MM = 1700;
export const SKULL_SOURCES = Object.freeze({
  native: '../../models/skull-native-266d.glb',
  legacy: '../../models/skull-detailed.glb',
  ecorche: 'Built-in Écorché skull'
});
export const emptyOffsets = () => Object.fromEntries(TARGETS.map(n => [n, [0,0,0]]));
export function isValidVector(v, limit=LIMIT) {
  return Array.isArray(v) && v.length === 3 && v.every(n => typeof n==='number' && Number.isFinite(n) && Math.abs(n)<=limit);
}
export function normalizeOffsets(raw, {allowPartial=false}={}) {
  if (!raw || typeof raw!=='object' || Array.isArray(raw)) throw Error('Offsets must be an object.');
  const out=emptyOffsets();
  for (const name of Object.keys(raw)) {
    if (!TARGETS.includes(name)) throw Error('Unknown muscle: '+name);
    if (!isValidVector(raw[name])) throw Error('Invalid XYZ offset for '+name);
    out[name]=[...raw[name]];
  }
  if (!allowPartial && TARGETS.some(name => !(name in raw))) throw Error('Missing muscle offsets.');
  return out;
}
export function fromImport(obj){
  if (!obj || typeof obj!=='object') throw Error('Not an alignment JSON file.');
  if (obj.schema===LEGACY_SCHEMA && obj.model==='ecorche.glb' && obj.units===UNITS) {
    const values={};
    for(const name of LEGACY_TARGETS) {
      if (!(name in (obj.offsets||{}))) throw Error('Missing '+name);
      values[name]=obj.offsets[name];
    }
    const extras=Object.keys(obj.offsets||{}).filter(k=>!LEGACY_TARGETS.includes(k));
    if (extras.length) throw Error('Legacy alignment contains unexpected targets.');
    return normalizeOffsets(values,{allowPartial:true});
  }
  if (obj.schema!==SCHEMA || obj.model!=='ecorche.glb' || obj.units!==UNITS) throw Error('Incompatible alignment format.');
  return normalizeOffsets(obj.offsets);
}
export function legacyExport(offsets){
  const valid=normalizeOffsets(offsets);
  return {schema:LEGACY_SCHEMA,model:'ecorche.glb',units:UNITS,
    offsets:Object.fromEntries(LEGACY_TARGETS.map(name=>[name,[...valid[name]]]))};
}
export function vectorToDisplay(v){ return v.map(x=>Number(x.toFixed(6))); }
export function createHandoff({offsets, skullSource, skullRegistration, baseHeight, targets, originalModelUrl}) {
  const valid=normalizeOffsets(offsets);
  if (!Number.isFinite(baseHeight) || baseHeight<=0) throw Error('Invalid source-model height.');
  const detail={};
  for(const name of TARGETS){
    const item=targets[name];
    detail[name]={
      offsetApproxMm: [...valid[name]],
      baseWorldOrigin: item?.baseWorldOrigin ?? null,
      adjustedWorldOrigin: item?.adjustedWorldOrigin ?? null,
      adjustedWorldBounds: item?.adjustedWorldBounds ?? null,
      sourceMeshName: item?.sourceMeshName ?? null
    };
  }
  return {schema:SCHEMA,model:'ecorche.glb',units:UNITS,
    sourceModelUrl:originalModelUrl,skullReference:skullSource,
    skullRegistration,bodyHeightModelUnits:Number(baseHeight.toFixed(8)),
    worldUnitsPerApproxMm:Number((baseHeight/MODEL_REFERENCE_MM).toFixed(12)),
    offsets:valid,targets:detail};
}
export function skullName(name){
  const n=String(name||'').toLowerCase();
  return /(?:frontal bone|parietal bone|temporal bone|occipital bone|sphenoid|ethmoid|mandible|maxilla|zygomatic|lacrimal|nasal bone|palatine|vomer|inferior nasal concha|septal nasal cartilage|nasal cartilage|upper jaw|lower jaw|tooth)/.test(n);
}
export function focusedBoneName(name){
  const n=String(name||'').toLowerCase();
  return /(?:frontal|nasal|temporal)/.test(n);
}
export function describeRegistration({ratio,centerDistance,baseHeight}){
  if(!(Number.isFinite(ratio)&&ratio>0&&Number.isFinite(centerDistance)&&Number.isFinite(baseHeight)&&baseHeight>0))return 'unverified';
  if(ratio>1.5||ratio<.667||centerDistance>baseHeight*.55)return 'possible-mismatch';
  return 'approximate-bounds-match';
}
