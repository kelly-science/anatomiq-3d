/* ANATOMIQ_LOADING_EXPERIENCE_376 — read-only theme bridge for lesson loader.
 * Does not load 3D assets, modify assessment state, or change progress reporting.
 */
(function(){
  'use strict';
  const root=document.documentElement;
  function choose(bg){
    if(bg!=='white'&&bg!=='classic')return false;
    root.dataset.aiqLoadTheme=bg==='white'?'light':'dark';
    return true;
  }
  function setProject(project){
    if(!project||typeof project!=='object')return false;
    const chapters=Array.isArray(project.chapters)?project.chapters:[];
    const idx=Number.isInteger(project.start)?project.start:0;
    const start=chapters[idx]||chapters[0];
    // Lesson presentation is stored in sp.bg: 'white' or 'classic'.
    return choose(project.sp?.bg)||choose(start?.sp?.bg);
  }
  function complete(){root.classList.remove('aiq376-boot');}
  window.AnatomIQLoading376=Object.freeze({setProject,complete});
  // The embed preview has already read the published theme. Carry it through
  // without waiting for another small JSON download. Ignore arbitrary values.
  const preset=new URLSearchParams(location.search).get('aiqTheme');
  if(preset==='light'||preset==='dark')root.dataset.aiqLoadTheme=preset;
  const loader=document.getElementById('loader');
  if(!loader)return;
  // Detach the existing loader from the viewer's overflow/stacking contexts.
  // All existing app.js references and event handlers still target this node.
  document.body.appendChild(loader);
  // The app remains the authority for completion. The bootstrap simply shields
  // the unfinished teacher-style shell until the app marks its loader hidden.
  const observer=new MutationObserver(()=>{if(loader.hidden){complete();observer.disconnect();}});
  observer.observe(loader,{attributes:true,attributeFilter:['hidden']});
  if(loader.hidden){complete();observer.disconnect();}
})();
