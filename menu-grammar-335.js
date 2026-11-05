/* ANATOMIQ_MENU_SENTENCE_CASE_335
 * UI-only grammar audit: sentence case for built-in menu commands in Teacher
 * Studio, Student View, and both floating flyout menus. Preserve user-authored
 * lesson/library names, acronyms, shortcuts, and existing event listeners.
 */
(() => {
  'use strict';
  if (window.AnatomIQMenuGrammar335) return;
  const MENU_BARS = ['studio-menubar', 'anat-student-menubar'];
  const PORTALS = ['anat324-flyout', 'anat326-flyout'];
  const ROOTS = [...MENU_BARS, ...PORTALS];
  const SELECTOR = [
    '.menu-dropdown .menu-item',
    '.menu-dropdown [role="menuitem"]',
    '.menu-dropdown [role="menuitemcheckbox"]',
    '.menu-dropdown [role="menuitemradio"]',
    '.menu-dropdown .view-system-button',
    '.menu-dropdown .anat324-system-head',
    '.menu-dropdown [data-anat326-trigger]',
    '#anat324-flyout [role^="menuitem"]',
    '#anat326-flyout [role^="menuitem"]',
    '#anat324-flyout .anat324-option',
    '#anat326-flyout .anat326-option'
  ].join(',');
  const SKIP = '.menu-shortcut, .menu-key, .shortcut, .kbd, kbd, [aria-hidden="true"], svg, #menu-library-items, #anat-student-menu-library-items, .menu-library-items, [data-user-title], [data-lesson-id], [data-project-id], [data-custom-title]';
  // Technical terms and branded names aren't ordinary title-case words.
  const CANONICAL = Object.freeze({
    '3d':'3D', '2d':'2D', 'json':'JSON', 'pdf':'PDF', 'png':'PNG',
    'jpg':'JPG', 'jpeg':'JPEG', 'gif':'GIF', 'svg':'SVG',
    'glb':'GLB', 'gltf':'glTF', 'obj':'OBJ', 'fbx':'FBX',
    'html':'HTML', 'css':'CSS', 'js':'JS', 'url':'URL', 'uri':'URI',
    'pwa':'PWA', 'dof':'DOF', 'gpu':'GPU', 'cpu':'CPU', 'fps':'FPS',
    'ui':'UI', 'ai':'AI', 'id':'ID', 'csv':'CSV', 'rom':'ROM',
    'usb':'USB', 'vr':'VR', 'xr':'XR', 'cns':'CNS',
    'github':'GitHub', 'google':'Google', 'schoology':'Schoology',
    'anatomiq':'AnatomIQ', 'bodyparts3d':'BodyParts3D',
    'webgl':'WebGL', 'webgpu':'WebGPU', 'wasm':'WASM',
    'chromebook':'Chromebook', 'chromeos':'ChromeOS',
    'macos':'macOS', 'ios':'iOS', 'ipad':'iPad', 'iphone':'iPhone',
    'macbook':'MacBook', 'mac':'Mac', 'javascript':'JavaScript',
    'ctrl':'Ctrl', 'cmd':'Cmd', 'alt':'Alt', 'shift':'Shift'
  });
  const WORDS = /[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu;
  const hooked = new WeakSet();
  let scheduled = false;

  const BRAND_CONTINUATIONS = Object.freeze({
    github: new Set(['pages','desktop','actions']),
    google: new Set(['drive','docs','sheets','slides','vids','classroom','workspace','apps','script'])
  });
  function tokenCase(original, state) {
    if (!/[\p{L}]/u.test(original)) return original;
    const key = original.toLocaleLowerCase('en-US');
    const brandWord = state.brand && BRAND_CONTINUATIONS[state.brand]?.has(key);
    if (key === 'google' || key === 'github') state.brand = key;
    else if (!brandWord) state.brand = null;
    const known = CANONICAL[key];
    state.first = false;
    if (known) return known;
    if (brandWord) return original.charAt(0).toLocaleUpperCase('en-US') + original.slice(1).toLocaleLowerCase('en-US');
    return state.wasFirst ? original.charAt(0).toLocaleUpperCase('en-US') + original.slice(1).toLocaleLowerCase('en-US')
      : original.toLocaleLowerCase('en-US');
  }
  function titleCaseToken(original, state) {
    state.wasFirst = state.first;
    return tokenCase(original, state);
  }
  function sentenceCase(label) {
    const state = {first:true, brand:null, wasFirst:true};
    return String(label).replace(WORDS, word => titleCaseToken(word, state));
  }
  function isUserTitle(item) { return !!item.closest(SKIP); }
  function labelNodes(item) {
    const nodes = [];
    const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = walker.currentNode;
      if (text.parentElement?.closest(SKIP)) continue;
      if (!/[\p{L}]/u.test(text.nodeValue || '')) continue;
      nodes.push(text);
    }
    return nodes;
  }
  function normalize(item) {
    if (!item || isUserTitle(item) || item.matches('[hidden], [data-anat327-hidden-quality]')) return false;
    const nodes = labelNodes(item);
    // The first word belongs to the *entire* label, not each nested <span>.
    // Preserve shortcut spans, icon/checkmark spans, and element identity.
    const state = {first:true, brand:null, wasFirst:true};
    let changed = false;
    for (const node of nodes) {
      const updated = (node.nodeValue || '').replace(WORDS, word => titleCaseToken(word, state));
      if (updated !== node.nodeValue) { node.nodeValue = updated; changed = true; }
    }
    return changed;
  }
  function scan(root) {
    if (!root) return;
    const items = root.matches?.(SELECTOR) ? [root] : [];
    for (const el of root.querySelectorAll(SELECTOR)) items.push(el);
    for (const item of items) normalize(item);
  }
  function scanAll() { for (const id of ROOTS) scan(document.getElementById(id)); }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; scanAll(); watchRoots(); });
  }
  function watchRoots() {
    for (const id of ROOTS) {
      const root = document.getElementById(id);
      if (!root || hooked.has(root)) continue;
      hooked.add(root);
      new MutationObserver(schedule).observe(root, {childList:true, characterData:true, subtree:true});
      scan(root);
    }
  }
  function install() {
    scanAll(); watchRoots();
    // The student menubar and the two flyout portals mount later. Observe only
    // direct children of their known hosts, not the high-frequency 3D label DOM.
    const shell = document.querySelector('.app-shell');
    if (shell) new MutationObserver(schedule).observe(shell, {childList:true});
    new MutationObserver(schedule).observe(document.body, {childList:true});
    // A menu can be lazily constructed as the pointer enters a top-level row.
    // After other menu handlers run, normalize the newly populated commands.
    for (const name of ['pointerover', 'focusin', 'click']) {
      document.addEventListener(name, event => {
        if (event.target?.closest?.('#studio-menubar,#anat-student-menubar,#anat324-flyout,#anat326-flyout')) schedule();
      });
    }
    window.AnatomIQMenuGrammar335 = Object.freeze({sentenceCase, scanAll});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();
