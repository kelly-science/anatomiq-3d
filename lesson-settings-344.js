/* ANATOMIQ_LESSON_SETTINGS_344 — single Edit menu entry, no workspace shortcut.
 * Uses existing live lesson/permissions controls. No JSON/schema/store changes.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const create = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  };
  let modal = null;
  let previousFocus = null;
  let sceneState = null;
  let controlsState = null;
  let placements = [];
  let initialized = false;
  const reattach = ({node,parent,next}) => {
    if (!node || !parent) return;
    if (next && next.parentNode === parent) parent.insertBefore(node,next);
    else parent.appendChild(node);
  };
  function restoreNodes() {
    // Preserve the original control elements so their input listeners remain live.
    for (let i = placements.length - 1; i >= 0; i--) reattach(placements[i]);
    placements = [];
  }
  function close() {
    if (!modal) return;
    const scene = placements[0]?.node;
    const details = $('polish-student-controls-details');
    if (scene && sceneState) {
      scene.hidden = sceneState.hidden;
      if (sceneState.aria === null) scene.removeAttribute('aria-hidden');
      else scene.setAttribute('aria-hidden',sceneState.aria);
    }
    if (details && controlsState) details.open = controlsState.open;
    restoreNodes();
    modal.remove(); modal=null;
    sceneState=controlsState=null;
    if (previousFocus?.isConnected) previousFocus.focus({preventScroll:true});
    previousFocus=null;
  }
  function teacherAvailable() {
    const menu = $('studio-menubar');
    return !!menu && !menu.hidden && getComputedStyle(menu).display !== 'none';
  }
  function open() {
    if (modal) return;
    try {
      if (!teacherAvailable()) throw new Error('Lesson Settings is available in Teacher Studio only.');
      const scene = document.querySelector('#left-sidebar .studio-card');
      const student = $('polish-student-controls');
      if (!scene || !student) throw new Error('Existing lesson or student controls were not found.');
      if (scene.contains(student) || student.contains(scene)) throw new Error('Unexpected lesson controls hierarchy.');
      previousFocus = document.activeElement;
      sceneState = {hidden:scene.hidden, aria:scene.getAttribute('aria-hidden')};
      const details = $('polish-student-controls-details');
      controlsState = {open:details?.open};
      // Capture *both* original insertion sites before moving either node.
      placements = [scene,student].map(node => ({node,parent:node.parentNode,next:node.nextSibling}));
      const overlay = create('div','anat128-lesson-backdrop');
      overlay.id = 'anat128-lesson-modal';
      const dialog = create('section','anat128-lesson-dialog');
      dialog.setAttribute('role','dialog');
      dialog.setAttribute('aria-modal','true');
      dialog.setAttribute('aria-label','Lesson settings');
      const header = create('header','anat128-modal-head');
      header.append(create('strong','','Lesson settings'));
      const exit = create('button','anat128-modal-close','✕');
      exit.type='button';exit.setAttribute('aria-label','Close Lesson Settings');
      exit.addEventListener('click',close);header.append(exit);
      const content = create('div','anat128-modal-content');
      const footer = create('footer','anat128-modal-footer');
      const done=create('button','anat128-modal-done','Done');
      done.type='button';done.addEventListener('click',close);footer.append(done);
      dialog.append(header,content,footer);overlay.append(dialog);
      overlay.addEventListener('click',event => {if(event.target===overlay) close();});
      document.body.append(overlay); modal=overlay;
      content.append(scene,student);
      scene.hidden=false;scene.removeAttribute('aria-hidden');
      if (details) details.open=true;
      exit.focus({preventScroll:true});
    } catch (error) {
      console.error('[AnatomIQ] Lesson Settings launch failed:',error);
      if (modal) close();
      else {restoreNodes();sceneState=controlsState=null;previousFocus=null;}
      window.alert?.('Lesson Settings could not open: '+error.message);
    }
  }
  function settingsItem(item) {
    return item && /^lesson\s+settings\s*(?:…|\.\.\.)?$/i.test(item.textContent.trim().replace(/^[⚙\s]+/u,''));
  }
  function injectMenuItem() {
    const dropdown = $('menu-edit');
    const guided = $('anat125-guided-setup');
    if (!dropdown || !guided || !dropdown.contains(guided)) return;
    if ([...dropdown.querySelectorAll('button,[role="menuitem"]')].some(settingsItem)) return;
    const control=create('button','menu-item','Lesson settings…');
    control.id='anat344-lesson-menu';control.type='button';control.setAttribute('role','menuitem');
    dropdown.insertBefore(control,guided);
  }
  function removeOtherLessonSettings() {
    // A legacy File-menu entry may be recreated by another menu script.
    // Hide ONLY exact "Lesson settings" menu rows, leaving all other File actions.
    for (const el of $('menu-file')?.querySelectorAll('button,[role="menuitem"]') || []) {
      if (!settingsItem(el)) continue;
      if (el.hidden && el.style.display === 'none') continue;
      el.hidden=true;
      el.style.display='none';
      el.dataset.anat344Duplicate='file';
    }
    // No separate Guided Workspace header button.
    $('anat128-lesson-button')?.remove();
  }
  function initialize() {
    if (initialized) return;
    initialized=true;
    injectMenuItem();removeOtherLessonSettings();
    const menus=$('studio-menubar');
    if (menus) new MutationObserver(()=>{injectMenuItem();removeOtherLessonSettings();})
      .observe(menus,{childList:true,subtree:true});
    // Guided header is dynamically inserted when the workspace launches.
    // Older header actions must not reappear under any menu rebuild.
    const app=$('anat125-workspace-header');
    if (app) app.querySelector('#anat128-lesson-button')?.remove();
    document.addEventListener('click',event => {
      const target=event.target?.closest?.('button,[role="menuitem"]');
      if (!target) return;
      const isOwn=target.id==='anat344-lesson-menu';
      const isMenu=target.closest('#menu-edit') && settingsItem(target);
      if (!isOwn && !isMenu) return;
      event.preventDefault();event.stopImmediatePropagation();
      const dropdown=target.closest('.menu-dropdown');
      if (dropdown) {
        dropdown.hidden=true;
        const trigger=dropdown.closest('.menu-group')?.querySelector('.menu-trigger');
        trigger?.setAttribute('aria-expanded','false');
      }
      open();
    },true);
    document.addEventListener('keydown',event => {
      if (modal && event.key==='Escape') {
        event.preventDefault();event.stopImmediatePropagation();close();
      }
    },true);
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
  window.AnatomIQLessonSettings128=Object.freeze({open,close,get active(){return !!modal;}});
})();
