/* ANATOMIQ_UI_CLEANUP_353 — text-only chapter controls and coherent menu layout.
 * Existing controls and click handlers remain authoritative.
 */
(() => {
  'use strict';
  if(window.AnatomIQUI353)return;
  const $=id=>document.getElementById(id);
  function polish(){
    for(const [id,text] of [['capture-chapter-start','Capture starting position'],['restore-chapter-start','Return to start'],['save-library-as','Duplicate lesson']]){
      const node=$(id);if(node&&node.textContent.trim()!==text)node.textContent=text;
    }
    const advanced=$('open-app-settings');
    if(advanced && advanced.textContent.trim()!=='Advanced settings…')advanced.textContent='Advanced settings…';
    // The student update-check button now lives in About in both views.
    const old=$('menu-check-updates');if(old)old.hidden=true;
    for(const root of [$('menu-settings'),$('anat-student-menu-settings')]){
      if(!root)continue;
      for(const btn of root.querySelectorAll('button.menu-item')){
        if(/^[\s⚙️\u2699]*Advanced\s+Settings\s*(?:…|\.\.\.)?$/i.test(btn.textContent.trim())&&btn.textContent!=='Advanced settings…')btn.textContent='Advanced settings…';
      }
      // Discard only visible orphan separators; leave meaningful groups intact.
      const children=[...root.children];let priorVisible=false;
      for(let i=0;i<children.length;i++){
        const node=children[i];if(node.matches('.menu-separator')){
          const next=children.slice(i+1).find(n=>!n.hidden&&!n.matches('.menu-separator'));
          node.style.display=priorVisible&&!!next?'':'none';
          priorVisible=false;
        }else if(!node.hidden && getComputedStyle(node).display!=='none')priorVisible=true;
      }
    }
  }
  function init(){
    polish();
    for(const id of ['studio-menubar','anat-student-menubar']){
      const n=$(id);if(n)new MutationObserver(()=>queueMicrotask(polish)).observe(n,{childList:true,subtree:true});
    }
    document.addEventListener('pointerdown',e=>{if(e.target.closest?.('.menu-trigger'))polish();},true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.AnatomIQUI353=Object.freeze({polish});
})();
