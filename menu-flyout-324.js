/* ANATOMIQ_FLYOUT_MENUS_324
 * macOS-inspired hover / keyboard / touch flyouts for AnatomIQ View menus.
 * Reuses the existing Settings selectors; no saved scene or lesson data changes.
 */
(() => {
  'use strict';
  if (window.AnatomIQFlyout324) return;

  const EFFECTS = Object.freeze({
    motion: {name:'Motion Blur', select:'settings-motion-blur', choices:[['off','Off'],['subtle','Subtle'],['cinematic','Cinematic'],['extreme','Extreme']]},
    dof: {name:'Depth of Field', select:'settings-dof-mode', choices:[['off','Off'],['subtle','Subtle'],['cinematic','Cinematic']]}
  });
  const VIEW_ROOTS = ['menu-view','anat-student-menu-view'];
  let portal = null, active = null, closeTimer = 0;
  const prepared = new WeakSet();
  const preparedBars = new WeakSet();

  function element(tag,className,text){
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text !== undefined)node.textContent=text;
    return node;
  }
  function ensurePortal(){
    if(portal?.isConnected)return portal;
    portal=element('div','anat324-flyout');
    portal.id='anat324-flyout';portal.hidden=true;
    portal.setAttribute('role','menu');portal.setAttribute('aria-label','View submenu');
    portal.addEventListener('pointerenter',clearClose);
    portal.addEventListener('pointerleave',scheduleClose);
    portal.addEventListener('focusin',clearClose);
    portal.addEventListener('keydown',event=>{
      const items=[...portal.querySelectorAll('button:not([disabled])')];
      const index=items.indexOf(document.activeElement);
      if(event.key==='Escape'||event.key==='ArrowLeft'){
        event.preventDefault();event.stopPropagation();
        const restore=active?.trigger;close();restore?.focus();
      }else if(event.key==='ArrowDown'||event.key==='ArrowUp'){
        event.preventDefault();event.stopPropagation();
        items[(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();
      }else if(event.key==='Home'||event.key==='End'){
        event.preventDefault();items[event.key==='Home'?0:items.length-1]?.focus();
      }
    });
    document.body.append(portal);return portal;
  }
  function clearClose(){if(closeTimer){clearTimeout(closeTimer);closeTimer=0;}}
  function scheduleClose(){clearClose();closeTimer=setTimeout(()=>{
    // A keyboard user may have focused an actual submenu item.
    if(!portal?.contains(document.activeElement))close();
  },190);}
  function close(){
    clearClose();
    if(active?.trigger){
      active.trigger.classList.remove('anat324-active');
      active.trigger.setAttribute('aria-expanded','false');
      active.trigger.querySelector?.('.view-system-button')?.setAttribute('aria-expanded','false');
    }
    active=null;
    if(portal){portal.hidden=true;portal.replaceChildren();}
  }
  function position(anchor){
    if(!portal)return;
    const r=anchor.getBoundingClientRect();
    const width=portal.offsetWidth||220,height=portal.offsetHeight||36;
    const vw=window.innerWidth,vh=window.innerHeight;
    const right=r.right-2,left=r.left-width+2;
    const x=right+width+9<=vw ? right : left>=8 ? left : Math.max(8,Math.min(right,vw-width-8));
    const y=Math.max(8,Math.min(r.top,vh-height-8));
    portal.style.left=Math.round(x)+'px';portal.style.top=Math.round(y)+'px';
  }
  function checkedOption(label,on){
    const b=element('button','anat324-option');b.type='button';
    const tick=element('span','anat324-check',on?'✓':'');tick.setAttribute('aria-hidden','true');
    const title=element('span','anat324-option-label',label);
    b.append(tick,title);return b;
  }
  function closeParentMenu(trigger){
    const group=trigger.closest('.menu-group');
    const top=group?.querySelector(':scope > .menu-trigger');
    // Invoke the application's existing menu manager; do not alter its state.
    if(top?.getAttribute('aria-expanded')==='true')top.click();
  }
  function effectContent(kind,anchor){
    const spec=EFFECTS[kind],select=document.getElementById(spec.select);
    if(!select)return false;
    for(const [value,label] of spec.choices){
      // Hidden/disabled values in Settings must not be available from View.
      if(![...select.options].some(opt=>opt.value===value&&!opt.disabled))continue;
      const b=checkedOption(label,select.value===value);
      b.setAttribute('role','menuitemradio');b.setAttribute('aria-checked',String(select.value===value));
      b.dataset.anat324Value=value;
      b.addEventListener('click',event=>{
        event.preventDefault();event.stopPropagation();
        if(select.value!==value){select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));}
        syncChecks();const origin=anchor;close();closeParentMenu(origin);
      });
      portal.append(b);
    }
    return !!portal.children.length;
  }
  function systemContent(anchor){
    const group=anchor.closest('.view-system-group');
    const hidden=group?.querySelector('.view-submenu');
    if(!hidden)return false;
    for(const source of hidden.querySelectorAll('button.menu-item')){
      const item=checkedOption(source.textContent.replace(/^\s*✓\s*/,''),false);
      item.classList.toggle('anat324-disabled',source.disabled);
      item.disabled=source.disabled;
      item.setAttribute('role','menuitem');
      if(source.getAttribute('aria-checked')!=null){
        item.setAttribute('role','menuitemcheckbox');
        item.setAttribute('aria-checked',source.getAttribute('aria-checked'));
        item.querySelector('.anat324-check').textContent=source.getAttribute('aria-checked')==='true'?'✓':'';
      }
      item.addEventListener('click',event=>{
        event.preventDefault();event.stopPropagation();
        close();
        // Source item stays inside the original View menu, so existing handlers
        // for skeletal, teeth, eye, muscle and cardio presets remain canonical.
        if(!source.disabled)source.click();
        closeParentMenu(anchor);
      });
      portal.append(item);
    }
    return !!portal.children.length;
  }
  function open(anchor,{focusFirst=false}={}){
    if(!anchor?.isConnected)return;
    const root=anchor.closest('.menu-dropdown');
    if(!root||root.hidden)return;
    if(active?.trigger===anchor && !portal.hidden){
      if(focusFirst)portal.querySelector('button:not([disabled])')?.focus();
      return;
    }
    close();ensurePortal();
    const kind=anchor.dataset.anat324Effect;
    const success=kind?effectContent(kind,anchor):systemContent(anchor);
    if(!success){close();return;}
    portal.setAttribute('aria-label',kind?EFFECTS[kind].name+' options':'Anatomical system views');
    portal.hidden=false;
    active={trigger:anchor,root,kind};
    anchor.classList.add('anat324-active');anchor.setAttribute('aria-expanded','true');
    anchor.querySelector?.('.view-system-button')?.setAttribute('aria-expanded','true');
    position(anchor);
    if(focusFirst)portal.querySelector('button:not([disabled])')?.focus();
  }
  function triggerFor(event){return event.target?.closest?.('[data-anat324-effect], .anat324-system-head');}
  function syncChecks(){
    for(const kind of Object.keys(EFFECTS)){
      const select=document.getElementById(EFFECTS[kind].select);
      for(const trigger of document.querySelectorAll(`[data-anat324-effect="${kind}"]`)){
        const value=select?.value||'off';
        trigger.dataset.anat324Selected=value;
        trigger.setAttribute('aria-label',`${EFFECTS[kind].name}: ${value}`);
      }
    }
    if(active?.kind){
      const value=document.getElementById(EFFECTS[active.kind].select)?.value;
      for(const b of portal.querySelectorAll('[data-anat324-value]')){
        const yes=b.dataset.anat324Value===value;
        b.setAttribute('aria-checked',String(yes));
        b.querySelector('.anat324-check').textContent=yes?'✓':'';
      }
    }
  }
  function setupEffectTriggers(root){
    if(root.querySelector('[data-anat324-effect]'))return;
    const originals=[...root.querySelectorAll('button[data-anat-view-effect]')];
    // Keep old controls inside the menu; the legacy scripts can still sync them.
    // Only their UI is hidden; the existing renderer Settings selectors are used.
    if(originals.length){
      const preceding=originals[0].previousElementSibling;
      if(preceding?.classList.contains('view-menu-caption')&&preceding.textContent.trim()==='ACCESSIBILITY')preceding.hidden=true;
      for(const original of originals)original.hidden=true;
    }
    const divider=element('div','menu-separator anat324-separator');divider.setAttribute('role','separator');
    if(!originals.length)root.append(divider);
    const first=originals[0]||null;
    for(const kind of ['motion','dof']){
      const item=element('button','menu-item anat324-flyout-trigger',EFFECTS[kind].name);
      item.type='button';item.dataset.anat324Effect=kind;
      item.setAttribute('role','menuitem');item.setAttribute('aria-haspopup','menu');
      item.setAttribute('aria-expanded','false');item.setAttribute('aria-controls','anat324-flyout');
      if(first)root.insertBefore(item,first);else root.append(item);
    }
    syncChecks();
  }
  function setupSystemRows(root){
    for(const group of root.querySelectorAll('.view-system-group')){
      const source=group.querySelector('.view-submenu');
      if(!source?.querySelector('.menu-item'))continue;
      const head=group.querySelector('.view-system-head');
      if(!head)continue;
      head.classList.add('anat324-system-head');
      head.dataset.anat324System=group.dataset.system||'';
      head.setAttribute('aria-haspopup','menu');head.setAttribute('aria-expanded','false');
      const control=head.querySelector('.view-system-button');
      if(control){control.setAttribute('aria-haspopup','menu');control.setAttribute('aria-expanded','false');control.setAttribute('aria-controls','anat324-flyout');}
      // Original inline list stays available to existing source handlers but is
      // visually removed; its chevron toggle is no longer an interactive target.
      group.querySelector('.view-submenu-toggle')?.setAttribute('hidden','');
      source.hidden=true;
      group.dataset.open='false';
    }
  }
  function upgrade(root){
    if(!root)return;
    if(active?.root===root && (root.hidden || !active.trigger.isConnected))close();
    // Teacher View is rebuilt on every opening, so upgrade newly-created rows.
    if(!root.querySelector('[data-anat324-effect]'))setupEffectTriggers(root);
    setupSystemRows(root);
    syncChecks();
  }
  function attach(root){
    if(!root)return;
    if(!prepared.has(root)){
      prepared.add(root);
      root.addEventListener('pointerover',e=>{
        if(e.pointerType==='touch')return;
        const trigger=triggerFor(e);
        if(!trigger || trigger.contains(e.relatedTarget))return;
        clearClose();open(trigger);
      });
      root.addEventListener('pointerout',e=>{
        const trigger=triggerFor(e);if(!trigger||trigger.contains(e.relatedTarget))return;
        if(!portal?.contains(e.relatedTarget))scheduleClose();
      });
      root.addEventListener('focusin',e=>{
        const trigger=triggerFor(e);if(trigger){clearClose();return;}
        if(active?.root===root)close();
      });
      root.addEventListener('keydown',e=>{
        const trigger=triggerFor(e);
        if(!trigger)return;
        if(e.key==='ArrowRight'||e.key==='Enter'&&e.altKey){
          e.preventDefault();e.stopPropagation();open(trigger,{focusFirst:true});
        }else if(e.key==='Escape'){close();}
      },true);
      root.addEventListener('click',e=>{
        const trigger=triggerFor(e);
        // Effect parent is a menu action; it opens the flyout on click or tap.
        if(trigger?.dataset.anat324Effect){
          e.preventDefault();e.stopPropagation();open(trigger,{focusFirst:false});
        }
      },true);
      // Touching a system row opens its submenu, while mouse-clicking the name
      // retains the existing select-system behavior. Intercept before root's
      // original delegated click handler via a document capture listener below.
      new MutationObserver(()=>upgrade(root)).observe(root,{childList:true,attributes:true,attributeFilter:['hidden']});
    }
    upgrade(root);
  }
  function setupMenubar(bar){
    if(!bar||preparedBars.has(bar))return;
    preparedBars.add(bar);
    bar.addEventListener('pointerover',e=>{
      if(e.pointerType==='touch')return;
      const target=e.target.closest?.('.menu-group > .menu-trigger');
      if(!target||target.contains(e.relatedTarget))return;
      const opened=bar.querySelector('.menu-group > .menu-trigger[aria-expanded="true"]');
      if(opened && opened!==target){close();target.click();}
    });
  }
  function detect(){
    for(const id of VIEW_ROOTS)attach(document.getElementById(id));
    setupMenubar(document.getElementById('studio-menubar'));
    setupMenubar(document.getElementById('anat-student-menubar'));
  }
  function install(){
    ensurePortal();detect();
    // A student menubar is built on DOMContentLoaded and may mount after us.
    const watch=new MutationObserver(()=>{
      detect();
      if(VIEW_ROOTS.every(id=>document.getElementById(id)))watch.disconnect();
    });
    if(!document.getElementById(VIEW_ROOTS[1]))watch.observe(document.body,{childList:true,subtree:true});
    document.addEventListener('change',e=>{
      if(e.target?.id==='settings-motion-blur'||e.target?.id==='settings-dof-mode')syncChecks();
    },true);
    document.addEventListener('pointerdown',e=>{
      if(portal?.contains(e.target)){
        // The app's document-level outside-click handler would otherwise close
        // the parent menu before a portaled option receives its click.
        e.stopPropagation();return;
      }
      if(e.pointerType==='touch'){
        const row=e.target.closest?.('.anat324-system-head');
        if(row){
          row.dataset.anat324Touched='1';open(row);
        }
      }
      if(active && !portal.contains(e.target) && !active.trigger.contains(e.target) &&
         !e.target.closest?.('.menu-trigger'))close();
    },true);
    document.addEventListener('click',e=>{
      const row=e.target.closest?.('.anat324-system-head');
      if(row?.dataset.anat324Touched==='1'){
        row.dataset.anat324Touched='';e.preventDefault();e.stopImmediatePropagation();open(row);return;
      }
      if(active && !portal.contains(e.target) && !active.trigger.contains(e.target) &&
         !e.target.closest?.('.menu-trigger'))close();
    },true);
    // The teacher and student menus live in different bars; no scene state touched.
    window.addEventListener('resize',()=>{if(active)position(active.trigger);});
    window.addEventListener('scroll',()=>{if(active)position(active.trigger);},true);
    window.addEventListener('hashchange',close);
    document.addEventListener('fullscreenchange',close);
    window.AnatomIQFlyout324=Object.freeze({close,sync:syncChecks,upgrade:detect});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
