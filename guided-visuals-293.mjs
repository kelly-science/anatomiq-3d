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
export function createGuidedFlasher(THREE, getMesh, redraw=()=>{}, win=window) {
  const flashes=new Set();
  function clear() {for(const f of [...flashes])f.dispose();}
  function flash(index, correct) {
    if(!Number.isInteger(index))return false;
    const source=getMesh(index);
    if(!source?.geometry||!source.visible||!source.add)return false;
    for(const f of [...flashes])if(f.source===source)f.dispose();
    const material=new THREE.MeshBasicMaterial({
      color:correct?0x4edfa5:0xf25e64,transparent:true,opacity:.64,
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
    const duration=correct?690:730;
    const started=win.performance?.now?.()??Date.now();
    let frame=null,dead=false;
    const state={source,dispose};flashes.add(state);
    function dispose() {
      if(dead)return;
      dead=true;
      if(frame!==null)win.cancelAnimationFrame?.(frame);
      source.remove(glow);
      material.dispose();
      flashes.delete(state);
      redraw();
    }
    const tick=now=>{
      if(dead)return;
      const progress=Math.max(0,Math.min(1,(now-started)/duration));
      material.opacity=.64*(1-progress)*(1-progress*.20);
      redraw();
      if(progress>=1){dispose();return;}
      frame=win.requestAnimationFrame(tick);
    };
    redraw();
    frame=win.requestAnimationFrame(tick);
    return true;
  }
  return {flash,clear};
}
