/* ANATOMIQ_MENU_TOUCH_FADE_333
 * Menu appearance/exit without disturbing application menu state.
 * A touch-opened menu remains open until selection, outside tap, Escape,
 * or a second press on its own menu trigger. Mouse hover still behaves normally.
 */
(() => {
  'use strict';
  if (window.AnatomIQMenuPolish333) return;
  const BARS = ['studio-menubar', 'anat-student-menubar'];
  const EXIT_MS = 145;
  const state = new WeakMap();
  const seen = new WeakSet();
  let touchHold = null;

  function isReducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
  }
  function renameRestore(bar) {
    for (const item of bar.querySelectorAll('.menu-dropdown .menu-item, .menu-dropdown [data-menu-click="restore-all"]')) {
      if (/^\s*Restore hidden bones\s*$/i.test(item.textContent || '')) {
        item.textContent = 'Restore hidden structures';
      }
    }
  }
  function cleanup(node) {
    const status = state.get(node);
    if (!status) return;
    clearTimeout(status.timer);
    status.timer = 0;
    status.closing = false;
    node.classList.remove('anat333-exiting');
    node.removeAttribute('inert');
    node.removeAttribute('aria-hidden');
  }
  function fadeClosed(node, status) {
    status.visible = false;
    if (status.closing || isReducedMotion()) return;
    status.closing = true;
    // Restore visibility only for the brief exit animation. The app's
    // aria-expanded and is-open state remain closed; it is not interactive.
    node.hidden = false;
    node.setAttribute('inert', '');
    node.setAttribute('aria-hidden', 'true');
    node.classList.add('anat333-exiting');
    status.timer = setTimeout(() => {
      status.visible = false;
      status.closing = false;
      status.timer = 0;
      node.hidden = true;
      node.classList.remove('anat333-exiting');
      node.removeAttribute('inert');
      node.removeAttribute('aria-hidden');
    }, EXIT_MS);
  }
  function sync(node) {
    const status = state.get(node);
    if (!status) return;
    const group = node.closest('.menu-group');
    const trigger = group?.querySelector(':scope > .menu-trigger');
    const shouldOpen = trigger?.getAttribute('aria-expanded') === 'true';
    // An app action may have hidden a menu while a touch selection is active.
    // The touch guard below is only for spurious auto-closes, not action clicks.
    if (!node.hidden && status.closing && shouldOpen) {
      cleanup(node);
      status.visible = true;
      return;
    }
    if (node.hidden && status.closing) return;
    if (node.hidden && status.visible) {
      // The element was genuinely displayed; animate its exit.
      fadeClosed(node, status);
      return;
    }
    if (!node.hidden) status.visible = true;
  }
  function watchDropdown(node) {
    if (seen.has(node)) return;
    seen.add(node);
    state.set(node, { visible:!node.hidden, closing:false, timer:0 });
    new MutationObserver(() => sync(node)).observe(node, {attributes:true,attributeFilter:['hidden']});
  }
  function takeTouchHold(bar, trigger, wasOpen) {
    // Tapping the same open menu again is a deliberate dismissal.
    if (wasOpen && touchHold?.trigger === trigger) { touchHold = null; return; }
    touchHold = {bar, trigger, until: Date.now() + 1100, retries:0};
  }
  function reconcileTouch(bar) {
    const hold = touchHold;
    if (!hold || hold.bar !== bar || Date.now() > hold.until) return;
    const trigger = hold.trigger;
    if (!trigger.isConnected) { touchHold = null; return; }
    const dropdown = trigger.closest('.menu-group')?.querySelector(':scope > .menu-dropdown');
    if (!dropdown || trigger.getAttribute('aria-expanded') === 'true') return;
    // If legacy touch handling dismissed the root on pointerleave, reopen it.
    // Only attempt this once; never fight deliberate close actions.
    if (hold.retries < 1) {
      hold.retries += 1;
      trigger.click();
    }
  }
  function attach(bar) {
    if (!bar || bar.dataset.anat333Bound === 'true') return;
    bar.dataset.anat333Bound = 'true';
    for (const drop of bar.querySelectorAll('.menu-dropdown')) watchDropdown(drop);
    renameRestore(bar);
    const observer = new MutationObserver(records => {
      if (records.some(record => record.type === 'childList')) {
        for (const drop of bar.querySelectorAll('.menu-dropdown')) watchDropdown(drop);
        renameRestore(bar);
      }
      queueMicrotask(() => reconcileTouch(bar));
    });
    observer.observe(bar, {childList:true,subtree:true,attributes:true,attributeFilter:['aria-expanded']});
  }
  function detect() { for (const id of BARS) attach(document.getElementById(id)); }
  function install() {
    detect();
    // Student navigation can mount after initial DOM ready. Watch only app-shell
    // direct children rather than 3D labels, which update every camera frame.
    const shell = document.querySelector('.app-shell') || document.body;
    if (shell) new MutationObserver(detect).observe(shell, {childList:true});
    document.addEventListener('pointerdown', event => {
      const target = event.target;
      const bar = target?.closest?.('#studio-menubar,#anat-student-menubar');
      const trigger = target?.closest?.('.menu-group > .menu-trigger');
      const portal = target?.closest?.('#anat324-flyout,#anat326-flyout');
      const action = target?.closest?.('.menu-item, .anat324-option, .anat326-option, [role="menuitem"]');
      if (event.pointerType !== 'touch') { touchHold = null; return; }
      if (trigger && bar) {
        takeTouchHold(bar, trigger, trigger.getAttribute('aria-expanded') === 'true');
      } else if (!bar && !portal) {
        touchHold = null;
      } else if (action) {
        touchHold = null;
      }
    }, true);
    // Protect the nested flyouts from touch's synthetic pointerleave/out.
    // Their original 190/210 ms timer should remain mouse/trackpad-only.
    document.addEventListener('pointerleave', event => {
      if (event.pointerType === 'touch' &&
          event.target?.closest?.('#anat324-flyout,#anat326-flyout,.menu-dropdown,.menu-group')) {
        event.stopImmediatePropagation();
      }
    }, true);
    document.addEventListener('pointerout', event => {
      if (event.pointerType === 'touch' && event.target?.closest?.('.menu-dropdown,.menu-group')) {
        event.stopImmediatePropagation();
      }
    }, true);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') touchHold = null;
    }, true);
    window.AnatomIQMenuPolish333 = Object.freeze({detect, renameRestore});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();
