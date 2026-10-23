import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cardiovascularGroup,cardioPresetCounts,cardioVisibleInPreset,cardioCanApply} from '../cardio-presentation.js';
const meshes=[
 {name:'Wall of ventricle',cardioGroup:'heart'},
 {name:'Posterior leaflet of mitral valve',cardioGroup:'heart-internal'},
 {name:'Great cardiac vein',cardioGroup:'coronary'},
 {name:'Trunk of left pulmonary artery',cardioGroup:'pulmonary'},
 {name:'Right femoral artery',cardioGroup:'systemic'},
];
test('cardiovascular study views target real structures only',()=>{
 assert.equal(cardiovascularGroup(meshes[1]),'heart-internal');
 assert.equal(cardiovascularGroup(meshes[2]),'coronary');
 assert.deepEqual(cardioPresetCounts(meshes),{all:5,exterior:3,interior:2,coronary:2,pulmonary:2,systemic:1});
 assert.equal(cardioVisibleInPreset(meshes[0],'interior'),false);
 assert.equal(cardioVisibleInPreset(meshes[1],'interior'),true);
 assert.throws(()=>cardioVisibleInPreset(meshes[0],'fake'));
});
test('interior and coronary require actual downloaded anatomy',()=>{
 assert.equal(cardioCanApply(meshes,'interior'),true);
 assert.equal(cardioCanApply(meshes.slice(0,1),'interior'),false);
 assert.equal(cardioCanApply(meshes.slice(0,1),'coronary'),false);
});
test('installer downloads expanded subset using absolute script location',()=>{
 const script=readFileSync(new URL('../tools/install-cardiovascular-43.sh',import.meta.url),'utf8');
 assert.match(script,/"\$PY" "\$ROOT\/tools\/fetch-cardiovascular-expansion\.py"/);
 assert.match(readFileSync(new URL('../sw.js',import.meta.url),'utf8'),/anatomy-v1\.8\.0/);
});
