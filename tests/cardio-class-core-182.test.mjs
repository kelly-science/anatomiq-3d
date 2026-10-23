import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARDIO_CLASS_CORE,curriculumMatches,classCoreCoverage,classCoreVisible} from '../cardio-class-core.js';
import {cardioVisibleInPreset,cardioCanApply} from '../cardio-presentation.js';
const fake=(id,name)=>({sourceName:id,name,system:'cardiovascular',cardioGroup:'systemic'});
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('teacher PDF/table source is canonical in source and runtime, no invented structures',()=>{
 const source=JSON.parse(read('data/cardio-class-core.json'));
 assert.deepEqual(CARDIO_CLASS_CORE,source);
 assert.equal(source.targets.length,81);
 for(const v of ['Chordae tendineae','Pulmonary semilunar valve','Left coronary artery','Dorsalis pedis arteries','Median cubital veins','Plantar venous arch'])assert.ok(source.targets.some(x=>x.name===v));
});
test('class core matches real names, excludes nerve clutter and respects bilateral partial coverage',()=>{
 const a=fake('FJ1','Left femoral vein'),b=fake('FJ2','Right femoral vein');
 const nerve=fake('FJ3','Trunk of right maxillary nerve');
 assert.equal(classCoreVisible(a),true);
 assert.equal(classCoreVisible(nerve),false);
 assert.equal(cardioVisibleInPreset(a,'classcore'),true);
 assert.equal(cardioVisibleInPreset(nerve,'classcore'),false);
 const alone=classCoreCoverage([a]);
 assert.equal(alone.targets.find(t=>t.name==='Femoral veins').status,'partial');
 const both=classCoreCoverage([a,b]);
 assert.equal(both.targets.find(t=>t.name==='Femoral veins').status,'represented');
 assert.equal(both.targets.find(t=>t.name==='Chordae tendineae').status,'missing');
 assert.equal(cardioCanApply([nerve],'classcore'),false);
});
test('cardiac valves use component evidence, atria are not mistaken for separately modeled chamber anatomy',()=>{
 const valves=[fake('FJ2420','Anterior leaflet of mitral valve'),fake('FJ2417','Left anterior cusp of pulmonary valve'),fake('FJ2438','Wall of left atrium')];
 const coverage=classCoreCoverage(valves);
 for(const name of ['Bicuspid (mitral) valve','Pulmonary semilunar valve','Left atrium']){
   assert.equal(coverage.targets.find(t=>t.name===name).status,'partial');
 }
 assert.equal(coverage.targets.find(t=>t.name==='Right auricle').status,'missing');
});
test('new modes are editor-only scene presets, old link data remains unchanged',()=>{
 const app=read('app.js'),index=read('index.html'),sw=read('sw.js');
 for(const k of ['classcore','arteries','veins'])assert.match(index,new RegExp('data-cardio-preset="'+k+'"'));
 assert.match(app,/CARDIO_CLASS_CORE|classCoreCoverage/);
 assert.match(sw,/anatomy-v1\.8\.3/);
 assert.match(sw,/cardio-class-core\.js/);
 assert.match(read('tools/install-cardiovascular-43.sh'),/--prior-manifest/);
 assert.match(read('tools/install-cardiovascular-43.sh'),/fetch-cardiovascular-class-core\.py/);
});
