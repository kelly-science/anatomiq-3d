import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalogAnatomy,sceneModelCompatible,upgradeLegacyScene} from '../structure-layout.js';
import {makeVisibilityBits,readVisibilityBits,hashForStructures,validateScene,encodeScene,decodeScene} from '../scene-codec.js';
import {digestiveDefaultColor,digestiveOrganFamily} from '../digestive-model.js';
import {detailStructureEntries,validateDigestiveManifest} from '../digestive-detail.js';
import {readFileSync} from 'node:fs';
const mk=(name,system,layer,meshName)=>({name,system,layer,side:'midline',tissue:system==='digestive'?'organ':system==='muscular'?'muscle':'bone',sourceName:meshName,mesh:{name:meshName}});
const entries=[mk('Liver','digestive','digestive','liver__FMA1'),mk('Stomach','digestive','digestive','stomach__FMA2'),mk('Colon','digestive','digestive-detail','FJ200'),mk('Duodenum','digestive','digestive-detail','FJ100'),mk('Frontal','skeletal','skeleton','frontal'),mk('Soleus','muscular','deep muscles','soleus')];
const tab=catalogAnatomy(entries);
const sc=(n,f)=>({v:1,m:'digestive',n,f,b:makeVisibilityBits(Array(n).fill(true)),t:'Gut',lm:'reveal',x:false,te:true,ca:true,sb:false,dm:false,sm:false,dg:true,cam:[0,1,2,0,1,0],labels:[],pc:[]});
test('anatomy 1.2 indices and fingerprint remain an exact prefix of 1.3',()=>{
 assert.deepEqual(tab.structures.map(e=>e.name),['Frontal','Soleus','Liver','Stomach','Duodenum','Colon']);
 assert.equal(tab.previousCount,4);
 assert.equal(tab.previousFingerprint,hashForStructures(tab.structures.slice(0,4).map(s=>`${s.name}|${s.side}|${s.tissue}|${s.mesh.name}`)));
 assert.ok(sceneModelCompatible(sc(4,tab.previousFingerprint),6,tab.fullFingerprint,1,tab.legacyFingerprint,2,tab.baseFingerprint,4,tab.previousFingerprint));
 const upgraded=upgradeLegacyScene(sc(4,tab.previousFingerprint),6,tab.fullFingerprint);
 assert.deepEqual(readVisibilityBits(upgraded.b,6),[true,true,true,true,false,false]);
});
test('chapter settings preserve detailed anatomy mode and custom paint',async()=>{
 const original={...sc(6,tab.fullFingerprint),hd:true,pc:[[5,'#aaeebb']],labels:[{s:4,p:[0,0,0],t:'Duodenum',dx:12,dy:-21}]};
 assert.deepEqual(await decodeScene(await encodeScene(original)),original);
 assert.throws(()=>validateScene({...original,hd:'oops'}),/layer setting/);
});
test('organ colors cover digestive segments and accessory organs',()=>{
 for(const name of ['Liver','Stomach','Pancreas','Gallbladder','Esophagus','Distal part of jejunum','Ascending colon','Rectum']){
   assert.match(digestiveDefaultColor(name),/^#[a-fA-F0-9]{6}$/);
 }
 assert.equal(digestiveOrganFamily('Middle part of ileum'),'ileum');
});
test('detailed model requires exact FJ mesh IDs matching metadata',()=>{
 const metadata={version:1,structures:[{id:'FJ123',name:'Duodenum',fma_id:'FMA1'},{id:'FJ456',name:'Pancreas',fma_id:'FMA2'}]};
 assert.equal(validateDigestiveManifest(metadata).structures.length,2);
 const fakeRoot={traverse(fn){fn({isMesh:true,name:'FJ123'});fn({isMesh:true,name:'FJ456'});}};
 const parsed=detailStructureEntries(fakeRoot,metadata);
 assert.deepEqual(parsed.map(x=>x.stableId),['bp43:FJ123','bp43:FJ456']);
 assert.equal(parsed[1].organId,'pancreas');
 assert.throws(()=>detailStructureEntries({traverse(fn){fn({isMesh:true,name:'FJ123'});}},metadata),/count/);
 assert.throws(()=>validateDigestiveManifest({...metadata,structures:[metadata.structures[0],metadata.structures[0]]}),/Duplicate/);
});
test('PWA caches new source modules and optional local detailed model assets',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(sw,/digestive-detail\.js/);
 assert.match(sw,/digestive-structures\.json/);
 assert.match(sw,/digestive-detailed\.glb/);
 assert.match(app,/detailEnabled=Boolean\(saved\.hd\)/);
 assert.match(index,/id="settings-digestive-geometry"/);
});
