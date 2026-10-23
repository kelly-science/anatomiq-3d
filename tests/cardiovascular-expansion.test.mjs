import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {catalogAnatomy, ORIGINAL_CARDIO_IDS,sceneModelCompatible,upgradeLegacyScene} from '../structure-layout.js';
import {validateCardiovascularManifest,cardiovascularEntries,cardiovascularFamily} from '../cardiovascular-model.js';
import {makeVisibilityBits,readVisibilityBits,encodeScene,decodeScene} from '../scene-codec.js';
const mk=(id,name,system='cardiovascular')=>({system,layer:'cardiovascular-detail',name,sourceName:id,mesh:{name:id},tissue:system==='cardiovascular'?'vessel':'bone',side:'midline'});
test('expanded catalog preserves original 15 cardiovascular structure indices and legacy scene fingerprint',async()=>{
 const bones=[{...mk('B1','Skull','skeletal'),layer:'skeleton'}];
 const oldCv=ORIGINAL_CARDIO_IDS.map((id,i)=>mk(id,i===1?'Wall of ventricle':'Aorta'));
 const old=catalogAnatomy([...bones,...oldCv]);
 const newCv=[mk('FJ2417','Left anterior cusp of pulmonary valve'),mk('FJ2422','Cavity of left ventricle')];
 const expanded=catalogAnatomy([...bones,...newCv,...oldCv]);
 assert.deepEqual(expanded.structures.slice(0,old.structures.length).map(s=>s.sourceName),old.structures.map(s=>s.sourceName));
 assert.equal(expanded.originalCardioFingerprint,old.fullFingerprint);
 assert.equal(expanded.originalCardioCount,old.structures.length);
 const lesson={v:1,m:'systems',n:old.structures.length,f:old.fullFingerprint,b:makeVisibilityBits(Array(old.structures.length).fill(true)),t:'Heart anatomy',lm:'hidden',x:false,te:true,ca:true,sb:false,sm:false,dm:false,dg:false,cv:true,cam:[0,1,3,0,1,0],labels:[{s:2,p:[0,0,0],t:'Valve question',dx:8,dy:10}],pc:[[2,'#ff0000']]};
 assert.equal(sceneModelCompatible(lesson,expanded.structures.length,expanded.fullFingerprint,expanded.legacyCount,expanded.legacyFingerprint,expanded.baseCount,expanded.baseFingerprint,expanded.previousCount,expanded.previousFingerprint,expanded.preCardioCount,expanded.preCardioFingerprint,expanded.originalCardioCount,expanded.originalCardioFingerprint),true);
 const upgraded=upgradeLegacyScene(lesson,expanded.structures.length,expanded.fullFingerprint);
 assert.equal(upgraded.labels[0].s,2);assert.deepEqual(upgraded.pc,lesson.pc);
 assert.deepEqual(readVisibilityBits(upgraded.b,upgraded.n).slice(old.structures.length),[false,false]);
 assert.deepEqual(await decodeScene(await encodeScene(upgraded)),upgraded);
});
test('expanded manifest covers named heart structures and up to 350 separate meshes',()=>{
 const structures=Array.from({length:155},(_,i)=>({id:`FJ${1800+i}`,name:i%2?'Cavity of left ventricle':'Left internal jugular vein',category:i%2?'heart-internal':'systemic'}));
 const meta=validateCardiovascularManifest({version:1,structures});
 const root={traverse:fn=>meta.structures.forEach(s=>fn({isMesh:true,name:s.id}))};
 const entries=cardiovascularEntries(root,meta);
 assert.equal(entries.length,155);assert.equal(entries[1].cardioGroup,'heart-internal');
 assert.equal(cardiovascularFamily('Anterior leaflet of mitral valve'),'heart-internal');
 assert.equal(cardiovascularFamily('Great cardiac vein'),'coronary');
});
test('1.6 install and UI expose heart internals with local-only model files',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 assert.match(read('tools/install-cardiovascular-43.sh'),/fetch-cardiovascular-expansion\.py/);
 assert.match(read('app.js'),/data\.?menuCardiac|menuCardiac/);
 assert.match(read('index.html'),/data-menu-cardiac="interior"/);
 assert.match(read('sw.js'),/anatomy-v1\.8\.3/);
});
