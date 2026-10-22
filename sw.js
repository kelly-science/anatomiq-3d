/* Anatomy Studio PWA. Offline assets are cached on first successful online load.
   Keep third-party model attribution in the application and README. */
const VERSION = 'anatomy-v0.5.0';
const SHELL = ['./', './index.html', './styles.css', './app.js', './scene-codec.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
const THREE_BASE = 'https://cdn.jsdelivr.net/npm/three@0.169.0/';
const EXTERNALS = [
  THREE_BASE + 'build/three.module.js',
  THREE_BASE + 'examples/jsm/controls/OrbitControls.js',
  THREE_BASE + 'examples/jsm/loaders/GLTFLoader.js'
];
const MODEL_HOSTS = new Set(['https://cdn.jsdelivr.net','https://charleeh.github.io', self.location.origin]);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('anatomy-') && key !== VERSION) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!MODEL_HOSTS.has(url.origin)) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const saved = await cache.match(request);
    if (saved) return saved;
    try {
      const response = await fetch(request);
      if (response.ok && (response.type === 'basic' || response.type === 'cors')) {
        event.waitUntil(cache.put(request, response.clone()).catch(error => console.warn('Cache storage unavailable:', error)));
      }
      return response;
    } catch (error) {
      if (url.origin === self.location.origin && request.mode === 'navigate') {
        const shell = await cache.match('./index.html');
        if (shell) return shell;
      }
      throw error;
    }
  })());
});
self.addEventListener('message', (event) => {
  if (!['CACHE_OFFLINE', 'CHECK_OFFLINE'].includes(event.data?.type)) return;
  const source = event.source;
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    const modelURL = event.data.model;
    let modelIsValid = false;
    try {
      const url = new URL(modelURL, self.location.href);
      modelIsValid = MODEL_HOSTS.has(url.origin) && /\.glb$/i.test(url.pathname);
    } catch {}
    if (!modelIsValid) {
      source?.postMessage({type:'OFFLINE_STATUS',complete:false,message:'Model URL unavailable'});
      return;
    }
    const urls = [...SHELL.map(path=>new URL(path,self.location.href).href), ...EXTERNALS, new URL(modelURL,self.location.href).href];
    let ready = 0;
    for (const url of urls) {
      let saved = await cache.match(url);
      if (!saved && event.data.type === 'CACHE_OFFLINE') {
        try {
          const response = await fetch(url, {mode: new URL(url).origin === self.location.origin ? 'same-origin' : 'cors'});
          if (response.ok && (response.type === 'basic' || response.type === 'cors')) {
            await cache.put(url,response.clone());
            saved = response;
          }
        } catch (error) { console.warn('Could not cache offline resource:', url, error); }
      }
      if (saved) ready++;
      source?.postMessage({type:'OFFLINE_PROGRESS',completed:ready,total:urls.length});
    }
    source?.postMessage({type:'OFFLINE_STATUS',complete:ready===urls.length,completed:ready,total:urls.length});
  })());
});
