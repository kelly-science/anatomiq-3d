/** AnatomIQ Natural Bone — visible, geometry-preserving material finish.
 * Zero geometry, normals, displacement, bump, metalness or label changes.
 * Material variants are shared by source material; classics remain untouched.
 */
export const BONE_APPEARANCE_MODES = Object.freeze(['natural','classic']);
export const BONE_APPEARANCE_STORAGE_KEY = 'anatomiq-bone-appearance-v1';
export const BONE_APPEARANCE_MARKER = 'ANATOMIQ_NATURAL_BONE_VISIBILITY_20261025';
export function normalizeBoneAppearance(mode){return mode === 'classic' ? 'classic' : 'natural';}

/** Source anatomy metadata, not user-facing UI names or system-wide switches. */
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

/** A stronger ivory response, with very gentle COLOR variation only.
 * There is no relief, fake ridge, fake suture, normal map or deformation.
 */
export function naturalBoneMaterial(source,THREE){
  if(!source || !(source.isMeshStandardMaterial || source.isMeshPhysicalMaterial))return source;
  const material=source.clone();
  material.roughness=0.78;
  if('metalness' in material)material.metalness=0;
  // A measured, visibly different ivory finish, rather than v1's almost-white tint.
  // Preserve the model's base shade and any authored diffuse/vertex texture maps.
  if(material.color?.isColor)material.color.lerp(new THREE.Color(0xe8d4ba),0.42);
  material.userData={...material.userData,anatomiqNaturalBone:true,anatomiqBoneAppearance:'natural-v2'};
  const previousHook=material.onBeforeCompile;
  material.onBeforeCompile=function(shader,renderer){
    if(typeof previousHook==='function')previousHook.call(this,shader,renderer);
    if(!shader.vertexShader.includes(VERTEX) || !shader.fragmentShader.includes(COLOR) || !shader.fragmentShader.includes(ROUGH))return;
    shader.vertexShader=`varying vec3 ${VARYING};\n`+shader.vertexShader.replace(VERTEX,`${VERTEX}\n${VARYING}=position;`);
    shader.fragmentShader=`varying vec3 ${VARYING};\n`+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace(COLOR,`${COLOR}
      // Extremely fine mineral-tone variation in diffuse color only.
      float boneToneA = sin(dot(${VARYING},vec3(31.7,41.3,29.9)));
      float boneToneB = sin(dot(${VARYING},vec3(-47.1,23.3,53.7)));
      float boneTone = boneToneA * boneToneB;
      diffuseColor.rgb *= 0.977 + 0.020 * boneTone;
    `);
    shader.fragmentShader=shader.fragmentShader.replace(ROUGH,`${ROUGH}
      roughnessFactor=clamp(roughnessFactor+0.018*boneTone,0.65,0.89);
    `);
  };
  material.customProgramCacheKey=()=>'anatomiq-natural-bone-v2-ivory-roughness-color-only';
  material.needsUpdate=true;
  return material;
}

/** Keeps originals for an exact Classic toggle, and exposes a non-invasive audit. */
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
