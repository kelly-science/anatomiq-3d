import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {URINARY_IDS,URINARY_PRESETS,urinaryGroup,urinaryVisibleInPreset,urinaryEntries,validateUrinaryManifest,isRenalVessel} from '../urinary-model.js';
import {catalogAnatomy,sceneModelCompatible} from '../structure-layout.js';
import {validateScene} from '../scene-codec.js';
import {chapterAssets,offlineLessonFiles} from '../scene-assets.js';
const makeManifest=()=>({version:1,structures:URINARY_IDS.map(id=>({id,name:({FJ3145:'Left kidney',FJ3147:'Right kidney',FJ3144:'Left ureter',FJ3146:'Right ureter',FJ3149:'Urinary bladder',FJ3148:'Urethra'})[id],standard_triangles:300,detailed_triangles:700}))});
const fixture=makeManifest();
test('six exact source-backed urinary structures; reject duplicate or mismatched names',()=>{
  assert.equal(validateUrinaryManifest(fixture).structures.length,6);
  assert.throws(()=>validateUrinaryManifest({...fixture,structures:[...fixture.structures.slice(1),fixture.structures[1]]}));
  assert.throws(()=>validateUrinaryManifest({...fixture,structures:[{...fixture.structures[0],name:'Renal pyramid'},...fixture.structures.slice(1)]}));
});
test('metadata-only and actual GLB views retain source IDs and grouping',()=>{
  const meshes=fixture.structures.map(s=>({name:s.id,isMesh:true}));
  const root={traverse(fn){meshes.forEach(fn)}};
  const entries=urinaryEntries(root,fixture);
  assert.deepEqual(entries.map(x=>x.sourceName),fixture.structures.map(x=>x.id));
  assert.equal(entries.filter(x=>x.organId==='kidney').length,2);
  assert.equal(entries.filter(x=>x.organId==='ureter').length,2);
  assert.equal(entries.filter(x=>x.organId==='bladder').length,1);
  assert.equal(entries.filter(x=>x.organId==='urethra').length,1);
});
test('presets and renal vessel reuse never invent internal anatomical meshes',()=>{
  const entries=urinaryEntries({traverse(fn){fixture.structures.forEach(s=>fn({isMesh:true,name:s.id}));}},fixture);
  assert.equal(entries.filter(x=>urinaryVisibleInPreset(x,'kidneys')).length,2);
  assert.equal(entries.filter(x=>urinaryVisibleInPreset(x,'tract')).length,4);
  assert.equal(entries.filter(x=>urinaryVisibleInPreset(x,'overview')).length,6);
  assert.equal(entries.filter(x=>urinaryVisibleInPreset(x,'vessels')).length,6);
  assert.ok(isRenalVessel({system:'cardiovascular',name:'Trunk of left renal artery'}));
  assert.equal(isRenalVessel({system:'urinary',name:'Trunk of left renal artery'}),false);
  assert.equal(isRenalVessel({system:'cardiovascular',name:'Ureteric segment of left renal artery'}),true);
});
test('urinary inventory appends AFTER the stable nervous prefix',()=>{
  const s=(system,name,index)=>({system,name,sourceName:name,layer:system,side:'midline',tissue:'organ',mesh:{name:'mesh'+index},skull:false});
  const existing=[s('skeletal','bone',1),s('muscular','muscle',2),s('nervous','brain',3)];
  const additional=[s('urinary','Left kidney',4),s('urinary','Right kidney',5)];
  const old=catalogAnatomy(existing),updated=catalogAnatomy([...existing,...additional]);
  assert.deepEqual(updated.structures.slice(0,old.structures.length).map(x=>x.name),old.structures.map(x=>x.name));
  const scene={n:old.structures.length,f:old.fullFingerprint};
  assert.ok(sceneModelCompatible(scene,updated.structures.length,updated.fullFingerprint,...Array(8).fill(undefined),0,undefined,updated.structures));
});
test('scene flag optional and offline bundle includes only required urinary assets',()=>{
  const scene={v:1,m:'systems',n:1,f:'123',b:'AQ',t:'Urinary test',lm:'shown',x:true,te:true,ca:true,sb:true,dm:false,sm:false,dg:false,ur:true,cam:[1,2,3,4,5,6],labels:[]};
  assert.equal(validateScene(scene).ur,true);
  assert.equal(validateScene({...scene,ur:undefined}).ur,undefined);
  const a=chapterAssets(scene);assert.equal(a.urinary,true);
  const files=offlineLessonFiles(scene,{urinaryGeometry:'detailed'});
  assert.ok(files.includes('models/urinary-detailed.glb'));
  assert.ok(files.includes('models/urinary-structures.json'));
  assert.ok(!files.includes('models/nervous-standard.glb'));
});
test('app and offline worker include exact 2.1.0 plumbing',()=>{
  const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  for(const name of ['mode-urinary','urinary-study-panel','urinary-interior-open','settings-urinary-geometry'])assert.ok(html.includes('id="'+name+'"'));
  for(const symbol of ['loadUrinary','urinaryEntriesList','ur:systemLayers.urinary','urinaryMetadata','restoreDeferredReferences(\'urinary\''])assert.ok(app.includes(symbol));
  assert.ok(sw.includes("urinary:['models/urinary-structures.json'"));
  assert.ok(sw.includes("./urinary-model.js"));
});
