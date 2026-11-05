/* AnatomIQ 2.2.138 — Student About: explicit, non-destructive update checking.
 * Does not clear Cache Storage, site data, IndexedDB, student answers, or lesson progress.
 */
(() => {
  'use strict';
  const BUILD = '352';
  const $ = id => document.getElementById(id);
  const studentMode = () => document.body.classList.contains('student-mode') || /^#(?:scene|lesson)=/.test(location.hash);
  const numericVersion = value => {
    const match = /^\s*(\d+)\.(\d+)\.(\d+)(?:[-.]?([a-z]\d*))?\s*$/i.exec(String(value || ''));
    return match ? [Number(match[1]), Number(match[2]), Number(match[3]), match[4] || ''] : null;
  };
  function compareVersions(a,b){
    const x=numericVersion(a),y=numericVersion(b);
    if(!x || !y)return null;
    for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i]?1:-1;
    if(x[3]===y[3])return 0;
    if(!x[3])return 1; if(!y[3])return -1;
    return x[3]>y[3]?1:-1;
  }
  const installedVersion = () => String(window.__AnatomIQBuildVersion || $('anat-about-version')?.textContent || '').trim();
  let latestVersion = null;
  let running = false;
  let initiated = false;

  async function check(){
    const status=$('anat-about-update-status'),checkButton=$('anat-about-update-check'),applyButton=$('anat-about-update-apply');
    if(!status || !checkButton || !applyButton || running)return;
    latestVersion=null;
    applyButton.hidden=true;
    if(navigator.onLine===false){status.textContent='Offline. Connect to the internet to check for updates. Your saved lesson can still be used offline.';return;}
    running=true;checkButton.disabled=true;
    status.textContent='Checking the published AnatomIQ version…';
    try{
      const url=new URL('./version.json',document.baseURI);
      url.searchParams.set('check',String(Date.now()));
      const response=await fetch(url.href,{cache:'no-store',credentials:'same-origin'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      const published=String(data?.version||'').trim();
      const installed=installedVersion();
      if(!numericVersion(published))throw new Error('Invalid published version');
      latestVersion=published;
      const order=compareVersions(published,installed);
      if(order===null){
        status.textContent=`Published version: ${published}. Unable to determine the installed version; close the lesson and reopen it when finished.`;
      }else if(order>0){
        status.textContent=`Version ${published} is available (installed: ${installed}). Finish or save your current work before updating.`;
        applyButton.hidden=false;
      }else if(order===0){
        status.textContent=`You're using the latest published version (${published}).`;
      }else{
        status.textContent=`This viewer (${installed}) is newer than the published version (${published}). No update is needed.`;
      }
    }catch(err){
      status.textContent=`Couldn't check for updates (${String(err?.message||err)}). Keep working and try again when connected.`;
    }finally{running=false;checkButton.disabled=false;}
  }

  async function apply(){
    const status=$('anat-about-update-status'),btn=$('anat-about-update-apply');
    if(initiated || !latestVersion || !btn || btn.hidden)return;
    if(!window.confirm(`Update AnatomIQ to ${latestVersion}?\n\nFinish your Practical or Guided activity first. Updating reloads this page and may interrupt answers that haven't yet been saved. This does not clear saved lessons or browser storage.`))return;
    initiated=true;btn.disabled=true;
    status.textContent='Preparing the new version…';
    try{
      if('serviceWorker' in navigator){
        const reg=await navigator.serviceWorker.getRegistration();
        if(reg)await reg.update();
      }
      // Explicit user consent received. Do not clear storage or un-register the worker.
      // The new SW owns current-version assets; a fresh navigation requests the shell.
      const url=new URL(location.href);
      url.searchParams.set('app-refresh',String(Date.now()));
      location.replace(url.href);
    }catch(err){
      initiated=false;btn.disabled=false;
      status.textContent=`Update could not start (${String(err?.message||err)}). Finish this lesson and reopen its original link to try again.`;
    }
  }

  function attach(){
    const modal=$('anat-about');
    if(!modal)return false;
    if($('anat-about-update-section'))return true;
    const dismiss=modal.querySelector('.anat-about-dismiss');
    if(!dismiss)return false;
    const section=document.createElement('section');
    section.id='anat-about-update-section';
    section.hidden=true;
    section.setAttribute('aria-label','AnatomIQ student updates');
    section.style.cssText='margin:16px 0 10px;padding:14px 0 0;border-top:1px solid var(--line,rgba(128,148,160,.35));';
    const heading=document.createElement('strong');heading.textContent='App updates';
    const status=document.createElement('p');status.id='anat-about-update-status';
    status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    status.style.cssText='margin:8px 0 12px;line-height:1.45;';
    status.textContent='Check whether a newer published version is available.';
    const checkButton=document.createElement('button');checkButton.type='button';
    checkButton.id='anat-about-update-check';checkButton.className='anat-about-dismiss';
    checkButton.textContent='Check for updates';
    checkButton.addEventListener('click',check);
    const applyButton=document.createElement('button');applyButton.type='button';
    applyButton.id='anat-about-update-apply';applyButton.className='anat-about-dismiss';
    applyButton.textContent='Update and reload';applyButton.hidden=true;
    applyButton.style.marginLeft='8px';applyButton.addEventListener('click',apply);
    section.append(heading,status,checkButton,applyButton);
    dismiss.before(section);
    const sync=()=>{section.hidden=!studentMode();};
    new MutationObserver(sync).observe(modal,{attributes:true,attributeFilter:['hidden']});
    window.addEventListener('hashchange',sync);
    new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
    sync();
    return true;
  }
  function init(){
    if(attach())return;
    const observer=new MutationObserver(()=>{if(attach())observer.disconnect();});
    observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
  window.__AnatomIQStudentUpdates352={build:BUILD,compareVersions,check};
})();
