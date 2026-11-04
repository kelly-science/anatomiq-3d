/* ANATOMIQ_MENU_CLEANUP_327
 * 2.2.113: Remove legacy visual quality controls, retain their native select
 * for 326's functional quality flyout, rename App Settings -> Advanced Settings.
 * Safe with dynamic teacher/student menu rebuilds.
 */
(() => {
  'use strict';
  if (window.AnatomIQMenuCleanup327) return;
  const QUALITY = /^(?:3d\s+)?(?:rendering\s+)?quality(?:\s*[:›»▸⌄▼]+)?$/i;
  const QUALITY_IDENT = /(?:\b3d\b[^\n]{0,45}\bquality\b|\brender(?:ing|er)?\b[^\n]{0,45}\bquality\b|^quality$|\bquality\s*(?:preset|mode)\b)/i;
  const APP = /^\s*App\s+Settings(?:\s*(?:\.{3}|…))?\s*$/i;
  const NAVS = ['studio-menubar', 'anat-student-menubar'];
  const MENU_IDS = ['menu-settings', 'anat-student-menu-settings', 'menu-view', 'anat-student-menu-view'];
  const hooked = new WeakSet();
  let queued = false;
  let busy = false;

  function norm(value) {
    return String(value || '').replace(/[✓✔⚙️›»▸]/g, '').replace(/\s+/g, ' ').trim();
  }
  function isNewFlyout(el) {
    return !!el.closest('[data-anat326-trigger], #anat326-flyout');
  }
  function isLegacyQualityLabel(value) {
    return QUALITY.test(norm(value));
  }
  function hide(el) {
    if (!el || isNewFlyout(el)) return false;
    if (el.dataset.anat327HiddenQuality === 'true') return false;
    el.dataset.anat327HiddenQuality = 'true';
    el.hidden = true;
    return true;
  }
  function hasWorkingFlyout() {
    const api = window.AnatomIQSettingsFlyouts326;
    if (typeof api?.qualityOptions !== 'function') return false;
    try { return api.qualityOptions().length > 0; }
    catch (_) { return false; }
  }
  function isQualitySelect(select) {
    if (isNewFlyout(select)) return false;
    const labels = [...(select.labels || [])].map(label => label.textContent).join(' ');
    const attrs = [select.id, select.name, select.getAttribute('aria-label'),
      select.getAttribute('title'), labels].filter(Boolean).join(' ');
    return QUALITY_IDENT.test(attrs);
  }
  function legacyRowFor(select) {
    // Remove a single-purpose form row, but NEVER a dialog or a container holding
    // the Motion Blur / DOF controls. The actual <select> remains in the DOM.
    let node = select.parentElement;
    for (let depth = 0; depth < 3 && node; depth++, node = node.parentElement) {
      if (node.matches('.menu-dropdown, .menu-group, dialog, form, section, nav, body') ||
          node.id === 'app-settings' || node.id === 'anat-student-menu-settings' ||
          node.id === 'menu-settings') break;
      if (node.querySelector('[data-anat326-trigger]')) break;
      const selects = node.querySelectorAll('select');
      const otherInputs = node.querySelectorAll('input, textarea, button');
      const content = norm(node.textContent);
      const singlePurpose = selects.length === 1 && otherInputs.length === 0 &&
        content.length <= 100 && (QUALITY_IDENT.test(content) ||
          [...node.querySelectorAll('label')].some(l => QUALITY_IDENT.test(norm(l.textContent))));
      if (singlePurpose) return node;
    }
    return select;
  }
  function hideLegacyQuality() {
    if (!hasWorkingFlyout()) return;
    // If 326 hasn't created BOTH views' flyouts, leave the legacy source UI
    // visible rather than removing the only functional quality control.
    for (const group of [['menu-settings', 'menu-view'], ['anat-student-menu-settings', 'anat-student-menu-view']]) {
      if (!group.some(id => document.getElementById(id)?.querySelector('[data-anat326-trigger="quality"]'))) return;
    }
    // The 326-quality flyout is the sole visible menu entry. Keep its source
    // controls alive, even when they are hidden from both views.
    for (const menuId of MENU_IDS) {
      const root = document.getElementById(menuId);
      if (!root) continue;
      for (const item of root.querySelectorAll('button, a, [role="menuitem"], .menu-item')) {
        if (isNewFlyout(item) || item.closest('[data-anat327-hidden-quality]')) continue;
        if (isLegacyQualityLabel(item.textContent)) hide(item);
      }
      for (const child of root.children) {
        if (isNewFlyout(child) || child.querySelector?.('[data-anat326-trigger]')) continue;
        // Covers menu rows wrapped as a <div> rather than a direct <button>.
        if (isLegacyQualityLabel(child.textContent) &&
            !child.querySelector?.('button:not([data-anat327-hidden-quality]), a:not([data-anat327-hidden-quality])')) {
          hide(child);
        }
      }
    }
    for (const select of document.querySelectorAll('select')) {
      if (!isQualitySelect(select)) continue;
      const row = legacyRowFor(select);
      hide(row);
      if (row === select) for (const label of select.labels || []) hide(label);
    }
  }
  function renameTextNode(node) {
    if (node.nodeType !== Node.TEXT_NODE) return;
    const original = node.nodeValue || '';
    if (APP.test(norm(original))) node.nodeValue = original.replace(/App\s+Settings/i, 'Advanced Settings');
  }
  function renameAppSettings() {
    // Only exact UI labels, not instructions, report content, or settings keys.
    const selectors = 'button, a, [role="menuitem"], .menu-item, h1, h2, h3, [role="heading"], label';
    for (const el of document.querySelectorAll(selectors)) {
      const label = norm(el.textContent);
      if (!APP.test(label)) continue;
      // Change only the text nodes, preserving icons, listeners, and child controls.
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      while (walk.nextNode()) renameTextNode(walk.currentNode);
      for (const attr of ['aria-label', 'title']) {
        const value = el.getAttribute(attr);
        if (value && APP.test(value)) el.setAttribute(attr, 'Advanced Settings');
      }
    }
  }
  function upgrade() {
    if (busy) return;
    busy = true;
    try { hideLegacyQuality(); renameAppSettings(); hookMenus(); }
    finally { busy = false; }
  }
  function schedule() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; upgrade(); });
  }
  function hookMenus() {
    for (const id of [...NAVS, ...MENU_IDS]) {
      const el = document.getElementById(id);
      if (!el || hooked.has(el)) continue;
      hooked.add(el);
      new MutationObserver(schedule).observe(el, { childList: true, subtree: true });
    }
  }
  function install() {
    upgrade();
    // Modest root watch detects menus appended as direct children, without
    // observing the continually updating 3D labels and scene subtree.
    if (document.body) new MutationObserver(schedule).observe(document.body, { childList: true });
    document.addEventListener('pointerdown', e => {
      if (e.target.closest?.('.menu-trigger, [data-menu="settings"], #menu-settings, #anat-student-menu-settings'))
        schedule();
    }, true);
    document.addEventListener('focusin', e => {
      if (e.target.closest?.('.menu-trigger, .menu-dropdown')) schedule();
    }, true);
    window.AnatomIQMenuCleanup327 = Object.freeze({ upgrade, hideLegacyQuality, renameAppSettings });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
