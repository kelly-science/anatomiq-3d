// ANATOMIQ_FADE_DETAILS_239_20261026 — UI relocation, BVH renderer retained.
// ANATOMIQ_VIEW_FADE_237_20261026 — presentation-only UI controls; model caches unchanged.
/* ANATOMIQ_GITHUB_PREVIEW_TEACHER_EDIT_235_20261026 */
/* ANATOMIQ_CHAPTER_BAR_WIDTH_234_20261026 — width-only UI update */
/* ANATOMIQ_RESPONSIVE_CHAPTERS_PANELS_233_20261026 — UI-only assets */
/* ANATOMIQ_GLOBAL_GEOMETRY_LIBRARY_232_20261026 */
// AnatomIQ 2.1.0 HTML startup repair: refresh precached shell without clearing lessons.
/* Anatomy Studio 1.1 — same-origin-first installable PWA.
   Student scenes remain URL-contained. Library scenes remain in IndexedDB. */
const VERSION='anatomy-shell-2.2.59-carousel-spring'; // ANATOMIQ_STUDENT_LABEL_LIST_252 // ANATOMIQ_SELECTION_STUDENT_251 // ANATOMIQ_LESSON_RENAME_250 // ANATOMIQ_LESSON_EXPERIENCE_249 // ANATOMIQ_TYPOGRAPHY_248 // ANATOMIQ_TAB_SIZING_247 // ANATOMIQ_TAB_MENU_POLISH_246 // ANATOMIQ_TRIQUETRUM_244
const POLISH_MODELS='anatomiq-models-persistent-v1';
const SHELL=['./chapter-iris-254.mjs?rev=259','./chapter-carousel-255.mjs?rev=259','./chapter-live-carousel-256.mjs?rev=259','./app.js?rev=carousel259','./chapter-live-carousel-256.mjs?rev=257','./app.js?rev=carousel257','./chapter-live-carousel-256.mjs?rev=256','./chapter-carousel-255.mjs?rev=255','./app.js?rev=live256','./chapter-iris-254.mjs?rev=255','./app.js?rev=chapter253','./student-label-list-252.css?rev=252','./app.js?rev=student252','./student-selection-251.css?rev=251','./app.js?rev=student251','./lesson-renaming-250.css?rev=250','./workspace-tabs-241.js?rev=250','./app.js?rev=lesson250','./lesson-experience-249.js?rev=249','./lesson-experience-249.css?rev=249','./app.js?rev=lesson249','./typography-248.css?rev=248','./app.js?rev=typography248','./tab-menu-polish-246.css?rev=247','./app.js?rev=tabsize247','./app.js?rev=triquetrum245','./triquetrum-extension.mjs?rev=245','./models/triquetrum-extension.json?rev=245','./app.js?rev=triquetrum244','./triquetrum-extension.mjs?rev=244','./models/triquetrum-extension.json?rev=244','./app.js?rev=labelorder242','./label-reorder-242.js?rev=242','./label-order-242.css?rev=242','./app.js?rev=workspace241','./interface-2221.js?rev=workspace241','./workspace-tabs-241.js?rev=241','./workspace-tabs-241.css?rev=241','./app.js?rev=tools240','./interface-2221.js?rev=tools240','./teacher-tools-2240.js?rev=240','./teacher-tools-2240.css?rev=240','./label-occlusion-bvh.js?rev=238','./app.js?rev=labelbvh238','./app.js?rev=fadepanel239r2','./view-menu-polish.js?rev=fadepanel239r2','./interface-2221.js?rev=fadepanel239r2','./chapter-bar-width-234.css?rev=234','./chapter-bar-width-234.js?rev=234','./responsive-chapters-panels.css?rev=233','./responsive-chapters-panels.js?rev=233','./','./index.html','./styles.css','./view-menu-polish.js','./view-menu-polish.css','./skeletal-views-2217.mjs','./selection-2217.css','./anatomy-divisions-2218.mjs','./anatomy-divisions-2218.css','./anatomy-sidebar-2219.mjs','./anatomy-sidebar-2219.css','./app.js','./app.js?rev=2.2.29-natural-bone-approved-v1','./bone-appearance.js','./bone-appearance.js?rev=natural-bone-approved-detail-v1',
  './practical-quiz.js','./smart-label-focus.js','./lesson-publishing.js','./github-token-vault.js','./scene-codec.js','./scene-assets.js','./library-store.js','./github-library-embed.mjs?rev=20261026','./github-library-embed.css?rev=20261026','./github-library-embed.mjs?rev=235','./app.js?rev=2.2.29-natural-bone-approved-v1-github-preview-edit-235','./scene-history.js','./structure-layout.js','./digestive-model.js','./digestive-detail.js','./render-performance.js','./surface-lighting.js','./dynamic-shadows.js','./system-layers.js','./cardiovascular-model.js','./respiratory-model.js','./nervous-model.js','./urinary-model.js','./lymphatic-model.js','./connective-model.js','./connective-model.js?rev=cartilage-20261025','./lymphatic-drainage.svg','./kidney-interior.svg','./cardio-presentation.js','./cardio-class-core.js','./cardio-vascular-audit.js','./skeletal-detail.js','./skull-geometry.js','./global-geometry-quality.js?rev=232','./skull-preferences.js','./version.json','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
const LOCAL_RENDERER=[
  './vendor/three/build/three.module.js',
  './vendor/three/examples/jsm/controls/OrbitControls.js',
  './vendor/three/examples/jsm/loaders/GLTFLoader.js'
];
const REMOTE_RENDERER_BASE='https://cdn.jsdelivr.net/npm/three@0.169.0/';
const REMOTE_RENDERER=[REMOTE_RENDERER_BASE+'build/three.module.js',REMOTE_RENDERER_BASE+'examples/jsm/controls/OrbitControls.js',REMOTE_RENDERER_BASE+'examples/jsm/loaders/GLTFLoader.js'];
const ALLOWED_ORIGINS=new Set([self.location.origin,'https://cdn.jsdelivr.net','https://charleeh.github.io']);
self.addEventListener('install',event=>event.waitUntil((async()=>{
  await (await caches.open(VERSION)).addAll(SHELL);
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  // Migrate previously downloaded models before removing an old shell cache.
  const oldKeys=(await caches.keys()).filter(key=>key.startsWith('anatomy-')&&key!==VERSION);
  const forever=await caches.open(POLISH_MODELS);
  for(const key of oldKeys){
    const previous=await caches.open(key);
    for(const request of await previous.keys()){
      if(!/\/models\/[^/]+\.(?:glb|json)$/i.test(new URL(request.url).pathname))continue;
      try{
        if(await forever.match(request))continue;
        const value=await previous.match(request);
        if(value)await forever.put(request,value);
      }catch(error){console.warn('Model preservation skipped:',error);}
    }
  }
  await Promise.all(oldKeys.map(key=>caches.delete(key)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(!ALLOWED_ORIGINS.has(url.origin))return;
  event.respondWith((async()=>{
    const cache=await caches.open(VERSION);
    const cached=await cache.match(request,{ignoreSearch:request.mode==='navigate'}) || await (await caches.open(POLISH_MODELS)).match(request);
    // Model assets and their manifests must revalidate together against the
    // deployed GitHub Pages files. Old cache-first behaviour could combine a
    // new manifest with an older GLB, breaking anatomy after deployments.
    const modelAsset=url.origin===self.location.origin && /\/models\/[^/]+\.(?:glb|json)$/i.test(url.pathname);
    if(request.mode==='navigate'||modelAsset||(url.origin===self.location.origin&&url.pathname.endsWith('/version.json'))){
      try{
        const response=await fetch(modelAsset?new Request(request,{cache:'no-cache'}):request);
        if(response.ok&&(response.type==='basic'||response.type==='cors')&&
          (!modelAsset||!/text\/html/i.test(response.headers.get('content-type')||'')))
          event.waitUntil((async()=>{await cache.put(request,response.clone());if(modelAsset)await (await caches.open(POLISH_MODELS)).put(request,response.clone());})().catch(()=>{}));
        return response;
      }catch(error){if(cached)return cached;throw error;}
    }
    if(cached)return cached;
    try{
      const response=await fetch(request);
      if(response.ok&&(response.type==='basic'||response.type==='cors')){
        event.waitUntil(cache.put(request,response.clone()).catch(()=>{}));
      }
      return response;
    }catch(error){throw error;}
  })());
});
const MODEL_REFRESH_SCOPES=Object.freeze({
  cardiovascular:['models/cardiovascular-structures.json','models/cardiovascular-standard.glb','models/cardiovascular-detailed.glb'],
  digestive:['models/anatomy-organs.glb','models/digestive-structures.json','models/digestive-standard.glb','models/digestive-detailed.glb'],
  respiratory:['models/respiratory-structures.json','models/respiratory-standard.glb','models/respiratory-detailed.glb'],
  nervous:['models/nervous-structures.json','models/nervous-standard.glb','models/nervous-detailed.glb'],
  urinary:['models/urinary-structures.json','models/urinary-standard.glb','models/urinary-detailed.glb'],
  connective:['models/connective-structures.json','models/connective-standard.glb','models/connective-detailed.glb'],
  lymphatic:['models/lymphatic-structures.json','models/lymphatic-standard.glb','models/lymphatic-detailed.glb'],
  skeletal:['models/ecorche.glb']
});
async function refreshModelAssets(scope,reply){
  const paths=MODEL_REFRESH_SCOPES[scope];
  if(!paths)throw new Error('Choose a supported model system.');
  // Stage all replacements first. A missing file must not partially overwrite
  // the cache and leave a new JSON manifest paired with an old geometry file.
  const downloads=[];
  for(const [index,path] of paths.entries()){
    const url=new URL('./'+path,self.location.href);
    url.searchParams.set('anatomy-refresh',String(Date.now()));
    const response=await fetch(url.href,{cache:'reload'});
    if(!response.ok)throw new Error(`${path}: GitHub Pages returned HTTP ${response.status}`);
    if(/text\/html/i.test(response.headers.get('content-type')||''))
      throw new Error(`${path}: server returned an HTML page instead of a model file`);
    const bytes=await response.arrayBuffer();
    let catalogData;
    if(path.endsWith('.glb')){
      const header=new Uint8Array(bytes,0,Math.min(bytes.byteLength,4));
      if(bytes.byteLength<28||String.fromCharCode(...header)!=='glTF')
        throw new Error(`${path}: downloaded data is not a valid GLB file`);
      const view=new DataView(bytes);
      const jsonLength=view.getUint32(12,true);
      if(view.getUint32(4,true)!==2 || view.getUint32(8,true)!==bytes.byteLength ||
         view.getUint32(16,true)!==0x4e4f534a || jsonLength<10 || jsonLength>bytes.byteLength-20)
        throw new Error(`${path}: malformed GLB header or JSON chunk`);
      if(scope==='cardiovascular'||scope==='respiratory'||scope==='nervous'||scope==='urinary'||scope==='lymphatic'){
        let sceneData;
        try{sceneData=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,jsonLength)));}
        catch{throw new Error(`${path}: GLB scene metadata is unreadable`);}
        const catalog=downloads.find(entry=>entry.path.endsWith(scope+'-structures.json'))?.catalog;
        const names=new Set((sceneData.nodes||[]).map(node=>node.name).filter(Boolean));
        if(!catalog || catalog.structures.length!==((sceneData.nodes||[]).filter(node=>node.mesh!==undefined).length) || !catalog.structures.every(item=>names.has(item.id)))
          throw new Error(`${path}: GLB structures do not match ${scope}-structures.json; upload the complete regenerated model set`);
      }
    }else{
      try{catalogData=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new Error(`${path}: invalid JSON`);}
      if(!Array.isArray(catalogData.structures)||!catalogData.structures.length)
        throw new Error(`${path}: no structure catalog found`);
    }
    downloads.push({path,bytes,catalog:catalogData});
    reply({type:'MODEL_REFRESH_PROGRESS',completed:index+1,total:paths.length,path});
  }
  const cache=await caches.open(VERSION);
  const originals=await Promise.all(downloads.map(async ({path})=>{
    const url=new URL('./'+path,self.location.href).href;
    return {url,response:await cache.match(url)};
  }));
  try{
    for(const {path,bytes} of downloads){
      const stableURL=new URL('./'+path,self.location.href).href;
      await cache.put(stableURL,new Response(bytes,{status:200,headers:{'Content-Type':path.endsWith('.glb')?'model/gltf-binary':'application/json'}}));
    }
  }catch(error){
    // Cache quota failure: restore as much of the original model set as possible.
    await Promise.all(originals.map(({url,response})=>response?cache.put(url,response):cache.delete(url)));
    throw new Error('Browser could not save the new models (check device storage): '+String(error?.message||error));
  }
  reply({type:'MODEL_REFRESH_RESULT',ok:true,scope,count:downloads.length});
}
self.addEventListener('message',event=>{
  if(event.data?.type==='MODEL_REFRESH_PING'){
    event.ports?.[0]?.postMessage({type:'MODEL_REFRESH_PONG',version:VERSION});
    return;
  }
  if(event.data?.type==='REFRESH_MODELS'){
    const port=event.ports?.[0];
    if(!port)return;
    event.waitUntil(refreshModelAssets(event.data.scope,msg=>port.postMessage(msg))
      .catch(error=>port.postMessage({type:'MODEL_REFRESH_RESULT',ok:false,error:String(error?.message||error)})));
    return;
  }
  if(!['CACHE_OFFLINE','CHECK_OFFLINE'].includes(event.data?.type))return;
  const source=event.source;
  event.waitUntil((async()=>{
    const cache=await caches.open(VERSION);
    let modelURL='';
    try{
      const url=new URL(event.data.model,self.location.href);
      if(ALLOWED_ORIGINS.has(url.origin)&&/\.glb$/i.test(url.pathname))modelURL=url.href;
    }catch{}
    if(!modelURL){source?.postMessage({type:'OFFLINE_STATUS',complete:false,message:'Model URL unavailable'});return;}
    const renderer=event.data.renderer==='local'?LOCAL_RENDERER:REMOTE_RENDERER;
    // A student's explicit offline request caches the published lesson's
    // required chapter assets (not every model installed in the repository).
    const lessonAllow=/^(?:models\/(?:anatomy-organs|digestive-(?:standard|detailed)|cardiovascular-(?:standard|detailed)|respiratory-(?:standard|detailed)|nervous-(?:standard|detailed)|urinary-(?:standard|detailed)|lymphatic-(?:standard|detailed)|skull-detailed)\.glb|models\/(?:digestive|cardiovascular|respiratory|nervous|urinary|lymphatic|skull)-structures\.json|vendor\/three\/examples\/jsm\/(?:loaders\/DRACOLoader\.js|libs\/draco\/gltf\/(?:draco_decoder\.wasm|draco_wasm_wrapper\.js)))$/;
    const lessonModels=Array.isArray(event.data.lessonModels)
      ? event.data.lessonModels.filter(path=>typeof path==='string'&&lessonAllow.test(path)).map(path=>'./'+path)
      : [];
    const urls=[...SHELL,...renderer,modelURL,...lessonModels,...(event.data.organs?['./models/anatomy-organs.glb','./vendor/three/examples/jsm/loaders/DRACOLoader.js','./vendor/three/examples/jsm/libs/draco/gltf/draco_decoder.wasm','./vendor/three/examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js']:[]),...(event.data.detail?['./models/digestive-structures.json',event.data.detailMode==='detailed'?'./models/digestive-detailed.glb':'./models/digestive-standard.glb']:[]),...(event.data.cardio?['./models/cardiovascular-structures.json',event.data.cardioMode==='detailed'?'./models/cardiovascular-detailed.glb':'./models/cardiovascular-standard.glb']:[]),...(event.data.respiratory?['./models/respiratory-structures.json',event.data.respiratoryMode==='detailed'?'./models/respiratory-detailed.glb':'./models/respiratory-standard.glb']:[]),...(event.data.nervous?['./models/nervous-structures.json',event.data.nervousMode==='detailed'?'./models/nervous-detailed.glb':'./models/nervous-standard.glb']:[]),...(event.data.lymphatic?['./models/lymphatic-structures.json',event.data.lymphaticMode==='detailed'?'./models/lymphatic-detailed.glb':'./models/lymphatic-standard.glb']:[]),...(event.data.urinary?['./models/urinary-structures.json',event.data.urinaryMode==='detailed'?'./models/urinary-detailed.glb':'./models/urinary-standard.glb']:[]),...(event.data.skullDetail?['./models/skull-structures.json','./models/skull-detailed.glb']:[])].map(path=>new URL(path,self.location.href).href);
    let done=0;
    for(const url of urls){
      let saved=await cache.match(url)||await (await caches.open(POLISH_MODELS)).match(url);
      if(!saved&&event.data.type==='CACHE_OFFLINE'){
        try{
          const response=await fetch(url,{cache:'no-cache'});
          if(response.ok&&(response.type==='basic'||response.type==='cors')){await cache.put(url,response.clone());if(/\/models\/[^/]+\.(?:glb|json)$/i.test(new URL(url).pathname)){try{await (await caches.open(POLISH_MODELS)).put(url,response.clone());}catch(error){console.warn('Model pinning limited by storage:',error);}}saved=response;}
        }catch(e){console.warn('Offline asset missing',url,e);}
      }
      if(saved)done++;
      source?.postMessage({type:'OFFLINE_PROGRESS',completed:done,total:urls.length});
    }
    source?.postMessage({type:'OFFLINE_STATUS',complete:done===urls.length,completed:done,total:urls.length});
  })());
});
