/* AnatomIQ 2.2.34 — size the lesson chapter strip to the actual unified toolbar.
   Presentation-only; no chapter, anatomy, camera or permission state is modified. */
(() => {
  'use strict';
  function initialize() {
    const nav = document.getElementById('chapter-nav');
    const viewer = nav?.closest('.viewer-panel');
    const host = viewer?.querySelector('.viewer-bottom');
    if (!nav || !viewer || !host || nav.dataset.anatWidthSync234 === 'true') return;
    nav.dataset.anatWidthSync234 = 'true';
    let currentToolbar = null;
    let frame = 0;
    let lastWidth = null;
    const observer = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => queueMeasure()) : null;

    function measure() {
      frame = 0;
      if (!currentToolbar || !currentToolbar.isConnected) return;
      const width = currentToolbar.getBoundingClientRect().width;
      if (!Number.isFinite(width) || width < 30) return;
      // Preserve toolbar's measured CSS pixel width, including zoom/device scaling.
      const nextWidth = `${Math.round(width * 10) / 10}px`;
      if (nextWidth !== lastWidth) {
        nav.style.setProperty('--anat-chapter-toolbar-width', nextWidth);
        lastWidth = nextWidth;
      }
    }
    function queueMeasure() {
      if (!frame) frame = requestAnimationFrame(measure);
    }
    function findToolbar() {
      const found = host.querySelector('.anat-unified-toolbar');
      if (found !== currentToolbar) {
        if (observer && currentToolbar) observer.unobserve(currentToolbar);
        currentToolbar = found;
        if (observer && found) observer.observe(found);
        lastWidth = null;
      }
      queueMeasure();
    }
    // The unified toolbar may be inserted after this defer script runs.
    const mutation = new MutationObserver(findToolbar);
    mutation.observe(host, {childList: true, subtree: true});
    window.addEventListener('resize', queueMeasure, {passive: true});
    document.addEventListener('fullscreenchange', queueMeasure);
    document.addEventListener('webkitfullscreenchange', queueMeasure);
    findToolbar();
    // Safe diagnostic for comparing the two bars without reading lesson contents.
    window.__AnatomIQChapterBarWidth234 = () => ({
      chapterWidth: nav.getBoundingClientRect().width,
      toolbarWidth: currentToolbar?.getBoundingClientRect().width ?? null,
      tabsScrollable: (() => {
        const tabs = document.getElementById('chapter-tabs');
        return !!tabs && tabs.scrollWidth > tabs.clientWidth + 1;
      })()
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, {once: true});
  else initialize();
})();
