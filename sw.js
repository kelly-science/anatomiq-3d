/* Anatomy Studio 1.1 — same-origin-first installable PWA.
   Student scenes remain URL-contained. Library scenes remain in IndexedDB. */
const VERSION='anatomy-v1.1.0';
const SHELL=['./','./index.html','./styles.css','./app.js','./scene-codec.js','./library-store.js','./scene-history.js','./structure-layout.js','./render-performance.js','./version.json','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
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
  await Promise.all((await caches.keys()).filter(key=>key.startsWith('anatomy-')&&key!==VERSION).map(key=>caches.delete(key)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(!ALLOWED_ORIGINS.has(url.origin))return;
  event.respondWith((async()=>{
    const cache=await caches.open(VERSION);
    const cached=await cache.match(request,{ignoreSearch:request.mode==='navigate'});
    // Updates must be fresh. Navigations use network first so deploying a new release can replace the page.
    if(request.mode==='navigate'||(url.origin===self.location.origin&&url.pathname.endsWith('/version.json'))){
      try{
        const response=await fetch(request);
        if(response.ok)event.waitUntil(cache.put(request,response.clone()).catch(()=>{}));
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
self.addEventListener('message',event=>{
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
    const urls=[...SHELL,...renderer,modelURL].map(path=>new URL(path,self.location.href).href);
    let done=0;
    for(const url of urls){
      let saved=await cache.match(url);
      if(!saved&&event.data.type==='CACHE_OFFLINE'){
        try{
          const response=await fetch(url,{cache:'no-cache'});
          if(response.ok&&(response.type==='basic'||response.type==='cors')){await cache.put(url,response.clone());saved=response;}
        }catch(e){console.warn('Offline asset missing',url,e);}
      }
      if(saved)done++;
      source?.postMessage({type:'OFFLINE_PROGRESS',completed:done,total:urls.length});
    }
    source?.postMessage({type:'OFFLINE_STATUS',complete:done===urls.length,completed:done,total:urls.length});
  })());
});
