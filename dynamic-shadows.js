/* Anatomiq 3D: bounded, camera-aware real shadow maps.
   One studio key light casts; opaque anatomy casts and receives. Camera orbit,
   zoom, pan and visibility edits invalidate shadows without a perpetual loop.
   Renderer-only device preference: no meshes, IDs or lesson payload changes. */
export const SHADOW_MODES=Object.freeze(['auto','on','off']);
export function normalizeShadowMode(value){return SHADOW_MODES.includes(value)?value:'auto';}
export function shadowProfile(mode='auto',quality='balanced'){
  const choice=normalizeShadowMode(mode);
  const level=['fast','balanced','sharp'].includes(quality)?quality:'balanced';
  const enabled=choice==='on'||(choice==='auto'&&level!=='fast');
  // A single 1024² map is intentionally the default; avoid 2048² on budget GPUs.
  const mapSize=level==='fast'?512:level==='sharp'?2048:1024;
  return {enabled,mapSize,description:enabled?`${mapSize} px, one dynamic key light`:'Disabled (no extra depth pass)'};
}
function opaque(material){
  if(!material)return false;
  const arr=Array.isArray(material)?material:[material];
  return arr.length>0 && arr.every(m=>m && !m.transparent && (m.opacity??1)>=0.999 && m.depthWrite!==false);
}
export function configureAnatomyShadows(root,enabled=true){
  if(!root||typeof root.traverse!=='function')return 0;
  let count=0;
  root.traverse(obj=>{
    if(!obj.isMesh || obj.userData?.deferredAsset)return;
    const active=enabled&&opaque(obj.material);
    if(obj.receiveShadow!==active){
      // Ensure existing material programs pick up the receiving-shadow shader
      // when quality changes between Fast and Balanced in an open tab.
      const mats=Array.isArray(obj.material)?obj.material:[obj.material];
      for(const mat of mats)if(mat)mat.needsUpdate=true;
    }
    obj.castShadow=active;
    obj.receiveShadow=active;
    count++;
  });
  return count;
}
export function createDynamicShadows(THREE,renderer,keyLight,{mode='auto',quality='balanced'}={}){
  if(!keyLight?.shadow)throw new Error('Studio directional key light is required for shadows');
  const shadow=keyLight.shadow;
  shadow.bias=-0.00012;
  shadow.normalBias=0.0013;
  shadow.radius=2.0;
  let profile=null;
  let dirty=true;
  const cameraSpace={eye:new THREE.Vector3(),right:new THREE.Vector3(),up:new THREE.Vector3(),position:new THREE.Vector3()};
  function setQuality(nextMode=mode,nextQuality=quality){
    mode=normalizeShadowMode(nextMode);quality=nextQuality;
    const next=shadowProfile(mode,quality);
    if(!profile||profile.mapSize!==next.mapSize){
      if(shadow.map){shadow.map.dispose();shadow.map=null;}
      shadow.mapSize.set(next.mapSize,next.mapSize);
    }
    // The renderer only spends time on the shadow pass when enabled. The key
    // still lights the model in Off/Classic modes, but does not cast shadows.
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.shadowMap.enabled=next.enabled;
    renderer.shadowMap.autoUpdate=false;
    keyLight.castShadow=next.enabled;
    if(profile?.enabled!==next.enabled){
      // Shader programs can change when switching USE_SHADOWMAP at runtime.
      // The caller reloads on shadow preference changes; this also covers
      // quality changes in a live tab.
      dirty=true;
    }
    profile=next;
    dirty=true;
    return profile;
  }
  function update(camera,target,force=false){
    if(!profile.enabled)return false;
    if(!dirty && !force)return false;
    const {eye,right,up,position}=cameraSpace;
    eye.subVectors(camera.position,target);
    const distance=Math.max(0.01,eye.length());
    eye.multiplyScalar(1/distance);
    camera.updateMatrixWorld();
    right.setFromMatrixColumn(camera.matrixWorld,0).normalize();
    up.setFromMatrixColumn(camera.matrixWorld,1).normalize();
    // Focus the light's orthographic frustum near the student's visible anatomy
    // so close-up skull / heart views retain usable resolution. Wide views
    // cover the full adult body. Do not depend on model-specific coordinates.
    const radius=Math.min(2.8,Math.max(0.33,distance*0.88));
    position.copy(target).addScaledVector(eye,radius*2.8)
      .addScaledVector(right,radius*1.5).addScaledVector(up,radius*2.0);
    keyLight.position.copy(position);
    keyLight.target.position.copy(target);
    keyLight.target.updateMatrixWorld();
    const sc=shadow.camera;
    sc.left=-radius;sc.right=radius;sc.top=radius;sc.bottom=-radius;
    sc.near=Math.max(0.01,radius*0.1);sc.far=radius*10;
    sc.updateProjectionMatrix();
    // Bias scales with zoom. Avoid acne without detaching tiny vessels' shadows.
    shadow.normalBias=Math.min(0.003,Math.max(0.0004,radius*0.001));
    renderer.shadowMap.needsUpdate=true;
    dirty=false;
    return true;
  }
  setQuality(mode,quality);
  return {setQuality,update,markDirty(){dirty=true;},get profile(){return profile;}};
}
