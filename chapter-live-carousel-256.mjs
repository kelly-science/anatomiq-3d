/* AnatomIQ 2.2.56 — experimental LIVE chapter carousel.
 * TWO genuine THREE.Scene renders per frame, ONE WebGLRenderer and its canvas.
 * Shared geometry / textures; no PNG/JPEG snapshots during the live effect.
 * The CSS viewer background and all menus/toolbars remain stationary.
 * BVH occlusion and label rendering are deliberately not invoked during slides.
 */
export const LIVE_CAROUSEL_DURATION_MS = 560;
export const slideEase = t => {
  const x = Math.max(0, Math.min(1, t));
  return x < 0.5 ? 4*x*x*x : 1-Math.pow(-2*x+2,3)/2;
};

/** Render two entire live 3D scenes into adjacent sliding scissor viewports.
 * The clone contains THREE.Object3D nodes only; BufferGeometry, textures,
 * materials and programs are shared rather than reloaded or duplicated.
 */
export function createLiveChapterCarousel({THREE,scene,camera,renderer,stage,direction,durationMs=LIVE_CAROUSEL_DURATION_MS}){
  if(!THREE || !scene || !camera || !renderer || !stage || Math.abs(direction)!==1) return null;
  const canvas = renderer.domElement;
  const box = canvas?.getBoundingClientRect?.();
  if(!canvas || !box || box.width < 24 || box.height < 24 || typeof scene.clone!=='function')return null;
  if(!renderer.getContext?.() || typeof renderer.setScissor!=='function' || typeof renderer.setViewport!=='function')return null;
  // The outgoing scene is a frozen *pose*, not a bitmap. It is re-rendered with
  // the original lights/materials every frame using the exact same renderer.
  const outgoing = scene.clone(true);
  outgoing.background = null;
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
  };
  const markers=document.getElementById('label-markers');
  const leaders=document.getElementById('label-lines');
  const labels=[markers,leaders].filter(Boolean).map(el=>({el,visibility:el.style.visibility}));
  // Screen-space labels are intentionally hidden during the 560ms motion, then
  // restored; BVH raycasts never run for the temporary outgoing scene.
  for(const entry of labels)entry.el.style.visibility='hidden';
  canvas.style.pointerEvents='none';
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
    for(const entry of labels)entry.el.style.visibility=entry.visibility;
    pendingResolve?.();pendingResolve=null;
    // Never dispose shared materials/geometries; the original scene owns them.
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
        if(document.hidden || durationMs<=0){drawLive(incomingScene,incomingCamera,1);return;}
        await new Promise(resolve=>{
          pendingResolve=resolve;
          let started=null;
          const frame=time=>{
            animationId=null;
            if(removed){resolve();return;}
            if(document.hidden){drawLive(incomingScene,incomingCamera,1);resolve();return;}
            if(started===null)started=time;
            const p=Math.min(1,(time-started)/durationMs);
            try{drawLive(incomingScene,incomingCamera,p);}
            catch(error){console.warn('AnatomIQ live carousel render failed',error);resolve();return;}
            if(p>=1){resolve();return;}
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
