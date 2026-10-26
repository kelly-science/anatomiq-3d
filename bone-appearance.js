/** AnatomIQ bone material comparison — Satin vs experimental cortical microrelief.
 * Three appearance modes are device-only and NEVER alter geometry or saved scenes.
 * The Detail mode uses screen-filtered procedural shading normals, not displacement.
 * NOTE: relief is artistically simulated, not a medically validated bone scan.
 */
export const BONE_APPEARANCE_MODES = Object.freeze(['natural','detail','classic']);
export const BONE_APPEARANCE_STORAGE_KEY = 'anatomiq-bone-appearance-v1';
export const BONE_APPEARANCE_MARKER = 'ANATOMIQ_BONE_DETAIL_TEST_1';
export function normalizeBoneAppearance(mode){
  return mode==='classic' || mode==='detail' ? mode : 'natural';
}

/** The original skeletal collection contains cartilage and discs, which are excluded. */
export function isAnatomicalBone(mesh){
  if(!mesh?.isMesh || mesh.userData?.layer!=='skeleton')return false;
  const tissue=String(mesh.userData?.tissue||'bone').trim().toLowerCase();
  const name=String(mesh.userData?.name||mesh.name||'');
  return tissue==='bone' && !/(cartilage|intervertebral\s+disc|intervertebral\s+disk|ligament|tendon|meniscus|tooth|teeth)/i.test(name);
}

const LOCAL_VARYING='vAnatomIQBoneLocalPos';
const DETAIL_VARYING='vAnatomIQCorticalPosition';
const VERTEX='#include <begin_vertex>';
const COLOR='#include <color_fragment>';
const ROUGH='#include <roughnessmap_fragment>';
const NORMAL='#include <normal_fragment_maps>';

/** Preserve the approved v3 satin shader as-is for the Natural mode. */
export function naturalBoneMaterial(source,THREE){
  if(!source || !(source.isMeshStandardMaterial || source.isMeshPhysicalMaterial))return source;
  const material=source.clone();
  const originalRoughness=Number.isFinite(source.roughness)?source.roughness:0.38;
  material.roughness=Math.max(0.30,Math.min(0.46,originalRoughness-0.06));
  if('metalness' in material)material.metalness=0;
  if(material.color?.isColor)material.color.lerp(new THREE.Color(0xf2f1ee),0.12);
  material.userData={...material.userData,anatomiqNaturalBone:true,anatomiqBoneAppearance:'natural-v3-satin'};
  const previousHook=material.onBeforeCompile;
  material.onBeforeCompile=function(shader,renderer){
    if(typeof previousHook==='function')previousHook.call(this,shader,renderer);
    if(!shader.vertexShader.includes(VERTEX)||!shader.fragmentShader.includes(COLOR)||!shader.fragmentShader.includes(ROUGH))return;
    shader.vertexShader=`varying vec3 ${LOCAL_VARYING};\n`+shader.vertexShader.replace(VERTEX,`${VERTEX}\n${LOCAL_VARYING}=position;`);
    shader.fragmentShader=`varying vec3 ${LOCAL_VARYING};\n`+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace(COLOR,`${COLOR}
      float boneToneA=sin(dot(${LOCAL_VARYING},vec3(31.7,41.3,29.9)));
      float boneToneB=sin(dot(${LOCAL_VARYING},vec3(-47.1,23.3,53.7)));
      float boneTone=boneToneA*boneToneB;
      diffuseColor.rgb*=0.995+0.008*boneTone;
    `);
    shader.fragmentShader=shader.fragmentShader.replace(ROUGH,`${ROUGH}
      roughnessFactor=clamp(roughnessFactor+0.012*boneTone,0.27,0.49);
    `);
  };
  material.customProgramCacheKey=()=>'anatomiq-natural-bone-v3-neutral-satin';
  material.needsUpdate=true;
  return material;
}

// 3D value-noise, continuous in all directions; no UVs or tiled bump texture.
// The three bands have varying amplitudes and non-round soft plateau transitions.
// Frequency is in metre-like viewer coordinates (world-scaled model space).
const DETAIL_FUNCTIONS=`
float aqBoneHash(vec3 p){
  p=fract(p*0.1031);
  p+=dot(p,p.yzx+33.33);
  return fract((p.x+p.y)*p.z);
}
float aqBoneNoise(vec3 p){
  vec3 i=floor(p),f=fract(p);
  f=f*f*(3.0-2.0*f);
  return mix(
    mix(mix(aqBoneHash(i),aqBoneHash(i+vec3(1.,0.,0.)),f.x),
        mix(aqBoneHash(i+vec3(0.,1.,0.)),aqBoneHash(i+vec3(1.,1.,0.)),f.x),f.y),
    mix(mix(aqBoneHash(i+vec3(0.,0.,1.)),aqBoneHash(i+vec3(1.,0.,1.)),f.x),
        mix(aqBoneHash(i+vec3(0.,1.,1.)),aqBoneHash(i+vec3(1.,1.,1.)),f.x),f.y),f.z);
}
// Analytic screen derivatives of simulated height perturb the LIGHTING normal.
// Mesh vertices, geometry normals, depth, raycasting and silhouette never change.
vec3 aqBoneNormal(vec3 base,vec3 viewPos,float height){
  vec3 dx=dFdx(viewPos),dy=dFdy(viewPos);
  vec3 r1=cross(dy,base),r2=cross(base,dx);
  float determinant=dot(dx,r1);
  vec3 grad=(dFdx(height)*r1+dFdy(height)*r2);
  if(abs(determinant)<1.e-14)return base;
  return normalize(abs(determinant)*base-sign(determinant)*grad);
}
`;

/** Experimental finish: opt-in procedural relief from irregular, filtered scales.
 * It preserves all original PBR maps and keeps the exact approved satin base.
 */
export function detailedBoneMaterial(source,THREE){
  if(!source || !(source.isMeshStandardMaterial || source.isMeshPhysicalMaterial))return source;
  const material=naturalBoneMaterial(source,THREE);
  // Replace ONLY the cloned shader callback, keep the same base color/roughness.
  const sourceHook=source.onBeforeCompile;
  material.userData={...material.userData,anatomiqBoneAppearance:'detail-test-1'};
  material.onBeforeCompile=function(shader,renderer){
    if(typeof sourceHook==='function')sourceHook.call(this,shader,renderer);
    if(!shader.vertexShader.includes(VERTEX)||![COLOR,ROUGH,NORMAL].every(s=>shader.fragmentShader.includes(s)))return;
    shader.vertexShader=`varying vec3 ${DETAIL_VARYING};\n`+shader.vertexShader.replace(VERTEX,`${VERTEX}\n${DETAIL_VARYING}=(modelMatrix*vec4(position,1.0)).xyz;`);
    shader.fragmentShader=`varying vec3 ${DETAIL_VARYING};\n${DETAIL_FUNCTIONS}\n`+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace(COLOR,`${COLOR}
      // World-scaled 3D coordinates: subtle, nonuniform elongated patches.
      vec3 aqBoneP=${DETAIL_VARYING}*vec3(1.07,0.68,1.13);
      float aqBonePixel=max(length(dFdx(${DETAIL_VARYING})),length(dFdy(${DETAIL_VARYING})));
      float aqBoneBroad=0.0,aqBoneMid=0.0,aqBoneFine=0.0;
      float aqBoneBroadWeight=1.0-smoothstep(0.004,0.013,aqBonePixel);
      float aqBoneMidWeight=1.0-smoothstep(0.0011,0.004,aqBonePixel);
      float aqBoneFineWeight=1.0-smoothstep(0.00035,0.0014,aqBonePixel);
      if(aqBoneBroadWeight>0.0){aqBoneBroad=aqBoneNoise(aqBoneP*145.0)-0.5;}
      if(aqBoneMidWeight>0.0){aqBoneMid=aqBoneNoise(aqBoneP*380.0)-0.5;}
      if(aqBoneFineWeight>0.0){aqBoneFine=aqBoneNoise(aqBoneP*950.0)-0.5;}
      float aqBoneShape=aqBoneBroad*aqBoneBroadWeight*0.64+aqBoneMid*aqBoneMidWeight*0.28+aqBoneFine*aqBoneFineWeight*0.08;
      // Tiny mineral-colored changes; the existing satin specular response stays.
      diffuseColor.rgb*=1.0+0.025*aqBoneShape;
      // Height exists only as a temporary fragment-shader scalar (no displacement).
      float aqBoneHeight=0.00022*aqBoneShape;
    `);
    shader.fragmentShader=shader.fragmentShader.replace(ROUGH,`${ROUGH}
      roughnessFactor=clamp(roughnessFactor+0.037*aqBoneShape,0.27,0.49);
    `);
    shader.fragmentShader=shader.fragmentShader.replace(NORMAL,`${NORMAL}
      normal=aqBoneNormal(normal,vViewPosition,aqBoneHeight);
    `);
  };
  material.customProgramCacheKey=()=>'anatomiq-bone-detail-test-1-screen-filtered';
  material.needsUpdate=true;
  return material;
}

/** Shared variants; no per-mesh textures/UVs, exact Classic material retained. */
export function createBoneAppearanceController(root,THREE,initialMode='natural'){
  const entries=new Map(),variants=new Map();
  let mode=normalizeBoneAppearance(initialMode);
  function variant(original){
    if(Array.isArray(original)){
      return {classic:original,natural:original.map(m=>variant(m).natural),detail:original.map(m=>variant(m).detail)};
    }
    if(!variants.has(original))variants.set(original,{classic:original,natural:naturalBoneMaterial(original,THREE),detail:detailedBoneMaterial(original,THREE)});
    return variants.get(original);
  }
  function register(mesh,classicMaterial,{force=false}={}){
    if(!force&&!isAnatomicalBone(mesh))return false;
    if(!classicMaterial)return false;
    const choices=variant(classicMaterial);
    entries.set(mesh,choices);
    mesh.material=choices[mode];
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
    let enhanced=0,detailSlots=0,active=0;
    const samples=[];
    for(const [mesh,choices] of entries){
      if(mesh.material===choices[mode])active++;
      const classics=Array.isArray(choices.classic)?choices.classic:[choices.classic];
      const naturals=Array.isArray(choices.natural)?choices.natural:[choices.natural];
      const details=Array.isArray(choices.detail)?choices.detail:[choices.detail];
      for(let i=0;i<classics.length;i++){
        if(details[i]?.userData?.anatomiqBoneAppearance==='detail-test-1')detailSlots++;
        if(naturals[i]!==classics[i])enhanced++;
      }
      if(samples.length<3)samples.push({name:String(mesh.userData?.name||mesh.name||'bone'),satinRoughness:naturals[0]?.roughness??null,detailRoughness:details[0]?.roughness??null,detailMaterial:details[0]!==naturals[0]});
    }
    return {mode,boneCount:entries.size,uniqueSourceMaterials:variants.size,enhancedMaterialSlots:enhanced,detailMaterialSlots:detailSlots,currentlyAssigned:active,examples:samples};
  }
  return {register,setMode,status,get mode(){return mode;},get count(){return entries.size;},get variantCount(){return variants.size;}};
}
