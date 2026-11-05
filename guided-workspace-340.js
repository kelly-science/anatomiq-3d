/* ANATOMIQ_GUIDED_WORKSPACE_340 — 2.2.126 LOCAL test.
 * One existing Three.js viewport; live guided editor and chapter-manager nodes
 * are moved, not cloned. No change to saved lesson schema or student progress.
 */
(() => {
  'use strict';
  if (window.AnatomIQGuidedWorkspace126) return;
  const MENU_ID = 'anat125-guided-setup'; // existing Edit-menu trigger retained
  const $ = id => document.getElementById(id);
  const el = (tag, cls = '', label) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (label !== undefined) node.textContent = label;
    return node;
  };
  const TYPES = [
    ['explore','Explore'], ['identify','Identify'], ['mc','Multiple Choice'],
    ['short','Short Answer'], ['reveal','Reveal & Identify'],
    ['relationship','Relationships'], ['label','Hotspot (paint area)'],
    ['dissect','Dissect']
  ];
  const normalize = value => String(value || '').normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\s\u00a0]+/g,' ').trim();
  const anchors = [];
  let active = false, selected = 0, previousCount = 0, refreshing = false;
  let header, inspector, stepList, heading, chapterName, status, selectedText;
  let guidedDetails, guidedDetailsWasOpen, listObserver, chapterObserver, titleObserver, modelObserver;
  let previousFocus = null;
  let modal = null, modalOpen = false, modalPreviousFocus = null;
  let modalSceneHidden, modalSceneAria, modalControlsDetailsOpen;

  function storeNode(node) {
    if (!node?.parentNode) throw new Error('Missing original settings or chapter node.');
    const place = {node, parent: node.parentNode, next: node.nextSibling};
    anchors.push(place);
    return place;
  }
  function restoreNode(place) {
    const {node, parent, next} = place;
    if (next?.parentNode === parent) parent.insertBefore(node, next);
    else parent.append(node);
  }
  function restoreAll() {
    for (let i = anchors.length - 1; i >= 0; i--) restoreNode(anchors[i]);
    anchors.length = 0;
  }
  function announce(message, problem = false) {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('is-error', problem);
  }
  function isTeacher() {
    const bar = $('studio-menubar');
    return bar && !bar.hidden && getComputedStyle(bar).display !== 'none';
  }
  function checkReady() {
    const workspace = document.querySelector('.workspace');
    const root = $('anat-guided-teacher');
    const list = $('anat-ga-list');
    const chapterManager = document.querySelector('#left-sidebar > .chapters-manager');
    const explorer = $('left-sidebar');
    const viewer = document.querySelector('.workspace > .viewer-panel');
    if (!isTeacher()) throw new Error('Guided Activity Setup is teacher-only.');
    if ($('anat336-workspace')?.hidden === false) throw new Error('Close Practical Setup first.');
    if (!workspace || !root || !list || !chapterManager || !explorer || !viewer || !$(MENU_ID)) {
      throw new Error('The expected existing Guided editor, lesson chapters, or 3D viewer is missing.');
    }
    return {workspace, root, list, chapterManager};
  }
  function resizeViewport() {
    requestAnimationFrame(() => requestAnimationFrame(() => window.dispatchEvent(new Event('resize'))));
  }
  function closeDropdown() {
    const trigger = $(MENU_ID)?.closest('.menu-group')?.querySelector('.menu-trigger');
    if (trigger) trigger.setAttribute('aria-expanded','false');
    const menu = $(MENU_ID)?.closest('.menu-dropdown');
    if (menu) menu.hidden = true;
  }
  function chapterLabel() {
    return $('anat-ga-title')?.textContent?.trim() || 'Current chapter';
  }
  function activityItems() {
    return [...($('anat-ga-list')?.children || [])]
      .filter(node => node.classList?.contains('anat-ga-editor-item'));
  }
  function selectedStructure() {return $('selected-name')?.textContent?.trim() || '';}
  function syncStructure() {
    if (!active || !selectedText) return;
    const name = selectedStructure();
    selectedText.textContent = name && name !== '—' ? `Selected: ${name}` :
      'Select a structure in the 3D model, then add it as an activity target.';
  }
  function useStructure() {
    const name = selectedStructure();
    if (!name || name === '—') {announce('Select a structure on the model first.',true);return;}
    const item = activityItems()[selected];
    if (!item) {announce('Create an activity first.',true);return;}
    const labels = [...item.querySelectorAll('.anat-investigate-teacher-checks label')];
    const exact = labels.filter(node => normalize(node.textContent) === normalize(name));
    if (exact.length === 1) {
      const box = exact[0].querySelector('input[type="checkbox"]');
      if (!box) {announce('The target checklist is not ready.',true);return;}
      if (!box.checked) {box.checked = true;box.dispatchEvent(new Event('change',{bubbles:true}));}
      announce(`Added ${name} to this activity.`);
      return;
    }
    if (exact.length > 1) {announce('Ambiguous structure name. Use the existing checklist.',true);return;}
    const matches = [];
    for (const select of item.querySelectorAll('select')) {
      for (const option of select.options) {
        if (normalize(option.textContent) === normalize(name)) matches.push({select, option});
      }
    }
    if (matches.length === 1) {
      matches[0].select.value = matches[0].option.value;
      matches[0].select.dispatchEvent(new Event('change',{bubbles:true}));
      announce(`Selected ${name} as the target.`);
      return;
    }
    announce(`No unique target field for ${name}. Use the existing structure picker.`,true);
  }
  function refresh() {
    if (!active || refreshing) return;
    refreshing = true;
    try {
      const items = activityItems();
      if (items.length > previousCount) selected = items.length - 1;
      previousCount = items.length;
      selected = Math.max(0,Math.min(selected,items.length-1));
      stepList.replaceChildren();
      items.forEach((item, index) => {
        const name = item.querySelector('.anat-ga-editor-header strong')?.textContent?.trim() || `Activity ${index+1}`;
        const button = el('button','anat126-step',`${index+1}. ${name}`);
        button.type = 'button';
        button.classList.toggle('is-selected',index === selected);
        button.setAttribute('aria-current',index === selected ? 'true' : 'false');
        button.addEventListener('click',()=>{selected=index;refresh();});
        stepList.append(button);
        item.hidden = index !== selected;
      });
      heading.textContent = items.length ? `Activity ${selected+1} of ${items.length}` : 'Create an activity';
      chapterName.textContent = chapterLabel();
      const count = $('anat-ga-count')?.textContent?.trim() || `${items.length} activities`;
      const label = $('anat126-activity-count');
      if (label) label.textContent = count;
      const empty = $('anat126-empty');
      if (empty) empty.hidden = !!items.length;
      const button = $('anat126-use-selected');
      if (button) button.disabled = !items.length;
      syncStructure();
    } finally {refreshing = false;}
  }
  function scheduleRefresh() {
    if (active) queueMicrotask(() => {if (active) refresh();});
  }
  function addActivity(type) {
    const button = document.querySelector(`#anat-guided-teacher [data-anat-add="${type}"]`);
    if (!button) {announce('Guided editor has not initialized.',true);return;}
    const before = activityItems().length;
    button.click(); // authoritative Guided engine owns render and save
    queueMicrotask(()=>{
      const after = activityItems().length;
      if (after > before) selected = after-1;
      refresh();
      announce(after > before ? 'Activity added to the current chapter.' :
        'No activity added; check the activity limit.',after <= before);
    });
  }
  function buildWorkspace() {
    header = el('div','anat126-workspace-header');header.id='anat126-workspace-header';
    const back = el('button','anat126-back','← Back to Studio');back.type='button';
    back.addEventListener('click',close);
    const copy = el('div','anat126-header-copy');
    copy.append(el('strong','','Guided Activity Setup'));
    chapterName = el('small','','');copy.append(chapterName);
    const settings = el('button','anat126-lesson-button','Lesson settings…');settings.type='button';
    settings.id='anat126-lesson-settings';settings.addEventListener('click',showLessonSettings);
    header.append(back,copy,settings,el('span','anat126-experiment','LOCAL EXPERIMENT'));

    inspector = el('aside','anat126-inspector');inspector.id='anat126-inspector';
    inspector.setAttribute('aria-label','Guided Activity editor and lesson chapters');
    const chapters = el('details','anat126-chapters');chapters.open = true;
    chapters.append(el('summary','','Lesson chapters'));
    const chapterHost = el('div','anat126-chapter-host');chapterHost.id='anat126-chapter-host';
    chapters.append(chapterHost);
    const activitySection = el('section','anat126-activity-nav');
    const title = el('div','anat126-activity-nav-title');
    title.append(el('strong','','Activities'));
    const count = el('small','','');count.id='anat126-activity-count';title.append(count);
    stepList = el('nav','anat126-step-list');stepList.setAttribute('aria-label','Current chapter activities');
    const add = el('div','anat126-add');
    const picker = el('select','anat126-type-picker');picker.setAttribute('aria-label','Activity type');
    for(const [key,label] of TYPES){const option=el('option','',label);option.value=key;picker.append(option);}
    const addButton = el('button','anat126-primary','+ Add activity');addButton.type='button';
    addButton.addEventListener('click',()=>addActivity(picker.value));
    add.append(picker,addButton);
    activitySection.append(title,stepList,add);
    const editorSection = el('section','anat126-editor');
    const editorTitle = el('div','anat126-editor-title');
    editorTitle.append(el('span','anat126-eyebrow','ACTIVITY EDITOR'));
    heading = el('strong','','Create an activity');editorTitle.append(heading);
    const model = el('div','anat126-model-picker');
    selectedText = el('p','anat126-model-name','Select a structure on the model.');
    const use=el('button','anat126-use','Use selected structure');use.id='anat126-use-selected';use.type='button';
    use.addEventListener('click',useStructure);model.append(selectedText,use);
    const guidedHost = el('div','anat126-guided-host');guidedHost.id='anat126-guided-host';
    const empty = el('p','anat126-empty','Choose or create an activity.');empty.id='anat126-empty';
    status = el('p','anat126-status','Changes are saved by the existing Guided lesson editor.');
    status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    editorSection.append(editorTitle,model,empty,guidedHost,status);
    inspector.append(chapters,activitySection,editorSection);
    return {chapterHost,guidedHost};
  }
  function open() {
    if (active) return;
    let began = false;
    try {
      const {workspace,root,list,chapterManager} = checkReady();
      previousFocus = document.activeElement;
      const {chapterHost,guidedHost} = buildWorkspace();
      storeNode(chapterManager);
      storeNode(root);
      guidedDetails = root.querySelector('details.anat-ga-panel') || root.querySelector('details');
      guidedDetailsWasOpen = guidedDetails?.open;
      began = true;
      // Reparent EXACT existing nodes (and their listeners), never clone them.
      workspace.before(header);
      workspace.append(inspector);
      chapterHost.append(chapterManager);
      guidedHost.append(root);
      if (guidedDetails) guidedDetails.open = true;
      active = true;
      document.body.classList.add('anat126-active');
      closeDropdown();
      selected = 0;previousCount = 0;
      listObserver = new MutationObserver(scheduleRefresh);
      listObserver.observe(list,{childList:true});
      const chapterList = $('teacher-chapter-list');
      if (chapterList) {
        chapterObserver = new MutationObserver(scheduleRefresh);
        chapterObserver.observe(chapterList,{childList:true});
      }
      const title = $('anat-ga-title');
      if (title) {titleObserver = new MutationObserver(scheduleRefresh);titleObserver.observe(title,{childList:true,subtree:true,characterData:true});}
      const structure = $('selected-name');
      if (structure) {modelObserver = new MutationObserver(syncStructure);modelObserver.observe(structure,{childList:true,subtree:true,characterData:true});}
      refresh();resizeViewport();
      header.querySelector('.anat126-back')?.focus({preventScroll:true});
      announce('Edit chapter activities using the live anatomy viewer.');
    } catch (error) {
      if (began) close();
      else {restoreAll();header?.remove();inspector?.remove();}
      console.error('[AnatomIQ Guided Activity Setup] Launch failed:',error);
      let warning=$('anat126-launch-error');
      if(!warning){warning=el('div','anat126-launch-error');warning.id='anat126-launch-error';warning.setAttribute('role','alert');document.body.append(warning);}
      warning.textContent='Guided Activity Setup could not open: '+error.message;
      warning.hidden=false;
    }
  }
  function close() {
    if (!active && !anchors.length) return;
    if (modalOpen) hideLessonSettings();
    for(const observer of [listObserver,chapterObserver,titleObserver,modelObserver]) observer?.disconnect();
    listObserver=chapterObserver=titleObserver=modelObserver=null;
    for (const item of activityItems()) item.hidden=false;
    if (guidedDetails && guidedDetailsWasOpen !== undefined) guidedDetails.open=guidedDetailsWasOpen;
    restoreAll();
    header?.remove();inspector?.remove();
    document.body.classList.remove('anat126-active');
    active=false;resizeViewport();
    if(previousFocus?.isConnected) previousFocus.focus({preventScroll:true});
  }

  // Lesson settings are an actual dialog around the existing teacher source
  // controls. We intentionally do NOT introduce a second settings data store.
  const settingsNodes = [];
  function restoreSettingsNodes() {
    for(let i=settingsNodes.length-1;i>=0;i--) restoreNode(settingsNodes[i]);
    settingsNodes.length=0;
  }
  function showLessonSettings() {
    if (modalOpen) return;
    try {
      if (!isTeacher()) throw new Error('Lesson settings are teacher-only.');
      const scene = document.querySelector('#left-sidebar .studio-card');
      const student = $('polish-student-controls');
      if (!scene || !student) throw new Error('Existing lesson and student control fields are unavailable.');
      modalPreviousFocus = document.activeElement;
      settingsNodes.push({node:scene,parent:scene.parentNode,next:scene.nextSibling});
      settingsNodes.push({node:student,parent:student.parentNode,next:student.nextSibling});
      modal = el('div','anat126-lesson-backdrop');modal.id='anat126-lesson-modal';
      modal.setAttribute('role','presentation');
      const dialog = el('section','anat126-lesson-dialog');
      dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
      dialog.setAttribute('aria-label','Lesson settings');
      const bar = el('header','anat126-modal-head');
      bar.append(el('strong','','Lesson settings'));
      const exit = el('button','anat126-modal-close','✕');exit.type='button';
      exit.setAttribute('aria-label','Close lesson settings');exit.addEventListener('click',hideLessonSettings);
      bar.append(exit);
      const contents = el('div','anat126-modal-content');
      const footer = el('div','anat126-modal-footer');
      const done = el('button','anat126-primary','Done');done.type='button';done.addEventListener('click',hideLessonSettings);
      footer.append(done);dialog.append(bar,contents,footer);modal.append(dialog);
      modal.addEventListener('click',e=>{if(e.target===modal) hideLessonSettings();});
      modalSceneHidden = scene.hidden;
      modalSceneAria = scene.getAttribute('aria-hidden');
      modalControlsDetailsOpen = $('polish-student-controls-details')?.open;
      document.body.append(modal);
      contents.append(scene,student);
      scene.hidden=false;scene.removeAttribute('aria-hidden');
      const details = $('polish-student-controls-details');if(details) details.open=true;
      modalOpen=true;
      exit.focus({preventScroll:true});
    } catch(error) {
      console.error('[AnatomIQ] Lesson settings could not open:',error);
      restoreSettingsNodes();modal?.remove();modal=null;modalOpen=false;
      if(status) announce('Lesson settings unavailable: '+error.message,true);
      else window.alert?.('Lesson settings unavailable: '+error.message);
    }
  }
  function hideLessonSettings() {
    if (!modalOpen) return;
    const scene = document.querySelector('#anat126-lesson-modal .studio-card');
    if (scene) {
      scene.hidden=modalSceneHidden;
      if(modalSceneAria===null)scene.removeAttribute('aria-hidden');
      else scene.setAttribute('aria-hidden',modalSceneAria);
    }
    const details=$('polish-student-controls-details');
    if(details && modalControlsDetailsOpen!==undefined)details.open=modalControlsDetailsOpen;
    restoreSettingsNodes();modal?.remove();modal=null;modalOpen=false;
    if(modalPreviousFocus?.isConnected)modalPreviousFocus.focus({preventScroll:true});
  }
  document.addEventListener('click',event=>{
    const target = event.target?.closest?.('button');
    if (!target) return;
    if (target.id===MENU_ID) {
      event.preventDefault();event.stopImmediatePropagation();open();return;
    }
    // Also recover a pre-existing native menu command named Lesson settings.
    // Do not change App Settings / Advanced Settings or any other settings item.
    if(target.closest('#studio-menubar') && /^lesson\s+settings\s*(?:…|\.\.\.)?$/i.test(target.textContent.replace(/^[\s⚙]+/u,''))) {
      event.preventDefault();event.stopImmediatePropagation();showLessonSettings();return;
    }
  },true);
  document.addEventListener('keydown',event=>{
    if(modalOpen && event.key==='Escape') {event.preventDefault();event.stopImmediatePropagation();hideLessonSettings();return;}
    if(active && event.key==='Escape' && !event.defaultPrevented &&
      !event.target.closest?.('.anat-ga-editor-item')) {event.preventDefault();close();}
  });
  window.AnatomIQGuidedWorkspace126=Object.freeze({open,close,showLessonSettings,hideLessonSettings,get active(){return active;}});
})();
