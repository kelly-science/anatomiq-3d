import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {activeSystemTabs,toggleAnatomySystem} from '../system-layers.js';
import {nervousEntries,validateNervousManifest,NERVOUS_PRESETS,nervousVisibleInPreset} from '../nervous-model.js';
import {catalogAnatomy,sceneModelCompatible,upgradeLegacyScene} from '../structure-layout.js';
import {hashForStructures,makeVisibilityBits,readVisibilityBits,validateScene} from '../scene-codec.js';
import {chapterAssets,offlineLessonFiles} from '../scene-assets.js';
const read=n=>readFileSync(new URL('../'+n,import.meta.url),'utf8');
const catalog=JSON.parse(read('models/nervous-structures.json'));
const legacyIds=JSON.parse(read('tests/nervous-20-prefix.json'));
const roots=list=>({traverse(f){for(const name of list)f({isMesh:true,name});}});
const skeleton=[{system:'skeletal',name:'Frontal',side:'midline',tissue:'bone',mesh:{name:'frontal'}}];
const respiratory=[{system:'respiratory',name:'Trachea',side:'midline',tissue:'organ',sourceName:'FJ2541',mesh:{name:'FJ2541'}}];
const prev=catalogAnatomy([...skeleton,...respiratory]);
const later=catalogAnatomy([...skeleton,...respiratory,...nervousEntries(roots(catalog.structures.map(s=>s.id)),catalog)]);
test('Legacy source ID prefix validates, and GLB must match its exact set',()=>{
 assert.ok(validateNervousManifest(catalog).structures.length>=125);
 assert.deepEqual(catalog.structures.slice(0,legacyIds.length).map(s=>s.id),legacyIds);
 assert.equal(nervousEntries(roots(catalog.structures.map(s=>s.id)),catalog).length,catalog.structures.length);
 assert.throws(()=>nervousEntries(roots(catalog.structures.map(s=>s.id).slice(1)),catalog),/count mismatch/);
 assert.throws(()=>nervousEntries(roots(catalog.structures.map(s=>s.id).concat('FJ9999')),catalog),/count mismatch/);
 assert.throws(()=>nervousEntries(roots(catalog.structures.map(s=>s.id).slice(1).concat('FJ1321')),catalog),/duplicate/);
});
test('brain, cord, peripheral counts and preset selections',()=>{
 const items=nervousEntries(roots(catalog.structures.map(s=>s.id)),catalog);
 assert.ok(items.filter(s=>s.organId==='brain').length>=64);
 assert.equal(items.filter(s=>s.organId==='spinal_cord').length,1);
 assert.ok(items.filter(s=>s.organId==='peripheral').length>=60);
 for(const k of ['all','cns','brain','cord','peripheral'])assert.ok(items.some(x=>nervousVisibleInPreset(x,k)));
 assert.ok(items.filter(x=>nervousVisibleInPreset(x,'cns')).length>=65);
});
test('new layer toggles without affecting preexisting systems',()=>{
 const old={skeletal:true,superficial:false,deep:false,digestive:false,cardiovascular:true,respiratory:true,nervous:false};
 const next=toggleAnatomySystem('systems',old,'nervous',true,true,true,true);
 assert.equal(activeSystemTabs('systems',next).nervous,true);
 assert.equal(next.cardiovascular,true);assert.equal(next.respiratory,true);
 assert.deepEqual({...toggleAnatomySystem('systems',next,'nervous',true,true,true,true),nervous:false},old);
 assert.throws(()=>toggleAnatomySystem('systems',old,'nervous',true,true,true,false),/Upload/);
});
test('nervous append retains old index prefix, accepts old scene fingerprint and upgrades hidden bits',()=>{
 assert.deepEqual(later.structures.slice(0,prev.structures.length).map(x=>x.mesh.name),prev.structures.map(x=>x.mesh.name));
 const scene={v:1,m:'systems',n:prev.structures.length,f:prev.fullFingerprint,b:makeVisibilityBits([true,true]),t:'Old anatomy',lm:'shown',x:true,te:true,ca:true,sb:true,dm:false,sm:false,dg:false,cv:false,rs:true,cam:[0,1,2,0,0,0],labels:[]};
 validateScene(scene);
 assert.equal(sceneModelCompatible(scene,later.structures.length,later.fullFingerprint,0,'',0,'',0,'',0,'',0,'',later.structures),true); // old catalog matches exact 2.0 prefix
 const up=upgradeLegacyScene(scene,later.structures.length,later.fullFingerprint);
 assert.deepEqual(readVisibilityBits(up.b,up.n).slice(0,2),[true,true]);
 assert.ok(readVisibilityBits(up.b,up.n).slice(2).every(x=>!x));
 assert.equal(up.rs,true);assert.equal(up.nv,undefined);
});
test('student links load only nervous assets where chapter requires them',()=>{
 const skull={v:1,m:'skull'},neuro={v:1,m:'systems',nv:true};
 assert.equal(chapterAssets(skull).nervous,false);
 assert.equal(chapterAssets(neuro).nervous,true);
 const project={v:2,start:0,chapters:[skull,neuro]};
 const files=offlineLessonFiles(project,{nervousGeometry:'detailed'});
 assert.deepEqual(files.filter(f=>f.includes('nervous')),['models/nervous-structures.json','models/nervous-detailed.glb']);
});
test('2.0.1 version, UI, worker, deferred loading and refresh support new system',()=>{
 const app=read('app.js'),html=read('index.html'),sw=read('sw.js');
 assert.equal(JSON.parse(read('version.json')).version,'2.0.1');
 assert.match(sw,/anatomy-v2\.0\.1/);
 assert.match(sw,/nervous-standard\.glb/);assert.match(sw,/nervous-detailed\.glb/);
 assert.match(app,/createDeferredCatalog/);assert.match(app,/restoreDeferredReferences\('nervous'/);
 assert.match(app,/if\(requirements\.nervous\)await loadNervous/);
 assert.match(app,/if\(needed\[type\]\)await loadNeededAsset/);
 assert.match(html,/id="mode-nervous"/);assert.match(html,/id="settings-nervous-geometry"/);
});
