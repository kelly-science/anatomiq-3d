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

// ANATOMIQ_LABEL_CASCADE_269G_LOCAL1 — seeded jitter; no per-frame JavaScript.
const activeLabelReveals=new WeakMap();
function labelSeed(text){
  let h=2166136261;
  for(const char of text){h=Math.imul(h^char.charCodeAt(0),16777619);}
  return h>>>0;
}
export function labelCascadeDelays(names){
  const count=names.length,spread=Math.min(1000,Math.max(0,(count-1)*67+55));
  let previous=-10;
  return names.map((name,i)=>{
    const progress=count>1?i/(count-1):0;
    const center=count>1?Math.round(spread*Math.pow(progress,1.85)):0;
    const jitter=(labelSeed(String(name)+'|'+i)%25)-12;
    const delay=Math.max(i?previous+10:0,center+jitter);
    previous=delay;
    return delay;
  });
}

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
  // ANATOMIQ_LABEL_CASCADE_269G_LOCAL1: gate the common overlay for the live
  // slide, then animate each label with its own paired SVG leader group.
  // A leader group's opacity is independent of its child line/dot occlusion.
  const overlay=document.getElementById('label-overlay');
  const markers=document.getElementById('label-markers');
  const leaders=document.getElementById('label-lines');
  const previousReveal=overlay?activeLabelReveals.get(overlay):null;
  previousReveal?.();
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
    const cards=Array.from(markers?.querySelectorAll('.anatomy-label')||[]);
    const leaderGroups=Array.from(leaders?.querySelectorAll('.anat-label-leader-group')||[]);
    const pairs=cards.map((card,i)=>({card,leader:leaderGroups[i]}))
      .filter(({card,leader})=>!card.hidden && leader);
    const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
    if(!fullySettled || !pairs.length || overlayStyles.visibility==='hidden' ||
       document.hidden || reducedMotion || pairs.some(({card,leader})=>
         typeof card.animate!=='function'||typeof leader.animate!=='function')){
      restore();return;
    }
    const schedule=labelCascadeDelays(pairs.map(({card})=>card.getAttribute?.('aria-label')||card.textContent||''));
    const animations=[];
    let remaining=0, finished=false;
    const finish=()=>{
      if(finished)return;
      finished=true;
      if(activeLabelReveals.get(overlay)!==finish)return;
      activeLabelReveals.delete(overlay);
      for(const animation of animations){animation.onfinish=null;animation.cancel();}
      restore();
    };
    try{
      for(const [i,{card,leader}] of pairs.entries()){
        const base=Math.max(0,labelFadeDelayMs)+schedule[i];
        const cardOpacity=typeof getComputedStyle==='function'
          ? Number.parseFloat(getComputedStyle(card).opacity) : 1;
        const targetOpacity=Number.isFinite(cardOpacity)?cardOpacity:1;
        const useLift=typeof getComputedStyle!=='function' ||
          ['none','0px','0px 0px'].includes(getComputedStyle(card).translate);
        // Leaders lead the matching card by just 24–48 ms; both receive the
        // same progressively slowing stagger. Occlusion remains on descendants.
        const leaderEffect=leader.animate([{opacity:0},{opacity:1}],{
          delay:base,duration:290,easing:'cubic-bezier(0.22,1,0.36,1)',fill:'both'
        });
        animations.push(leaderEffect);
        const lag=24+(labelSeed('line|'+i+'|'+String(card.textContent||''))%25);
        const cardFrames=useLift
          ?[{opacity:0,translate:'0px 5px'},{opacity:targetOpacity,translate:'0px 0px'}]
          :[{opacity:0},{opacity:targetOpacity}];
        const cardEffect=card.animate(cardFrames,{
          delay:base+lag,duration:320,easing:'cubic-bezier(0.22,1,0.36,1)',fill:'both'
        });
        animations.push(cardEffect);
      }
      remaining=animations.length;
      for(const animation of animations){
        animation.onfinish=()=>{if(--remaining===0)finish();};
      }
      activeLabelReveals.set(overlay,finish);
      // Animations with fill:'both' are in their invisible first keyframe
      // before this reveal. Never expose bare SVG leaders during the slide.
      overlay.style.visibility=overlayStyles.visibility;
      overlay.style.opacity=overlayStyles.opacity||'1';
    }catch(error){
      console.warn('AnatomIQ label cascade skipped',error);
      for(const animation of animations){animation.onfinish=null;animation.cancel();}
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
