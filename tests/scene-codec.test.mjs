import {test} from 'node:test';
import assert from 'node:assert/strict';
import {encodeScene, decodeScene, makeVisibilityBits, readVisibilityBits, hashForStructures, validateScene} from '../scene-codec.js';
function baseScene(){
  const bones=Array.from({length:270},(_,i)=>i===0||i===1||i>250);
  return {v:1,m:'skull',n:bones.length,f:hashForStructures(['frontal bone','left parietal']),
    b:makeVisibilityBits(bones),t:'Skull anatomy · foramina & sutures',lm:'reveal',x:false,te:true,ca:true,
    cam:[.005,1.72,.65,.001,1.66,.001],labels:[
      {s:0,p:[1500.15,100.25,0.15],t:'Coronal suture',dx:25,dy:-35},
      {s:1,p:[10.15,-88.25,0.9],t:'Foramen magnum',dx:30,dy:40}]
  };
}
test('visible bitmap round trips 270 structures and handles tail bits',()=>{
  const flags=Array.from({length:270},(_,i)=>i%3===0);
  assert.deepEqual(readVisibilityBits(makeVisibilityBits(flags),270),flags);
});
test('shared link round trips with camera labels and label-reveal setting',async()=>{
  const original=baseScene();const token=await encodeScene(original);
  assert.ok(token.startsWith('g')||token.startsWith('j'));
  assert.ok(token.length<1200,`Expected compact link; got ${token.length}`);
  assert.deepEqual(await decodeScene(token),original);
});
test('fingerprint is deterministic but detects changes to bone metadata',()=>{
  assert.equal(hashForStructures(['bone A','bone B']),hashForStructures(['bone A','bone B']));
  assert.notEqual(hashForStructures(['bone B','bone A']),hashForStructures(['bone A','bone B']));
});
test('does not accept invalid, truncated, or corrupt links',async()=>{
  await assert.rejects(decodeScene('not-a-scene'));
  await assert.rejects(decodeScene('g@@@@@@'));
  await assert.rejects(decodeScene('j'+ 'a'.repeat(24010)));
  const token=await encodeScene(baseScene());
  await assert.rejects(decodeScene(token.slice(0,20)));
});
test('rejects crafted fields and malicious annotation payloads',()=>{
  const scene=baseScene();scene.labels.push({s:-3,p:[0,0,0],t:'X',dx:1,dy:1});
  assert.throws(()=>validateScene(scene),/label/i);
  const broken=baseScene();broken.labels[0].t='';
  assert.throws(()=>validateScene(broken),/label/i);
  const mismatch=baseScene();mismatch.b=makeVisibilityBits([true]);
  assert.throws(()=>validateScene(mismatch),/visibility/i);
});
