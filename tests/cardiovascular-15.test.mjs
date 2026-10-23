import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateCardiovascularManifest,cardiovascularEntries,cardiovascularColor,cardiovascularFamily} from '../cardiovascular-model.js';
import {catalogAnatomy,sceneModelCompatible,upgradeLegacyScene} from '../structure-layout.js';
import {effectiveSystemLayers,toggleAnatomySystem,activeSystemTabs} from '../system-layers.js';
import {validateScene,encodeScene,decodeScene,makeVisibilityBits,readVisibilityBits} from '../scene-codec.js';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const fakeStructure=(name,system,layer,sourceName)=>({name,system,layer,sourceName,side:'midline',tissue:'bone',mesh:{name}});
const old=[fakeStructure('Femur','skeletal','skeleton','sk1'),fakeStructure('Biceps','muscular','superficial muscles','mus1'),fakeStructure('Stomach','digestive','digestive-detail','FJ777')];
const cv=[fakeStructure('Wall of left atrium','cardiovascular','cardiovascular-detail','FJ400'),fakeStructure('Aorta','cardiovascular','cardiovascular-detail','FJ401')];
test('cardiovascular mesh manifests are validated and correctly mapped',()=>{
 const manifest={version:1,structures:Array.from({length:15},(_,i)=>({id:`FJ${100+i}`,name:i<3?'Wall of right atrium':'Aorta',fma_id:'FMA1'}))};
 assert.equal(validateCardiovascularManifest(manifest).structures.length,15);
 assert.throws(()=>validateCardiovascularManifest({...manifest,structures:[...manifest.structures,manifest.structures[0]]}),/identifier/);
 const nodes=manifest.structures.map(s=>({isMesh:true,name:s.id}));
 const root={traverse:fn=>nodes.forEach(fn)};
 const entries=cardiovascularEntries(root,manifest);
 assert.equal(entries.length,15);
 assert.equal(entries[0].system,'cardiovascular');
 assert.equal(entries[0].stableId,'bp43:FJ100');
 assert.equal(entries[0].tissue,'heart');
 assert.equal(entries[3].tissue,'vessel');
 assert.notEqual(cardiovascularColor('aorta'),cardiovascularColor('wall of left atrium'));
 assert.equal(cardiovascularFamily('superior vena cava'),'vein');
});
test('cardiovascular structures append without changing earlier indices/fingerprint',()=>{
 const pre=catalogAnatomy(old);const after=catalogAnatomy([...old,...cv]);
 assert.deepEqual(after.structures.slice(0,pre.structures.length),pre.structures);
 assert.equal(after.preCardioCount,pre.structures.length);
 assert.equal(after.preCardioFingerprint,pre.fullFingerprint);
 const oldScene={v:1,m:'systems',n:pre.structures.length,f:pre.fullFingerprint,b:makeVisibilityBits([true,true,true]),t:'Old saved lesson',lm:'shown',x:true,te:true,ca:true,sb:true,sm:true,dm:false,dg:false,cam:[0,1,3,0,1,0],labels:[{s:0,p:[0,0,0],t:'Bone',dx:1,dy:2}]};
 assert.ok(sceneModelCompatible(oldScene,after.structures.length,after.fullFingerprint,after.legacyCount,after.legacyFingerprint,after.baseCount,after.baseFingerprint,after.previousCount,after.previousFingerprint,after.preCardioCount,after.preCardioFingerprint));
 const migrated=upgradeLegacyScene(oldScene,after.structures.length,after.fullFingerprint);
 assert.deepEqual(readVisibilityBits(migrated.b,migrated.n),[true,true,true,false,false]);
 assert.equal(migrated.labels[0].s,0);
});
test('cardiovascular system has an independent toggle and optional assets guard',()=>{
 const off={skeletal:true,superficial:false,deep:false,digestive:false,cardiovascular:false};
 assert.throws(()=>toggleAnatomySystem('systems',off,'cardiovascular',true,false),/Install/);
 const on=toggleAnatomySystem('systems',off,'cardiovascular',true,true);
 assert.deepEqual(activeSystemTabs('systems',on),{skeletal:true,muscular:false,digestive:false,cardiovascular:true});
 assert.equal(on.skeletal,true);
 assert.deepEqual(toggleAnatomySystem('systems',on,'cardiovascular',true,true),off);
 assert.equal(effectiveSystemLayers('skull',on).cardiovascular,false);
});
test('cardiovascular enabled scene and layers survive share links',async()=>{
 const newScene={v:1,m:'systems',n:5,f:'abc123',b:makeVisibilityBits([true,true,false,true,true]),t:'Heart practical',lm:'hidden',x:false,te:true,ca:true,sb:false,sm:false,dm:false,dg:false,cv:true,cam:[0,1,2,0,1,0],labels:[],pc:[[3,'#c45551']]};
 validateScene(newScene);
 assert.deepEqual(await decodeScene(await encodeScene(newScene)),newScene);
 const legacy={...newScene};delete legacy.cv;validateScene(legacy);
});
test('PWA assets and self-hosting script are bundled',()=>{
 assert.match(read('index.html'),/id="mode-cardiovascular"/);
 assert.match(read('app.js'),/await loadCardiovascular\(\)/);
 assert.match(read('sw.js'),/cardiovascular-structures\.json/);
 assert.match(read('tools/install-cardiovascular-43.sh'),/--group blood_vessel/);
 assert.match(read('tools/install-cardiovascular-43.sh'),/--group heart/);
});

test('suffixed left/right vessel identifiers are distinct and round-trip as stable IDs',()=>{
 const ids=['FJ1682','FJ1682M','FJ1725M','FJ1656M','FJ1725'];
 const manifest={version:1,structures:ids.map((id,i)=>({id,name:i%2?'Left internal carotid artery':'Right internal carotid artery',fma_id:'FMA1'}))};
 assert.deepEqual(validateCardiovascularManifest(manifest).structures.map(x=>x.id),ids);
 const nodes=ids.map(id=>({isMesh:true,name:id}));
 const entries=cardiovascularEntries({traverse:fn=>nodes.forEach(fn)},manifest);
 assert.deepEqual(entries.map(x=>x.sourceName),ids);
 assert.deepEqual(entries.map(x=>x.stableId),ids.map(id=>'bp43:'+id));
 assert.notEqual(entries[0].mesh,entries[1].mesh);
 assert.throws(()=>validateCardiovascularManifest({...manifest,structures:[...manifest.structures,{id:'FJ1682MA',name:'Bad'}]}),/identifier/);
});
