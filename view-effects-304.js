/* AnatomIQ 2.2.93 — accessibility toggles in View menus.
   Uses the existing rendering Settings selectors; no scene, chapter, or lesson
   objects are read or modified. Both preferences remain browser-local. */
(() => {
  'use strict';
  if (window.AnatomIQViewEffects304) return;
  const EFFECTS = Object.freeze({
    motion: {label:'Motion Blur', control:'settings-motion-blur', defaultOn:'extreme',
      lastKey:'anatomiq-view-motion-restore-304'},
    dof: {label:'Depth of Field', control:'settings-dof-mode', defaultOn:'cinematic',
      lastKey:'anatomiq-view-dof-restore-304'}
  });
  function storageRead(key){try{return localStorage.getItem(key);}catch{return null;}}
  function storageWrite(key,value){try{localStorage.setItem(key,value);}catch{}}
  function selectFor(kind){return document.getElementById(EFFECTS[kind]?.control);}
  function isOn(kind){const select=selectFor(kind);return !!select && select.value!=='off';}
  function sync(){
    document.querySelectorAll('[data-anat-view-effect]').forEach(item=>{
      const spec=EFFECTS[item.dataset.anatViewEffect];if(!spec)return;
      const on=isOn(item.dataset.anatViewEffect);
      item.textContent=(on?'✓  ':'     ')+spec.label;
      item.setAttribute('role','menuitemcheckbox');
      item.setAttribute('aria-checked',String(on));
      item.setAttribute('aria-label',spec.label+(on?' on':' off'));
    });
  }
  function toggle(kind){
    const spec=EFFECTS[kind],select=selectFor(kind);
    if(!spec||!select||select.disabled)return false;
    const wasOn=select.value!=='off';
    if(wasOn){
      storageWrite(spec.lastKey,select.value);
      select.value='off';
    }else{
      const prior=storageRead(spec.lastKey);
      select.value=prior && prior!=='off' && [...select.options].some(o=>o.value===prior)
        ?prior:spec.defaultOn;
    }
    // Existing DOF and motion controllers own persistence + shader changes.
    // This does NOT invoke scene autosave, teacher drafts, or publication.
    select.dispatchEvent(new Event('change',{bubbles:true}));
    sync();
    return true;
  }
  function append(root,{student=false}={}){
    if(!root||root.querySelector('[data-anat-view-effect]'))return;
    const divider=document.createElement('div');divider.className='menu-separator';divider.setAttribute('role','separator');
    const caption=document.createElement('div');caption.className='view-menu-caption';caption.textContent='ACCESSIBILITY';
    root.append(divider,caption);
    for(const kind of ['motion','dof']){
      const item=document.createElement('button');
      item.type='button';item.className='menu-item';
      item.dataset.anatViewEffect=kind;
      item.setAttribute('role','menuitemcheckbox');
      if(student)item.addEventListener('click',()=>{
        toggle(kind);
        // Use the existing student menu manager to close; it also clears its
        // internal openStudentMenu flag so View opens normally next time.
        const trigger=item.closest('.menu-group')?.querySelector('.menu-trigger');
        if(trigger?.getAttribute('aria-expanded')==='true')trigger.click();
      });
      root.append(item);
    }
    sync();
  }
  // Keep View menu checkmarks consistent with Settings > App Settings.
  for(const kind of Object.keys(EFFECTS)){
    document.addEventListener('change',event=>{
      const spec=EFFECTS[kind];
      if(event.target?.id!==spec.control)return;
      if(event.target.value!=='off')storageWrite(spec.lastKey,event.target.value);
      sync();
    });
  }
  window.AnatomIQViewEffects304=Object.freeze({append,toggle,sync,isOn});
})();
