/* ANATOMIQ_MODEL_MANAGER_353 — per-browser offline model library.
 * Does not access the user's filesystem, delete lessons, or change the active scene.
 * Save file uses a browser download; Download for offline use writes CacheStorage.
 */
(() => {
  'use strict';
  if (window.AnatomIQModelManager353) return;
  const MODELS = Object.freeze([
    ['Skeleton · core model','skeletal','models/ecorche.glb',null],
    ['Detailed skeleton','skeletal','models/skeletal-detailed-265c.glb',null],
    ['High-detail skull','skeletal','models/skull-native-266d.glb',null],
    ['Realistic eye','eyes','models/realistic-human-eye.glb',null],
    ['Cardiovascular · standard','cardiovascular','models/cardiovascular-standard.glb','models/cardiovascular-structures.json'],
    ['Cardiovascular · detailed','cardiovascular','models/cardiovascular-detailed.glb','models/cardiovascular-structures.json'],
    ['Respiratory · standard','respiratory','models/respiratory-standard.glb','models/respiratory-structures.json'],
    ['Respiratory · detailed','respiratory','models/respiratory-detailed.glb','models/respiratory-structures.json'],
    ['Digestive · standard','digestive','models/digestive-standard.glb','models/digestive-structures.json'],
    ['Digestive · detailed','digestive','models/digestive-detailed.glb','models/digestive-structures.json'],
    ['Connective · standard','connective','models/connective-standard.glb','models/connective-structures.json'],
    ['Connective · detailed','connective','models/connective-detailed.glb','models/connective-structures.json'],
    ['Nervous · standard','nervous','models/nervous-standard.glb','models/nervous-structures.json'],
    ['Nervous · detailed','nervous','models/nervous-detailed.glb','models/nervous-structures.json'],
    ['Urinary · standard','urinary','models/urinary-standard.glb','models/urinary-structures.json'],
    ['Urinary · detailed','urinary','models/urinary-detailed.glb','models/urinary-structures.json'],
    ['Lymphatic · standard','lymphatic','models/lymphatic-standard.glb','models/lymphatic-structures.json'],
    ['Lymphatic · detailed','lymphatic','models/lymphatic-detailed.glb','models/lymphatic-structures.json'],
    ['Legacy digestive model','digestive','models/anatomy-organs.glb',null],
  ].map(([title,system,path,catalog])=>Object.freeze({title,system,path,catalog})));
  const PERSISTENT = 'anatomiq-models-persistent-v1';
  const base = new URL('./', document.baseURI);
  const $ = id => document.getElementById(id);
  const byPath = path => new URL(path,base).href;
  const isModelPath = url => {
    try{const u=new URL(url);return u.origin===base.origin&&u.pathname.startsWith(base.pathname+'models/')&&/\.(?:glb|json)$/i.test(u.pathname);}
    catch{return false;}
  };
  const canonicalPath = url => new URL(url).pathname;
  const isTeacher = () => !document.body.classList.contains('student-mode') && !/^#(?:scene|lesson)=/.test(location.hash);
  let page, list, summary, feedback, busy = false, lastFocus;

  async function modelCaches(){
    if (!('caches' in window)) throw Error('Browser model storage is unavailable. Use a secure origin (HTTPS or localhost).');
    const result=[];
    for(const name of await caches.keys()) {
      if(name!==PERSISTENT&&!name.startsWith('anatomy-'))continue;
      const cache=await caches.open(name);
      for(const request of await cache.keys()) if(isModelPath(request.url))result.push({name,request,cache});
    }
    return result;
  }
  async function cachedModelPaths(){return new Set((await modelCaches()).map(x=>canonicalPath(x.request.url)));}
  async function cachedResponse(path){
    for(const entry of await modelCaches()) if(canonicalPath(entry.request.url)===new URL(byPath(path)).pathname){
      const response=await entry.cache.match(entry.request);if(response?.ok)return response;
    }
    return null;
  }
  const report = (message, error=false) => { if(feedback){feedback.textContent=message;feedback.dataset.error=String(error);} };

  async function refresh(){
    if(!page || page.hidden)return;
    try {
      const paths=await cachedModelPaths();
      let count=0;
      for(const item of MODELS){
        const row=list.querySelector(`[data-path="${CSS.escape(item.path)}"]`);
        if(!row)continue;
        const downloaded=paths.has(new URL(byPath(item.path)).pathname);
        if(downloaded)count++;
        row.querySelector('.anat353-state').textContent=downloaded?'Downloaded':'Not downloaded';
        row.querySelector('[data-action="download"]').textContent=downloaded?'Refresh':'Download';
        row.querySelector('[data-action="download"]').disabled=false;
        row.querySelector('[data-action="remove"]').disabled=!downloaded;
        row.querySelector('[data-action="save"]').disabled=!downloaded;
      }
      let storage='';
      try{const estimate=await navigator.storage?.estimate?.();if(estimate?.usage!=null)storage=` · Browser storage used: ${(estimate.usage/1048576).toFixed(1)} MB`;}
      catch{} // Storage estimates are optional and include all origin data.
      summary.textContent=`${count} of ${MODELS.length} listed models stored for offline use${storage}`;
    }catch(error){report(String(error?.message||error),true);}
  }
  async function validDownload(path){
    const url=byPath(path);
    const response=await fetch(url,{cache:'reload'});
    if(!response.ok)throw Error(`${path}: server returned HTTP ${response.status}`);
    if(/text\/html/i.test(response.headers.get('content-type')||''))throw Error(`${path}: server returned HTML instead of a model.`);
    const blob=await response.clone().blob();
    if(path.endsWith('.glb')){
      if(blob.size<28)throw Error(`${path}: incomplete model file`);
      const head=new DataView(await blob.slice(0,20).arrayBuffer());
      if(head.getUint32(0,true)!==0x46546c67||head.getUint32(4,true)!==2 || head.getUint32(8,true)!==blob.size || head.getUint32(16,true)!==0x4e4f534a)
        throw Error(`${path}: invalid glTF binary header`);
    }else{
      let data;try{data=JSON.parse(await blob.text());}catch{throw Error(`${path}: unreadable JSON catalog`);}
      if(!Array.isArray(data.structures)||data.structures.length===0)throw Error(`${path}: missing structure catalog`);
    }
    return {url,response};
  }
  async function download(item){
    if(navigator.onLine===false)throw Error('Connect to the internet before downloading a model.');
    const staged=[];
    if(item.catalog)staged.push(await validDownload(item.catalog));
    staged.push(await validDownload(item.path));
    const store=await caches.open(PERSISTENT);
    const originals=await Promise.all(staged.map(async x=>({url:x.url,response:await store.match(x.url)})));
    try{
      for(const asset of staged)await store.put(asset.url,asset.response.clone());
    }catch(error){
      // Preserve the previous, working model pair if a write fails (e.g., quota).
      for(const prev of originals){if(prev.response)await store.put(prev.url,prev.response);else await store.delete(prev.url);}
      throw Error('Insufficient browser storage or cache write failed: '+String(error?.message||error));
    }
  }
  async function remove(item){
    if(!confirm(`Remove ${item.title} from offline storage on this browser?\n\nThe current 3D scene will remain loaded, but this model will need to download again before it can be used offline. Saved lessons and progress will not be deleted.`))return false;
    // Only model GLBs; shared structure catalogs remain for other model variants.
    for(const entry of await modelCaches()) if(canonicalPath(entry.request.url)===new URL(byPath(item.path)).pathname){
      await entry.cache.delete(entry.request);
    }
    return true;
  }
  async function saveFile(item){
    const response=await cachedResponse(item.path);
    if(!response)throw Error('Download this model for offline use before saving its file.');
    const blob=await response.blob();
    const url=URL.createObjectURL(blob);
    try{
      const anchor=document.createElement('a');anchor.href=url;anchor.download=item.path.split('/').pop();
      document.body.append(anchor);anchor.click();anchor.remove();
    }finally{setTimeout(()=>URL.revokeObjectURL(url),10000);}
  }
  async function run(item,action,button){
    if(busy)return;
    busy=true;
    page.querySelectorAll('button[data-action]').forEach(b=>b.disabled=true);
    try{
      report(action==='download'?`Downloading ${item.title}…`:action==='remove'?`Removing ${item.title}…`:`Saving ${item.title}…`);
      if(action==='download')await download(item);
      else if(action==='remove')await remove(item);
      else if(action==='save')await saveFile(item);
      report(action==='download'?`${item.title} is saved for offline use.`:action==='remove'?'Offline storage updated.':'File download requested.');
    }catch(error){report(String(error?.message||error),true);}
    finally{busy=false;await refresh();}
  }
  function build(){
    if(page)return;
    page=document.createElement('section');page.id='anat353-model-manager';page.hidden=true;page.setAttribute('aria-label','Model Manager');
    page.innerHTML=`<div class="anat353-head"><button type="button" id="anat353-model-back">← Back to Teacher Studio</button><div><strong>Model Manager</strong><small>Offline anatomy storage on this device</small></div></div>
      <div class="anat353-body"><p>Download models for offline use, remove browser-cached copies, or save individual GLB files to the computer. Removing a downloaded model does not delete lessons or the source files on GitHub. Downloaded models are stored <strong>in this browser</strong>, not transferred to other Chromebooks.</p>
      <p id="anat353-summary" class="anat353-muted">Checking local model storage…</p>
      <div id="anat353-model-list" class="anat353-model-list"></div>
      <p id="anat353-model-feedback" role="status" aria-live="polite"></p></div>`;
    document.body.append(page);
    list=$('anat353-model-list');summary=$('anat353-summary');feedback=$('anat353-model-feedback');
    for(const item of MODELS){
      const row=document.createElement('article');row.className='anat353-model-row';row.dataset.path=item.path;
      const meta=document.createElement('div');meta.className='anat353-model-meta';
      const title=document.createElement('strong');title.textContent=item.title;
      const path=document.createElement('small');path.textContent=item.path;
      const state=document.createElement('span');state.className='anat353-state';state.textContent='Checking…';
      meta.append(title,path,state);
      const actions=document.createElement('div');actions.className='anat353-actions';
      for(const [kind,label] of [['download','Download'],['save','Save file'],['remove','Remove']]){
        const btn=document.createElement('button');btn.type='button';btn.dataset.action=kind;btn.textContent=label;
        btn.addEventListener('click',()=>run(item,kind,btn));actions.append(btn);
      }
      row.append(meta,actions);list.append(row);
    }
    $('anat353-model-back').addEventListener('click',close);
    document.addEventListener('keydown',e=>{if(e.key==='Escape' && page && !page.hidden)close();});
  }
  function open(){
    if(!isTeacher()){return;}
    build();lastFocus=document.activeElement;document.body.classList.add('anat353-model-open');page.hidden=false;refresh();
    $('anat353-model-back').focus();
  }
  function close(){if(!page || page.hidden)return;page.hidden=true;document.body.classList.remove('anat353-model-open');lastFocus?.focus?.({preventScroll:true});window.dispatchEvent(new Event('resize'));}
  function menu(){
    const root=$('menu-settings');if(!root || !isTeacher())return;
    if(!$('anat353-model-menu')){
      const b=document.createElement('button');b.id='anat353-model-menu';b.className='menu-item';b.setAttribute('role','menuitem');b.type='button';b.textContent='Model Manager…';
      b.addEventListener('click',()=>{root.hidden=true;root.closest('.menu-group')?.classList.remove('is-open');open();});
      root.append(b);
    }
  }
  function init(){menu();build();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.AnatomIQModelManager353=Object.freeze({open,close,refresh,models:MODELS});
})();
