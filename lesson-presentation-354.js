/* ANATOMIQ_LESSON_PRESENTATION_355
 * Lesson-specific student presentation settings. Reuses the existing
 * Lesson Settings permissions grid and the 2.2.140 published lesson keys.
 * All student-only appearance changes are transient and don't touch 3D data.
 */
(() => {
  'use strict';
  const TAG='ANATOMIQ_LESSON_PRESENTATION_355';
  const defaults=Object.freeze({ht:false,hm:false,hh:false,sc:true,bg:'classic'});
  const $=id=>document.getElementById(id);
  const isStudent=()=>document.body.classList.contains('student-mode') || /^#(?:scene|lesson)=/.test(location.hash);
  function normalize(data){
    const p=data && typeof data==='object'?data:{};
    return {
      ht:p.ht===true,
      hm:p.hm===true,
      // In 2.2.140 ht hid BOTH header and toolbar. Preserve that intent
      // when a 2.2.140 lesson has not yet saved the independent hh key.
      hh:p.hh===undefined?p.ht===true:p.hh===true,
      sc:p.sc!==false,
      bg:p.bg==='white'?'white':'classic'
    };
  }
  let current={...defaults};
  function createControls(){
    // 2.2.139 moves .publish-options into Lesson Settings. Attaching to its
    // original live permissions grid preserves the existing layout and save handlers.
    const grid=document.querySelector('.publish-options .publish-permissions');
    if(!grid || $('anat354-hide-toolbar'))return false;
    // Older experimental prototypes inserted a standalone presentation section;
    // remove it so there is exactly one UI for these settings.
    $('anat354-presentation')?.remove();
    const check=(id,title,description)=>{
      const card=document.createElement('label');card.className='anat355-setting-card';
      const input=document.createElement('input');input.id=id;input.type='checkbox';
      const body=document.createElement('span');
      const strong=document.createElement('strong');strong.textContent=title;
      const help=document.createElement('small');help.textContent=description;
      body.append(strong,help);card.append(input,body);
      input.addEventListener('change',changed);grid.append(card);
    };
    check('anat354-hide-toolbar','Hide toolbar','Hide the 3D tools strip; retain the header and menu bar.');
    check('anat355-hide-menu','Hide menu bar','Hide File, Edit and other student menus in this lesson.');
    check('anat355-hide-header','Hide header','Hide the AnatomIQ branding/header above the viewer.');
    check('anat354-allow-screenshot','Disable screenshots','Remove Take Screenshot from the View menu. This does not block device screenshots.');
    const label=document.createElement('label');label.className='anat355-setting-card anat355-theme-card';
    const content=document.createElement('span');
    const title=document.createElement('strong');title.textContent='Theme';
    const help=document.createElement('small');help.textContent='Student viewer appearance';
    content.append(title,help);
    const select=document.createElement('select');select.id='anat354-background';select.className='text-input';
    select.setAttribute('aria-label','Student viewer theme');
    for(const [value,name] of [['classic','Classic (default)'],['white','White · grayscale']]){
      const option=document.createElement('option');option.value=value;option.textContent=name;select.append(option);
    }
    select.addEventListener('change',changed);
    label.append(content,select);grid.append(label);
    return true;
  }
  function changed(){
    current=read();
    window.dispatchEvent(new CustomEvent('anatomiq:lesson-presentation-change',{detail:{...current}}));
  }
  function read(){
    createControls();
    const toolbar=$('anat354-hide-toolbar'),menu=$('anat355-hide-menu');
    const header=$('anat355-hide-header'),screenshot=$('anat354-allow-screenshot');
    const theme=$('anat354-background');
    if(!toolbar || !menu || !header || !screenshot || !theme)return {...current};
    return normalize({ht:toolbar.checked,hm:menu.checked,hh:header.checked,
      sc:!screenshot.checked,bg:theme.value});
  }
  function write(settings){
    current=normalize(settings);
    createControls();
    const values={
      'anat354-hide-toolbar':current.ht,
      'anat355-hide-menu':current.hm,
      'anat355-hide-header':current.hh,
      'anat354-allow-screenshot':!current.sc
    };
    for(const [id,value] of Object.entries(values))if($(id))$(id).checked=value;
    if($('anat354-background'))$('anat354-background').value=current.bg;
  }
  function apply(settings){
    if(!isStudent())return;
    const state=normalize(settings);
    const body=document.body;
    // Clear the old bundled class, including when a legacy lesson updates.
    body.classList.remove('anat354-hide-chrome');
    body.classList.toggle('anat355-hide-toolbar',state.ht);
    body.classList.toggle('anat355-hide-menubar',state.hm);
    body.classList.toggle('anat355-hide-header',state.hh);
    body.classList.toggle('anat354-no-screenshot',!state.sc);
    body.classList.toggle('anat354-white',state.bg==='white');
    const screenshot=$('anat249-student-screenshot');
    if(screenshot)screenshot.hidden=!state.sc;
    window.dispatchEvent(new Event('resize'));
  }
  function initialize(){
    createControls();
    // App initialization applies the stored lesson settings once loaded.
    if(isStudent())apply(defaults);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
  window.AnatomIQLessonPresentation354=Object.freeze({read,write,apply,normalize,defaults,tag:TAG});
})();
