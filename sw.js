importScripts('./offline-shell-280.js'); // ANATOMIQ_OFFLINE_RELIABILITY_280
// ANATOMIQ_FADE_DETAILS_239_20261026 — UI relocation, BVH renderer retained.
// ANATOMIQ_VIEW_FADE_237_20261026 — presentation-only UI controls; model caches unchanged.
/* ANATOMIQ_GITHUB_PREVIEW_TEACHER_EDIT_235_20261026 */
/* ANATOMIQ_CHAPTER_BAR_WIDTH_234_20261026 — width-only UI update */
/* ANATOMIQ_RESPONSIVE_CHAPTERS_PANELS_233_20261026 — UI-only assets */
/* ANATOMIQ_GLOBAL_GEOMETRY_LIBRARY_232_20261026 */
// AnatomIQ 2.1.0 HTML startup repair: refresh precached shell without clearing lessons.
/* Anatomy Studio 1.1 — same-origin-first installable PWA.
   Student scenes remain URL-contained. Library scenes remain in IndexedDB. */
const VERSION='anatomy-shell-2.2.85-guided-visual293'; // ANATOMIQ_SHORT_AFTER_DISTRICT_292 // ANATOMIQ_DISTRICT_PORTAL_291 // ANATOMIQ_PUBLISH_DISSECTION_289 // ANATOMIQ_SCHOOL_HANDSHAKE_287 // ANATOMIQ_STUDENT_LABEL_LIST_252 // ANATOMIQ_SELECTION_STUDENT_251 // ANATOMIQ_LESSON_RENAME_250 // ANATOMIQ_LESSON_EXPERIENCE_249 // ANATOMIQ_TYPOGRAPHY_248 // ANATOMIQ_TAB_SIZING_247 // ANATOMIQ_TAB_MENU_POLISH_246 // ANATOMIQ_TRIQUETRUM_244
const POLISH_MODELS='anatomiq-models-persistent-v1';
const SHELL=self.ANATOMIQ_OFFLINE_SHELL_280;
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
    const sameOrigin=url.origin===self.location.origin;
    const modelFile=sameOrigin&&/\/models\/[^/]+\.(?:glb|json)$/i.test(url.pathname);
    const staticFile=sameOrigin&&/\.(?:js|mjs|css)$/i.test(url.pathname);
    const cached=await cache.match(request,{ignoreSearch:request.mode==='navigate'})
      || ((modelFile||staticFile)?await cache.match(request,{ignoreSearch:true}):null)
      || await (await caches.open(POLISH_MODELS)).match(request);
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
    const route=typeof event.data.route==='string'&&event.data.route.startsWith('#')?event.data.route.slice(0,12000):'';
    const full=event.data.type==='CACHE_OFFLINE';
    const modelURL=new URL('./models/ecorche.glb',self.location.href).href;
    // ANATOMIQ_OFFLINE_HTML_READINESS_282 — HTML is REQUIRED for the
    // app's homepage and index.html, but invalid for script/model assets.
    const isValid=async(response,url)=>{
      if(!response?.ok || response.type==='opaque')return false;
      const candidate=new URL(url);
      const appRoot=new URL('./',self.location.href).pathname;
      const isAppDocument=candidate.origin===self.location.origin &&
        (candidate.pathname===appRoot || candidate.pathname===appRoot+'index.html');
      const contentType=(response.headers.get('content-type')||'').toLowerCase();
      if(isAppDocument){
        if(!contentType.includes('text/html'))return false;
      }else if(contentType.includes('text/html'))return false;
      if(/\.glb$/i.test(candidate.pathname)){
        const length=Number(response.headers.get('content-length')||0);
        if(length>0&&length<28)return false;
      }
      return true;
    };
    const allow=/^(?:models\/(?:anatomy-organs|digestive-(?:standard|detailed)|cardiovascular-(?:standard|detailed)|respiratory-(?:standard|detailed)|nervous-(?:standard|detailed)|urinary-(?:standard|detailed)|lymphatic-(?:standard|detailed)|connective-(?:standard|detailed)|skull-detailed)\.glb|models\/(?:digestive|cardiovascular|respiratory|nervous|urinary|lymphatic|connective|skull)-structures\.json|vendor\/three\/examples\/jsm\/(?:loaders\/DRACOLoader\.js|libs\/draco\/gltf\/(?:draco_decoder\.wasm|draco_wasm_wrapper\.js)))$/;
    const lessonModels=Array.isArray(event.data.lessonModels)?event.data.lessonModels.filter(x=>typeof x==='string'&&allow.test(x)).map(x=>'./'+x):[];
    const extras=[
      './models/skeletal-detailed-265c.glb?rev=265c',
      './models/skeletal-detailed-265c-report.json?rev=265c',
      './models/skull-native-266d.glb?rev=skull267',
      './models/skull-native-266d-report.json?rev=skull267',
      './models/triquetrum-extension.json?rev=245',
      './models/realistic-human-eye.glb?rev=2215',
      ...(event.data.organs?['./models/anatomy-organs.glb']:[]),
      ...(event.data.detail?['./models/digestive-structures.json',`./models/digestive-${event.data.detailMode==='detailed'?'detailed':'standard'}.glb`]:[]),
      ...(event.data.cardio?['./models/cardiovascular-structures.json',`./models/cardiovascular-${event.data.cardioMode==='detailed'?'detailed':'standard'}.glb`]:[]),
      ...(event.data.respiratory?['./models/respiratory-structures.json',`./models/respiratory-${event.data.respiratoryMode==='detailed'?'detailed':'standard'}.glb`]:[]),
      ...(event.data.nervous?['./models/nervous-structures.json',`./models/nervous-${event.data.nervousMode==='detailed'?'detailed':'standard'}.glb`]:[]),
      ...(event.data.lymphatic?['./models/lymphatic-structures.json',`./models/lymphatic-${event.data.lymphaticMode==='detailed'?'detailed':'standard'}.glb`]:[]),
      ...(event.data.urinary?['./models/urinary-structures.json',`./models/urinary-${event.data.urinaryMode==='detailed'?'detailed':'standard'}.glb`]:[]),
      ...(event.data.skullDetail?['./models/skull-structures.json','./models/skull-detailed.glb']:[])
    ];
    const urls=[...new Set([...SHELL,modelURL,...lessonModels,...extras].map(path=>new URL(path,self.location.href).href))];
    let completed=0;
    const missing=[];
    for(const url of urls){
      let saved=await cache.match(url);
      // A currently active cache may have the same static model saved without a
      // query suffix, but readiness records must use THIS build's actual URL.
      if(!(await isValid(saved,url)))saved=null;
      if(!saved&&full){
        try{
          const response=await fetch(url,{cache:'no-cache'});
          if(await isValid(response,url)){
            await cache.put(url,response.clone());
            saved=await cache.match(url);
          }
        }catch(error){console.warn('[AnatomIQ] Offline asset not saved',url,error);}
      }
      if(saved&&await isValid(saved,url))completed++;
      else missing.push(new URL(url).pathname.split('/').slice(-2).join('/'));
      source?.postMessage({type:'OFFLINE_PROGRESS',completed,total:urls.length});
    }
    // Published student lessons are cached independently from the SW. Verify
    // that the exact lesson can also be reopened without raw.githubusercontent.
    const lesson=String(event.data.lessonURL||'');
    if(lesson){
      const safe=/^https:\/\/raw\.githubusercontent\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/.+\/lessons\/[a-z0-9-]+\.json$/i.test(lesson);
      urls.push(lesson);
      let stored=safe?await (await caches.open('anatomiq-public-lessons-v1')).match(lesson):null;
      if(!stored&&safe&&full){
        try{
          const res=await fetch(lesson,{cache:'no-store',credentials:'omit'});
          if(res.ok&&/json|text\/plain/i.test(res.headers.get('content-type')||'application/json')){
            const text=await res.clone().text();
            JSON.parse(text); // A parse failure must not result in "offline ready".
            await (await caches.open('anatomiq-public-lessons-v1')).put(lesson,res);
            stored=await (await caches.open('anatomiq-public-lessons-v1')).match(lesson);
          }
        }catch(error){console.warn('[AnatomIQ] Lesson not saved offline',error);}
      }
      if(stored?.ok)completed++;else missing.push('Published lesson JSON');
      source?.postMessage({type:'OFFLINE_PROGRESS',completed,total:urls.length});
    }
    // A status is never based on attempted downloads, earlier cache versions,
    // or the older persistent model cache: only current-build cache responses.
    const complete=completed===urls.length;
    source?.postMessage({type:'OFFLINE_STATUS',route,complete,completed,total:urls.length,
      missing:missing.slice(0,15),message:complete?'All current app and model assets cached.':'Missing offline assets'});
  })().catch(error=>{
    console.error('[AnatomIQ] Offline preparation error',error);
    source?.postMessage({type:'OFFLINE_STATUS',route:typeof event.data.route==='string'?event.data.route:'',complete:false,completed:0,total:0,
      missing:[],message:'Offline cache error: '+String(error?.message||error)});
  }));
});
