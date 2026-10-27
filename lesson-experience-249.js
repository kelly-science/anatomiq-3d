/* AnatomIQ 2.2.49 — menu actions, structure note dialog, responsive chapter bar.
   Rendering, BVH occlusion, and saved geometry are untouched. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const isStudent = () => /^#(?:lesson|scene)=/.test(location.hash)||document.body.classList.contains('student-mode');
  const bridge = () => window.__AnatomIQ249;
  const actionButton = (label, id, action) => {
    const node=document.createElement('button');node.className='menu-item';node.type='button';node.id=id;
    node.setAttribute('role','menuitem');node.textContent=label;node.addEventListener('click', async()=>{
      const menu=node.closest('.menu-dropdown');
      menu?.closest('.menu-group')?.querySelector('.menu-trigger')?.click();
      try{await action();}catch(e){console.error(e);window.alert(e.message||String(e));}
    });return node;
  };
  function addActions(){
    const teacherView=$('menu-view');
    if(teacherView && !$('anat249-teacher-screenshot')){
      teacherView.append(actionButton('Take Screenshot','anat249-teacher-screenshot',()=>bridge()?.screenshot()));
      teacherView.append(actionButton('Open Student Preview','anat249-student-preview',()=>bridge()?.preview()));
    }
    // Student View menus are built dynamically by interface-2221.js.
    const studentView=$('anat-student-menubar')?.querySelector('.menu-group[data-menu="view"] .menu-dropdown');
    if(studentView && !$('anat249-student-screenshot'))
      studentView.append(actionButton('Take Screenshot','anat249-student-screenshot',()=>bridge()?.screenshot()));
  }
  function editor(){
    if(isStudent()||$('anat249-edit-detail'))return;
    const text=$('selected-description');if(!text)return;
    const edit=document.createElement('button');edit.type='button';edit.id='anat249-edit-detail';
    edit.className='button subtle anat249-edit-detail';edit.textContent='✎ Edit Location & Notes';
    text.insertAdjacentElement('afterend',edit);
    const modal=document.createElement('div');modal.id='anat249-modal';modal.className='anat249-modal';modal.hidden=true;
    modal.innerHTML='<div class="anat249-dialog" role="dialog" aria-modal="true" aria-labelledby="anat249-dialog-title"><h2 id="anat249-dialog-title">Location & Notes</h2><p>These changes apply only to this structure in this chapter.</p><label for="anat249-location">Location</label><textarea id="anat249-location" rows="3" maxlength="1200"></textarea><label for="anat249-notes">Notes</label><textarea id="anat249-notes" rows="5" maxlength="2000"></textarea><div class="anat249-actions"><button id="anat249-cancel" class="button subtle" type="button">Cancel</button><button id="anat249-save" class="button primary" type="button">Save for this chapter</button></div></div>';
    document.body.append(modal);
    const close=()=>{modal.hidden=true;edit.focus();};
    edit.addEventListener('click',()=>{const state=bridge()?.getSelected();if(!state)return;
      $('anat249-dialog-title').textContent='Edit '+state.name;
      $('anat249-location').value=state.location||'';$('anat249-notes').value=state.notes||'';
      modal.hidden=false;$('anat249-location').focus();});
    $('anat249-cancel').addEventListener('click',close);
    modal.addEventListener('click',event=>{if(event.target===modal)close();});
    modal.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
    $('anat249-save').addEventListener('click',()=>{
      try{bridge()?.updateSelected($('anat249-location').value,$('anat249-notes').value);close();}
      catch(e){window.alert(e.message);}
    });
    function refresh(){
      const state=bridge()?.getSelected();
      const active=document.querySelector('.anat-tool-active')?.dataset.tool;
      edit.hidden=!state||!bridge()?.teacher|| (active&&active!=='orbit');
    }
    document.addEventListener('anatomiq:selection-change',refresh);
    document.addEventListener('click',()=>queueMicrotask(refresh));
    refresh();
  }
  function begin(){
    addActions();editor();
    const observer=new MutationObserver(()=>addActions());
    const target=$('studio-menubar')?.parentElement||document.body;
    observer.observe(target,{subtree:true,childList:true});
    document.addEventListener('anatomiq:lesson-loaded',()=>editor());
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',begin,{once:true});else begin();
})();
