import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateConnectiveManifest,connectiveEntries,connectiveVisibleInPreset,isBaseConnective,baseConnectiveVisibleInPreset,CONNECTIVE_PRESETS} from '../connective-model.js';
const selection=JSON.parse(readFileSync(new URL('../tools/connective-selection.json',import.meta.url),'utf8')).structures;
const manifest={version:1,structures:selection.map(s=>({id:s.fj_id,name:s.name,category:s.category,fma_id:s.fma_id,standard_triangles:100,detailed_triangles:200}))};
const entries=()=>connectiveEntries({traverse(fn){manifest.structures.forEach(s=>fn({isMesh:true,name:s.id}));}},manifest);
test('curated selection has exactly 14 meshes and no original disc/Achilles duplicates',()=>{
  assert.equal(selection.length,14);
  assert.equal(new Set(selection.map(s=>s.fj_id)).size,14);
  assert.ok(selection.every(s=>!/intervertebral disk|calcaneal tendon/i.test(s.name)));
  assert.doesNotThrow(()=>validateConnectiveManifest(manifest));
});
test('refuse unexpected, repeated, or legacy 33-mesh metadata',()=>{
  assert.throws(()=>validateConnectiveManifest({...manifest,structures:selection.slice(0,13)}));
  assert.throws(()=>validateConnectiveManifest({...manifest,structures:[...manifest.structures.slice(0,13),manifest.structures[0]]}));
  assert.throws(()=>validateConnectiveManifest({...manifest,structures:Array.from({length:33},()=>manifest.structures[0])}));
});
test('native entries have stable FJ IDs and no index remapping',()=>{
  assert.equal(entries().length,14);
  assert.ok(entries().every(e=>e.system==='connective'&&e.stableId==='bp43-connective:'+e.sourceName));
});
test('all six costal cartilages for false ribs 8–10, bilateral',()=>{
  const a=entries().filter(e=>e.organId==='cartilage');
  assert.equal(a.length,6);
  assert.equal(a.filter(e=>e.side==='left').length,3);
  assert.equal(a.filter(e=>e.side==='right').length,3);
  assert.equal(entries().filter(e=>connectiveVisibleInPreset(e,'ribs')).length,6);
});
test('presets use native and existing base cartilage correctly',()=>{
  assert.equal(entries().filter(e=>connectiveVisibleInPreset(e,'membranes')).length,4);
  assert.equal(entries().filter(e=>connectiveVisibleInPreset(e,'ankle')).length,2);
  assert.equal(entries().filter(e=>connectiveVisibleInPreset(e,'wrist')).length,4); // wrist retinacula + forearm membranes
  assert.equal(entries().filter(e=>connectiveVisibleInPreset(e,'spine')).length,0);
  assert.ok(baseConnectiveVisibleInPreset({name:'Intervertebral disc L4-L5'},'spine'));
  assert.ok(baseConnectiveVisibleInPreset({name:'Eighth costal cartilage'},'ribs'));
  assert.ok(!baseConnectiveVisibleInPreset({name:'Knee ligament'},'spine'));
  assert.ok(CONNECTIVE_PRESETS.ribs);
});
test('legacy skeletal cartilage retains object identity and never gets assigned new FJ ID',()=>{
  const old={system:'skeletal',tissue:'cartilage',name:'Intervertebral disc',sourceName:'legacy',mesh:{name:'old'},index:5};
  assert.equal(isBaseConnective(old),true);
  assert.equal(old.system,'skeletal');assert.equal(old.index,5);
  assert.equal(isBaseConnective({...old,tissue:'bone',name:'Left humerus'}),false);
  assert.equal(isBaseConnective({...old,system:'nervous',name:'Internal capsule'}),false);
});
