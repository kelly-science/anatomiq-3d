import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalogAnatomy,sceneModelCompatible,upgradeLegacyScene} from '../structure-layout.js';
import {encodeScene, decodeScene, makeVisibilityBits,readVisibilityBits,validateScene} from '../scene-codec.js';
import {readFileSync} from 'node:fs';
const bone=(name,side='midline')=>({name,side,tissue:'bone',system:'skeletal',layer:'skeleton',mesh:{name}});
const muscle=(name,layer='superficial muscles')=>({name,side:'left',tissue:'muscle',system:'muscular',layer,mesh:{name}});
const anatomy=[muscle('Biceps brachii'),bone('Zygomatic'),muscle('Supraspinatus','deep muscles'),bone('Frontal'),muscle('Deltoid')];
const table=catalogAnatomy(anatomy);
const scene=(m,n,f)=>({v:1,m,n,f,b:makeVisibilityBits(Array.from({length:n},(_,i)=>i%2===0)),t:'Muscle practical',lm:'hidden',x:false,te:true,ca:true,sb:true,dm:true,sm:false,cam:[0,1,.7,0,1,0],labels:[],pc:[[n-1,'#ff6655']]});
test('skeletal indices stay before muscle indices and legacy fingerprint stays intact',()=>{
 assert.deepEqual(table.structures.map(x=>x.name),['Frontal','Zygomatic','Biceps brachii','Deltoid','Supraspinatus']);
 const original=catalogAnatomy(anatomy.filter(x=>x.system==='skeletal'));
 assert.equal(table.legacyCount,original.legacyCount);
 assert.equal(table.legacyFingerprint,original.legacyFingerprint);
 assert.notEqual(table.fullFingerprint,table.legacyFingerprint);
 assert.ok(sceneModelCompatible(scene('skull',2,table.legacyFingerprint),5,table.fullFingerprint,2,table.legacyFingerprint));
 assert.ok(sceneModelCompatible(scene('muscular',5,table.fullFingerprint),5,table.fullFingerprint,2,table.legacyFingerprint));
 assert.equal(sceneModelCompatible(scene('skull',2,'bad'),5,table.fullFingerprint,2,table.legacyFingerprint),false);
});
test('muscular and combined chapters round-trip visibility, layers, paint, labels and camera',async()=>{
 const muscles=scene('muscular',5,table.fullFingerprint);muscles.labels=[{s:2,p:[.1,.2,.3],t:'Biceps',dx:12,dy:-20}];
 const combined=scene('systems',5,table.fullFingerprint);combined.sb=false;combined.dm=false;combined.sm=true;combined.cam=[0,1,-1,0,1,0];
 const doc={v:2,t:'Muscular lab',start:0,chapters:[muscles,combined]};
 assert.deepEqual(await decodeScene(await encodeScene(doc)),doc);
 assert.equal((await decodeScene(await encodeScene(doc))).chapters[1].sb,false);
});
test('older single-scene skeletal links without system layers remain valid',async()=>{
 const old=scene('skull',2,table.legacyFingerprint);delete old.sb;delete old.dm;delete old.sm;
 assert.deepEqual(await decodeScene(await encodeScene(old)),old);
 assert.throws(()=>validateScene({...old,m:'muscular'}),/layer settings/i);
 assert.throws(()=>validateScene({...scene('systems',5,table.fullFingerprint),dm:'yes'}),/layer setting/i);
});
test('system UI and offline shell include new controls and structure layout module',()=>{
 const read=n=>readFileSync(new URL('../'+n,import.meta.url),'utf8');
 const html=read('index.html'),app=read('app.js'),sw=read('sw.js');
 for(const id of ['mode-muscular','mode-systems','system-skeletal','system-deep','system-superficial'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(app,/catalogAnatomy\(\[\.\.\.found,\.\.\.digestiveSourceEntries\]\)/);
 assert.match(app,/saved\.sb \?\? true/);
 assert.match(sw,/structure-layout\.js/);
});

test('legacy multi-chapter lessons migrate both chapters before resaving',async()=>{
 const legacy=scene('skull',2,table.legacyFingerprint);
 delete legacy.sb;delete legacy.dm;delete legacy.sm;
 const chapters=[legacy,{...legacy,t:'Cranial interior'}].map(ch=>upgradeLegacyScene(ch,5,table.fullFingerprint));
 assert.equal(chapters[0].n,5);
 assert.equal(chapters[1].f,table.fullFingerprint);
 assert.equal(chapters[0].labels.length,0);
 const project={v:2,t:'Prior skull lesson',start:0,chapters};
 assert.deepEqual(await decodeScene(await encodeScene(project)),project);
 assert.deepEqual(readVisibilityBits(chapters[0].b,5).slice(2),[false,false,false]);
});
