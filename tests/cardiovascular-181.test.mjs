import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cardioIsCavity,cardioVisibleInPreset,cardioCanApply,cardiovascularGroup} from '../cardio-presentation.js';
import {catalogAnatomy,ORIGINAL_CARDIO_IDS,sceneModelCompatible,upgradeLegacyScene} from '../structure-layout.js';
import {makeVisibilityBits,readVisibilityBits} from '../scene-codec.js';
const cv=(id,name,cardioGroup)=>({system:'cardiovascular',sourceName:id,name,cardioGroup,mesh:{name:id},side:'midline',tissue:'vessel',layer:'cardiovascular-detail'});
test('cardiac chamber space is not opaque tissue in the heart-interior preset',()=>{
 const space=cv('FJ2700','Cavity of left ventricle','heart-internal');
 const valve=cv('FJ2701','Posterior leaflet of mitral valve','heart-internal');
 const chord=cv('FJ2702','Chordae tendineae','heart-internal');
 assert.equal(cardioIsCavity(space),true);
 assert.equal(cardiovascularGroup(space),'chamber-volume');
 assert.equal(cardioIsCavity(valve),false);
 assert.equal(cardioVisibleInPreset(space,'interior'),false);
 assert.equal(cardioVisibleInPreset(valve,'interior'),true);
 assert.equal(cardioVisibleInPreset(chord,'interior'),true);
 assert.equal(cardioVisibleInPreset(space,'chambers'),true);
 assert.equal(cardioVisibleInPreset(valve,'chambers'),false);
 assert.equal(cardioCanApply([valve],'chambers'),false);
 assert.equal(cardioCanApply([space],'chambers'),true);
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(app,/opacity:chamberVolume\?0\.12:1/);
 assert.match(app,/depthWrite:!chamberVolume/);
});
test('new major vessel segments append without renumbering past 1.8 models',()=>{
 const spine={system:'skeletal',sourceName:'SK1',name:'Atlas',mesh:{name:'SK1'},tissue:'bone',side:'midline',layer:'skeleton'};
 const base=ORIGINAL_CARDIO_IDS.map(id=>cv(id,'Aorta','systemic'));
 const previouslyAdded=[cv('FJ2900','Great cardiac vein','coronary'),cv('FJ9000','Left brachial artery','systemic')];
 const prior=catalogAnatomy([spine,...base,...previouslyAdded]);
 // A new vessel has a *lower* numerical ID; it MUST NOT get inserted earlier.
 const current=catalogAnatomy([spine,...base,...previouslyAdded,cv('FJ2500','Left renal vein','systemic')]);
 assert.deepEqual(current.structures.slice(0,prior.structures.length).map(s=>s.sourceName),prior.structures.map(s=>s.sourceName));
 const scene={n:prior.structures.length,f:prior.fullFingerprint,b:makeVisibilityBits(Array(prior.structures.length).fill(true))};
 assert.equal(sceneModelCompatible(scene,current.structures.length,current.fullFingerprint,current.legacyCount,current.legacyFingerprint,current.baseCount,current.baseFingerprint,current.previousCount,current.previousFingerprint,current.preCardioCount,current.preCardioFingerprint,current.originalCardioCount,current.originalCardioFingerprint,current.structures),true);
 const upgraded=upgradeLegacyScene(scene,current.structures.length,current.fullFingerprint);
 assert.deepEqual(readVisibilityBits(upgraded.b,upgraded.n).slice(scene.n),[false]);
 assert.equal(sceneModelCompatible({...scene,f:'unrelated'},current.structures.length,current.fullFingerprint,current.legacyCount,current.legacyFingerprint,current.baseCount,current.baseFingerprint,current.previousCount,current.previousFingerprint,current.preCardioCount,current.preCardioFingerprint,current.originalCardioCount,current.originalCardioFingerprint,current.structures),false);
});
test('the app and worker use the 1.8.1 version, and the new source-backed installer',()=>{
 const get=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
 assert.match(get('sw.js'),/anatomy-v1\.8\.1/);
 assert.match(get('index.html'),/data-cardio-preset="chambers"/);
 assert.match(get('tools/install-cardiovascular-43.sh'),/fetch-cardiovascular-vessels\.py/);
 assert.match(get('tools/install-cardiovascular-43.sh'),/--prior-manifest/);
});
