/* ANATOMIQ_GUIDED_WORKSPACE_343 — original 2.2.125 layout + scoped editor visuals.
 * Reparents the existing LIVE Guided teacher editor; it does not clone editor
 * controls, replace the Three.js canvas, or write guided/project storage.
 */
(() => {
  'use strict';
  const ID = 'anat125-guided-setup';
  const $ = id => document.getElementById(id);
  const make = (tag, className, label) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (label !== undefined) el.textContent = label;
    return el;
  };
  const TYPES = [
    ['explore','Explore'], ['identify','Identify'], ['mc','Multiple Choice'],
    ['short','Short Answer'], ['reveal','Reveal & Identify'],
    ['relationship','Relationships'], ['label','Hotspot (paint area)'],
    ['dissect','Dissect']
  ];
  const normalize = v => String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[\s\u00a0]+/g,' ').trim();
  let active = false, selected = 0, lastCount = 0, refreshing = false;
  let header, left, inspector, listButtons, chapterName, heading, status, selectedText;
  let originalParent, originalSibling, originalDetailsOpen;
  let listObserver, titleObserver, modelObserver;
  let lastFocused = null;

  function report(message, problem = false) {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('is-error', problem);
  }
  function checkReady() {
    const menu = $(ID), workspace = document.querySelector('.workspace');
    const root = $('anat-guided-teacher');
    const list = $('anat-ga-list');
    const viewport = document.querySelector('.workspace > .viewer-panel');
    const studioMenu = $('studio-menubar');
    if (!menu || !workspace || !root || !list || !viewport || !studioMenu) {
      throw new Error('Guided workspace is missing required Studio elements.');
    }
    if (studioMenu.hidden || getComputedStyle(studioMenu).display === 'none') {
      throw new Error('Guided workspace is available only in Teacher Studio.');
    }
    if ($('anat336-workspace')?.hidden === false) {
      throw new Error('Close Practical Setup before opening Guided Activity Setup.');
    }
    return {workspace, root, list};
  }
  function canvasResize() {
    requestAnimationFrame(() => requestAnimationFrame(() =>
      window.dispatchEvent(new Event('resize'))));
  }
  function closeMenu() {
    const trigger = $(ID)?.closest('.menu-group')?.querySelector('.menu-trigger');
    if (trigger) trigger.setAttribute('aria-expanded','false');
    const dropdown = $(ID)?.closest('.menu-dropdown');
    if (dropdown) dropdown.hidden = true;
  }
  function chapterLabel() {
    const name = $('anat-ga-title')?.textContent?.trim();
    const title = $('scene-title')?.value?.trim();
    return [name || 'Current chapter', title].filter(Boolean).join(' · ');
  }
  function currentItems() {
    return [...($('anat-ga-list')?.children || [])].filter(node => node.classList?.contains('anat-ga-editor-item'));
  }
  function updateSelectionFromModel() {
    if (!active || !selectedText) return;
    const value = $('selected-name')?.textContent?.trim() || '';
    selectedText.textContent = value && value !== '—'
      ? 'Selected on model: ' + value : 'Select a structure on the model to use it as a target.';
  }
  function applyModelSelection() {
    const name = $('selected-name')?.textContent?.trim();
    if (!name || name === '—') {report('Select a structure on the 3D model first.', true);return;}
    const item = currentItems()[selected];
    if (!item) {report('Add an activity before choosing targets.', true);return;}
    const labels = [...item.querySelectorAll('.anat-investigate-teacher-checks label')];
    const exact = labels.filter(el => normalize(el.textContent) === normalize(name));
    if (exact.length === 1) {
      const box = exact[0].querySelector('input[type="checkbox"]');
      if (!box) {report('Target checklist is not ready.',true);return;}
      if (!box.checked) {
        box.checked = true;
        box.dispatchEvent(new Event('change', {bubbles:true}));
      }
      report('Added '+name+' to the current activity.');
      return;
    }
    if (exact.length > 1) {report('Multiple targets have this name. Choose one in the editor.',true);return;}
    // Legacy single-target activities use a selector, not a checklist.
    const matches = [];
    for (const select of item.querySelectorAll('select')) {
      for (const option of select.options) {
        if (normalize(option.textContent) === normalize(name)) matches.push({select, option});
      }
    }
    if (matches.length === 1) {
      matches[0].select.value = matches[0].option.value;
      matches[0].select.dispatchEvent(new Event('change',{bubbles:true}));
      report('Selected '+name+' as an activity target.');
      return;
    }
    report('No unique target field matches '+name+'. Use the searchable activity picker.', true);
  }
  function refresh() {
    if (!active || refreshing) return;
    refreshing = true;
    try {
      const items = currentItems();
      if (items.length > lastCount) selected = items.length - 1;
      lastCount = items.length;
      selected = Math.min(Math.max(selected,0), Math.max(items.length-1,0));
      listButtons.replaceChildren();
      items.forEach((item, index) => {
        const name = item.querySelector('.anat-ga-editor-header strong')?.textContent?.trim() || `Activity ${index+1}`;
        const button = make('button','anat125-step',name);
        button.type = 'button';
        button.classList.toggle('is-selected',selected === index);
        button.setAttribute('aria-current',selected===index?'true':'false');
        button.addEventListener('click', () => {selected=index;refresh();});
        listButtons.append(button);
        item.hidden = index !== selected;
      });
      const count=$('anat-ga-count')?.textContent?.trim()||`${items.length} activities`;
      heading.textContent = items.length ? `Activity ${selected+1} of ${items.length}` : 'Create an activity';
      chapterName.textContent = chapterLabel();
      const title = left.querySelector('.anat125-activity-title');
      if (title) title.textContent = count;
      const empty = inspector.querySelector('.anat125-empty');
      if (empty) empty.hidden = items.length > 0;
      const pick = $('anat125-use-selected');
      if (pick) pick.disabled = !items.length;
      updateSelectionFromModel();
      // Editor-only visual selection: no saved lesson/scene material is changed.
      window.AnatomIQGuidedEditorVisuals343?.select(selected);
    } finally {
      refreshing = false;
    }
  }
  function onActivityFieldChange() {
    if (active) queueMicrotask(() => window.AnatomIQGuidedEditorVisuals343?.select(selected));
  }
  function scheduleRefresh() {
    if (!active) return;
    queueMicrotask(() => {if (active) refresh();});
  }
  function addActivity(type) {
    const button = document.querySelector(`#anat-guided-teacher [data-anat-add="${type}"]`);
    if (!button) { report('The existing Guided editor is still initializing. Try again.',true);return; }
    const before = currentItems().length;
    button.click();
    // The Guided engine owns its saved configuration and its render cycle.
    queueMicrotask(() => {
      const after = currentItems().length;
      if (after > before) selected = after - 1;
      refresh();
      report(after > before ? 'Activity added to the current chapter.' :
        'No activity added. Check the 12-activity chapter limit.', after <= before);
    });
  }
  function buildChrome() {
    header = make('div','anat125-workspace-header');header.id='anat125-workspace-header';
    const back=make('button','anat125-back','← Back to Studio');back.type='button';
    back.addEventListener('click', close);
    const h=make('div','anat125-header-copy');
    h.append(make('strong','','Guided Activity Setup'));
    chapterName=make('small','','');h.append(chapterName);
    const flag=make('span','anat125-experiment','LOCAL EXPERIMENT');
    header.append(back,h,flag);

    left=make('aside','anat125-nav');left.id='anat125-nav';
    left.setAttribute('aria-label','Guided activity navigator');
    const chapter=make('section','anat125-chapter-controls');
    chapter.append(make('span','anat125-eyebrow','CHAPTER'));
    const chapterButtons=make('div','anat125-chapter-buttons');
    for (const [label,id] of [['‹ Previous','previous-chapter'],['Next ›','next-chapter']]) {
      const b=make('button','anat125-chapter-button',label);b.type='button';
      b.addEventListener('click',()=>{
        const original=$(id);
        if (!original || original.disabled || original.hidden) {
          report('No adjacent chapter is available.',true);return;
        }
        original.click();
        report('Switching chapters…');
        setTimeout(scheduleRefresh,300);
      });
      chapterButtons.append(b);
    }
    chapter.append(chapterButtons);
    const activityTop=make('div','anat125-activity-heading');
    activityTop.append(make('strong','','ACTIVITIES'));
    activityTop.append(make('small','anat125-activity-title','0 of 12 activities'));
    listButtons=make('nav','anat125-step-list');listButtons.setAttribute('aria-label','Activities in this chapter');
    const add=make('div','anat125-add');
    const picker=make('select','anat125-select');picker.setAttribute('aria-label','Activity type to add');
    for (const [key,label] of TYPES) {
      const option=make('option','',label);option.value=key;picker.append(option);
    }
    const addButton=make('button','anat125-add-button','+ Add activity');addButton.type='button';
    addButton.addEventListener('click',()=>addActivity(picker.value));
    add.append(picker,addButton);
    const note=make('p','anat125-help','Activities use the same saved configuration as the original Guided editor. No lesson copy is created.');
    left.append(chapter,activityTop,listButtons,add,note);

    inspector=make('aside','anat125-inspector');inspector.id='anat125-inspector';
    inspector.setAttribute('aria-label','Selected Guided activity editor');
    const title=make('div','anat125-inspector-head');
    heading=make('strong','','Create an activity');
    title.append(make('span','anat125-eyebrow','ACTIVITY EDITOR'),heading);
    const modelRow=make('div','anat125-model-picker');
    selectedText=make('p','anat125-model-text','Select a structure on the model to use it as a target.');
    const choose=make('button','anat125-use','Use selected structure');choose.type='button';
    choose.id='anat125-use-selected';choose.addEventListener('click',applyModelSelection);
    modelRow.append(selectedText,choose);
    const empty=make('p','anat125-empty','Choose an activity on the left, or add one to get started.');
    status=make('p','anat125-status','Changes use the existing Guided lesson editor and autosave behavior.');
    status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    inspector.append(title,modelRow,empty,status);
  }
  function open() {
    if (active) return;
    try {
      const {workspace,root,list}=checkReady();
      lastFocused=document.activeElement;
      buildChrome();
      originalParent=root.parentNode;
      originalSibling=root.nextSibling;
      const details=root.querySelector('details.anat-ga-panel')||root.querySelector('details');
      originalDetailsOpen=details?.open;
      // Reparenting is deliberate: all Guided event listeners and data bindings
      // belong to these original elements, not to copied/duplicated UI fields.
      workspace.before(header);
      workspace.prepend(left);
      workspace.append(inspector);
      inspector.insertBefore(root,status);
      if (details) details.open=true;
      active=true;
      document.body.classList.add('anat125-active');
      closeMenu();
      selected=0;lastCount=0;
      listObserver=new MutationObserver(scheduleRefresh);
      listObserver.observe(list,{childList:true});
      // The engine updates Identify target arrays without rebuilding the list.
      list.addEventListener('change', onActivityFieldChange);
      const title=$('anat-ga-title');
      if(title){titleObserver=new MutationObserver(scheduleRefresh);titleObserver.observe(title,{subtree:true,childList:true,characterData:true});}
      const selectedLabel=$('selected-name');
      if(selectedLabel){modelObserver=new MutationObserver(updateSelectionFromModel);modelObserver.observe(selectedLabel,{subtree:true,childList:true,characterData:true});}
      refresh();canvasResize();backFocus();
      report('Editing the current Guided chapter. Select model anatomy or use the target pickers.');
    } catch (error) {
      console.error('[AnatomIQ Guided Activity Setup] Could not launch:',error);
      if (active) close();
      const msg='Guided Activity Setup could not open: '+error.message;
      let warning=$('anat125-launch-error');
      if(!warning){warning=make('div','anat125-launch-error');warning.id='anat125-launch-error';warning.setAttribute('role','alert');document.body.append(warning);}
      warning.textContent=msg;warning.hidden=false;
    }
  }
  function backFocus() {
    const back=header?.querySelector('.anat125-back');
    back?.focus({preventScroll:true});
  }
  function close() {
    if (!active) return;
    listObserver?.disconnect();titleObserver?.disconnect();modelObserver?.disconnect();
    $('anat-ga-list')?.removeEventListener('change', onActivityFieldChange);
    listObserver=titleObserver=modelObserver=null;
    window.AnatomIQGuidedEditorVisuals343?.clear();
    // Keep the exact original Guided tree and its live state, then remove chrome.
    const root=$('anat-guided-teacher');
    for (const item of currentItems()) item.hidden=false;
    if (root && originalParent) {
      if (originalSibling?.parentNode===originalParent) originalParent.insertBefore(root,originalSibling);
      else originalParent.append(root);
      const details=root.querySelector('details.anat-ga-panel')||root.querySelector('details');
      if (details && originalDetailsOpen !== undefined) details.open=originalDetailsOpen;
    }
    header?.remove();left?.remove();inspector?.remove();
    document.body.classList.remove('anat125-active');
    active=false;canvasResize();
    if(lastFocused?.isConnected)lastFocused.focus({preventScroll:true});
  }
  document.addEventListener('click',event=>{
    if (event.target.closest?.('#'+ID)) {
      event.preventDefault();event.stopImmediatePropagation();open();
    }
  },true);
  document.addEventListener('keydown',event=>{
    if (active && event.key==='Escape' && !event.defaultPrevented &&
       !event.target.closest?.('.anat-ga-editor-item') && !event.target.closest?.('.anat336-workspace')) {
      event.preventDefault();close();
    }
  });
  window.AnatomIQGuidedWorkspace125=Object.freeze({open,close,get active(){return active;}});
})();
