/* AnatomIQ 2.0 — real DBCLS / BodyParts3D 4.3 central and peripheral nerve anatomy. */
const ID=/^(?:FJ\d+[A-Z]?|ANR\d{3})$/;
export const NERVOUS_PRESETS=Object.freeze({all:'Entire nervous system',cns:'Central nervous system',brain:'Brain regions',deep:'Deep brain and ventricles',cord:'Spinal cord',peripheral:'Peripheral and cranial nerves',plexus:'Brachial plexus and arm',lower:'Lower-limb nerve reconstructions',verified:'Verified source anatomy only',posterior:'Posterior cerebral cortex',meninges:'Meninges with brain context'});
export function validateNervousManifest(data){
  if(!data||data.version!==1||!Array.isArray(data.structures)||data.structures.length<1||data.structures.length>600)throw Error('Invalid nervous-system structure manifest');
  const ids=new Set();
  for(const s of data.structures){
    if(!ID.test(s.id)||ids.has(s.id)||typeof s.name!=='string'||!s.name.trim()||s.name.length>200||!['brain','spinal_cord','peripheral','meninges'].includes(s.category))throw Error('Invalid or duplicate nervous structure: '+String(s.id));
    ids.add(s.id);
  }
  if(!data.structures.some(s=>s.category==='brain')||!data.structures.some(s=>s.category==='spinal_cord'))throw Error('Nervous atlas requires verified brain and spinal cord geometry');
  return data;
}
export function nervousEntries(root,raw){
  const catalog=validateNervousManifest(raw),found=new Map();
  root.traverse(obj=>{
    if(!obj.isMesh)return;
    const match=/(?:^|[^A-Za-z0-9])(FJ\d+[A-Z]?|ANR\d{3})(?=$|[^A-Za-z0-9])/.exec(obj.name||'');
    if(!match||found.has(match[1]))throw Error('Unexpected or duplicate nervous-system mesh: '+obj.name);
    found.set(match[1],obj);
  });
  if(found.size!==catalog.structures.length)throw Error(`Nervous GLB/metadata count mismatch (${found.size} vs ${catalog.structures.length})`);
  return catalog.structures.map(s=>{
    const mesh=found.get(s.id);if(!mesh)throw Error('Nervous mesh missing: '+s.id);
    return {mesh,name:s.name,sourceName:s.id,stableId:s.id.startsWith('ANR')?'anatomiq-reconstruction:'+s.id:'bp43-nerv:'+s.id,
      system:'nervous',layer:'nervous',organId:s.category,tissue:s.category==='meninges'?'meninx':s.category==='brain'?'neural-tissue':'nerve',provenance:s.provenance||'BodyParts3D 4.3',
      side:/\bleft\b/i.test(s.name)?'left':/\bright\b/i.test(s.name)?'right':'midline',fma:s.fma_id||''};
  });
}
export const NERVOUS_COLORS=Object.freeze({
  cortex:'#e4b2b7',
  cerebellum:'#cfaea9',
  spinal_cord:'#e1c3b2',
  peripheral:'#dcc379',
  ventricle:'#7c96a8',
  thalamus:'#907986',
  hypothalamus:'#ad8173',
  basal_ganglia:'#a17670',
  limbic:'#b59278',
  dura:'#c6d7df',
  brainstem:'#c3a29b',
  brain:'#e4b2b7'
});
export function nervousNameGroup(s){
  const n=(s?.name||'').toLowerCase();
  if(s?.organId==='meninges'||/dura mater|falx cerebri|tentorium cerebelli/.test(n))return 'dura';
  if(/third ventricle|fourth ventricle|lateral ventricle|interventricular foramen|cerebral aqueduct/.test(n))return 'ventricle';
  if(/hypothalam|mammillar/.test(n))return 'hypothalamus';
  if(/thalam|habenul|geniculate/.test(n))return 'thalamus';
  if(/caudate|putamen|globus pallidus|substantia nigra|subthalamic nucleus/.test(n))return 'basal_ganglia';
  if(/amygdala|fornix|hippocamp|corpus callosum|septum pellucidum/.test(n))return 'limbic';
  if(/cerebell/.test(n))return 'cerebellum';
  if(/pons|midbrain|medulla oblongata|brainstem/.test(n))return 'brainstem';
  if(s?.organId==='spinal_cord')return 'spinal_cord';
  if(s?.organId==='peripheral')return 'peripheral';
  return 'brain';
}
export const nervousColor=s=>s?.provenance==='illustrative-reconstruction'?'#cf9856':NERVOUS_COLORS[nervousNameGroup(s)];
export function nervousMaterialOverrides(s){
  const category=nervousNameGroup(s);
  if(category==='dura')return {transparent:true,opacity:0.3,depthWrite:false,roughness:0.48};
  if(category==='ventricle')return {transparent:true,opacity:0.9,depthWrite:false,roughness:0.48};
  return {transparent:false,opacity:1,depthWrite:true,roughness:0.48};
}
export function nervousVisibleInPreset(s,preset){
  if(preset==='all')return s.organId!=='meninges'&&s.provenance!=='illustrative-reconstruction';
  if(preset==='cns')return s.organId==='brain'||s.organId==='spinal_cord';
  if(preset==='brain')return s.organId==='brain';
  if(preset==='cord')return s.organId==='spinal_cord';
  if(preset==='peripheral')return s.organId==='peripheral';
  if(preset==='verified')return s.provenance!=='illustrative-reconstruction'&&s.organId!=='meninges';
  if(preset==='meninges')return s.organId==='meninges'||(s.organId==='brain'&&/\b(?:gyrus|lobule|cerebellum|insula|cuneus|precuneus)\b/i.test(s.name));
  if(preset==='posterior')return s.organId==='brain'&&/parietal lobule|occipital|angular gyrus|supramarginal gyrus|precuneus|cuneus|cerebellum/i.test(s.name);
  if(preset==='lower')return s.provenance==='illustrative-reconstruction';
  if(preset==='plexus')return s.provenance!=='illustrative-reconstruction'&&/\b(?:brachial|axillary|musculocutaneous|median|ulnar|radial|cervical|intercostobrachial|thoracodorsal|subscapular|first thoracic|second thoracic)\b/i.test(s.name)&&s.organId==='peripheral';
  if(preset==='deep')return s.organId==='brain'&&/\b(?:ventricle|interventricular|aqueduct|hypothalam\w*|thalamus|caudate|putamen|pallidus|amygdala|fornix|callosum|geniculate|habenula|choroid|subthalam\w*|substantia|hippocampus|commissure|colliculus|mammillary|mammillothalamic|pineal|nucle\w*|optic tract|optic chiasm)\b/i.test(s.name);
  throw Error('Unknown nervous-system preset');
}
