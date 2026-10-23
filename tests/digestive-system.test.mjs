import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {catalogAnatomy,sceneModelCompatible,upgradeLegacyScene} from '../structure-layout.js';
import {digestiveMeshEntries,sourceRegistration} from '../digestive-model.js';
import {encodeScene,decodeScene,makeVisibilityBits,readVisibilityBits,validateScene} from '../scene-codec.js';
const mk=(name,system,tissue='bone')=>({name,system,tissue,layer:'skeleton',side:'midline',mesh:{name}});
const bones=[mk('Scapula','skeletal'),mk('Frontal bone','skeletal')],muscles=[mk('Biceps','muscular','muscle')];
const mesh=(name)=>({isMesh:true,name,visible:true});
const nodes=[mesh('liver__FMA7197'),mesh('stomach__FMA7148'),mesh('intestines__FMA7206'),mesh('kidneys__FMA7203')];
const root={traverse(cb){nodes.forEach(cb)}};
const scene=(count,fp,mode='systems')=>({v:1,m:mode,n:count,f:fp,b:makeVisibilityBits(Array(count).fill(true)),t:'Digestive study',lm:'shown',x:true,te:true,ca:true,sb:false,dm:false,sm:false,dg:true,cam:[0,1,1,0,1,0],labels:[],pc:[]});
test('digestive semantic names are correctly selected and other organs hidden',()=>{
 const entries=digestiveMeshEntries(root);
 assert.equal(entries.length,3);assert.deepEqual(new Set(entries.map(e=>e.name)),new Set(['Liver','Stomach','Intestines']));
 assert.equal(nodes[3].visible,false);
});
test('digestive source frame produces anatomically sized overlay',()=>{
 const t=sourceRegistration({min:{x:-.7,y:0,z:-.25},max:{x:.7,y:1.8,z:.25}});
 assert.ok(t.scale>.2 && t.scale<.35);assert.ok(t.y>.8 && t.y<1.1);
 assert.throws(()=>sourceRegistration({min:{x:0,y:0,z:0},max:{x:0,y:50,z:0}}),/dimensions/i);
});
test('digestive entries append after original bone and muscle indices; old scene masks migrate',async()=>{
 const base=catalogAnatomy([...bones,...muscles]);
 const extended=catalogAnatomy([...muscles,...digestiveMeshEntries(root),...bones]);
 assert.deepEqual(extended.structures.slice(0,3).map(s=>s.name),base.structures.map(s=>s.name));
 assert.equal(extended.baseFingerprint,base.fullFingerprint);
 const prior=scene(base.structures.length,base.fullFingerprint,'muscular');delete prior.dg;
 assert.ok(sceneModelCompatible(prior,extended.structures.length,extended.fullFingerprint,extended.legacyCount,extended.legacyFingerprint,extended.baseCount,extended.baseFingerprint));
 const upgraded=upgradeLegacyScene(prior,extended.structures.length,extended.fullFingerprint);
 assert.deepEqual(readVisibilityBits(upgraded.b,upgraded.n).slice(-3),[false,false,false]);
 const project={v:2,t:'Digestive lesson',start:0,chapters:[scene(extended.structures.length,extended.fullFingerprint,'digestive')]};
 assert.deepEqual(await decodeScene(await encodeScene(project)),project);
});
test('digestive mode needs enabled organs, older combined systems do not',()=>{
 const base=catalogAnatomy([...bones,...muscles]);
 const legacy=scene(base.structures.length,base.fullFingerprint,'systems');delete legacy.dg;
 assert.doesNotThrow(()=>validateScene(legacy));
 assert.throws(()=>validateScene({...legacy,m:'digestive'}),/digestive/i);
});
test('HTML, worker and installer include separately hosted digestive assets',()=>{
 const read=n=>readFileSync(new URL('../'+n,import.meta.url),'utf8');
 for(const id of ['mode-digestive','settings-organs'])assert.match(read('index.html'),new RegExp(`id="${id}"`));
 assert.match(read('app.js'),/loadDigestiveModel/);
 assert.match(read('sw.js'),/anatomy-organs.glb/);
 assert.match(read('tools/vendor-three.py'),/DRACOLoader.js/);
 assert.match(read('tools/download-digestive-assets.sh'),/anatomy-organs.glb/);
});
