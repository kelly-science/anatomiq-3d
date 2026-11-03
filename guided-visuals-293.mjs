/* AnatomIQ 2.2.85 — transient student activity presentation only.
 * The overlay never replaces an anatomy mesh material or changes lesson/answer data.
 * Works without a backend; honors prefers-reduced-motion.
 */
export function createGuidedVisuals(doc=document) {
  let canvas=null, ring=null, move=null, leave=null, down=null;
  let entering=null;
  let scalpelCanvas=null; // ANATOMIQ_DISSECT_SCALPEL_295
  // ANATOMIQ_FULLSCREEN_CERTIFICATE_305: fullscreen establishes a top-layer subtree.
  // A ring appended to body cannot appear above a fullscreen viewer.
  function mountRing(){
    if(!canvas||!ring)return;
    const full=doc.fullscreenElement||doc.webkitFullscreenElement;
    const canvasFull=full===canvas;
    canvas.classList.toggle('anat305-fullscreen-canvas',canvasFull);
    const host=full && !canvasFull && full.contains?.(canvas) ? full : doc.body;
    if(ring.parentNode!==host)host.appendChild(ring);
    ring.classList.toggle('anat305-fullscreen-ring',host!==doc.body);
    ring.hidden=true;
  }
  function cursor(on, target, scalpelOn=false) {
    // Only the actual 3D canvas receives the scalpel; all other UI stays normal.
    // Always remove the old cursor before returning to hotspot or normal mode.
    if(scalpelCanvas && (scalpelCanvas!==target || !scalpelOn || on)) {
      scalpelCanvas.classList.remove('anat295-scalpel-armed');
      scalpelCanvas=null;
    }
    if(scalpelOn && !on && target) {
      target.classList.add('anat295-scalpel-armed');
      scalpelCanvas=target;
    }
    if (on && target===canvas && ring) {mountRing();return;}
    if (canvas) {
      canvas.classList.remove('anat293-hotspot-armed','anat305-fullscreen-canvas');
      canvas.removeEventListener('pointermove',move);
      canvas.removeEventListener('pointerleave',leave);
      canvas.removeEventListener('pointerdown',down);
    }
    doc.removeEventListener('fullscreenchange',mountRing);
     doc.removeEventListener('webkitfullscreenchange',mountRing);
     ring?.remove();ring=null;canvas=null;move=null;leave=null;down=null;
    if (!on || !target) return;
    canvas=target;
    ring=doc.createElement('div');
    ring.className='anat293-hotspot-ring';
    ring.setAttribute('aria-hidden','true');
    ring.hidden=true;
    mountRing();
    doc.addEventListener('fullscreenchange',mountRing);
    doc.addEventListener('webkitfullscreenchange',mountRing);
    move=e=>{
      ring.style.left=e.clientX+'px';ring.style.top=e.clientY+'px';
      ring.hidden=false;
    };
    leave=()=>{ring.hidden=true;};
    down=e=>move(e);
    canvas.addEventListener('pointermove',move);
    canvas.addEventListener('pointerleave',leave);
    canvas.addEventListener('pointerdown',down);
    canvas.classList.add('anat293-hotspot-armed');
  }
  function exit(root) {
    if (!root) return;
    root.classList.remove('anat293-card-entering');
    root.classList.add('anat293-card-exiting');
  }
  function enter(root) {
    if (!root) return;
    root.classList.remove('anat293-card-entering');
    root.classList.remove('anat293-card-exiting');
    // Force a distinct animation start even when the same panel is reused.
    void root.offsetWidth;
    root.classList.add('anat293-card-entering');
    if (entering?.root) entering.root.removeEventListener('animationend',entering.end);
    const end=e=>{
      if(e.target!==root)return;
      root.classList.remove('anat293-card-entering');
      if(entering?.root===root)entering=null;
      root.removeEventListener('animationend',end);
    };
    entering={root,end};
    root.addEventListener('animationend',end);
  }
  function reset(root) {
    cursor(false);
    if(entering?.root)entering.root.removeEventListener('animationend',entering.end);
    entering=null;
    root?.classList.remove('anat293-card-exiting','anat293-card-entering');
  }
  return {cursor,exit,enter,reset};
}

// Returns flash and clear actions. Mesh geometry is shared, not cloned/disposed;
// only the temporary material and child mesh are created and cleaned up.
export const GUIDED_FEEDBACK_TIMINGS_313 = Object.freeze({greenMs:1400,redMs:1600,fadeInMs:150,fadeOutMs:250}); // ANATOMIQ_GUIDED_FEEDBACK_313
export const GUIDED_FEEDBACK_PRIORITY_314 = Object.freeze({outgoingFadeMs:150}); // ANATOMIQ_GUIDED_PRIORITY_314
export function createGuidedFlasher(THREE, getMesh, redraw=()=>{}, win=window) { // ANATOMIQ_GUIDED_PRIORITY_314
  // At most one *outgoing* overlay plus the newest full-length overlay.
  // Previously outgoing overlays are disposed on a subsequent click to avoid pileups.
  const flashes=new Set();
  const timing=GUIDED_FEEDBACK_TIMINGS_313;
  const priority=GUIDED_FEEDBACK_PRIORITY_314;
  const clock=()=>win.performance?.now?.()??Date.now();
  function clear(){for(const f of [...flashes])f.dispose();}
  function flash(index,correct){
    if(!Number.isInteger(index))return false;
    const source=getMesh(index);
    if(!source?.geometry||!source.visible||!source.add)return false;
    const started=clock();
    // Evaluate clicks before changing visuals. An invalid pick must not cancel a valid cue.
    for(const f of [...flashes]){
      if(f.retiring||f.source===source)f.dispose(); // No stacked red/green on the same bone.
      else f.retire(started);
    }
    const material=new THREE.MeshBasicMaterial({
      color:correct?0x4edfa5:0xf25e64,transparent:true,opacity:0,
      depthWrite:false,depthTest:true,side:THREE.DoubleSide,
      polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,
      toneMapped:false
    });
    const glow=new THREE.Mesh(source.geometry,material);
    glow.name='AnatomIQ transient activity feedback';
    glow.raycast=()=>{};
    glow.renderOrder=(source.renderOrder||0)+1;
    glow.scale.setScalar(1.002);
    source.add(glow);
    const duration=correct?timing.greenMs:timing.redMs;
    let frame=null,holdTimer=null,dead=false,retiring=false,retireStarted=0,retireOpacity=0;
    const state={source,dispose,retire,get retiring(){return retiring;}};
    flashes.add(state);
    function stopScheduled(){
      if(frame!==null)win.cancelAnimationFrame?.(frame);
      if(holdTimer!==null)win.clearTimeout(holdTimer);
      frame=null;holdTimer=null;
    }
    function dispose(){
      if(dead)return;
      dead=true;
      stopScheduled();
      source.remove(glow);
      material.dispose();
      flashes.delete(state);
      redraw();
    }
    function normalOpacity(at){
      const elapsed=Math.max(0,at-started);
      if(elapsed>=duration)return 0;
      if(elapsed<timing.fadeInMs)return .64*Math.min(1,elapsed/timing.fadeInMs);
      if(elapsed<duration-timing.fadeOutMs)return .64;
      return .64*Math.max(0,(duration-elapsed)/timing.fadeOutMs);
    }
    function retire(at){
      if(dead||retiring)return;
      stopScheduled(); // Wake from the prior static hold, if any.
      retiring=true;
      retireStarted=at;
      // Compute exact present intensity, even between animation frames.
      retireOpacity=Math.min(.64,Math.max(0,normalOpacity(at)));
      if(retireOpacity<=0){dispose();return;}
      material.opacity=retireOpacity;
      redraw();
      frame=win.requestAnimationFrame(tick);
    }
    const tick=at=>{
      if(dead)return;
      frame=null;
      if(retiring){
        const elapsed=Math.max(0,at-retireStarted);
        if(elapsed>=priority.outgoingFadeMs){dispose();return;}
        material.opacity=retireOpacity*(1-elapsed/priority.outgoingFadeMs);
        redraw();
        frame=win.requestAnimationFrame(tick);
        return;
      }
      const elapsed=Math.max(0,at-started);
      if(elapsed>=duration){dispose();return;}
      if(elapsed<timing.fadeInMs){
        material.opacity=.64*Math.min(1,elapsed/timing.fadeInMs);
      }else if(elapsed<duration-timing.fadeOutMs){
        material.opacity=.64;
        redraw();
        // No frame loop while held steady. A new click can interrupt this timer.
        holdTimer=win.setTimeout(()=>{
          holdTimer=null;
          if(!dead&&!retiring)frame=win.requestAnimationFrame(tick);
        },Math.max(0,duration-timing.fadeOutMs-elapsed));
        return;
      }else{
        material.opacity=.64*Math.max(0,(duration-elapsed)/timing.fadeOutMs);
      }
      redraw();
      frame=win.requestAnimationFrame(tick);
    };
    redraw();
    frame=win.requestAnimationFrame(tick);
    return true;
  }
  return {flash,clear};
}
