import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const origin='https://example.github.io/anatomy-studio/';
const goodManifest={version:1,structures:[{id:'FJ111',name:'Vessel'},{id:'FJ222',name:'Vein'}]};
function glb(ids){
  const json=new TextEncoder().encode(JSON.stringify({asset:{version:'2.0'},nodes:ids.map(name=>({name}))}));
  const padded=(json.byteLength+3)&~3;
  const bytes=new Uint8Array(20+padded);
  bytes.set([0x67,0x6c,0x54,0x46]);
  const view=new DataView(bytes.buffer);
  view.setUint32(4,2,true);view.setUint32(8,bytes.length,true);
  view.setUint32(12,padded,true);view.setUint32(16,0x4e4f534a,true);
  bytes.fill(0x20,20);
  bytes.set(json,20);
  return bytes;
}
function setup({absent='',wrongGeometry=false}={}){
  const listeners={},stored=new Map(),requests=[];
  const cache={
    match:async req=>stored.get(typeof req==='string'?req:req.url),
    put:async(req,res)=>{stored.set(typeof req==='string'?req:req.url,res);},
  };
  const caches={open:async()=>cache,keys:async()=>[],delete:async()=>true};
  async function fetcher(input,options){
    const url=new URL(typeof input==='string'?input:input.url);
    requests.push({url,options});
    const path=url.pathname.split('/').at(-1);
    if(path===absent)return new Response('missing',{status:404});
    if(path==='cardiovascular-structures.json')return new Response(JSON.stringify(goodManifest),{headers:{'content-type':'application/json'}});
    if(path.endsWith('.glb'))return new Response(glb(wrongGeometry?['FJ111']:['FJ111','FJ222']),{headers:{'content-type':'model/gltf-binary'}});
    return new Response('fresh',{headers:{'content-type':'text/plain'}});
  }
  const self={location:new URL(origin),addEventListener:(name,handler)=>listeners[name]=handler,skipWaiting:async()=>{},clients:{claim:async()=>{}}};
  runInNewContext(source,{self,caches,fetch:fetcher,URL,Request,Response,TextDecoder,Uint8Array,DataView,Date,console});
  return {listeners,stored,requests,cache};
}
async function runRefresh(setup,scope='cardiovascular'){
  const messages=[];let pending;
  setup.listeners.message({data:{type:'REFRESH_MODELS',scope},ports:[{postMessage:m=>messages.push(m)}],waitUntil:p=>pending=p});
  await pending;
  return messages;
}
test('refresh downloads and verifies catalog and both GLBs before cache commit',async()=>{
  const s=setup();
  const messages=await runRefresh(s);
  assert.equal(messages.at(-1).ok,true);
  assert.equal(messages.filter(m=>m.type==='MODEL_REFRESH_PROGRESS').length,3);
  assert.equal(s.stored.size,3);
  assert.equal(s.requests.length,3);
  for(const call of s.requests){
    assert.equal(call.options.cache,'reload');
    assert.ok(call.url.searchParams.has('anatomy-refresh'));
  }
  for(const key of s.stored.keys())assert.equal(new URL(key).search,'');
});
test('a missing GLB leaves preexisting model cache intact without a partial write',async()=>{
  const s=setup({absent:'cardiovascular-detailed.glb'});
  const old='old cached response';
  s.stored.set(new URL('models/cardiovascular-standard.glb',origin).href,old);
  const messages=await runRefresh(s);
  assert.equal(messages.at(-1).ok,false);
  assert.match(messages.at(-1).error,/cardiovascular-detailed\.glb.*404/);
  assert.equal(s.stored.size,1);
  assert.equal(s.stored.get(new URL('models/cardiovascular-standard.glb',origin).href),old);
});
test('mismatched cardiovascular GLB IDs are rejected, preserving cache',async()=>{
  const s=setup({wrongGeometry:true});
  const messages=await runRefresh(s);
  assert.equal(messages.at(-1).ok,false);
  assert.match(messages.at(-1).error,/do not match/);
  assert.equal(s.stored.size,0);
});
test('normal GLB loading revalidates over network instead of using cached old data',async()=>{
  const s=setup();
  const url=new URL('models/cardiovascular-standard.glb',origin).href;
  s.stored.set(url,new Response('stale'));
  let result;const jobs=[];
  const event={request:new Request(url),respondWith:p=>result=p,waitUntil:p=>jobs.push(p)};
  s.listeners.fetch(event);
  const response=await result;
  assert.equal(response.status,200);
  assert.equal(s.requests[0].options,undefined); // A Request instance is passed for normal revalidation.
  await Promise.all(jobs);
  assert.equal(s.stored.get(url).status,200);
});
test('app exposes model refresh without deleting local site storage',()=>{
  const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/id="settings-force-models"/);
  assert.match(html,/id="settings-model-refresh-result"/);
  assert.match(app,/REFRESH_MODELS/);
  assert.doesNotMatch(app.slice(app.indexOf('async function forceRefreshModels'),app.indexOf("$('settings-force-models').addEventListener")),/localStorage\.clear|indexedDB\.deleteDatabase|caches\.delete/);
});
