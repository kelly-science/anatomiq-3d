import {test} from 'node:test';
import assert from 'node:assert/strict';
import {correctedDetailTransform} from '../digestive-detail.js';
import {sourceRegistration} from '../digestive-model.js';
import {readFileSync} from 'node:fs';

test('detailed anatomy corrects only AP depth while keeping registered center fixed',()=>{
  const a=sourceRegistration({min:{x:-0.7,y:0,z:-0.25},max:{x:0.7,y:1.8,z:0.25}});
  const t=correctedDetailTransform(a);
  assert.deepEqual(t.scale,[a.scale,a.scale,-a.scale]);
  assert.equal(t.position[0],a.x);
  assert.equal(t.position[1],a.y);
  const center=0.4;
  const prior=(z)=>a.z + a.scale*z;
  const corrected=(z)=>t.position[2]+t.scale[2]*z;
  assert.ok(Math.abs(corrected(center)-prior(center))<1e-12);
  for(const offset of [0.04,-0.17,0.23])
    assert.ok(Math.abs((corrected(center+offset)-prior(center))+(prior(center+offset)-prior(center)))<1e-12);
});

test('mirrored depth transform validates inputs',()=>{
  assert.throws(()=>correctedDetailTransform({scale:0,x:0,y:0,z:0}),/registration/);
  assert.throws(()=>correctedDetailTransform({scale:1,x:0,y:NaN,z:0}),/registration/);
});

test('orientation correction is isolated to 4.3 mesh loading (not legacy)',()=>{
  const s=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  const start=s.indexOf('async function loadDigestiveModel()');
  const detailed=s.indexOf('async function loadDetailedDigestive()');
  assert.ok(start>=0 && detailed>start);
  assert.doesNotMatch(s.slice(start,detailed),/correctedDetailTransform/);
  assert.match(s.slice(detailed,s.indexOf('async function loadAnatomy()',detailed)),/correctedDetailTransform/);
});
