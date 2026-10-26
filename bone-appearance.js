/** AnatomIQ Natural Bone v1: conservative, geometry-preserving surface finish.
 * Physically based tint + roughness with low-amplitude, isotropic position-based
 * albedo/roughness modulation. NO normals, height, displacement, or geometry edits.
 * Appearance stays device-local; not serialized in scenes or lessons.
 */
export const BONE_APPEARANCE_MODES = Object.freeze(['natural','classic']);
export const BONE_APPEARANCE_STORAGE_KEY = 'anatomiq-bone-appearance-v1';
export const BONE_APPEARANCE_MARKER = 'ANATOMIQ_NATURAL_BONE_PHASE1_20261025';

export function normalizeBoneAppearance(mode){
  return mode === 'classic' ? 'classic' : 'natural';
}

/** Base Écorché metadata, not the enclosing system tab: separates bone from cartilage. */
export function isAnatomicalBone(mesh){
  if(!mesh?.isMesh || mesh.userData?.layer !== 'skeleton')return false;
  const tissue=String(mesh.userData?.tissue||'bone').trim().toLowerCase();
  const name=String(mesh.userData?.name||mesh.name||'');
  return tissue==='bone' && !/(cartilage|intervertebral\s+disc|intervertebral\s+disk|ligament|tendon|meniscus|tooth|teeth)/i.test(name);
}

const VARYING = 'vAnatomIQBoneLocalPos';
const VERTEX_INCLUDE = '#include <begin_vertex>';
const COLOR_INCLUDE = '#include <color_fragment>';
const ROUGHNESS_INCLUDE = '#include <roughnessmap_fragment>';

/** Only compiler-supported, source-owned standard/physical GLTF materials are enhanced. */
export function naturalBoneMaterial(source,THREE){
  if(!source || !(source.isMeshStandardMaterial || source.isMeshPhysicalMaterial))return source;
  const finish=source.clone();
  finish.roughness=0.62; // Dry cortical bone, wider and softer highlights than 0.38 Studio shine.
  if('metalness' in finish)finish.metalness=0;
  if(finish.color?.isColor)finish.color.multiply(new THREE.Color(0xfff9ef));
  finish.userData={...finish.userData,anatomiqNaturalBone:true};
  const previousHook=finish.onBeforeCompile;
  finish.onBeforeCompile=function(shader,renderer){
    if(typeof previousHook==='function')previousHook.call(this,shader,renderer);
    // If the Three.js shader layout changes, fall back to the PBR tint/roughness.
    if(!shader.vertexShader.includes(VERTEX_INCLUDE)||
       !shader.fragmentShader.includes(COLOR_INCLUDE)||
       !shader.fragmentShader.includes(ROUGHNESS_INCLUDE))return;
    shader.vertexShader = `varying vec3 ${VARYING};\n` + shader.vertexShader.replace(
      VERTEX_INCLUDE, `${VERTEX_INCLUDE}\n${VARYING} = position;`);
    shader.fragmentShader = `varying vec3 ${VARYING};\n` + shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace(COLOR_INCLUDE,`${COLOR_INCLUDE}
      // Very low-contrast diffuse mineral variation, not relief or a landmark.
      float boneGrainA = sin(dot(${VARYING},vec3(33.1,41.7,27.3)));
      float boneGrainB = sin(dot(${VARYING},vec3(53.9,-22.7,48.1)));
      float boneGrain = boneGrainA * boneGrainB;
      diffuseColor.rgb *= 0.990 + 0.014 * boneGrain;
    `);
    shader.fragmentShader=shader.fragmentShader.replace(ROUGHNESS_INCLUDE,`${ROUGHNESS_INCLUDE}
      roughnessFactor = clamp(roughnessFactor + 0.035 * boneGrain, 0.49, 0.80);
    `);
  };
  finish.customProgramCacheKey=()=>'anatomiq-natural-bone-albedo-roughness-v1';
  finish.needsUpdate=true;
  return finish;
}

/**
 * One variant per *source material*, not per bone: bounded memory and programs.
 * Originals are kept for exact Classic restoration. register() supports a later
 * high-detail skull material replacement without changing mesh IDs or geometry.
 */
export function createBoneAppearanceController(root,THREE,initialMode='natural'){
  const entries=new Map();
  const variants=new Map();
  let mode=normalizeBoneAppearance(initialMode);
  function variant(original){
    if(Array.isArray(original))return original.map(variant);
    if(!variants.has(original))variants.set(original,naturalBoneMaterial(original,THREE));
    return variants.get(original);
  }
  function register(mesh,classicMaterial,{force=false}={}){
    if(!force && !isAnatomicalBone(mesh))return false;
    if(!classicMaterial)return false;
    const naturalMaterial=variant(classicMaterial);
    entries.set(mesh,{classic:classicMaterial,natural:naturalMaterial});
    mesh.material=mode==='natural'?naturalMaterial:classicMaterial;
    return true;
  }
  root?.traverse?.(mesh=>{if(isAnatomicalBone(mesh))register(mesh,mesh.material);});
  function setMode(next,notify){
    mode=normalizeBoneAppearance(next);
    for(const [mesh,choices] of entries){
      const material=choices[mode];
      mesh.material=material;
      if(typeof notify==='function')notify(mesh,material);
    }
    return mode;
  }
  return {register,setMode,get mode(){return mode;},get count(){return entries.size;},get variantCount(){return variants.size;}};
}
