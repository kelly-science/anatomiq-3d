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
// ANATOMIQ_PERSISTENT_IDENTIFY_329 — temporary per-question highlights, not bone materials.
// Keep this module instance shared with app.js by importing the IDENTICAL versioned URL.
let activeIdentifyHold329 = null;
export function holdIdentifyHighlight329(index) {
  return activeIdentifyHold329?.hold(index) === true;
}
export function releaseIdentifyHighlights329(delayMs = 1150) {
  activeIdentifyHold329?.release(delayMs);
}

// ANATOMIQ_WHOLE_STRUCTURE_FEEDBACK_330
// Full-surface Guided Identify feedback: tint the source material, never draw
// a coincident second copy of its triangles. This avoids depth interference
// on irregular skull bones while preserving normal occlusion by other bones.
export function createGuidedFlasher(THREE, getMesh, redraw=()=>{}, win=window) {
  const flashes=new Set();
  const heldIdentify329=new Map();
  const timing=GUIDED_FEEDBACK_TIMINGS_313;
  const priority=GUIDED_FEEDBACK_PRIORITY_314;
  const clock=()=>win.performance?.now?.()??Date.now();
  let heldReleaseTimer329=null;

  // Temporary material assignment is per bone, never per original material.
  // Multiple bones can share a source material; sharing the replacement would
  // recolor unrelated anatomy. Do not dispose any source material or geometry.
  function tintSource330(source, hex) {
    if (!source?.geometry||!source.visible||!source.material) return null;
    const original=source.material;
    const originalList=Array.isArray(original)?original:[original];
    if (!originalList.length||originalList.some(m=>!m)) return null;
    const target=new THREE.Color(hex);
    const copies=[];
    const values=[];
    try {
      for (const base of originalList) {
        const copy=base.clone?.()||new THREE.MeshBasicMaterial({color:hex});
        const originalColor=base.color?.clone?.()||new THREE.Color(0xffffff);
        const originalEmissive=base.emissive?.clone?.()||null;
        // Remove per-vertex/texture multipliers that caused patchy feedback.
        for(const key of ['map','alphaMap','emissiveMap','aoMap'])if(key in copy)copy[key]=null;
        if('vertexColors' in copy)copy.vertexColors=false;
        if('alphaTest' in copy)copy.alphaTest=0;
        if('alphaHash' in copy)copy.alphaHash=false;
        if('transmission' in copy)copy.transmission=0;
        copy.transparent=false;
        copy.opacity=1;
        copy.depthTest=true;
        copy.depthWrite=true;
        copy.side=THREE.DoubleSide;
        copy.polygonOffset=false;
        if('toneMapped' in copy)copy.toneMapped=false;
        copy.needsUpdate=true;
        copies.push(copy);
        values.push({copy,originalColor,originalEmissive,
          originalEmissiveIntensity: Number(base.emissiveIntensity)||0});
      }
    }catch(error){for(const m of copies)m.dispose?.();throw error;}
    const assignment=Array.isArray(original)?copies:copies[0];
    source.material=assignment;
    let disposed=false;
    const setIntensity=value=>{
      if(disposed)return;
      const v=Math.min(1,Math.max(0,Number.isFinite(value)?value:0));
      for(const state of values){
        const mat=state.copy;
        if(mat.color?.copy&&mat.color?.lerp)mat.color.copy(state.originalColor).lerp(target,v);
        if(mat.emissive?.copy&&mat.emissive?.lerp){
          mat.emissive.copy(state.originalEmissive||new THREE.Color(0x000000)).lerp(target,v);
          mat.emissiveIntensity=state.originalEmissiveIntensity*(1-v)+0.4*v;
        }
      }
    };
    // Initialize before the first draw, preventing a white flash.
    setIntensity(0);
    return {source,assignment,setIntensity,dispose(){
      if(disposed)return;
      disposed=true;
      // If another controller replaced the material meanwhile, respect it.
      if(source.material===assignment)source.material=original;
      for(const m of copies)m.dispose?.();
      redraw();
    }};
  }

  function dropHeld329(index){
    const entry=heldIdentify329.get(index);
    if(!entry)return;
    heldIdentify329.delete(index);
    if(entry.frame!==null)win.cancelAnimationFrame?.(entry.frame);
    entry.tint.dispose();
  }
  function clearHeld329(){
    if(heldReleaseTimer329!==null){win.clearTimeout(heldReleaseTimer329);heldReleaseTimer329=null;}
    for(const index of [...heldIdentify329.keys()])dropHeld329(index);
  }
  function clear(){for(const f of [...flashes])f.dispose();clearHeld329();}

  function hold329(index){
    if(!Number.isInteger(index)||index<0)return false;
    if(heldIdentify329.has(index))return true;
    const source=getMesh(index);
    if(!source?.geometry||!source.visible||!source.material)return false;
    for(const f of [...flashes])if(f.source===source)f.dispose();
    const tint=tintSource330(source,0x4edfa5);
    if(!tint)return false;
    const entry={source,tint,frame:null};
    heldIdentify329.set(index,entry);
    const started=clock();
    const tick=at=>{
      if(heldIdentify329.get(index)!==entry)return;
      entry.frame=null;
      const ratio=Math.max(0,Math.min(1,(at-started)/timing.fadeInMs));
      tint.setIntensity(ratio);
      redraw();
      if(ratio<1)entry.frame=win.requestAnimationFrame(tick);
    };
    redraw();entry.frame=win.requestAnimationFrame(tick);
    return true;
  }
  function releaseHeld329(delayMs=1150){
    if(heldReleaseTimer329!==null)win.clearTimeout(heldReleaseTimer329);
    const delay=Number.isFinite(delayMs)?Math.max(0,Math.min(3000,delayMs)):1150;
    heldReleaseTimer329=win.setTimeout(()=>{
      heldReleaseTimer329=null;
      const started=clock();
      for(const entry of heldIdentify329.values()){
        if(entry.frame!==null)win.cancelAnimationFrame?.(entry.frame);
        entry.frame=null;
      }
      const fade=at=>{
        const ratio=Math.max(0,Math.min(1,(at-started)/timing.fadeOutMs));
        for(const entry of heldIdentify329.values())entry.tint.setIntensity(1-ratio);
        redraw();
        if(ratio>=1){for(const index of [...heldIdentify329.keys()])dropHeld329(index);}
        else{
          const first=heldIdentify329.values().next().value;
          if(first)first.frame=win.requestAnimationFrame(fade);
        }
      };
      if(heldIdentify329.size)fade(started);
    },delay);
  }
  activeIdentifyHold329={hold:hold329,release:releaseHeld329,clear:clearHeld329};

  function flash(index,correct){
    if(!Number.isInteger(index))return false;
    const source=getMesh(index);
    if(!source?.geometry||!source.visible||!source.material)return false;
    const started=clock();
    // Preserve 314 latest-click priority and its 150 ms outgoing fade.
    for(const f of [...flashes]){
      if(f.retiring||f.source===source)f.dispose();
      else f.retire(started);
    }
    // A new cue for the same bone replaces a persistent hold safely.
    for(const [id,entry] of heldIdentify329)if(entry.source===source)dropHeld329(id);
    const tint=tintSource330(source,correct?0x4edfa5:0xf25e64);
    if(!tint)return false;
    const duration=correct?timing.greenMs:timing.redMs;
    let frame=null,holdTimer=null,dead=false,retiring=false,retireStarted=0,retireIntensity=0;
    const state={source,dispose,retire,get retiring(){return retiring;}};
    flashes.add(state);
    function stopScheduled(){
      if(frame!==null)win.cancelAnimationFrame?.(frame);
      if(holdTimer!==null)win.clearTimeout(holdTimer);
      frame=null;holdTimer=null;
    }
    function dispose(){
      if(dead)return;
      dead=true;stopScheduled();tint.dispose();flashes.delete(state);
    }
    function normalIntensity(at){
      const elapsed=Math.max(0,at-started);
      if(elapsed>=duration)return 0;
      if(elapsed<timing.fadeInMs)return Math.min(1,elapsed/timing.fadeInMs);
      if(elapsed<duration-timing.fadeOutMs)return 1;
      return Math.max(0,(duration-elapsed)/timing.fadeOutMs);
    }
    function retire(at){
      if(dead||retiring)return;
      stopScheduled();retiring=true;retireStarted=at;
      retireIntensity=Math.min(1,Math.max(0,normalIntensity(at)));
      if(retireIntensity<=0){dispose();return;}
      tint.setIntensity(retireIntensity);redraw();
      frame=win.requestAnimationFrame(tick);
    }
    const tick=at=>{
      if(dead)return;
      frame=null;
      if(retiring){
        const elapsed=Math.max(0,at-retireStarted);
        if(elapsed>=priority.outgoingFadeMs){dispose();return;}
        tint.setIntensity(retireIntensity*(1-elapsed/priority.outgoingFadeMs));
        redraw();frame=win.requestAnimationFrame(tick);return;
      }
      const elapsed=Math.max(0,at-started);
      if(elapsed>=duration){dispose();return;}
      if(elapsed<timing.fadeInMs){
        tint.setIntensity(Math.min(1,elapsed/timing.fadeInMs));
      }else if(elapsed<duration-timing.fadeOutMs){
        tint.setIntensity(1);redraw();
        // Keep Chromebooks idle during the steady hold.
        holdTimer=win.setTimeout(()=>{
          holdTimer=null;
          if(!dead&&!retiring)frame=win.requestAnimationFrame(tick);
        },Math.max(0,duration-timing.fadeOutMs-elapsed));
        return;
      }else tint.setIntensity(Math.max(0,(duration-elapsed)/timing.fadeOutMs));
      redraw();frame=win.requestAnimationFrame(tick);
    };
    redraw();frame=win.requestAnimationFrame(tick);
    return true;
  }
  return {flash,clear};
}
