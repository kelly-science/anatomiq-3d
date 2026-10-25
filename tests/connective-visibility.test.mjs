import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverLegacyConnectiveHidden} from '../connective-model.js';

function native(){ return Array.from({length:14}, (_,i)=>({mesh:{name:`FJ${i}`,userData:{}}})); }

test('repairs the 14-mesh all-hidden legacy case without clearing unrelated hides',()=>{
  const entries=native(), unrelated={name:'teacher-hidden bone'};
  const hidden=new Set([...entries.map(s=>s.mesh),unrelated]);
  assert.equal(recoverLegacyConnectiveHidden(hidden,entries),14);
  assert.equal(hidden.size,1);
  assert.ok(hidden.has(unrelated));
});

test('preserves deliberate partial Connective exclusions',()=>{
  const entries=native(), hidden=new Set(entries.slice(0,13).map(e=>e.mesh));
  assert.equal(recoverLegacyConnectiveHidden(hidden,entries),0);
  assert.equal(hidden.size,13);
});

test('never reveals virtual/deferred assets or incomplete atlases',()=>{
  const entries=native(), hidden=new Set(entries.map(e=>e.mesh));
  entries[0].mesh.userData.deferredAsset=true;
  assert.equal(recoverLegacyConnectiveHidden(hidden,entries),0);
  assert.equal(hidden.size,14);
  entries[0].mesh.userData.deferredAsset=false;
  assert.equal(recoverLegacyConnectiveHidden(hidden,entries.slice(1)),0);
});

test('is safe when not all models are hidden',()=>{
  const entries=native(), hidden=new Set(entries.map(e=>e.mesh));
  hidden.delete(entries[0].mesh);
  assert.equal(recoverLegacyConnectiveHidden(hidden,entries),0);
});
