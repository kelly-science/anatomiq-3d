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
test('multi-chapter lesson saves separate label visibility and camera for each chapter',async()=>{
  const first=baseScene();first.t='Skull: Exterior';
  const second=structuredClone(first);second.t='Skull: Interior';
  second.b=makeVisibilityBits(Array.from({length:270},(_,i)=>i===0||i===3));
  second.cam=[0.2,1.68,-.3,0,1.65,0];
  second.labels=[{s:3,p:[0,0,0],t:'Foramen magnum',dx:-20,dy:10}];
  second.lm='hidden';
  const project={v:2,t:'Skull lab',start:1,chapters:[first,second]};
  const token=await encodeScene(project);
  const restored=await decodeScene(token);
  assert.deepEqual(restored,project);
  assert.ok(token.length < 1500,`Expected compact lesson URL, got ${token.length}`);
  assert.notEqual(restored.chapters[0].b,restored.chapters[1].b);
  assert.notEqual(restored.chapters[0].cam[2],restored.chapters[1].cam[2]);
});
test('project permits legacy v1 scenes but rejects mismatched fingerprints and chapters overflow',async()=>{
  const old=baseScene();
  assert.deepEqual(await decodeScene(await encodeScene(old)),old);
  const other=baseScene();other.f='different';
  const mismatch={v:2,t:'Skull lesson',start:0,chapters:[baseScene(),other]};
  await assert.rejects(encodeScene(mismatch),/same 3D model/i);
  const overflow={v:2,t:'Skull lesson',start:0,chapters:Array.from({length:13},baseScene)};
  await assert.rejects(encodeScene(overflow),/1–12 chapters/i);
  const invalid={v:2,t:'Skull lesson',start:2,chapters:[baseScene()]};
  await assert.rejects(encodeScene(invalid),/starting chapter/i);
});

test('painted bones survive links, multiple chapters, and remain separate from older projects',async()=>{
  const outside=baseScene();outside.t='Exterior';outside.pc=[[0,'#e45d58'],[1,'#5dbfda']];
  const inside=structuredClone(outside);inside.t='Interior';inside.pc=[[1,'#a89bdf'],[3,'#f3d66a']];
  const project={v:2,t:'Skull color lesson',start:0,chapters:[outside,inside]};
  const result=await decodeScene(await encodeScene(project));
  assert.deepEqual(result,project);
  assert.deepEqual(result.chapters[0].pc,[[0,'#e45d58'],[1,'#5dbfda']]);
  assert.deepEqual(result.chapters[1].pc,[[1,'#a89bdf'],[3,'#f3d66a']]);
  const old=baseScene();
  assert.deepEqual(await decodeScene(await encodeScene(old)),old);
});
test('rejects unsafe or malformed paint entries',()=>{
  for(const bad of [
    [[-1,'#e45d58']], [[270,'#e45d58']], [[0,'red']], [[0,'#12345g']],
    [[0,'#aabbcc'],[0,'#ffeedd']], [[0,'#e45d58','unexpected']], [['0','#e45d58']]
  ]){
    const scene=baseScene();scene.pc=bad;
    assert.throws(()=>validateScene(scene),/bone paint/i);
  }
  const excessive=baseScene();excessive.pc=Array.from({length:271},(_,i)=>[i,'#ffffff']);
  assert.throws(()=>validateScene(excessive),/bone paint/i);
});
test('large chapter paint lists stay compact enough for shareable links',async()=>{
  const project={v:2,t:'Colored skeleton',start:0,chapters:Array.from({length:6},(_,index)=>{
    const ch=baseScene();ch.t='Chapter '+index;
    ch.pc=Array.from({length:45},(_,i)=>[i+index*10,['#e45d58','#5dbfda','#69bf93'][i%3]]);
    return ch;
  })};
  const token=await encodeScene(project);
  assert.ok(token.length < 6000,`6 chapters with colors exceeded expected share length: ${token.length}`);
  assert.deepEqual(await decodeScene(token),project);
});
