import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chapterAssets,assetsForProject,offlineLessonFiles,LEGACY_DIGESTIVE_MESH_NAMES} from '../scene-assets.js';
import {digestiveMeshEntries} from '../digestive-model.js';
import {detailStructureEntries} from '../digestive-detail.js';
import {cardiovascularEntries} from '../cardiovascular-model.js';
import {catalogAnatomy} from '../structure-layout.js';
const scene=(patch={})=>({v:1,m:'systems',sb:true,dm:false,sm:false,dg:false,hd:false,cv:false,...patch});
const proj=(...chapters)=>({v:2,start:0,chapters});
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const virtualRoot=names=>({traverse(fn){for(const name of names)fn({isMesh:true,name});}});
test('skull-only and muscle-only chapters use shared base without downloading cardiovascular or digestive models',()=>{
  for(const chapter of [scene(),scene({m:'skull'}),scene({sm:true,sb:false})]){
    const needed=chapterAssets(chapter);
    assert.equal(needed.base,true);
    assert.equal(needed.cardiovascular,false);
    assert.equal(needed.detailedDigestive,false);
    assert.equal(needed.legacyDigestive,false);
  }
});
test('student loads only starting chapter immediately; later chapters are discovered independently',()=>{
  const skull=scene({m:'skull'}), heart=scene({cv:true,sb:false}), gut=scene({dg:true,hd:true,sb:false});
  assert.equal(chapterAssets(skull).cardiovascular,false);
  assert.equal(chapterAssets(heart).cardiovascular,true);
  assert.equal(chapterAssets(gut).detailedDigestive,true);
  const all=assetsForProject(proj(skull,heart,gut));
  assert.equal(all.cardiovascular,true);
  assert.equal(all.detailedDigestive,true);
  assert.equal(all.legacyDigestive,false);
});
test('old single-chapter digestive links retain the basic legacy asset selection',()=>{
  const legacy={...scene({m:'digestive',dg:true}),hd:undefined};
  assert.equal(chapterAssets(legacy).legacyDigestive,true);
  assert.equal(chapterAssets(legacy).detailedDigestive,false);
});
test('offline prep includes only assets used by one or more lesson chapters, never unrelated GLBs',()=>{
  const onlySkull=offlineLessonFiles(proj(scene({m:'skull'})));
  assert.deepEqual(onlySkull,[]);
  const files=offlineLessonFiles(proj(scene({m:'skull'}),scene({cv:true,sb:false})),{cardioGeometry:'detailed'});
  assert.ok(files.includes('models/cardiovascular-detailed.glb'));
  assert.ok(!files.includes('models/digestive-detailed.glb'));
  assert.ok(!files.includes('models/anatomy-organs.glb'));
  assert.deepEqual(offlineLessonFiles(proj(scene({m:'skull'})),{skullGeometry:'detailed'}),['models/skull-structures.json','models/skull-detailed.glb']);
});
test('virtual entries have identical indexed names and fingerprint to their eventual real meshes',()=>{
  const meta={version:1,structures:[{id:'FJ2428',name:'Wall of ventricle'},{id:'FJ1682M',name:'Trunk of left common carotid artery'},{id:'FJ2429',name:'Papillary muscle'},{id:'FJ2438',name:'Wall of left atrium'},{id:'FJ2439',name:'Wall of right atrium'}]};
  const gut={version:1,structures:[{id:'FJ2564',name:'Stomach'},{id:'FJ2563',name:'Esophagus'}]};
  const fake=['liver__FMA7197','stomach__FMA7148','intestines__FMA7206'];
  assert.deepEqual(LEGACY_DIGESTIVE_MESH_NAMES.slice().sort(),fake.slice().sort());
  const base=[{name:'Frontal bone',side:'midline',tissue:'bone',system:'skeletal',layer:'skeleton',mesh:{name:'frontal'}},
    {name:'Biceps',side:'left',tissue:'muscle',system:'muscular',layer:'superficial muscles',mesh:{name:'biceps'}}];
  const add=root=>[
    ...base,...digestiveMeshEntries(virtualRoot(root.legacy)),
    ...detailStructureEntries(virtualRoot(root.gut),gut),
    ...cardiovascularEntries(virtualRoot(root.cardio),meta)
  ];
  const one=catalogAnatomy(add({legacy:fake,gut:['FJ2564','FJ2563'],cardio:['FJ2428','FJ1682M','FJ2429','FJ2438','FJ2439']}));
  const two=catalogAnatomy(add({legacy:fake.slice().reverse(),gut:['FJ2563','FJ2564'],cardio:['FJ2439','FJ2438','FJ2429','FJ1682M','FJ2428']}));
  assert.equal(one.fullFingerprint,two.fullFingerprint);
  assert.deepEqual(one.structures.map(s=>s.sourceName),two.structures.map(s=>s.sourceName));
});
test('new student boot reads link before geometry and service worker requires explicit lesson-model caching',()=>{
  const app=read('app.js'),sw=read('sw.js');
  assert.ok(app.indexOf('studentProjectAtStartup=await decodeScene')<app.indexOf('let localAvailable=false'));
  assert.match(app,/if\(teacherMode\)cacheOffline\(\)/);
  assert.match(app,/await ensureChapterAssets\(chapters\[index\]\)/);
  assert.match(sw,/lessonAllow/);
  assert.match(sw,/lessonModels/);
  assert.match(sw,/scene-assets\.js/);
  assert.equal(JSON.parse(read('version.json')).version,'1.8.5');
});
