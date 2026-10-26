/* AnatomIQ Studio 2.2.40: Teacher tool mode UI. 3D picking is handled in app.js. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const teacher = () => !/^#(?:lesson|scene)=/.test(location.hash) && !document.body.classList.contains('student-mode');
  const paths={
    orbit:['M4 9V4h5','M20 15v5h-5','M4 4l5 5','M20 20l-5-5','M16 3a9 9 0 0 1 5 7','M8 21a9 9 0 0 1-5-7'],
    select:['M4 3l15 9-7 1-3 7z'],
    paint:['M14 5l5 5','M5 14l9-9 5 5-9 9-5 1z','M3 21l5-1-4-4z'],
    labels:['M20 12l-8 8-9-9V4h7z','M7.5 8h.01']
  };
  const icon = name => {
    const ns='http://www.w3.org/2000/svg',s=document.createElementNS(ns,'svg');
    s.setAttribute('viewBox','0 0 24 24');s.setAttribute('width','20');s.setAttribute('height','20');
    s.setAttribute('fill','none');s.setAttribute('stroke','currentColor');s.setAttribute('stroke-width','1.9');
    s.setAttribute('stroke-linecap','round');s.setAttribute('stroke-linejoin','round');s.setAttribute('aria-hidden','true');
    for(const d of paths[name]){const p=document.createElementNS(ns,'path');p.setAttribute('d',d);s.append(p);}return s;
  };
  let mode='orbit',drag=null,selectionRule='touching',barButtons=new Map(),selectionOverlay,selectionRect,context,paintSection,labelSection,selectSection;
  function toast(message){const t=$('app-toast');if(t){t.textContent=message;t.hidden=false;}else console.info(message);}
  function openRight(){
    if(window.__AnatomIQResponsivePanels?.toggle){window.__AnatomIQResponsivePanels.toggle('right',true);return;}
    const panel=$('info-sidebar');if(!panel)return;
    if(!panel.classList.contains('open'))$('details-toggle')?.click();
  }
  function showContext(){
    document.body.classList.toggle('anat-teacher-tool-active',teacher()&&mode!=='orbit');
    if(context)context.hidden=mode==='orbit';
    if(paintSection)paintSection.hidden=mode!=='paint';
    if(labelSection)labelSection.hidden=mode!=='labels';
    if(selectSection)selectSection.hidden=mode!=='select';
    if(selectionOverlay)selectionOverlay.hidden=mode!=='select';
    barButtons.forEach((button,key)=>{
      const current=key===mode;
      button.classList.toggle('anat-tool-active',current);
      button.setAttribute('aria-pressed',String(current));
    });
    if(mode!=='orbit'&&teacher())openRight();
  }
  function stopOldTool(){
    if($('paint-mode')?.getAttribute('aria-pressed')==='true')$('paint-mode').click();
    if($('place-label')?.classList.contains('placing'))$('place-label').click();
  }
  function setMode(next){
    if(!teacher())return;
    if(mode===next)next='orbit';
    if(drag)finishDrag(true);
    stopOldTool();
    mode=next;
    if(mode==='paint')$('paint-mode')?.click();
    showContext();
  }
  function point(ev){const r=selectionOverlay.getBoundingClientRect();return {x:Math.max(0,Math.min(r.width,ev.clientX-r.left)),y:Math.max(0,Math.min(r.height,ev.clientY-r.top))};}
  function draw(){
    if(!drag)return;
    const x=Math.min(drag.a.x,drag.b.x),y=Math.min(drag.a.y,drag.b.y);
    Object.assign(selectionRect.style,{left:`${x}px`,top:`${y}px`,width:`${Math.abs(drag.b.x-drag.a.x)}px`,height:`${Math.abs(drag.b.y-drag.a.y)}px`});
  }
  function finishDrag(cancel=false){
    if(!drag)return;
    const d=drag;drag=null;selectionRect.hidden=true;
    if(cancel)return;
    const frame=selectionOverlay.getBoundingClientRect();
    if(frame.width<1||frame.height<1)return;
    const small=Math.hypot(d.b.x-d.a.x,d.b.y-d.a.y)<6;
    window.dispatchEvent(new CustomEvent('anatomiq:teacher-box-select',{detail:{
      x0:Math.min(d.a.x,d.b.x)/frame.width,x1:Math.max(d.a.x,d.b.x)/frame.width,
      y0:Math.min(d.a.y,d.b.y)/frame.height,y1:Math.max(d.a.y,d.b.y)/frame.height,
      point:small,additive:d.additive,contained:selectionRule==='contained'
    }}));
  }
  function createOverlay(){
    const stage=$('canvas-container');if(!stage||$('anat-select-surface'))return;
    selectionOverlay=document.createElement('div');selectionOverlay.id='anat-select-surface';selectionOverlay.hidden=true;
    selectionOverlay.setAttribute('aria-label','Drag to select anatomical structures');
    selectionRect=document.createElement('div');selectionRect.id='anat-selection-rectangle';selectionRect.hidden=true;
    selectionOverlay.append(selectionRect);stage.append(selectionOverlay);
    selectionOverlay.addEventListener('pointerdown',ev=>{
      if(!teacher()||mode!=='select'||ev.button!==0)return;
      ev.preventDefault();ev.stopPropagation();
      const a=point(ev);drag={a,b:a,additive:ev.shiftKey||ev.metaKey||ev.ctrlKey,id:ev.pointerId};
      selectionOverlay.setPointerCapture(ev.pointerId);selectionRect.hidden=false;draw();
    });
    selectionOverlay.addEventListener('pointermove',ev=>{if(drag&&drag.id===ev.pointerId){drag.b=point(ev);draw();}});
    selectionOverlay.addEventListener('pointerup',ev=>{if(drag&&drag.id===ev.pointerId){drag.b=point(ev);finishDrag();}});
    selectionOverlay.addEventListener('pointercancel',()=>finishDrag(true));
    selectionOverlay.addEventListener('lostpointercapture',()=>finishDrag(true));
  }
  function makeTool(key,label){
    const b=document.createElement('button');b.type='button';b.className='anat-tool anat-mode-tool';
    b.dataset.tool=key;b.title=label;b.setAttribute('aria-label',label);b.setAttribute('aria-pressed','false');
    b.append(icon(key));const text=document.createElement('span');text.className='anat-mode-caption';text.textContent=label;b.append(text);
    b.addEventListener('click',()=>setMode(key));barButtons.set(key,b);return b;
  }
  function makeSelectOptions(){
    const section=document.createElement('section');section.className='anat-select-options';section.hidden=true;
    const header=document.createElement('div');header.className='eyebrow';header.textContent='SELECT STRUCTURES';
    const p=document.createElement('p');p.className='annotation-help';p.textContent='Drag a rectangle across the viewer to select structures. The camera stays stationary while Select is active. Hold Shift or Command to add to a selection.';
    const label=document.createElement('label');label.className='field-label';label.htmlFor='anat-select-rule';label.textContent='Selection region';
    const select=document.createElement('select');select.id='anat-select-rule';select.className='text-input';
    for(const [val,txt] of [['touching','Touching rectangle'],['contained','Fully inside rectangle']]){
      const opt=document.createElement('option');opt.value=val;opt.textContent=txt;select.append(opt);
    }
    select.addEventListener('change',()=>{selectionRule=select.value;});
    const clear=document.createElement('button');clear.type='button';clear.className='button subtle full';clear.textContent='Clear selected structures';
    clear.addEventListener('click',()=>$('clear-selection')?.click());
    section.append(header,p,label,select,clear);return section;
  }
  function createContext(){
    const panel=$('info-sidebar');if(!panel||$('anat-tool-context'))return;
    paintSection=panel.querySelector('.paint-editor.teacher-only');
    labelSection=panel.querySelector('.annotation-editor.teacher-only[aria-label="Annotation editor"]');
    if(!paintSection||!labelSection)throw new Error('Required teacher Paint/Label editor sections are missing');
    context=document.createElement('div');context.id='anat-tool-context';context.hidden=true;
    context.className='anat-tool-context teacher-only';
    const heading=document.createElement('div');heading.className='anat-tool-heading';heading.textContent='TOOL OPTIONS';
    selectSection=makeSelectOptions();
    // Reparent original controls: all existing listeners and chapter logic are preserved.
    context.append(heading,selectSection,paintSection,labelSection);
    panel.querySelector('.info-top')?.insertAdjacentElement('afterend',context);
    if(!context.parentNode)panel.prepend(context);
  }
  function createTools(){
    if(!teacher())return;
    const bar=$('anat-unified-toolbar');if(!bar||$('anat-tool-mode-group'))return;
    const group=document.createElement('div');group.id='anat-tool-mode-group';group.className='anat-toolbar-group';
    group.setAttribute('role','group');group.setAttribute('aria-label','Teacher tools');
    for(const [name,title] of [['orbit','Orbit'],['select','Select'],['paint','Paint'],['labels','Labels']])group.append(makeTool(name,title));
    // Keep camera presets first and separate teacher editing actions from navigation.
    const history=bar.querySelector('.anat-history-tools');
    const sep=document.createElement('span');sep.className='anat-toolbar-separator';sep.setAttribute('aria-hidden','true');
    if(history){bar.insertBefore(group,history);bar.insertBefore(sep,history);}else bar.append(group);
    createContext();createOverlay();showContext();
    document.addEventListener('keydown',ev=>{
      if(ev.key!=='Escape'||mode==='orbit'||!teacher()||ev.target.closest('input,textarea,select,[contenteditable]'))return;
      setMode('orbit');
    });
    // If the existing Paint/Label commands are canceled by their own Escape handlers,
    // reflect that state without attempting to override the original commands.
    const originalPaint=$('paint-mode');
    const syncPaint=()=>{if(mode==='paint'&&originalPaint?.getAttribute('aria-pressed')!=='true'){mode='orbit';showContext();}};
    originalPaint?.addEventListener('click',()=>queueMicrotask(syncPaint));
    if(originalPaint)new MutationObserver(syncPaint).observe(originalPaint,{attributes:true,attributeFilter:['aria-pressed']});
    window.__AnatomIQTeacherTools={get mode(){return mode;},setMode,version:'2.2.40'};
  }
  function init(){
    if(!teacher())return;
    try{createTools();}catch(e){console.error('AnatomIQ teacher tools initialization:',e);return;}
    if(!$('anat-tool-mode-group')){
      const observer=new MutationObserver(()=>{if($('anat-unified-toolbar')){observer.disconnect();createTools();}});
      observer.observe(document.body,{childList:true,subtree:true});
      window.setTimeout(()=>observer.disconnect(),10000);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
