/** AnatomIQ Natural Bone — satin cortical-bone finish (v3).
 * Preserve mesh geometry, normals, UVs, texture maps, shadows and authored landmarks.
 * Subtle diffuse modulation and micro-roughness ONLY; no synthetic bump, relief,
 * cracks, sutures, grooves, displacement or fabricated anatomical detail.
 */
export const BONE_APPEARANCE_MODES = Object.freeze(['natural','classic']);
export const BONE_APPEARANCE_STORAGE_KEY = 'anatomiq-bone-appearance-v1';
export const BONE_APPEARANCE_MARKER = 'ANATOMIQ_NATURAL_BONE_SATIN_20261025';
export function normalizeBoneAppearance(mode){return mode === 'classic' ? 'classic' : 'natural';}

/** Respect underlying tissue metadata: original skeletal collection includes cartilage. */
export function isAnatomicalBone(mesh){
  if(!mesh?.isMesh || mesh.userData?.layer !== 'skeleton')return false;
  const tissue=String(mesh.userData?.tissue||'bone').trim().toLowerCase();
  const name=String(mesh.userData?.name||mesh.name||'');
  return tissue==='bone' && !/(cartilage|intervertebral\s+disc|intervertebral\s+disk|ligament|tendon|meniscus|tooth|teeth)/i.test(name);
}
const VARYING='vAnatomIQBoneLocalPos';
const VERTEX='#include <begin_vertex>';
const COLOR='#include <color_fragment>';
const ROUGH='#include <roughnessmap_fragment>';

/** Reintroduce realistic lighting/specular instead of opaque yellow Play-Doh.
 * The Classic material is preserved exactly for user toggling.
 */
export function naturalBoneMaterial(source,THREE){
  if(!source || !(source.isMeshStandardMaterial || source.isMeshPhysicalMaterial))return source;
  const material=source.clone();
  const originalRoughness=Number.isFinite(source.roughness)?source.roughness:0.38;
  // Original studio bones use about 0.38. Near 0.32 produces gentle, visible
  // highlights; 0.78 previously removed them and made the bones look like clay.
  material.roughness=Math.max(0.30,Math.min(0.46,originalRoughness-0.06));
  // Bone is dielectric: retain physically plausible nonmetallic white highlights.
  if('metalness' in material)material.metalness=0;
  // Barely cool/neutralize the original material instead of blending in yellow.
  // Crucially, existing authored map/vertex colors are not replaced.
  if(material.color?.isColor)material.color.lerp(new THREE.Color(0xf2f1ee),0.12);
  material.userData={...material.userData,anatomiqNaturalBone:true,anatomiqBoneAppearance:'natural-v3-satin'};
  const previousHook=material.onBeforeCompile;
  material.onBeforeCompile=function(shader,renderer){
    if(typeof previousHook==='function')previousHook.call(this,shader,renderer);
    if(!shader.vertexShader.includes(VERTEX) || !shader.fragmentShader.includes(COLOR) || !shader.fragmentShader.includes(ROUGH))return;
    shader.vertexShader=`varying vec3 ${VARYING};\n`+shader.vertexShader.replace(VERTEX,`${VERTEX}\n${VARYING}=position;`);
    shader.fragmentShader=`varying vec3 ${VARYING};\n`+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace(COLOR,`${COLOR}
      // Diffuse mineral tone variation only; not surface relief.
      float boneToneA=sin(dot(${VARYING},vec3(31.7,41.3,29.9)));
      float boneToneB=sin(dot(${VARYING},vec3(-47.1,23.3,53.7)));
      float boneTone=boneToneA*boneToneB;
      diffuseColor.rgb*=0.995+0.008*boneTone;
    `);
    shader.fragmentShader=shader.fragmentShader.replace(ROUGH,`${ROUGH}
      // Very faint modulation of highlight size, not fabricated bone geometry.
      roughnessFactor=clamp(roughnessFactor+0.012*boneTone,0.27,0.49);
    `);
  };
  material.customProgramCacheKey=()=>'anatomiq-natural-bone-v3-neutral-satin';
  material.needsUpdate=true;
  return material;
}

/** Reuse source materials and retain exact originals for Classic mode. */
export function createBoneAppearanceController(root,THREE,initialMode='natural'){
  const entries=new Map(),variants=new Map();
  let mode=normalizeBoneAppearance(initialMode);
  function variant(original){
    if(Array.isArray(original))return original.map(variant);
    if(!variants.has(original))variants.set(original,naturalBoneMaterial(original,THREE));
    return variants.get(original);
  }
  function register(mesh,classicMaterial,{force=false}={}){
    if(!force&&!isAnatomicalBone(mesh))return false;
    if(!classicMaterial)return false;
    const natural=variant(classicMaterial);
    entries.set(mesh,{classic:classicMaterial,natural});
    mesh.material=mode==='natural'?natural:classicMaterial;
    return true;
  }
  root?.traverse?.(mesh=>{if(isAnatomicalBone(mesh))register(mesh,mesh.material);});
  function setMode(next,notify){
    mode=normalizeBoneAppearance(next);
    for(const [mesh,choices] of entries){
      mesh.material=choices[mode];
      if(typeof notify==='function')notify(mesh,choices[mode]);
    }
    return mode;
  }
  function status(){
    let standard=0,active=0,eligible=0;
    const samples=[];
    for(const [mesh,choices] of entries){
      if(mesh.material===choices[mode])active++;
      const originals=Array.isArray(choices.classic)?choices.classic:[choices.classic];
      const naturals=Array.isArray(choices.natural)?choices.natural:[choices.natural];
      for(let i=0;i<originals.length;i++){
        if(originals[i]?.isMeshStandardMaterial||originals[i]?.isMeshPhysicalMaterial){eligible++;if(naturals[i]!==originals[i])standard++;}
      }
      if(samples.length<3)samples.push({name:String(mesh.userData?.name||mesh.name||'bone'),classicRoughness:originals[0]?.roughness??null,naturalRoughness:naturals[0]?.roughness??null,differentMaterial:naturals[0]!==originals[0]});
    }
    return {mode,boneCount:entries.size,uniqueSourceMaterials:variants.size,pbrMaterialSlots:eligible,enhancedMaterialSlots:standard,currentlyAssigned:active,examples:samples};
  }
  return {register,setMode,status,get mode(){return mode;},get count(){return entries.size;},get variantCount(){return variants.size;}};
}
