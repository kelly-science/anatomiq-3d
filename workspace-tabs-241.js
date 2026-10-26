/* AnatomIQ 2.2.41. Project tabs and Teacher Lesson Settings. No anatomy or occlusion changes. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const student=()=>document.body.classList.contains('student-mode')||/^#(?:scene|lesson)=/.test(location.hash);
  const STORAGE='anatomiq-teacher-workspace-tabs-v1';
  const LIMIT=10;
  let workspaces=[],active='',switching=false,started=false,bar,tabStrip,modal;
  const toast=msg=>{const el=$('app-toast');if(el){el.textContent=msg;el.hidden=false;}else console.info(msg);};
  const bridge=()=>window.__AnatomIQWorkspaceBridge;
  const id=()=>`w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  const current=()=>workspaces.find(w=>w.id===active);
  const clone=o=>structuredClone(o);
  function persist(){
    try{localStorage.setItem(STORAGE,JSON.stringify({v:1,active,workspaces}));return true;}
    catch(e){toast('Workspace backup storage is full. Save projects to the Scene Library before opening more tabs.');console.warn('Workspace tabs could not persist',e);return false;}
  }
  function capture(){
    if(switching||!bridge()?.ready()||!current())return;
    try{current().state=bridge().capture();current().name=bridge().title;current().updated=Date.now();}
    catch(e){console.warn('Workspace snapshot failed',e);}
  }
  function syncActive(){if(!started||switching)return;capture();persist();render();}
  function render(){
    if(!tabStrip)return;
    tabStrip.replaceChildren();
    workspaces.forEach(w=>{
      const tab=document.createElement('div');tab.className='anat-project-tab'+(w.id===active?' active':'');
      tab.setAttribute('role','presentation');
      const open=document.createElement('button');open.type='button';open.className='anat-project-switch';
      open.setAttribute('role','tab');open.setAttribute('aria-selected',String(w.id===active));open.title=w.name;
      const name=document.createElement('span');name.textContent=w.name||'Untitled lesson';
      const dot=document.createElement('span');dot.className='anat-project-dot';dot.textContent=w.state?.lastLibrarySnapshot && JSON.stringify(w.state?.project)===w.state?.lastLibrarySnapshot?'':'•';
      open.append(dot,name);open.addEventListener('click',()=>void switchTab(w.id));
      const close=document.createElement('button');close.type='button';close.textContent='×';close.className='anat-project-close';
      close.setAttribute('aria-label',`Close ${w.name}`);close.title='Close project';
      close.addEventListener('click',()=>void closeTab(w.id));tab.append(open,close);tabStrip.append(tab);
    });
    const activeButton=tabStrip.querySelector('.active .anat-project-switch');
    if(activeButton)activeButton.setAttribute('aria-current','page');
  }
  async function switchTab(target){
    if(switching||target===active||!bridge()?.ready())return;
    const next=workspaces.find(w=>w.id===target);if(!next)return;
    capture();if(!persist())return;
    const previous=active;
    switching=true;active=target;
    try{await bridge().activate(clone(next.state));persist();render();}
    catch(error){active=previous;toast('Could not open tab: '+error.message);console.error(error);
      try{await bridge().activate(clone(current().state));}catch(e){console.error('Could not restore previous workspace',e);}}
    finally{switching=false;}
  }
  async function newTab(){
    if(switching||!bridge()?.ready())return;
    if(workspaces.length>=LIMIT){toast(`Save or close a project first (maximum ${LIMIT} tabs).`);return;}
    capture();if(!persist())return;
    const prior=active;const next={id:id(),name:'New lesson',state:null,updated:Date.now()};
    switching=true;
    try{const state=bridge().blank();next.state=state;next.name=state.project.t||'New lesson';workspaces.push(next);active=next.id;
      if(!persist()){workspaces.pop();active=prior;await bridge().activate(clone(current().state));return;}
      render();}
    catch(e){active=prior;toast('Could not create tab: '+e.message);console.error(e);
      try{await bridge().activate(clone(current().state));}catch{}}
    finally{switching=false;}
  }
  async function closeTab(target){
    if(switching||!bridge()?.ready())return;
    const index=workspaces.findIndex(w=>w.id===target);if(index<0)return;
    const w=workspaces[index];if(target===active)capture();
    const dirty=w.state?.lastLibrarySnapshot===null || JSON.stringify(w.state?.project)!==w.state?.lastLibrarySnapshot;
    const detail=dirty?' Unsaved changes in this tab will be discarded. Save to Library first if you want to keep them.':'';
    if(!window.confirm(`Close “${w.name}”?${detail}`))return;
    if(workspaces.length===1){
      // Closing the final tab creates a new empty workspace, never a blank viewer.
      switching=true;
      try{const blank=bridge().blank();workspaces=[{id:id(),name:blank.project.t,state:blank,updated:Date.now()}];active=workspaces[0].id;persist();render();}
      catch(e){toast('Could not close last tab: '+e.message);}finally{switching=false;}return;
    }
    if(target!==active){workspaces.splice(index,1);persist();render();return;}
    const neighbor=workspaces[index===0?1:index-1];
    switching=true;
    try{await bridge().activate(clone(neighbor.state));workspaces.splice(index,1);active=neighbor.id;persist();render();}
    catch(e){toast('Could not switch after closing: '+e.message);console.error(e);}
    finally{switching=false;}
  }
  function lessonSettings(){
    const file=$('menu-file'),barNode=$('studio-menubar');if(!file||!barNode)return;
    const item=document.createElement('button');item.type='button';item.id='anat-lesson-settings-open';item.className='menu-item';
    item.setAttribute('role','menuitem');item.textContent='Lesson Settings…';
    const publish=$('publish-open');if(publish)file.insertBefore(item,publish);else file.append(item);
    modal=document.createElement('div');modal.id='anat-lesson-settings-dialog';modal.className='dialog-backdrop';modal.hidden=true;
    modal.innerHTML='<section class="anat-lesson-settings-box" role="dialog" aria-modal="true" aria-labelledby="anat-lesson-settings-title"><header class="anat-lesson-settings-header"><h2 id="anat-lesson-settings-title">Lesson Settings</h2><button type="button" id="anat-lesson-settings-close" aria-label="Close lesson settings">×</button></header><div id="anat-lesson-settings-content"></div><footer>Changes apply to the current lesson tab. Save or publish when ready.</footer></section>';
    document.body.append(modal);
    const target=$('anat-lesson-settings-content');
    for(const sectionId of ['polish-student-controls','practical-teacher-editor']){
      const section=$(sectionId);if(!section)throw new Error('Missing lesson settings section: '+sectionId);
      target.append(section);section.hidden=false;
      section.querySelector('details')?.setAttribute('open','');
    }
    const close=()=>{modal.hidden=true;item.focus();};
    item.addEventListener('click',()=>{modal.hidden=false;document.querySelector('.studio-menubar .menu-group.is-open .menu-trigger')?.click();$('anat-lesson-settings-close').focus();});
    $('anat-lesson-settings-close').addEventListener('click',close);
    modal.addEventListener('click',e=>{if(e.target===modal)close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden){e.preventDefault();e.stopImmediatePropagation();close();}},true);
  }
  function statusPlacement(){
    const node=$('menubar-context'),status=$('connectivity');if(!node||!status)return;
    node.classList.add('anat-draft-header-status');node.title=node.textContent;
    status.insertAdjacentElement('afterend',node);
    new MutationObserver(()=>node.title=node.textContent).observe(node,{childList:true,characterData:true,subtree:true});
  }
  function shortcut(e){
    if(e.defaultPrevented||!e.shiftKey||!(e.metaKey||e.ctrlKey)||e.altKey||document.activeElement?.closest?.('input,textarea,select,[contenteditable]'))return;
    if(document.querySelector('.dialog-backdrop:not([hidden])'))return;
    const key=e.key.toLowerCase();
    const teacherOnly=['i','-','_','l','p','s','o'];
    if(student()&&teacherOnly.includes(key))return;
    let handled=true;
    switch(key){
      case 'f':
        window.__AnatomIQResponsivePanels?.toggle?.('left',true);
        $('search')?.focus();$('search')?.select();break;
      case 'i':$('isolate-selected')?.click();break;
      case '-':case '_':$('fade-selected')?.click();break;
      case 'l':window.__AnatomIQTeacherTools?.setMode('labels');break;
      case 'p':window.__AnatomIQTeacherTools?.setMode('paint');break;
      case 's':window.__AnatomIQTeacherTools?.setMode('select');break;
      case 'o':window.__AnatomIQTeacherTools?.setMode('orbit');break;
      default:handled=false;
    }
    if(handled){e.preventDefault();e.stopImmediatePropagation();}
  }
  function chrome(){
    const menubar=$('studio-menubar');if(!menubar)return;
    bar=document.createElement('section');bar.id='anat-project-tabs';bar.className='anat-project-tabs';bar.setAttribute('aria-label','Open lesson projects');
    tabStrip=document.createElement('div');tabStrip.id='anat-project-tab-list';tabStrip.setAttribute('role','tablist');
    const add=document.createElement('button');add.id='anat-new-project-tab';add.type='button';add.textContent='+';add.title='New project tab';add.setAttribute('aria-label','New project tab');
    add.addEventListener('click',()=>void newTab());bar.append(tabStrip,add);menubar.append(bar);
    $('new-project')?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();void newTab();},true);
  }
  function begin(){
    if(started||student()||!bridge()?.ready())return;
    started=true;
    try{lessonSettings();statusPlacement();chrome();document.addEventListener('keydown',shortcut,true);}catch(e){console.error('AnatomIQ 2.2.41 UI:',e);}
    let saved=null;
    try{saved=JSON.parse(localStorage.getItem(STORAGE)||'null');}catch{}
    if(saved?.v===1&&Array.isArray(saved.workspaces)&&saved.workspaces.length&&saved.workspaces.length<=LIMIT){
      workspaces=saved.workspaces.filter(w=>w.id&&w.state?.project);active=workspaces.some(w=>w.id===saved.active)?saved.active:workspaces[0]?.id;
    }
    if(!workspaces.length){const state=bridge().capture();workspaces=[{id:id(),name:state.project.t||'Working draft',state,updated:Date.now()}];active=workspaces[0].id;persist();render();}
    else{
      switching=true;void bridge().activate(clone(current().state)).then(()=>{render();}).catch(e=>{console.error('Workspace restore failed:',e);toast('Could not restore project tabs. Your existing single working draft remains available.');workspaces=[{id:id(),name:bridge().title,state:bridge().capture(),updated:Date.now()}];active=workspaces[0].id;persist();render();}).finally(()=>switching=false);
    }
    window.__AnatomIQWorkspaceTabs={syncActive,newTab,switchTab,closeTab,get count(){return workspaces.length;}};
    window.addEventListener('beforeunload',()=>{if(!switching){capture();persist();}});
    $('project-title')?.addEventListener('input',()=>{if(current()){current().name=$('project-title').value.trim()||'Untitled lesson';render();}});
  }
  // The 3D model and the first project are loaded asynchronously by app.js.
  const timer=setInterval(()=>{if(student()){clearInterval(timer);return;}if(bridge()?.ready()){clearInterval(timer);begin();}},120);
})();
