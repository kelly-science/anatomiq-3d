import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { encodeScene, decodeScene, hashForStructures, makeVisibilityBits, validatePermissions, validateProject, STUDY_PERMISSIONS, EXAM_PERMISSIONS } from '../scene-codec.js';

function sampleProject() {
  const chapter = (title)=>({v:1,m:'skull',n:8,f:hashForStructures(['bone-1','bone-2']),b:makeVisibilityBits([true,true,false,false,false,false,false,false]),t:title,lm:'shown',x:false,te:true,ca:true,cam:[0,0,1,0,0,0],labels:[{s:0,p:[0,0,0],t:'Foramen A',dx:20,dy:-20}]});
  return {v:2,t:'Skull Practical',start:0,chapters:[chapter('Exterior'),chapter('Interior')]};
}
test('study, practical exam and custom permissions round-trip in the share fragment',async()=>{
  for(const policy of [STUDY_PERMISSIONS,EXAM_PERMISSIONS,{ss:false,st:true,sn:false,sl:true,ex:false}]) {
    const project=sampleProject();project.sp={...policy};
    const token=await encodeScene(project);
    const decoded=await decodeScene(token);
    assert.deepEqual(decoded.sp,policy);
    assert.equal(decoded.chapters.length,2);
    assert.equal(decoded.chapters[0].labels[0].t,'Foramen A');
  }
});
test('older scenes and projects without permissions remain valid',async()=>{
  const old=sampleProject();delete old.sp;
  assert.equal((await decodeScene(await encodeScene(old))).sp,undefined);
  const oldSingle=old.chapters[0];
  assert.equal((await decodeScene(await encodeScene(oldSingle))).v,1);
});
test('malformed or incomplete permission maps are rejected',()=>{
  assert.throws(()=>validatePermissions({ss:true,st:true,sn:true,sl:true}),/permissions/i);
  const project=sampleProject();project.sp={ss:true,st:false,sn:'yes',sl:true,ex:false};
  assert.throws(()=>validateProject(project),/permissions/i);
});
test('student interface, publishing controls, and code-creation actions are wired',()=>{
 const base=new URL('../',import.meta.url);
 const html=readFileSync(new URL('index.html',base),'utf8');
 const js=readFileSync(new URL('app.js',base),'utf8');
 for(const id of ['publish-preset','publish-search','publish-tree','publish-names','publish-labels','publish-explore','generate-student-link','share-url','embed-url','iframe-code','copy-embed-url','copy-iframe']) assert.match(html,new RegExp(`id="${id}"`));
 assert.match(js,/studentPermissions\.sn/);
 assert.match(js,/studentPermissions\.ss/);
 assert.match(js,/studentPermissions\.sl/);
 assert.match(js,/location\.search/);
 assert.match(js,/searchParams\.set\('embed','1'\)/);
 assert.match(js,/studentAllowed\('sn'\)/);
});
