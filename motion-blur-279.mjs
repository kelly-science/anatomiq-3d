// AnatomIQ Studio — experimental camera-motion blur, depth-aware, local preference.
// Only the anatomy canvas is postprocessed; labels/activities are DOM overlays.
export const MOTION_STORAGE_KEY = 'anatomiq-motion-blur-experiment-279';
export const MOTION_DEFAULT_MIGRATION_KEY = 'anatomiq-motion-blur-extreme-default-279b';
export const MOTION_PRESETS = Object.freeze({
  off: {strength:0,maxPixels:0},
  subtle: {strength:0.32,maxPixels:7},
  cinematic: {strength:0.78,maxPixels:17},
  extreme: {strength:1.35,maxPixels:32}
});
export const MOTION_FRAGMENT = `
uniform mat4 uMBPrevVP;
uniform mat4 uMBInvVP;
uniform vec2 uMBViewport;
uniform float uMBStrength;
uniform float uMBMaxPx;
vec4 anat279CameraMotionBlur(vec2 uv,float depth){
  vec4 center=texture2D(tSharp,uv);
  if(uMBStrength<=0.0 || depth>=0.99995 || center.a<0.78)return center;
  // Reproject the current surface into the previous camera to estimate screen velocity.
  vec4 world=uMBInvVP*vec4(uv*2.0-1.0,depth*2.0-1.0,1.0);
  if(abs(world.w)<0.00001)return center;
  world/=world.w;
  vec4 previous=uMBPrevVP*world;
  if(previous.w<=0.00001)return center;
  vec2 oldUV=previous.xy/previous.w*0.5+0.5;
  vec2 pixelVelocity=(uv-oldUV)*uMBViewport;
  float motionPixels=length(pixelVelocity);
  float radius=min(motionPixels*uMBStrength,uMBMaxPx);
  if(radius<0.65)return center;
  vec2 streak=(pixelVelocity/max(motionPixels,0.00001))*radius/uMBViewport;
  // Shutter samples straddle the current position. Reject cross-surface and
  // transparent samples to reduce halos on silhouettes and faded structures.
  vec4 sum=center*0.28;
  float weight=0.28;
  for(int i=1;i<=3;i++){
    float t=float(i)/3.0;
    vec2 uvA=clamp(uv+streak*t*0.5,vec2(0.001),vec2(0.999));
    vec2 uvB=clamp(uv-streak*t*0.5,vec2(0.001),vec2(0.999));
    vec4 a=texture2D(tSharp,uvA);
    vec4 b=texture2D(tSharp,uvB);
    float da=texture2D(tDepth,uvA).r;
    float db=texture2D(tDepth,uvB).r;
    float wa=(1.0-smoothstep(0.001,0.009,abs(da-depth)))*smoothstep(0.75,0.95,a.a)*0.12;
    float wb=(1.0-smoothstep(0.001,0.009,abs(db-depth)))*smoothstep(0.75,0.95,b.a)*0.12;
    sum+=a*wa+b*wb;
    weight+=wa+wb;
  }
  return sum/max(0.0001,weight);
}`;

export function normalizeMotionPreset(value){
  return Object.prototype.hasOwnProperty.call(MOTION_PRESETS,value)?value:'extreme';
}
export function initialMotionPreset(store){
  try{
    const deviceStore=store===undefined?globalThis.localStorage:store;
    // One-time migration: apply Extreme to devices that used the previous Off default.
    // After this first launch, preserve the user's own selection on this device.
    if(deviceStore?.getItem(MOTION_DEFAULT_MIGRATION_KEY)!=='1'){
      deviceStore?.setItem(MOTION_STORAGE_KEY,'extreme');
      deviceStore?.setItem(MOTION_DEFAULT_MIGRATION_KEY,'1');
      return 'extreme';
    }
    return normalizeMotionPreset(deviceStore?.getItem(MOTION_STORAGE_KEY));
  }catch{return 'extreme';} // Privacy mode / disabled storage still defaults Extreme.
}
export function createCameraMotionBlur({THREE,selectElement,statusElement,invalidate,clock=()=>performance.now(),storage}){
  let mode=initialMotionPreset(storage),valid=false,previousTime=0,previousW=0,previousH=0;
  const lastVP=new THREE.Matrix4(),currentVP=new THREE.Matrix4(),inverseVP=new THREE.Matrix4();
  const uniforms={
    uMBPrevVP:{value:lastVP},
    uMBInvVP:{value:inverseVP},
    uMBViewport:{value:new THREE.Vector2(1,1)},
    uMBStrength:{value:0},
    uMBMaxPx:{value:0}
  };
  function sync(){
    if(selectElement)selectElement.value=mode;
    if(statusElement)statusElement.textContent=mode==='off'?'Off — original sharp motion':
      mode==='subtle'?'Subtle camera streaks during rotation':
      mode==='cinematic'?'Cinematic shutter blur while orbiting or zooming':
      'Extreme — exaggerated fast-motion streaks';
  }
  function reset(){valid=false;previousTime=0;}
  function select(value){
    const next=normalizeMotionPreset(value);
    if(mode===next)return;
    mode=next;reset();
    try{(storage===undefined?globalThis.localStorage:storage)?.setItem(MOTION_STORAGE_KEY,mode);}catch{}
    sync();invalidate(2);
  }
  function beginFrame(viewCamera,w,h){
    // Current/previous VP matrices include zoom, pan, orbit and focus movements.
    viewCamera.updateMatrixWorld(true);
    currentVP.multiplyMatrices(viewCamera.projectionMatrix,viewCamera.matrixWorldInverse);
    inverseVP.copy(currentVP).invert();
    const now=clock();
    const useHistory=valid && now-previousTime<140 && now>=previousTime && w===previousW && h===previousH;
    if(!useHistory)lastVP.copy(currentVP);
    uniforms.uMBViewport.value.set(w,h);
    const preset=MOTION_PRESETS[mode];
    uniforms.uMBStrength.value=useHistory?preset.strength:0;
    uniforms.uMBMaxPx.value=preset.maxPixels;
    previousW=w;previousH=h;
  }
  function commitFrame(){lastVP.copy(currentVP);previousTime=clock();valid=true;}
  if(selectElement)selectElement.addEventListener('change',()=>select(selectElement.value));
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',reset);
  sync();
  return {uniforms,beginFrame,commitFrame,reset,select,get mode(){return mode;},get enabled(){return mode!=='off';}};
}
