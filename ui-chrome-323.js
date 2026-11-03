/* ANATOMIQ_UI_CHROME_323
 * Repairs label/control overlap and adds animated lower-right notifications.
 * Observes the existing toast element: no changes to app.js or Guided Lessons.
 */
(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const panel = $('.viewer-panel');
  const toolbar = panel?.querySelector('.viewer-bottom');
  const chapterBar = panel?.querySelector('#chapter-nav');
  const toast = $('#app-toast');
  if (!panel || !toolbar || !toast) return;

  // Reserve the actual occupied height of visible lower controls. The label
  // overlay and its leader-line SVG share the same clipping region.
  let pendingMeasure = false;
  function measureLowerControls() {
    pendingMeasure = false;
    const bottom = panel.getBoundingClientRect().bottom;
    let top = bottom;
    for (const node of [toolbar, chapterBar]) {
      if (!node || !node.getClientRects().length) continue;
      const rect = node.getBoundingClientRect();
      if (rect.height > 0 && rect.width > 0) top = Math.min(top, rect.top);
    }
    const pixels = Math.max(0, Math.min(panel.clientHeight, Math.ceil(bottom - top + (top < bottom ? 10 : 0))));
    panel.style.setProperty('--anat-label-bottom-clearance', `${pixels}px`);
  }
  function scheduleMeasure() {
    if (pendingMeasure) return;
    pendingMeasure = true;
    requestAnimationFrame(measureLowerControls);
  }
  scheduleMeasure();
  window.addEventListener('resize', scheduleMeasure, { passive: true });
  document.addEventListener('fullscreenchange', scheduleMeasure);
  document.addEventListener('webkitfullscreenchange', scheduleMeasure);
  if ('ResizeObserver' in window) {
    const sizeObserver = new ResizeObserver(scheduleMeasure);
    for (const node of [panel, toolbar, chapterBar]) if (node) sizeObserver.observe(node);
  }
  if (chapterBar) {
    new MutationObserver(scheduleMeasure).observe(chapterBar, { attributes: true, attributeFilter: ['hidden', 'style', 'class'] });
  }

  // The fullscreen API only displays descendants of its fullscreen element.
  // Move the existing single toast node there, and restore it on exit.
  function syncToastParent() {
    const target = document.fullscreenElement || document.webkitFullscreenElement || document.body;
    if (toast.parentElement !== target) target.appendChild(toast);
  }
  document.addEventListener('fullscreenchange', syncToastParent);
  document.addEventListener('webkitfullscreenchange', syncToastParent);
  syncToastParent();

  // Existing showToast() updates textContent and sets hidden=false, then sets
  // hidden=true after 3200ms. Convert that final hide to an exit animation.
  // This keeps compatibility with every caller of showToast()/api.notify().
  let finishing = false;
  let exitTimer = 0;
  let hadVisibleToast = false;
  function enter() {
    clearTimeout(exitTimer);
    if (toast.hidden) return;
    syncToastParent();
    toast.classList.remove('anat323-toast-in', 'anat323-toast-out');
    // Flush the offscreen state so both the first and subsequent alerts slide.
    void toast.offsetWidth;
    toast.classList.add('anat323-toast-in');
    hadVisibleToast = true;
  }
  function beginExit() {
    if (finishing || !hadVisibleToast) return;
    // Undo the original abrupt hidden=true before the next paint.
    toast.hidden = false;
    toast.classList.remove('anat323-toast-in');
    toast.classList.add('anat323-toast-out');
    clearTimeout(exitTimer);
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    exitTimer = window.setTimeout(() => {
      finishing = true;
      hadVisibleToast = false;
      toast.classList.remove('anat323-toast-out');
      toast.hidden = true;
      // MutationObserver callbacks run in a microtask after this stack.
      queueMicrotask(() => { finishing = false; });
    }, reduced ? 0 : 320);
  }
  const toastObserver = new MutationObserver((records) => {
    if (finishing) return;
    if (toast.hidden) {
      beginExit();
      return;
    }
    // The hidden=false written by beginExit is not a fresh notification.
    if (toast.classList.contains('anat323-toast-out') &&
        !records.some(item => item.type === 'childList' || item.type === 'characterData')) return;
    if (records.some(item => item.type === 'childList' || item.type === 'characterData' ||
      (item.type === 'attributes' && item.attributeName === 'hidden'))) enter();
  });
  toastObserver.observe(toast, { attributes: true, attributeFilter: ['hidden'], childList: true, characterData: true, subtree: true });
  if (!toast.hidden) enter();
})();
