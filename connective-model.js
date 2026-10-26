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

// ANATOMIQ_COSTAL_CARTILAGE_TAXONOMY_20261025
// The Écorché 1–7 costal cartilages carry per-vertex color and baked shading.
// Sample their source appearance to tint the newer 8–10 GLB meshes consistently.
// Geometry, IDs, author paint, and historical structure order remain unchanged.
export function sourceCostalCartilageAppearance(root, THREE){
  if(!root || typeof root.traverse !== 'function')return null;
  const samples=[];
  const roughnesses=[];
  root.traverse(mesh=>{
    if(!mesh?.isMesh)return;
    const name=String(mesh.userData?.name||mesh.name||'');
    const tissue=String(mesh.userData?.tissue||'').toLowerCase();
    if(!/\bcostal cartilage\b/i.test(name) || (tissue && tissue!=='cartilage'))return;
    const raw=mesh.material;
    const material=Array.isArray(raw)?raw.find(m=>m?.color)||raw[0]:raw;
    if(Number.isFinite(material?.roughness))roughnesses.push(material.roughness);
    const tint=material?.color?.isColor?material.color:null;
    const vertexColor=mesh.geometry?.getAttribute?.('color');
    if(vertexColor?.itemSize>=3 && vertexColor.count>0 && material?.vertexColors!==false){
      const stride=Math.max(1,Math.floor(vertexColor.count/250));
      for(let i=0;i<vertexColor.count;i+=stride){
        let r=vertexColor.getX(i),g=vertexColor.getY(i),b=vertexColor.getZ(i);
        if(tint){r*=tint.r;g*=tint.g;b*=tint.b;}
        if(Number.isFinite(r)&&Number.isFinite(g)&&Number.isFinite(b))samples.push([r,g,b]);
      }
    }else if(tint){
      // Fallback for flat-color model variants without a COLOR_0 attribute.
      samples.push([tint.r,tint.g,tint.b]);
    }
  });
  if(!samples.length)return null;
  // Reject the darker, baked ambient-occlusion samples. Match the visibly lit
  // material rather than making the new cartilages artificially blue or dark.
  samples.sort((a,b)=>(a[0]*0.2126+a[1]*0.7152+a[2]*0.0722)
    -(b[0]*0.2126+b[1]*0.7152+b[2]*0.0722));
  const bright=samples.slice(Math.floor(samples.length*0.5));
  const avg=[0,0,0];
  for(const item of bright)for(let j=0;j<3;j++)avg[j]+=item[j];
  const color=new THREE.Color();
  color.setRGB(...avg.map(v=>Math.max(0,Math.min(1,v/bright.length))));
  const roughness=roughnesses.length?roughnesses.reduce((a,b)=>a+b,0)/roughnesses.length:0.65;
  return {color,roughness,sourceMeshSamples:samples.length};
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

// ANATOMIQ_CONNECTIVE_2211_VISIBILITY: Only repair a legacy all-hidden native atlas.
// Do not change saved structure IDs, authored partial selections, or other systems.
export function recoverLegacyConnectiveHidden(hidden,entries){
  if(!(hidden instanceof Set)||!Array.isArray(entries)||entries.length!==14)return 0;
  const meshes=entries.map(entry=>entry?.mesh);
  if(meshes.some(mesh=>!mesh||mesh.userData?.deferredAsset||!hidden.has(mesh)))return 0;
  for(const mesh of meshes)hidden.delete(mesh);
  return meshes.length;
}
