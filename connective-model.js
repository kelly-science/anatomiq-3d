/* AnatomIQ Connective: source-backed BodyParts3D 4.3 joints support.
 * Écorché cartilage classification is a view concern in the app; no base IDs move. */
// Curated source FJ IDs: *no duplicate* Écorché discs or muscular Achilles tendons.
const SOURCE_IDS=new Set(["FJ1424M", "FJ1424", "FJ1471M", "FJ1471", "FJ1476M", "FJ1392M", "FJ1476", "FJ1392", "FJ3668", "FJ3669", "FJ3667", "FJ3668M", "FJ3669M", "FJ3667M"]);
const ID=/^FJ\d+[A-Z]?$/;
export const CONNECTIVE_PRESETS=Object.freeze({all:'All connective',spine:'Spine & discs',ankle:'Foot & ankle',wrist:'Wrist & forearm',membranes:'Interosseous membranes',ribs:'Rib cartilages 8–10'});
export const CONNECTIVE_CATEGORIES=Object.freeze(['tendon_retinaculum','joint_ligament','membrane_fascia','cartilage']);
export function isBaseConnective(s){
  // Only reclassify Écorché skeletal cartilage/support; preserve the original
  // `system`, `name`, `tissue`, mesh name, array position and fingerprint.
  if(s.system!=='skeletal')return false;
  return /^(?:cartilage|disc|disk|ligament|tendon|fascia)$/i.test(s.tissue||'') ||
    /\b(?:intervertebral disc|intervertebral disk|costal cartilage|articular cartilage|fibrocartilage|ligament|retinaculum|interosseous membrane)\b/i.test(s.name||'');
}
export function validateConnectiveManifest(data){
  if(!data || data.version!==1 || !Array.isArray(data.structures) || data.structures.length!==14)throw Error('Connective atlas must contain the 14 curated BodyParts3D meshes');
  const ids=new Set();const groups=new Map();
  for(const s of data.structures){
    if(!ID.test(s.id)||!SOURCE_IDS.has(s.id)||ids.has(s.id)||typeof s.name!=='string'||!s.name.trim()||
       !CONNECTIVE_CATEGORIES.includes(s.category)||
       !Number.isInteger(s.standard_triangles)||s.standard_triangles<10||
       !Number.isInteger(s.detailed_triangles)||s.detailed_triangles<10)throw Error('Invalid connective anatomy mesh '+String(s.id));
    ids.add(s.id);groups.set(s.category,(groups.get(s.category)||0)+1);
  }
  if(groups.get('tendon_retinaculum')!==2 || groups.get('cartilage')!==6 ||
     groups.get('joint_ligament')!==2 || groups.get('membrane_fascia')!==4)
    throw Error('Unexpected source connective anatomy selection');
  return data;
}
export function connectiveEntries(root,data){
  const manifest=validateConnectiveManifest(data),found=new Map();
  root.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const m=/(?:^|[^A-Za-z0-9])(FJ\d+[A-Z]?)(?=$|[^A-Za-z0-9])/.exec(mesh.name||'');
    if(!m||found.has(m[1]))throw Error('Unexpected or repeated connective GLB mesh '+mesh.name);
    found.set(m[1],mesh);
  });
  if(found.size!==manifest.structures.length)throw Error('Connective metadata and GLB have different mesh counts');
  return manifest.structures.map(s=>{
    const mesh=found.get(s.id);
    if(!mesh)throw Error('Connective GLB missing '+s.id);
    return {mesh,name:s.name,sourceName:s.id,stableId:'bp43-connective:'+s.id,
      system:'connective',layer:'connective',organId:s.category,
      tissue:s.category==='cartilage'?'cartilage':s.category==='joint_ligament'?'ligament':s.category==='membrane_fascia'?'membrane':'tendon',
      provenance:'BodyParts3D 4.3',side:/\bleft\b/i.test(s.name)?'left':/\bright\b/i.test(s.name)?'right':'midline',fma:s.fma_id||''};
  });
}
export function connectiveColor(s){return ({cartilage:'#95c8d3',tendon_retinaculum:'#e6d5a4',joint_ligament:'#e8c893',membrane_fascia:'#b6c8c3'})[s.organId]||'#cbd5db';}
export function connectiveVisibleInPreset(s,preset){
  if(!Object.hasOwn(CONNECTIVE_PRESETS,preset))throw Error('Unknown connective preset');
  if(preset==='all')return true;
  if(preset==='spine')return false; // Existing, better-fitting Écorché discs are authoritative.
  if(preset==='ankle')return /plantar ligament/i.test(s.name);
  if(preset==='ribs')return s.organId==='cartilage';
  if(preset==='wrist')return /(?:flexor retinaculum|forearm)/i.test(s.name);
  return /interosseous membrane/i.test(s.name);
}

// The original skeleton and muscle source already provide discs and Achilles tendons.
// These existing structure objects retain IDs and geometry; presets only filter display.
export function baseConnectiveVisibleInPreset(s,preset){
  if(!Object.hasOwn(CONNECTIVE_PRESETS,preset))return false;
  if(preset==='all')return true;
  const n=String(s.name||'').toLowerCase();
  if(preset==='spine')return /intervertebral|\bdisc\b|\bdisk\b/.test(n);
  if(preset==='ribs')return /costal|rib/.test(n)&&/cartilage/.test(n);
  if(preset==='ankle')return /calcaneal|achilles|plantar/.test(n);
  if(preset==='wrist')return /wrist|retinaculum|forearm/.test(n);
  return /interosseous membrane/.test(n);
}
