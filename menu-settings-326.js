/* ANATOMIQ_SETTINGS_FLYOUTS_326
 * Extends 325 without modifying its system View flyouts or rendering engines.
 * Existing render-quality source controls (select / radio / quality action)
 * are the authority; no new quality renderer or locally invented presets.
 */
(() => {
  'use strict';
  if(window.AnatomIQSettingsFlyouts326)return;
  const VIEW_IDS=['menu-view','anat-student-menu-view'];
  const SETTINGS_IDS=['menu-settings','anat-student-menu-settings'];
  const EFFECTS=Object.freeze({
    motion:{label:'Motion Blur',id:'settings-motion-blur'},
    dof:{label:'Depth of Field',id:'settings-dof-mode'}
  });
  function settingsRoot(index){
    const named=document.getElementById(SETTINGS_IDS[index]);
    if(named)return named;
    const bar=document.getElementById(index===0?'studio-menubar':'anat-student-menubar');
    const groups=[...(bar?.querySelectorAll('.menu-group')||[])];
    const group=groups.find(g=>/^settings$/i.test(text(g.querySelector(':scope > .menu-trigger'))));
    return group?.querySelector(':scope > .menu-dropdown')||null;
  }
  const QUALITY_PATTERN=/(?:\b3d\b\s*)?(?:\brender(?:ing|er)?\b\s*)?\bquality\b/i;
  // Match menu names, not generic words like "carousel" in an anatomy lesson.
  const ANIMATION_PATTERN=/^(?:experimental\s+)?chapter\s+(?:animations?|transitions?)(?:\s*\(experimental\)|\s*—\s*experimental)?\s*:?$/i;
  const QUALITY_ATTRIBUTES=['data-render-quality','data-quality-preset','data-quality'];
  const installed=new WeakSet();
  let portal=null,active=null,closeTimer=0;
  let building=false;

  function el(tag,cls,label){const n=document.createElement(tag);if(cls)n.className=cls;if(label!==undefined)n.textContent=label;return n;}
  function text(node){return (node?.textContent||'').replace(/\s+/g,' ').trim();}
  function clearClose(){if(closeTimer){clearTimeout(closeTimer);closeTimer=0;}}
  function close(){
    clearClose();
    if(active?.trigger){active.trigger.classList.remove('anat326-open');active.trigger.setAttribute('aria-expanded','false');}
    active=null;
    if(portal){portal.hidden=true;portal.replaceChildren();}
  }
  function scheduleClose(){clearClose();closeTimer=setTimeout(()=>{
    if(!portal?.contains(document.activeElement))close();
  },210);}
  function ensurePortal(){
    const host=document.fullscreenElement||document.webkitFullscreenElement||document.body;
    if(portal?.isConnected){if(portal.parentNode!==host)host.append(portal);return portal;}
    portal=el('div','anat326-flyout');portal.id='anat326-flyout';portal.hidden=true;
    portal.setAttribute('role','menu');portal.setAttribute('aria-label','Rendering settings');
    // Stop outside-menu handlers in the bubble phase, after each option
    // receives its own click. Capture-phase stopping would block the option.
    portal.addEventListener('pointerdown',e=>e.stopPropagation());
    portal.addEventListener('click',e=>e.stopPropagation());
    portal.addEventListener('pointerenter',clearClose);
    portal.addEventListener('pointerleave',scheduleClose);
    portal.addEventListener('focusin',clearClose);
    portal.addEventListener('keydown',e=>{
      const buttons=[...portal.querySelectorAll('button:not([disabled])')];
      const idx=buttons.indexOf(document.activeElement);
      if(e.key==='ArrowLeft'||e.key==='Escape'){
        e.preventDefault();e.stopPropagation();const back=active?.trigger;close();back?.focus();
      }else if((e.key==='ArrowDown'||e.key==='ArrowUp')&&buttons.length){
        e.preventDefault();e.stopPropagation();
        buttons[(idx+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length].focus();
      }else if((e.key==='Home'||e.key==='End')&&buttons.length){
        e.preventDefault();buttons[e.key==='Home'?0:buttons.length-1].focus();
      }
    });
    host.append(portal);return portal;
  }
  function position(anchor){
    const b=anchor.getBoundingClientRect(),w=portal.offsetWidth||210,h=portal.offsetHeight||40;
    const x=(b.right+w+8<=innerWidth)?b.right-2:(b.left-w+2>=8?b.left-w+2:Math.max(8,innerWidth-w-8));
    const y=Math.max(8,Math.min(b.top,innerHeight-h-8));
    portal.style.left=Math.round(x)+'px';portal.style.top=Math.round(y)+'px';
  }
  function closeParentMenu(trigger){
    const group=trigger?.closest('.menu-group');
    const button=group?.querySelector(':scope > .menu-trigger');
    if(button?.getAttribute('aria-expanded')==='true')button.click();
  }
  function valueOption(label,selected,callback,sourceTrigger){
    const item=el('button','anat326-option');item.type='button';
    item.setAttribute('role','menuitemradio');item.setAttribute('aria-checked',String(selected));
    const check=el('span','anat326-tick',selected?'✓':'');check.setAttribute('aria-hidden','true');
    item.append(check,el('span','anat326-label',label));
    item.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      try{callback();}finally{close();closeParentMenu(sourceTrigger);}
    });
    return item;
  }
  function validOptions(select){
    return [...select.options].filter(o=>!o.disabled&&String(o.value).trim()&&text(o));
  }
  function effectOptions(kind){
    const select=document.getElementById(EFFECTS[kind].id);
    if(!(select instanceof HTMLSelectElement))return [];
    return validOptions(select).map(o=>({value:o.value,label:o.label||o.textContent||o.value,
      selected:select.value===o.value,apply:()=>{
        if(select.value===o.value)return;
        select.value=o.value;select.dispatchEvent(new Event('input',{bubbles:true}));
        select.dispatchEvent(new Event('change',{bubbles:true}));
      }}));
  }
  function looksQualitySelect(select){
    const attr=[select.id,select.name,select.getAttribute('aria-label'),
      document.querySelector(`label[for="${CSS.escape(select.id||'__none__')}"]`)?.textContent].join(' ');
    const options=validOptions(select);
    return QUALITY_PATTERN.test(attr)&&options.length>=2&&options.length<=12;
  }
  function candidateSelects(){
    return [...document.querySelectorAll('select')].filter(looksQualitySelect);
  }
  function isQualityButton(button){
    if(button.closest('[data-anat326-trigger],#anat326-flyout'))return false;
    if(button.matches('[disabled]'))return false;
    return QUALITY_ATTRIBUTES.some(key=>button.hasAttribute(key));
  }
  function qualityOptions(){
    const select=candidateSelects()[0];
    if(select)return validOptions(select).map(o=>({value:o.value,label:o.label||o.textContent||o.value,
      selected:select.value===o.value,apply:()=>{
        if(select.value===o.value)return;
        select.value=o.value;select.dispatchEvent(new Event('input',{bubbles:true}));
        select.dispatchEvent(new Event('change',{bubbles:true}));
      }}));
    // Some builds bind render quality to a labeled radio group.
    const radios=[...document.querySelectorAll('input[type="radio"]')]
      .filter(r=>QUALITY_PATTERN.test([r.id,r.name,r.getAttribute('aria-label')].join(' '))&&!r.disabled);
    if(radios.length>=2)return radios.map(r=>({
      value:r.value,
      label:text(r.labels?.[0])||r.getAttribute('aria-label')||r.value,
      selected:r.checked,
      apply:()=>{if(!r.checked){r.checked=true;r.dispatchEvent(new Event('input',{bubbles:true}));
        r.dispatchEvent(new Event('change',{bubbles:true}));}}
    }));
    // Some AnatomIQ builds use per-preset action buttons instead of a select.
    // Mirror only explicitly tagged source actions; never invent choices.
    const buttons=[...document.querySelectorAll('button')].filter(isQualityButton);
    return buttons.map(b=>({
      value:QUALITY_ATTRIBUTES.map(k=>b.getAttribute(k)||'').find(Boolean)||text(b),
      label:text(b),selected:b.getAttribute('aria-checked')==='true'||b.classList.contains('active'),
      apply:()=>b.click()
    })).filter(o=>o.label);
  }
  function optionsFor(kind){return kind==='quality'?qualityOptions():effectOptions(kind);}
  function open(trigger,focusFirst=false){
    if(!trigger?.isConnected||trigger.closest('.menu-dropdown')?.hidden)return;
    if(active?.trigger===trigger&&!portal.hidden){
      if(focusFirst)portal.querySelector('button:not([disabled])')?.focus();return;
    }
    const kind=trigger.dataset.anat326Trigger;
    const opts=optionsFor(kind);
    if(!opts.length){close();trigger.setAttribute('aria-disabled','true');return;}
    trigger.removeAttribute('aria-disabled');close();ensurePortal();
    for(const opt of opts)portal.append(valueOption(opt.label,opt.selected,opt.apply,trigger));
    portal.hidden=false;portal.setAttribute('aria-label',trigger.textContent.trim()+' options');
    active={trigger,kind};trigger.setAttribute('aria-expanded','true');trigger.classList.add('anat326-open');
    position(trigger);if(focusFirst)portal.querySelector('button:not([disabled])')?.focus();
  }
  function addTrigger(root,kind,before=null){
    let existing=[...root.querySelectorAll('[data-anat326-trigger]')].find(x=>x.dataset.anat326Trigger===kind);
    if(existing)return existing;
    const label=kind==='quality'?'3D Rendering Quality':EFFECTS[kind].label;
    const button=el('button','menu-item anat326-trigger',label);button.type='button';
    button.dataset.anat326Trigger=kind;button.setAttribute('role','menuitem');
    button.setAttribute('aria-haspopup','menu');button.setAttribute('aria-expanded','false');
    button.setAttribute('aria-controls','anat326-flyout');
    if(before)root.insertBefore(button,before);else root.append(button);
    return button;
  }
  function originalQualityItem(root){
    // Look only at direct menu rows; avoid matching headings that encompass
    // other controls. Never remove an existing control until it has a proxy.
    return [...root.children].find(child=>{
      if(child.matches?.('[data-anat326-trigger]'))return false;
      const name=child.matches('button')?text(child):text(child.querySelector(':scope > .menu-item,:scope > button,:scope > .menu-label'));
      return QUALITY_PATTERN.test(name)&&name.length<75;
    })||null;
  }
  function chooseQualityRoot(viewIndex){
    // Keep Quality in its existing menu, if present. Otherwise place it in
    // Settings for that view. Teacher and student get their own menu entry.
    const roots=[settingsRoot(viewIndex),document.getElementById(VIEW_IDS[viewIndex])].filter(Boolean);
    for(const r of roots){if(originalQualityItem(r))return r;}
    return settingsRoot(viewIndex);
  }
  function hideLegacyStudentAnimation(){
    const bar=document.getElementById('anat-student-menubar');if(!bar)return;
    for(const node of bar.querySelectorAll('button.menu-item, [role="menuitem"], .menu-section-title')){
      if(node.closest('[data-anat326-trigger]'))continue;
      const label=text(node).replace(/^[✓✔]\s*/,'');
      if(ANIMATION_PATTERN.test(label)&&!node.hidden){node.hidden=true;node.dataset.anat326HiddenAnimation='true';}
    }
  }
  function hideLegacyEffectRows(){
    for(const rootId of VIEW_IDS){
      const root=document.getElementById(rootId);
      if(!root)continue;
      // Keep original 325 triggers in the DOM; its observer expects them.
      for(const node of root.querySelectorAll('[data-anat324-effect],[data-anat-view-effect]')){
        if(!node.hidden)node.hidden=true;
      }
    }
  }
  function attach(root){
    if(!root||installed.has(root))return;
    installed.add(root);
    root.addEventListener('pointerover',e=>{
      if(e.pointerType==='touch')return;
      const button=e.target.closest?.('[data-anat326-trigger]');
      if(button&&!button.contains(e.relatedTarget)){clearClose();open(button);}
    });
    root.addEventListener('pointerout',e=>{
      const button=e.target.closest?.('[data-anat326-trigger]');
      if(button&&!button.contains(e.relatedTarget)&&!portal?.contains(e.relatedTarget))scheduleClose();
    });
    root.addEventListener('focusin',e=>{
      if(e.target.closest?.('[data-anat326-trigger]'))clearClose();
      else if(active?.trigger?.closest('.menu-dropdown')===root)close();
    });
    root.addEventListener('keydown',e=>{
      const trigger=e.target.closest?.('[data-anat326-trigger]');
      if(trigger&&(e.key==='ArrowRight'||e.key==='Enter'||e.key===' ')){
        e.preventDefault();e.stopImmediatePropagation();open(trigger,true);
      }
    },true);
    root.addEventListener('click',e=>{
      const trigger=e.target.closest?.('[data-anat326-trigger]');
      if(trigger){e.preventDefault();e.stopImmediatePropagation();open(trigger);}
    },true);
    new MutationObserver(()=>scheduleUpgrade()).observe(root,{childList:true,subtree:false});
  }
  function upgrade(){
    if(building)return;
    building=true;
    try{
      hideLegacyEffectRows();hideLegacyStudentAnimation();
      const settings=[settingsRoot(0),settingsRoot(1)].filter(Boolean);
      for(const root of settings){
        attach(root);
        addTrigger(root,'motion');addTrigger(root,'dof');
      }
      for(let i=0;i<2;i++){
        const qualityRoot=chooseQualityRoot(i);
        if(!qualityRoot)continue;
        attach(qualityRoot);
        const source=originalQualityItem(qualityRoot);
        if(qualityOptions().length){
          addTrigger(qualityRoot,'quality',source);
          if(source&&!source.hidden){source.hidden=true;source.dataset.anat326HiddenQuality='true';}
        }
      }
      if(active && (!active.trigger.isConnected||active.trigger.closest('.menu-dropdown')?.hidden))close();
    }finally{building=false;}
  }
  let scheduled=false;
  function scheduleUpgrade(){
    if(scheduled)return;scheduled=true;
    queueMicrotask(()=>{scheduled=false;upgrade();});
  }
  function install(){
    ensurePortal();upgrade();
    const barIds=['studio-menubar','anat-student-menubar'];
    for(const id of barIds){
      const bar=document.getElementById(id);
      if(bar)new MutationObserver(scheduleUpgrade).observe(bar,{childList:true,subtree:false});
    }
    if(!settingsRoot(1)){
      const watcher=new MutationObserver(()=>{
        upgrade();
        if(settingsRoot(0)&&settingsRoot(1))watcher.disconnect();
      });
      watcher.observe(document.body,{childList:true,subtree:true});
    }
    document.addEventListener('pointerdown',e=>{
      if(portal?.contains(e.target))return;
      if(active&&!active.trigger.contains(e.target)&&!e.target.closest?.('.menu-trigger'))close();
    },true);
    document.addEventListener('click',e=>{
      if(portal?.contains(e.target))return;
      if(active&&!active.trigger.contains(e.target)&&!e.target.closest?.('.menu-trigger'))close();
    },true);
    document.addEventListener('change',e=>{
      if(e.target?.matches?.('select')&&active?.kind==='quality'&&looksQualitySelect(e.target))close();
    },true);
    document.addEventListener('fullscreenchange',()=>{close();ensurePortal();});
    window.addEventListener('resize',()=>{if(active)position(active.trigger);});
    window.addEventListener('scroll',()=>{if(active)position(active.trigger);},true);
    window.AnatomIQSettingsFlyouts326=Object.freeze({upgrade,close,qualityOptions});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
