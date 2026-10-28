/* ANATOMIQ_CAROUSEL_LABEL_DOF_269B — DOF-safe label reveal */
/* AnatomIQ 2.2.57 — LIVE carousel: ready shadows + settled label fade.
 * TWO genuine THREE.Scene renders per frame, ONE WebGLRenderer and its canvas.
 * Shared geometry / textures; no PNG/JPEG snapshots during the live effect.
 * The CSS viewer background and all menus/toolbars remain stationary.
 * BVH occlusion and label rendering are deliberately not invoked during slides.
 */
// The additional travel time and smooth deceleration preserve a sense of
// momentum without a snap or overshoot when the model reaches the center.
export const LIVE_CAROUSEL_DURATION_MS = 680; // ANATOMIQ_CAROUSEL_SPRING_259
export const slideEase = t => {
  const x = Math.max(0, Math.min(1, t));
  // ANATOMIQ_INLINE_LABELS_EASE_261: horizontal, monotonic ease-out.
  // Velocity gently approaches zero at center; never overshoots or changes scale.
  return 1 - Math.pow(1-x, 3);
};

const activeLabelReveals=new WeakMap(); // ANATOMIQ_LABEL_HANDOFF_269C_TEST1

/** Render two entire live 3D scenes into adjacent sliding scissor viewports.
 * The clone contains THREE.Object3D nodes only; BufferGeometry, textures,
 * materials and programs are shared rather than reloaded or duplicated.
 */
export function createLiveChapterCarousel({THREE,scene,camera,renderer,stage,direction,durationMs=LIVE_CAROUSEL_DURATION_MS,onSettled,labelFadeDelayMs=200}){
  if(!THREE || !scene || !camera || !renderer || !stage || Math.abs(direction)!==1) return null;
  const canvas = renderer.domElement;
  const box = canvas?.getBoundingClientRect?.();
  if(!canvas || !box || box.width < 24 || box.height < 24 || typeof scene.clone!=='function')return null;
  if(!renderer.getContext?.() || typeof renderer.setScissor!=='function' || typeof renderer.setViewport!=='function')return null;
  // The outgoing scene is a frozen *pose*, not a bitmap. It is re-rendered with
  // the original lights/materials every frame using the exact same renderer.
  const outgoing = scene.clone(true);
  outgoing.background = null;
  // The outgoing scene is a real THREE.Scene clone (no texture/material copies).
  // Mark shadow maps independently for outgoing and incoming scenes.
  // With renderer.shadowMap.autoUpdate=false, a normal studio draw cannot do this
  // while the carousel owns the render loop.
  const preparedShadows = new WeakSet(); // ANATOMIQ_CAROUSEL_LIGHT_LABEL_257
  outgoing.traverse?.(obj=>{
    if(obj.isDirectionalLight && obj.target) obj.target.updateMatrixWorld?.(true);
  });
  const oldCamera = camera.clone();
  oldCamera.updateMatrixWorld?.(true);
  let removed = false;
  let animationId = null;
  let pendingResolve = null;
  const previous = {
    visibility:canvas.style.visibility,
    pointer:canvas.style.pointerEvents,
    scissorTest:renderer.getScissorTest?.()??false,
    autoClear:renderer.autoClear,
    // The app updates incoming light and will invalidate shadows on settle.
  };
  // ANATOMIQ_LABEL_HANDOFF_269C_TEST1: one gate for SVG connectors AND label cards.
  // Hiding children independently allowed the leaders to flash mid-carousel.
  // The single overlay also needs only one compositor animation on DOF devices.
  const overlay=document.getElementById('label-overlay');
  const markers=document.getElementById('label-markers');
  const previousReveal=overlay?activeLabelReveals.get(overlay):null;
  previousReveal?.(); // Complete an unfinished reveal before capturing base styles.
  const overlayStyles=overlay?{
    visibility:overlay.style.visibility,
    opacity:overlay.style.opacity,
    pointerEvents:overlay.style.pointerEvents
  }:null;
  if(overlay){
    overlay.style.visibility='hidden';
    overlay.style.opacity='0';
    overlay.style.pointerEvents='none';
  }
  canvas.style.pointerEvents='none';
  let fullySettled=false;
  const revealLabels=()=>{
    if(!overlay)return;
    const restore=()=>{
      overlay.style.visibility=overlayStyles.visibility;
      overlay.style.opacity=overlayStyles.opacity;
      overlay.style.pointerEvents=overlayStyles.pointerEvents;
    };
    const hasLabels=Boolean(markers?.querySelector('.anatomy-label:not([hidden])'));
    const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
    if(!fullySettled || !hasLabels || overlayStyles.visibility==='hidden' ||
       document.hidden || reducedMotion || typeof overlay.animate!=='function'){
      restore();return;
    }
    // Reveal only after the centered model is ready; preserve each leader's
    // BVH occlusion opacity and avoid additional WebGL/label-position frames.
    overlay.style.visibility=overlayStyles.visibility;
    overlay.style.opacity='0';
    overlay.style.pointerEvents='none';
    try{
      const effect=overlay.animate([{opacity:0},{opacity:1}],{
        delay:Math.max(0,labelFadeDelayMs),duration:330,
        easing:'cubic-bezier(0.22, 1, 0.36, 1)',fill:'both'
      });
      const finish=()=>{
        if(activeLabelReveals.get(overlay)!==finish)return;
        activeLabelReveals.delete(overlay);
        effect.onfinish=null;
        effect.cancel();
        restore();
      };
      activeLabelReveals.set(overlay,finish);
      effect.onfinish=finish;
    }catch(error){
      console.warn('AnatomIQ overlay reveal skipped',error);
      restore();
    }
  };
  const release=()=>{
    if(removed)return;
    removed=true;
    if(animationId!==null)cancelAnimationFrame(animationId);
    renderer.setScissorTest(false);
    const w=renderer.getSize(new THREE.Vector2()).x;
    const h=renderer.getSize(new THREE.Vector2()).y;
    renderer.setViewport(0,0,w,h);
    renderer.setScissor(0,0,w,h);
    renderer.setScissorTest(previous.scissorTest);
    renderer.autoClear=previous.autoClear;
    canvas.style.visibility=previous.visibility;
    canvas.style.pointerEvents=previous.pointer;
    // Bring shadows and the projected positions of the NEW labels up to date
    // while their containers are still invisible. Avoid a one-frame label jump.
    try{onSettled?.();}catch(error){console.warn('Carousel settle callback failed',error);}
    revealLabels();
    pendingResolve?.();pendingResolve=null;
    // The clone owns any transient shadow textures it rendered, but shares all
    // GLB materials, geometries and textures with the source. Only free its maps.
    outgoing.traverse?.(obj=>{
      if(obj.isLight && obj.shadow?.map){obj.shadow.map.dispose();obj.shadow.map=null;}
    });
    outgoing.clear?.();
  };
  const actualCanvasSize=()=>{
    const v=renderer.getSize(new THREE.Vector2());
    return {w:v.x,h:v.y};
  };
  const drawLive=(incomingScene,incomingCamera,fraction)=>{
    const {w,h}=actualCanvasSize();
    if(w<24||h<24)return;
    const ease=slideEase(fraction);
    const oldX = -direction*w*ease;
    const newX = direction*w*(1-ease);
    // Transparent canvas: the stage background is drawn ONLY ONCE by CSS.
    renderer.setRenderTarget(null);
    renderer.setScissorTest(false);
    renderer.setViewport(0,0,w,h);
    renderer.clear(true,true,true);
    const drawPane=(s,c,offset)=>{
      const start=Math.max(0,Math.round(offset));
      const end=Math.min(w,Math.round(offset+w));
      if(end<=start)return;
      // A viewport may extend past the canvas; scissor clips it at its edge.
      renderer.setViewport(offset,0,w,h);
      renderer.setScissor(start,0,end-start,h);
      renderer.setScissorTest(true);
      if(renderer.shadowMap?.enabled && !preparedShadows.has(s)){
        // Force the shadow depth pass *before* the first visible color pass.
        // Updating only once per scene avoids doubling shadow GPU work on
        // every animation frame. Shader lighting remains live throughout.
        renderer.shadowMap.needsUpdate=true;
        preparedShadows.add(s);
      }
      renderer.render(s,c);
    };
    drawPane(outgoing,oldCamera,oldX);
    drawPane(incomingScene,incomingCamera,newX);
    renderer.setScissorTest(false);
    renderer.setViewport(0,0,w,h);
  };
  return {
    /** Must be called after applyScene() has finished changing the main scene. */
    async play(incomingScene=scene,incomingCamera=camera){
      if(removed)return;
      try{
        if(document.hidden || durationMs<=0){drawLive(incomingScene,incomingCamera,1);fullySettled=true;return;}
        await new Promise(resolve=>{
          pendingResolve=resolve;
          let started=null;
          const frame=time=>{
            animationId=null;
            if(removed){resolve();return;}
            if(document.hidden){drawLive(incomingScene,incomingCamera,1);fullySettled=true;resolve();return;}
            if(started===null)started=time;
            const p=Math.min(1,(time-started)/durationMs);
            try{drawLive(incomingScene,incomingCamera,p);}
            catch(error){console.warn('AnatomIQ live carousel render failed',error);resolve();return;}
            if(p>=1){fullySettled=true;resolve();return;}
            animationId=requestAnimationFrame(frame);
          };
          animationId=requestAnimationFrame(frame);
        });
      }finally{release();}
    },
    remove:release,
    get active(){return !removed;},
    get usesLiveScenes(){return true;},
  };
}
