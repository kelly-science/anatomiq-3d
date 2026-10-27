// ANATOMIQ_FADE_DETAILS_239_20261026: student Fade follows Structure Details and exploration permissions.
/* AnatomIQ Studio 2.2.21 — shared UI chrome, no anatomy or lesson data changes.
   The new menu and toolbar proxy existing app handlers rather than reimplement them. */
(() => {
  'use strict';
  const VERSION='2.2.55';
  const $ = id => document.getElementById(id);
  const teacher = () => !document.body.classList.contains('student-mode') && !/^#(?:scene|lesson)=/.test(location.hash);
  const button = (label, action, extra={}) => {
    const b=document.createElement('button'); b.type='button'; b.textContent=label;
    b.className='menu-item'; b.setAttribute('role','menuitem');
    if(extra.id)b.id=extra.id;
    if(extra.aria)b.setAttribute('aria-label',extra.aria);
    // Let teacher actions bubble into the existing menu manager, which closes File/View after selection.
    b.addEventListener('click', e=>{action(e);closeStudentMenus();});
    return b;
  };
  const targetClick = id => {
    const node=$(id);
    if(!node || node.disabled){return false;}
    node.click();return true;
  };
  const divider = () => {const d=document.createElement('div');d.className='menu-separator';d.setAttribute('role','separator');return d;};
  let openStudentMenu=null;
  let studentMenu=null;
  let qualitySelectors=[];
  let aboutModal=null;
  let toolbarFullscreen=null;
  let toolbarUndo=null;
  let toolbarRedo=null;
  let toolbarChapterReset=null;
  let floatingDetailsAnchor=null;
  let floatingDetailsToggle=null;
  let floatingWasOpen=false;
  let studentHistoryState={canUndo:false,canRedo:false,ready:false};
  let studentMenuUndo=null,studentMenuRedo=null;
  const activeStudent=()=>!teacher();

  function displayMessage(message){
    const toast=$('app-toast');
    if(toast){toast.textContent=message;toast.hidden=false;window.setTimeout(()=>{if(toast.textContent===message)toast.hidden=true;},4400);}
    else window.alert(message);
  }
  function closeStudentMenus(){
    openStudentMenu=null;
    if(!studentMenu)return;
    studentMenu.querySelectorAll('.menu-group').forEach(g=>{
      g.classList.remove('is-open');
      const dd=g.querySelector('.menu-dropdown');if(dd)dd.hidden=true;
      g.querySelector('.menu-trigger')?.setAttribute('aria-expanded','false');
    });
  }
  function toggleStudentMenu(group){
    const already=openStudentMenu===group.dataset.menu;
    closeStudentMenus();if(already)return;
    openStudentMenu=group.dataset.menu;group.classList.add('is-open');
    group.querySelector('.menu-dropdown').hidden=false;
    group.querySelector('.menu-trigger').setAttribute('aria-expanded','true');
  }
  function createStudentGroup(label){
    const group=document.createElement('div');group.className='menu-group';group.dataset.menu=label.toLowerCase();
    const trigger=document.createElement('button');trigger.type='button';trigger.className='menu-trigger';
    trigger.textContent=label;trigger.setAttribute('aria-haspopup','true');trigger.setAttribute('aria-expanded','false');
    const dd=document.createElement('div');dd.className='menu-dropdown';dd.hidden=true;dd.setAttribute('role','menu');
    dd.setAttribute('aria-label',label);
    const menuId=`anat-student-menu-${label.toLowerCase()}`;dd.id=menuId;trigger.setAttribute('aria-controls',menuId);
    trigger.addEventListener('click',()=>toggleStudentMenu(group));
    trigger.addEventListener('keydown',e=>{
      if(e.key==='ArrowDown'){e.preventDefault();toggleStudentMenu(group);dd.querySelector('.menu-item')?.focus();}
      if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
        e.preventDefault();
        const all=[...studentMenu.querySelectorAll('.menu-group')];
        const at=all.indexOf(group),next=all[(at+(e.key==='ArrowRight'?1:-1)+all.length)%all.length];
        closeStudentMenus();next.querySelector('.menu-trigger')?.focus();
      }
      if(e.key==='Escape'){e.preventDefault();closeStudentMenus();}
    });
    dd.addEventListener('keydown',e=>{
      const choices=[...dd.querySelectorAll('.menu-item:not(:disabled),select')];const at=choices.indexOf(document.activeElement);
      if((e.key==='ArrowDown'||e.key==='ArrowUp')&&!(document.activeElement instanceof HTMLSelectElement)){
        e.preventDefault();choices[(at+(e.key==='ArrowDown'?1:-1)+choices.length)%choices.length]?.focus();
      }
      if(e.key==='Escape'){e.preventDefault();closeStudentMenus();trigger.focus();}
    });
    group.append(trigger,dd);studentMenu.append(group);return dd;
  }
  function createStudentMenu(){
    if($('anat-student-menubar'))return;
    const original=$('studio-menubar');if(!original)return;
    studentMenu=document.createElement('nav');studentMenu.id='anat-student-menubar';
    studentMenu.className='anat-student-menubar';studentMenu.setAttribute('aria-label','Student View menu bar');
    const file=createStudentGroup('File');
    file.append(button('Save lesson for offline use',()=>saveOffline(),{id:'anat-student-offline'}),divider(),button('About AnatomIQ…',openAbout));
    const edit=createStudentGroup('Edit');
    studentMenuUndo=button('Undo',()=>runStudentHistory('undo'),{id:'anat-student-undo'});
    studentMenuRedo=button('Redo',()=>runStudentHistory('redo'),{id:'anat-student-redo'});
    edit.append(studentMenuUndo,studentMenuRedo,divider(),button('Clear selection',()=>targetClick('clear-selection')),button('Reset camera',()=>targetClick('reset-camera')));
    const view=createStudentGroup('View');
    for(const [direction,label] of [['front','Front'],['back','Back'],['left','Left'],['right','Right']]){
      view.append(button(label,()=>activateView(direction)));
    }
    view.append(divider(),button('Reset Chapter',resetStudentChapter,{id:'anat-student-reset-chapter'}),divider(),button('Show / Hide Labels',toggleLabels,{id:'anat-student-toggle-labels'}));
    view.append(button('Enter Full Screen',toggleFullscreen,{id:'anat-student-fullscreen'}));
    const settings=createStudentGroup('Settings');
    settings.append(createQuickQuality('student'));
    const help=createStudentGroup('Help');
    help.append(button('Keyboard shortcuts & Help…',()=>targetClick('open-menu-help')));
    original.insertAdjacentElement('afterend',studentMenu);
  }
  function activateView(direction){
    const source=document.querySelector(`.view-presets [data-view="${direction}"]`);
    if(source && !source.disabled)source.click();
  }
  function saveOffline(){
    const save=$('save-offline');
    if(!save || save.disabled){displayMessage('Offline saving is not ready yet. Finish loading the lesson first.');return;}
    // The original handler performs model-and-lesson asset caching and reports progress.
    save.click();
  }
  function labelToggleAllowed(){
    if(teacher())return true;
    const b=$('polish-label-toggle');return Boolean(b&&!b.hidden);
  }
  function labelsShown(){
    if(teacher())return !document.body.classList.contains('anat-labels-hidden');
    const source=$('polish-label-toggle');return !!source && !source.hidden && source.getAttribute('aria-pressed')==='true';
  }
  function syncLabelMenus(){
    for(const id of ['anat-teacher-labels','anat-student-toggle-labels']){
      const item=$(id);if(!item)continue;
      const allowed=labelToggleAllowed(); item.disabled=!allowed;
      item.textContent=allowed?(labelsShown()?'✓ Show Labels':'Show Labels'):'Labels unavailable in this lesson';
      item.setAttribute('aria-pressed',String(labelsShown()));
    }
  }
  function toggleLabels(){
    if(!labelToggleAllowed()){displayMessage('Your teacher has not enabled labels for this chapter.');return;}
    if(teacher())document.body.classList.toggle('anat-labels-hidden');
    else targetClick('polish-label-toggle');
    syncLabelMenus();
    // Resume label placement immediately when the teacher turns labels back on.
    window.dispatchEvent(new Event('resize'));
  }

  // Student actions are implemented in app.js where chapter snapshots and mesh state live.
  // No teacher project changes or saves are performed by these commands.
  function runStudentHistory(action){
    if(teacher()||!studentHistoryState.ready)return;
    if(action==='undo'&&!studentHistoryState.canUndo)return;
    if(action==='redo'&&!studentHistoryState.canRedo)return;
    window.dispatchEvent(new CustomEvent('anatomiq:student-history-command',{detail:{action}}));
  }
  function resetStudentChapter(){
    if(teacher()||!studentHistoryState.ready)return;
    window.dispatchEvent(new CustomEvent('anatomiq:student-history-command',{detail:{action:'reset'}}));
  }
  function syncHistoryTools(){
    const sourceUndo=$('edit-undo'),sourceRedo=$('edit-redo');
    const canUndo=teacher()?Boolean(sourceUndo&&!sourceUndo.disabled):studentHistoryState.ready&&studentHistoryState.canUndo;
    const canRedo=teacher()?Boolean(sourceRedo&&!sourceRedo.disabled):studentHistoryState.ready&&studentHistoryState.canRedo;
    if(toolbarUndo)toolbarUndo.disabled=!canUndo;
    if(toolbarRedo)toolbarRedo.disabled=!canRedo;
    if(studentMenuUndo)studentMenuUndo.disabled=!studentHistoryState.ready||!studentHistoryState.canUndo;
    if(studentMenuRedo)studentMenuRedo.disabled=!studentHistoryState.ready||!studentHistoryState.canRedo;
    const reset=$('anat-student-reset-chapter');if(reset)reset.disabled=!studentHistoryState.ready;
    if(toolbarChapterReset)toolbarChapterReset.disabled=!studentHistoryState.ready;
  }
  function makeStrokeIcon(paths){
    const ns='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','19');svg.setAttribute('height','19');
    svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');
    svg.setAttribute('stroke-width','1.9');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
    svg.setAttribute('aria-hidden','true');
    for(const d of paths){const path=document.createElementNS(ns,'path');path.setAttribute('d',d);svg.append(path);}
    return svg;
  }
  // Lucide-style curved history arrows (rather than the previous U-turn glyphs).
  const UNDO_PATHS=['M9 14 4 9l5-5','M4 9h10.5a5.5 5.5 0 0 1 0 11H11'];
  const REDO_PATHS=['m15 14 5-5-5-5','M20 9H9.5a5.5 5.5 0 0 0 0 11H13'];
  const RESET_PATHS=['M3 11a9 9 0 1 1 2.6 6.4','M3 4v7h7'];

  function syncFloatingDetails(active){
    const info=$('info-sidebar'),viewer=document.querySelector('.viewer-panel');
    if(!info||!viewer)return;
    if(active){
      if(!floatingDetailsAnchor){
        floatingWasOpen=info.classList.contains('open');
        floatingDetailsAnchor=document.createComment('AnatomIQ student details original location');
        info.parentNode.insertBefore(floatingDetailsAnchor,info);
        viewer.appendChild(info);info.classList.add('anat-floating-info');
        info.classList.add('open');
      }
      if(!floatingDetailsToggle){
        floatingDetailsToggle=document.createElement('button');
        floatingDetailsToggle.type='button';floatingDetailsToggle.className='anat-floating-details-toggle';
        floatingDetailsToggle.setAttribute('aria-controls','info-sidebar');
        floatingDetailsToggle.addEventListener('click',()=>{
          info.classList.toggle('open');
          syncFloatingDetailsButton();
        });
        viewer.appendChild(floatingDetailsToggle);
      }
      syncFloatingDetailsButton();
    }else{
      if(floatingDetailsToggle){floatingDetailsToggle.remove();floatingDetailsToggle=null;}
      if(floatingDetailsAnchor){
        floatingDetailsAnchor.parentNode.insertBefore(info,floatingDetailsAnchor);
        floatingDetailsAnchor.remove();floatingDetailsAnchor=null;
        info.classList.remove('anat-floating-info');
        info.classList.toggle('open',floatingWasOpen);
      }
    }
  }
  function syncFloatingDetailsButton(){
    if(!floatingDetailsToggle)return;
    const open=Boolean($('info-sidebar')?.classList.contains('open'));
    floatingDetailsToggle.textContent=open?'✕':'ⓘ';
    floatingDetailsToggle.title=open?'Collapse structure details':'Show structure details';
    floatingDetailsToggle.setAttribute('aria-label',floatingDetailsToggle.title);
    floatingDetailsToggle.setAttribute('aria-expanded',String(open));
  }
  async function toggleFullscreen(){
    try{
      if(document.fullscreenElement){await document.exitFullscreen();return;}
      const panel=document.querySelector('.viewer-panel');
      if(!panel)throw new Error('3D viewer not ready');
      if(typeof panel.requestFullscreen==='function')await panel.requestFullscreen({navigationUI:'hide'});
      else if(typeof panel.webkitRequestFullscreen==='function')panel.webkitRequestFullscreen();
      else throw new Error('The browser does not support fullscreen for this viewer');
    }catch(err){
      displayMessage('Fullscreen is unavailable here. On iPhone/iPad, use the installed PWA for a larger viewing area.');
    }
  }
  function syncFullscreen(){
    const active=Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    document.body.classList.toggle('anat-fullscreen',active);
    syncFloatingDetails(active&&activeStudent()&&Boolean(document.fullscreenElement?.matches('.viewer-panel')||document.webkitFullscreenElement?.matches?.('.viewer-panel')));
    if(toolbarFullscreen){toolbarFullscreen.textContent=active?'⤢':'⛶';toolbarFullscreen.title=active?'Exit Full Screen':'Full Screen';toolbarFullscreen.setAttribute('aria-label',toolbarFullscreen.title);toolbarFullscreen.setAttribute('aria-pressed',String(active));}
    for(const id of ['anat-teacher-fullscreen','anat-student-fullscreen']){
      const item=$(id);if(item)item.textContent=active?'Exit Full Screen':'Enter Full Screen';
    }
    window.dispatchEvent(new Event('resize'));
  }
  function openAbout(){
    if(!aboutModal)return;
    $('anat-about-viewer').textContent=teacher()?'Teacher Studio':'Student View';
    $('anat-about-version').textContent=window.__AnatomIQBuildVersion||VERSION;
    aboutModal.hidden=false;
    aboutModal.querySelector('.anat-about-close')?.focus();
  }
  function createAbout(){
    if($('anat-about'))return;
    aboutModal=document.createElement('div');aboutModal.id='anat-about';
    aboutModal.className='anat-about-backdrop';aboutModal.hidden=true;
    aboutModal.innerHTML=`<section class="anat-about-panel" role="dialog" aria-modal="true" aria-labelledby="anat-about-title"><div class="anat-about-title-row"><h2 id="anat-about-title">About AnatomIQ</h2><button type="button" class="anat-about-close" aria-label="Close About">✕</button></div><p>Interactive 3D human anatomy and classroom lessons</p><dl><dt>Viewer</dt><dd id="anat-about-viewer"></dd><dt>Version</dt><dd id="anat-about-version"></dd></dl><button type="button" class="anat-about-dismiss">Close</button></section>`;
    aboutModal.addEventListener('click',e=>{if(e.target===aboutModal)aboutModal.hidden=true;});
    aboutModal.querySelectorAll('.anat-about-close,.anat-about-dismiss').forEach(el=>el.addEventListener('click',()=>aboutModal.hidden=true));
    document.body.append(aboutModal);
  }
  function createQuickQuality(viewer){
    const wrap=document.createElement('div');wrap.className='anat-menu-setting';
    const label=document.createElement('label');const select=document.createElement('select');
    select.id=`anat-quality-${viewer}`;select.setAttribute('aria-label','3D rendering quality');
    label.htmlFor=select.id;label.textContent='3D Rendering Quality';
    for(const [value,title] of [['auto','Auto'],['fast','Fast'],['balanced','Balanced'],['sharp','Sharp']]){
      const option=document.createElement('option');option.value=value;option.textContent=title;select.append(option);
    }
    select.value=$('view-quality')?.value||'auto';
    select.addEventListener('change',()=>{
      const source=$('view-quality');if(source){source.value=select.value;source.dispatchEvent(new Event('change',{bubbles:true}));}
      syncQuality();
    });
    select.addEventListener('click',e=>e.stopPropagation());
    qualitySelectors.push(select);wrap.append(label,select);return wrap;
  }
  function syncQuality(){
    const val=$('view-quality')?.value||'auto';
    for(const el of qualitySelectors)if(el.value!==val)el.value=val;
  }
  function addTeacherMenuEntries(){
    const file=$('menu-file'),view=$('menu-view'),settings=$('menu-settings');
    if(file&&!$('anat-teacher-about'))file.append(divider(),button('About AnatomIQ…',openAbout,{id:'anat-teacher-about'}));
    if(view&&!$('anat-teacher-fullscreen')){
      view.append(divider(),button('Show Labels',toggleLabels,{id:'anat-teacher-labels'}));
      view.append(button('Enter Full Screen',toggleFullscreen,{id:'anat-teacher-fullscreen'}));
    }
    if(settings&&!$('anat-quality-teacher'))settings.prepend(createQuickQuality('teacher'),divider());
  }
  function makeToolbarButton(label,title,cb,classname=''){
    const b=document.createElement('button');b.type='button';b.textContent=label;
    b.title=title;b.setAttribute('aria-label',title);b.className='anat-tool '+classname;
    b.addEventListener('click',cb);return b;
  }
  function createToolbar(){
    const bottom=document.querySelector('.viewer-panel .viewer-bottom');
    if(!bottom || $('anat-unified-toolbar'))return;
    const presets=bottom.querySelector('.view-presets');
    const zoom=bottom.querySelector('.zoom-actions');
    const reset=$('reset-camera');
    if(!presets||!zoom||!reset)return;
    const bar=document.createElement('div');bar.id='anat-unified-toolbar';bar.className='anat-unified-toolbar';bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','3D viewer tools');
    const cameras=document.createElement('div');cameras.className='anat-toolbar-group anat-orientations';cameras.append(presets);
    const cameraTools=document.createElement('div');cameraTools.className='anat-toolbar-group';
    cameraTools.append(zoom);
    reset.classList.remove('floating-button');reset.classList.add('anat-tool','anat-reset');
    reset.replaceChildren(document.createTextNode('⌖'));reset.title='Reset camera view';reset.setAttribute('aria-label','Reset camera view');
    cameraTools.append(reset);
    const history=document.createElement('div');history.className='anat-toolbar-group anat-history-tools';
    toolbarUndo=makeToolbarButton('','Undo',()=>teacher()?targetClick('edit-undo'):runStudentHistory('undo'));
    toolbarRedo=makeToolbarButton('','Redo',()=>teacher()?targetClick('edit-redo'):runStudentHistory('redo'));
    toolbarUndo.append(makeStrokeIcon(UNDO_PATHS));
    toolbarRedo.append(makeStrokeIcon(REDO_PATHS));
    toolbarChapterReset=makeToolbarButton('','Reset Chapter',resetStudentChapter,'anat-student-chapter-reset');
    toolbarChapterReset.append(makeStrokeIcon(RESET_PATHS));
    history.append(toolbarUndo,toolbarRedo,toolbarChapterReset);
    const display=document.createElement('div');display.className='anat-toolbar-group';
    toolbarFullscreen=makeToolbarButton('⛶','Full Screen',toggleFullscreen);
    display.append(toolbarFullscreen);
    const sep=()=>{const e=document.createElement('span');e.className='anat-toolbar-separator';e.setAttribute('aria-hidden','true');return e;};
    bar.append(cameras,sep(),cameraTools,sep(),history,sep(),display);
    bottom.append(bar);
    const sourceUndo=$('edit-undo'),sourceRedo=$('edit-redo');
    for(const source of [sourceUndo,sourceRedo])if(source)new MutationObserver(syncHistoryTools).observe(source,{attributes:true,attributeFilter:['disabled']});
    syncHistoryTools();syncFullscreen();
  }
  function syncStudentOffline(){
    const action=$('anat-student-offline');const source=$('save-offline');if(!action)return;
    action.disabled=!(source&&!source.hidden&&!source.disabled);
    action.textContent=source?.disabled&&source?.textContent?.includes('ready')?'✓ Saved for offline use':'Save lesson for offline use';
  }
  function maintain(){
    syncStudentOffline();syncLabelMenus();syncQuality();syncHistoryTools();
    if(studentMenu)studentMenu.hidden=!activeStudent();
    // Viewer type belongs in File > About, not in either viewer header.
    const brand=document.querySelector('.brand-label strong');
    if(brand && brand.textContent!=='AnatomIQ')brand.textContent='AnatomIQ';
  }
  function initialize(){
    if(!$('studio-menubar')||!$('canvas-container')||!$('view-quality'))return;
    createAbout();createStudentMenu();addTeacherMenuEntries();createToolbar();
    if(window.__AnatomIQStudentHistoryStatus){
      const s=window.__AnatomIQStudentHistoryStatus;
      studentHistoryState={ready:!!s.ready,canUndo:!!s.canUndo,canRedo:!!s.canRedo};
    }
    window.addEventListener('anatomiq:student-history-state',event=>{
      studentHistoryState={ready:!!event.detail?.ready,canUndo:!!event.detail?.canUndo,canRedo:!!event.detail?.canRedo};
      syncHistoryTools();
    });
    document.addEventListener('fullscreenchange',syncFullscreen);
    document.addEventListener('webkitfullscreenchange',syncFullscreen);
    document.addEventListener('pointerdown',e=>{if(studentMenu && !studentMenu.contains(e.target))closeStudentMenus();});
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'){closeStudentMenus();if(aboutModal&&!aboutModal.hidden)aboutModal.hidden=true;}
      if(!teacher()&&(e.metaKey||e.ctrlKey)&&!e.altKey&&e.key.toLowerCase()==='z'&&
        !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)&&!document.activeElement?.isContentEditable){
        e.preventDefault();runStudentHistory(e.shiftKey?'redo':'undo');
      }
    });
    // Existing app code changes these attributes when it loads a lesson or begins caching.
    for(const id of ['polish-label-toggle','save-offline']){
      const source=$(id);if(source)new MutationObserver(maintain).observe(source,{attributes:true,attributeFilter:['hidden','disabled','aria-pressed'],childList:true});
    }
    for(const id of ['view-quality','settings-render-quality']){
      $(id)?.addEventListener('change',syncQuality);
    }
    window.addEventListener('hashchange',maintain);
    // Student links can initialize asynchronously after the browser chrome is mounted.
    new MutationObserver(maintain).observe(document.body,{attributes:true,attributeFilter:['class']});
    maintain();
    window.__AnatomIQUI2222={version:VERSION,fullscreenSupported:!!document.querySelector('.viewer-panel')?.requestFullscreen,studentMenu:!!studentMenu,toolbar:!!$('anat-unified-toolbar'),studentHistory:true};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
