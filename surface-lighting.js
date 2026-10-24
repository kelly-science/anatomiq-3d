/* Shared, source-independent lighting and surface finishes for Anatomiq 3D.
   Visual preference only: never changes model geometry, identifiers, paint data,
   lesson serialization, or PWA cache contents. No extra textures/HDR downloads. */
export const SURFACE_MODES=Object.freeze(['studio','classic']);
export function normalizeSurfaceMode(value){
  return SURFACE_MODES.includes(value)?value:'studio';
}

export const STUDIO_ROUGHNESS=Object.freeze({
  skeletal:0.38,    // Bone: gentle ivory specular highlight, not polished metal.
  muscular:0.48,    // Preserve the muscle's existing source finish.
  digestive:0.43,   // Moist soft tissue, broader highlights than glass.
  cardiovascular:0.41,
  'cardio-cavity':0.77 // Transparent reference volumes must remain subdued.
});

// Apply to the material already owned by the corresponding GLB.
// Arrays are supported, and no material is cloned merely to change its finish.
export function applySurfaceFinish(material,system,mode='studio'){
  if(Array.isArray(material)){
    for(const part of material)applySurfaceFinish(part,system,mode);
    return material;
  }
  if(!material || normalizeSurfaceMode(mode)!=='studio' || !('roughness' in material))return material;
  const target=STUDIO_ROUGHNESS[system];
  if(target===undefined)return material;
  material.roughness=target;
  // Anatomical tissue is a dielectric. A metallic finish looks like chrome.
  if('metalness' in material)material.metalness=0;
  return material;
}

// The existing source uses only two materials (Bone and Muscle), so keep
// those GLB material instances shared across meshes. Avoid adding 634 draw
// materials or changing geometry/vertex normals.
export function finishSourceAnatomy(root,mode='studio'){
  if(!root || normalizeSurfaceMode(mode)!=='studio')return;
  const seen=new Set();
  root.traverse(obj=>{
    if(!obj.isMesh)return;
    const layer=obj.userData?.layer;
    if(!['skeleton','deep muscles','superficial muscles'].includes(layer))return;
    const system=layer==='skeleton'?'skeletal':'muscular';
    const mats=Array.isArray(obj.material)?obj.material:[obj.material];
    for(const mat of mats){
      if(!mat||seen.has(mat))continue;
      seen.add(mat);
      applySurfaceFinish(mat,system,mode);
    }
  });
}

// Real-time, shared studio light rig; not a screen-space filter or emissive
// material. Lights affect skeletal, muscular, digestive, and cardio equally.
// No shadows, environment downloads, or new render loop: Chromebook-friendly.
export function installSurfaceLighting(THREE,scene,renderer,mode='studio'){
  const studio=normalizeSurfaceMode(mode)==='studio';
  // Filmic tone mapping keeps lit pale bone from clipping to solid white.
  renderer.toneMapping=studio?THREE.ACESFilmicToneMapping:THREE.NoToneMapping;
  renderer.toneMappingExposure=studio?1.08:1;
  const hemisphere=new THREE.HemisphereLight(0xe9f5ff,0x556474,studio?1.25:2.3);
  scene.add(hemisphere);
  function directional(color,intensity,x,y,z){
    const light=new THREE.DirectionalLight(color,intensity);
    light.position.set(x,y,z);
    // Preserve legacy light aim in Classic mode; aim at the body in Studio.
    if(studio){light.target.position.set(0,1.3,0);scene.add(light.target);}
    scene.add(light);
    return light;
  }
  directional(studio?0xfff4e8:0xffffff,studio?3.15:2.5,3,5,5);
  directional(studio?0xc7e1fa:0xb6d9f5,studio?0.9:1.2,-3,2,-4);
  if(studio)directional(0xffffff,1.35,-2.5,4.2,-3.6);
}
