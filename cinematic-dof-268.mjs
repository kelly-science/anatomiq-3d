import {MOTION_FRAGMENT,createCameraMotionBlur} from './motion-blur-279.mjs?rev=motionblur279b'; // ANATOMIQ_MOTION_BLUR_279_EXPERIMENT
// AnatomIQ Studio 2.2.68a — zoom stability and carousel lighting handoff.
// Same tested renderer, with direct camera focus, matched final tone mapping, and carousel handoff.
// Scene-only postprocessing: native HTML labels, live chapter carousel, and
// original mesh materials are not modified.
export const DOF_STORAGE_KEY='anatomiq-depth-of-field-v1';
export const DOF_PRESETS=Object.freeze({
  off:{radius:0,intensity:0},
  subtle:{radius:2.0,intensity:0.72},
  cinematic:{radius:3.8,intensity:1.0}
});
export function normalizedPreset(value){
  return Object.prototype.hasOwnProperty.call(DOF_PRESETS,value)?value:'cinematic';
}
export function initialPreset(store=globalThis.localStorage){
  try { return normalizedPreset(store?.getItem(DOF_STORAGE_KEY)); }
  catch { return 'cinematic'; }
}
const VERTEX=`varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;
const BLUR_FRAGMENT=`precision highp float;
varying vec2 vUv;
uniform sampler2D tInput;
uniform vec2 uPx;
uniform float uRadius;
void main(){
  vec2 d=uPx*uRadius;
  vec4 c=texture2D(tInput,vUv)*0.18;
  c+=texture2D(tInput,vUv+vec2( 1.00,0.00)*d)*0.11;
  c+=texture2D(tInput,vUv+vec2(-1.00,0.00)*d)*0.11;
  c+=texture2D(tInput,vUv+vec2(0.00, 1.00)*d)*0.11;
  c+=texture2D(tInput,vUv+vec2(0.00,-1.00)*d)*0.11;
  c+=texture2D(tInput,vUv+vec2( 0.71, 0.71)*d)*0.095;
  c+=texture2D(tInput,vUv+vec2(-0.71, 0.71)*d)*0.095;
  c+=texture2D(tInput,vUv+vec2( 0.71,-0.71)*d)*0.095;
  c+=texture2D(tInput,vUv+vec2(-0.71,-0.71)*d)*0.095;
  gl_FragColor=c;
}`;
const COMPOSITE_FRAGMENT=`precision highp float;
varying vec2 vUv;
uniform sampler2D tSharp;
uniform sampler2D tSoft;
uniform sampler2D tDepth;
uniform float uNear;
uniform float uFar;
uniform float uFocus;
uniform float uIntensity;
${MOTION_FRAGMENT}
void main(){
  float depth=texture2D(tDepth,vUv).r;
  vec4 sharp=anat279CameraMotionBlur(vUv,depth);
  float realDepth=uNear*uFar/max(0.000001,(uFar-depth*(uFar-uNear)));
  float sharpZone=max(0.008,uFocus*0.035);
  float falloff=max(0.025,uFocus*0.26);
  float t=clamp((realDepth-uFocus-sharpZone)/falloff,0.0,1.0);
  float fade=t*t*(3.0-2.0*t);
  float nearZoom=clamp((0.85-uFocus)/0.65,0.0,1.0);
  float b=(depth>0.99999?0.0:fade*nearZoom*uIntensity);
  // ANATOMIQ_269F_FADED_DOF_EXEMPT_LOCAL1: faded anatomy is rendered at 26%.
  // Most unoccluded faded fragments retain partial alpha in tSharp. Do not
  // apply the DOF blur to those pixels. This does not add any render pass.
  // Opaque anatomy behind transparent anatomy can mask the alpha distinction;
  // exact per-mesh exclusion would require an additional ID/mask buffer.
  b *= smoothstep(0.65,0.95,sharp.a);
  vec4 soft=texture2D(tSoft,vUv);
  gl_FragColor=mix(sharp,soft,b);
  // Render-target alpha is premultiplied. Convert straight RGB before
  // color-space output, then premultiply again so faded surfaces visually
  // match the direct WebGL carousel renderer more closely.
  float anatAlpha=gl_FragColor.a;
  gl_FragColor.rgb/=max(anatAlpha,0.00001);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb*=anatAlpha;
}`;


export function createCinematicDepthOfField({THREE,renderer,camera,controls,invalidate,selectElement,statusElement}){
  const settings={preset:initialPreset()};
  const motion=createCameraMotionBlur({THREE,selectElement:document.getElementById('settings-motion-blur'),statusElement:document.getElementById('settings-motion-status'),invalidate});
  const size=new THREE.Vector2();
  let colorTarget=null,softTarget=null,quad=null,blurMaterial=null,combineMaterial=null;
  let hardwareFailure=false,screen=null,settleStartedAt=null;
  const settleMs=240;
  const clock=()=>globalThis.performance?.now?.() ?? Date.now();
  function settleGain(){
    if(settleStartedAt===null)return 1;
    const elapsed=Math.max(0,clock()-settleStartedAt);
    const t=Math.min(1,elapsed/settleMs);
    if(t>=1){settleStartedAt=null;return 1;}
    // The upcoming frame is still part of the carousel handoff; do not
    // request focus-chasing frames during ordinary OrbitControls movement.
    invalidate();
    return t*t*(3-2*t);
  }
  const safePersist=value=>{try{localStorage.setItem(DOF_STORAGE_KEY,value);}catch{}};
  function release(){
    colorTarget?.dispose();softTarget?.dispose();
    colorTarget=null;softTarget=null;
    blurMaterial?.dispose();combineMaterial?.dispose();
    blurMaterial=null;combineMaterial=null;
    quad?.geometry?.dispose();quad=null;screen=null;
  }
  function createTargets(){
    const color=new THREE.WebGLRenderTarget(1,1,{format:THREE.RGBAFormat,type:THREE.UnsignedByteType,
      minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true,stencilBuffer:false});
    color.texture.generateMipmaps=false;
    color.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
    color.depthTexture.minFilter=THREE.NearestFilter;
    color.depthTexture.magFilter=THREE.NearestFilter;
    const soft=new THREE.WebGLRenderTarget(1,1,{format:THREE.RGBAFormat,type:THREE.UnsignedByteType,
      minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false,stencilBuffer:false});
    soft.texture.generateMipmaps=false;
    return [color,soft];
  }
  function prepare(){
    if(colorTarget)return;
    if(!renderer.capabilities?.isWebGL2 && !renderer.extensions?.has?.('WEBGL_depth_texture')){
      throw new Error('Depth textures unavailable on this WebGL renderer');
    }
    [colorTarget,softTarget]=createTargets();
    const geometry=new THREE.PlaneGeometry(2,2);
    quad=new THREE.Mesh(geometry,null);
    const screenCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    const screenScene=new THREE.Scene();screenScene.add(quad);
    blurMaterial=new THREE.ShaderMaterial({vertexShader:VERTEX,fragmentShader:BLUR_FRAGMENT,
      uniforms:{tInput:{value:colorTarget.texture},uPx:{value:new THREE.Vector2(1,1)},uRadius:{value:2}},
      transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
    combineMaterial=new THREE.ShaderMaterial({vertexShader:VERTEX,fragmentShader:COMPOSITE_FRAGMENT,
      uniforms:{tSharp:{value:colorTarget.texture},tSoft:{value:softTarget.texture},tDepth:{value:colorTarget.depthTexture},
        uNear:{value:camera.near},uFar:{value:camera.far},uFocus:{value:0.5},uIntensity:{value:0.75}},
      transparent:false,depthTest:false,depthWrite:false,toneMapped:true});
    Object.assign(combineMaterial.uniforms,motion.uniforms);
    return {screenCamera,screenScene};
  }
  function status(message){if(statusElement)statusElement.textContent=message;}
  function syncUI(){
    if(selectElement)selectElement.value=settings.preset;
    status(settings.preset==='off'?'Off — original anatomy rendering':
      settings.preset==='subtle'?'Subtle — soft background focus':'Cinematic — stronger background separation');
  }
  function drawWithDepth(scene,viewCamera){
    if(!screen)screen=prepare();
    renderer.getDrawingBufferSize(size);
    const w=Math.max(1,Math.floor(size.x)),h=Math.max(1,Math.floor(size.y));
    if(colorTarget.width!==w || colorTarget.height!==h)colorTarget.setSize(w,h);
    const bw=Math.max(1,Math.ceil(w*0.5)),bh=Math.max(1,Math.ceil(h*0.5));
    if(softTarget.width!==bw || softTarget.height!==bh)softTarget.setSize(bw,bh);
    const cfg=DOF_PRESETS[settings.preset];
    motion.beginFrame(viewCamera,w,h);
    const distance=viewCamera.position.distanceTo(controls.target);
    // OrbitControls already invalidates on camera changes. Using the current
    // focus distance avoids a trailing blur plane and endless redraws on zoom.
    const focusDistance=distance;
    blurMaterial.uniforms.uPx.value.set(1/w,1/h);
    blurMaterial.uniforms.uRadius.value=cfg.radius;
    combineMaterial.uniforms.uNear.value=viewCamera.near;
    combineMaterial.uniforms.uFar.value=viewCamera.far;
    combineMaterial.uniforms.uFocus.value=(window.__anatomiqDofRefocusState ? window.__anatomiqDofRefocusState.resolve((focusDistance)) : (focusDistance));
    combineMaterial.uniforms.uIntensity.value=cfg.intensity*settleGain();
    const previousTarget=renderer.getRenderTarget();
    const previousAutoClear=renderer.autoClear;
    try{
      renderer.autoClear=true;
      renderer.setRenderTarget(colorTarget);renderer.clear();
      renderer.render(scene,viewCamera);
      if(settings.preset!=='off'){
        renderer.setRenderTarget(softTarget);renderer.clear();
        quad.material=blurMaterial;renderer.render(screen.screenScene,screen.screenCamera);
      }
      renderer.setRenderTarget(null);renderer.clear();
      quad.material=combineMaterial;renderer.render(screen.screenScene,screen.screenCamera);
      motion.commitFrame();
    }finally{
      renderer.setRenderTarget(previousTarget);
      renderer.autoClear=previousAutoClear;
    }
  }
  function select(preset){
    const next=normalizedPreset(preset);
    settings.preset=hardwareFailure?'off':next;
    settleStartedAt=null;
    if(settings.preset==='off'&&!motion.enabled)release(); // Reclaim buffers if BOTH effects are off.
    motion.reset();
    safePersist(settings.preset);
    syncUI();invalidate(2);
  }
  function render(scene,viewCamera){
    if((settings.preset==='off'&&!motion.enabled)||hardwareFailure){
      renderer.render(scene,viewCamera);return;
    }
    try{drawWithDepth(scene,viewCamera);}
    catch(error){
      hardwareFailure=true;settings.preset='off';motion.select('off');motion.reset();
      release();safePersist('off');syncUI();
      status('Depth of field unavailable on this device — original renderer restored.');
      console.warn('AnatomIQ depth of field disabled after a WebGL error:',error);
      renderer.setRenderTarget(null);renderer.render(scene,viewCamera);
    }
  }
  function onChapterSettled(){
    // Called after the live carousel restores its full-size viewport and
    // before its settled frame. Shadow synchronization stays in app.js.
    settleStartedAt=clock();
    motion.reset(); // Never smear the outgoing chapter into the new chapter.
  }
  // The same control is available from the application Settings dialog.
  if(selectElement)selectElement.addEventListener('change',()=>select(selectElement.value));
  syncUI();
  return {render,select,onChapterSettled,resetMotion:motion.reset,get mode(){return settings.preset;},get motionMode(){return motion.mode;},dispose:release};
}
