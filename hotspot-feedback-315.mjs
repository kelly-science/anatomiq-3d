/* ANATOMIQ_HOTSPOT_MOTION_315 — student Hotspot feedback only.
 * Existing green/red colors and camera-facing glyphs retained.
 * 316: markers use a constant CSS-pixel diameter at any camera distance.
 * No score, persistence, target selection, teacher marker or chapter visibility changes.
 */
export const HOTSPOT_GLYPH_TIMINGS_315 = Object.freeze({
  greenMs: 1400, redMs: 1600, appearMs: 150,
  greenDrawMs: 300, redDrawMs: 250, fadeOutMs: 250,
  outgoingMs: 150, popMs: 200
});


/** Screen-space sprite quad width in CSS pixels (the drawn circle is 76/96 of this). */
export const HOTSPOT_GLYPH_SCREEN_PX_316 = 48;

/**
 * Convert CSS pixels to sprite world units using the actual projection matrix.
 * Perspective uses camera-space depth (not Euclidean distance), avoiding
 * apparent size changes for points away from the center of the screen.
 * Orthographic cameras do not depend on depth. Device pixel ratio is omitted
 * deliberately: viewportHeight is the canvas's *CSS* height.
 */
export function hotspotGlyphWorldSize(camera, point, viewportHeight, cssPixels = HOTSPOT_GLYPH_SCREEN_PX_316) {
  const height = Number(viewportHeight);
  const yProjection = Math.abs(Number(camera?.projectionMatrix?.elements?.[5]));
  const pixels = Number(cssPixels);
  if (!(height > 0) || !(yProjection > 0) || !(pixels > 0) ||
      !Number.isFinite(height) || !Number.isFinite(yProjection) || !Number.isFinite(pixels)) return null;
  let depth = 1;
  if (camera.isPerspectiveCamera) {
    if (typeof camera.worldToLocal !== 'function' || typeof point?.clone !== 'function') return null;
    // worldToLocal updates the camera's world matrix after an OrbitControls move.
    depth = -camera.worldToLocal(point.clone()).z;
    if (!(depth > 0) || !Number.isFinite(depth)) return null;
  } else if (!camera.isOrthographicCamera) return null;
  const size = 2 * pixels * depth / (height * yProjection);
  return Number.isFinite(size) && size > 0 ? size : null;
}

const clamp = value => Math.min(1, Math.max(0, value));
const easeOutCubic = x => 1 - Math.pow(1 - clamp(x), 3);

/** Pure motion sampler. Duration is from *each* click, not from a shared queue. */
export function hotspotGlyphFrame(correct, elapsedMs, reducedMotion = false) {
  const t = Math.max(0, Number(elapsedMs) || 0);
  const timing = HOTSPOT_GLYPH_TIMINGS_315;
  const duration = correct ? timing.greenMs : timing.redMs;
  const done = t >= duration;
  if (reducedMotion) return { opacity: done ? 0 : 1, scale: 1, draw: 1, done };
  const opacity = done ? 0 : t < timing.appearMs ? clamp(t / timing.appearMs) :
    t < duration - timing.fadeOutMs ? 1 : clamp((duration - t) / timing.fadeOutMs);
  const draw = clamp((t - timing.appearMs) / (correct ? timing.greenDrawMs : timing.redDrawMs));
  let scale = 1;
  if (t < timing.popMs / 2) scale = .8 + .25 * easeOutCubic(t / (timing.popMs / 2));
  else if (t < timing.popMs) scale = 1.05 - .05 * easeOutCubic((t - timing.popMs / 2) / (timing.popMs / 2));
  return { opacity, scale, draw, done };
}

/** Draw the original glyph, progressively along its two line segments. */
export function drawHotspotGlyph(ctx, correct, progress = 1) {
  const p = clamp(progress);
  ctx.clearRect(0, 0, 96, 96);
  ctx.beginPath(); ctx.arc(48, 48, 38, 0, Math.PI * 2);
  ctx.fillStyle = correct ? '#098945' : '#cf2239'; ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.stroke();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 10;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const paths = correct ? [ [[26,48],[43,64],[71,32]] ] :
    [ [[32,32],[64,64]], [[64,32],[32,64]] ];
  const segments = [];
  for (const path of paths) for (let i = 1; i < path.length; i++) {
    const a = path[i-1], b = path[i];
    segments.push({ a, b, length: Math.hypot(b[0]-a[0], b[1]-a[1]) });
  }
  const fullLength = segments.reduce((sum, seg) => sum + seg.length, 0);
  let remaining = fullLength * p;
  for (const seg of segments) {
    if (remaining <= 0) break;
    const ratio = Math.min(1, remaining / seg.length);
    ctx.beginPath(); ctx.moveTo(seg.a[0], seg.a[1]);
    ctx.lineTo(seg.a[0] + (seg.b[0]-seg.a[0])*ratio,
               seg.a[1] + (seg.b[1]-seg.a[1])*ratio);
    ctx.stroke();
    remaining -= seg.length;
  }
}

/**
 * A new click wins immediately; the previous glyph retires in 150 ms.
 * Requests an animation frame only while something is visibly changing.
 */
export function createHotspotFeedbackController(THREE, scene, redraw = () => {}, doc = document, win = window, viewport = null) {
  const timing = HOTSPOT_GLYPH_TIMINGS_315;
  const reducedMotion = !!win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const clock = () => win.performance?.now?.() ?? Date.now();
  let active = null, outgoing = null;
  // The viewport is accessed lazily; camera and renderer are declared later in app.js.
  function applyScreenScale(entry) {
    if (!entry || entry.dead) return;
    const camera = viewport?.getCamera?.();
    const height = viewport?.getHeight?.();
    const worldSize = hotspotGlyphWorldSize(camera, entry.sprite.position, height);
    // A missing camera/viewport should not prevent feedback from displaying.
    const baseSize = worldSize ?? .025;
    const motionScale = entry.retiredAt === null ? entry.motionScale : entry.retiredScale;
    entry.sprite.scale.set(baseSize * motionScale, baseSize * motionScale, 1);
  }
  function syncScreenSize() {
    if (outgoing) applyScreenScale(outgoing);
    if (active) applyScreenScale(active);
  }
  const dispose = entry => {
    if (!entry || entry.dead) return;
    entry.dead = true;
    if (entry.frame !== null) win.cancelAnimationFrame?.(entry.frame);
    if (entry.timer !== null) win.clearTimeout(entry.timer);
    entry.sprite.parent?.remove(entry.sprite);
    entry.sprite.material?.map?.dispose();
    entry.sprite.material?.dispose();
    if (active === entry) active = null;
    if (outgoing === entry) outgoing = null;
    redraw();
  };
  function update(entry) {
    if (entry.dead) return;
    entry.frame = null; entry.timer = null;
    const now = clock();
    const elapsed = now - entry.started;
    const sampled = hotspotGlyphFrame(entry.correct, elapsed, reducedMotion);
    if (sampled.done) { dispose(entry); return; }
    let opacity = sampled.opacity;
    if (entry.retiredAt !== null) {
      const dt = Math.max(0, now - entry.retiredAt);
      if (dt >= timing.outgoingMs) { dispose(entry); return; }
      opacity = entry.retiredOpacity * (1 - dt / timing.outgoingMs);
    }
    if (entry.retiredAt === null && sampled.draw !== entry.lastDraw) {
      drawHotspotGlyph(entry.context, entry.correct, sampled.draw);
      entry.sprite.material.map.needsUpdate = true;
      entry.lastDraw = sampled.draw;
    }
    entry.sprite.material.opacity = opacity;
    entry.motionScale = sampled.scale;
    applyScreenScale(entry);
    redraw();
    const duration = entry.correct ? timing.greenMs : timing.redMs;
    const symbolDone = timing.appearMs + (entry.correct ? timing.greenDrawMs : timing.redDrawMs);
    const fadeStart = duration - timing.fadeOutMs;
    if (entry.retiredAt === null && elapsed >= symbolDone && elapsed < fadeStart && !reducedMotion) {
      // No WebGL redraws during the hold. Wake once for fade-out.
      entry.timer = win.setTimeout(() => update(entry), Math.max(0, fadeStart - elapsed));
    } else if (entry.retiredAt === null && reducedMotion && elapsed < duration) {
      entry.timer = win.setTimeout(() => update(entry), Math.max(0, duration - elapsed));
    } else {
      entry.frame = win.requestAnimationFrame(() => update(entry));
    }
  }
  function retire(entry) {
    if (!entry || entry.dead) return;
    if (entry.frame !== null) win.cancelAnimationFrame?.(entry.frame);
    if (entry.timer !== null) win.clearTimeout(entry.timer);
    entry.frame = entry.timer = null;
    entry.retiredAt = clock();
    entry.retiredOpacity = entry.sprite.material.opacity;
    entry.retiredScale = entry.motionScale;
    if (entry.retiredOpacity <= 0 || reducedMotion) { dispose(entry); return; }
    outgoing = entry;
    entry.frame = win.requestAnimationFrame(() => update(entry));
  }
  function show(point, correct) {
    if (!point?.clone) return false;
    const canvas = doc.createElement('canvas');
    canvas.width = canvas.height = 96;
    const context = canvas.getContext('2d');
    if (!context) return false;
    drawHotspotGlyph(context, !!correct, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture, transparent: true, opacity: 0, depthTest: false, depthWrite: false
    }));
    sprite.position.copy(point); sprite.renderOrder = 9999;
    const entry = {sprite, context, correct:!!correct, started:clock(), frame:null, timer:null,
      retiredAt:null, retiredOpacity:0, retiredScale:1, motionScale:1, lastDraw:-1, dead:false};
    if (outgoing) dispose(outgoing);
    if (active) retire(active);
    scene.add(sprite); active = entry;
    update(entry);
    return true;
  }
  function clearWrong() {
    if (outgoing && !outgoing.correct) dispose(outgoing);
    if (active && !active.correct) dispose(active);
  }
  function clear() {
    if (outgoing) dispose(outgoing);
    if (active) dispose(active);
  }
  return {show, clearWrong, clear, syncScreenSize};
}
