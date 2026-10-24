import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateNervousManifest,nervousEntries,nervousColor,nervousVisibleInPreset,NERVOUS_PRESETS} from '../nervous-model.js';
const catalog=JSON.parse(readFileSync(new URL('../models/nervous-structures.json',import.meta.url),'utf8'));
const roots=list=>({traverse(f){for(const name of list)f({isMesh:true,name});}});
test('2.0.1 new presets accept real and visibly labelled illustrative meshes',()=>{
 const specimen={version:1,structures:[
  {id:'FJ1782',name:'Left thalamus',category:'brain'},
  {id:'FJ4426',name:'Neural tissue of spinal cord',category:'spinal_cord'},
  {id:'FJ4273',name:'Inferior trunk of left brachial nerve plexus',category:'peripheral'},
  {id:'FJ1730',name:'Third ventricle',category:'brain'},
  {id:'ANR001',name:'Left sciatic nerve — schematic reconstruction',category:'peripheral',provenance:'illustrative-reconstruction'}
 ]};
 validateNervousManifest(specimen);
 const entries=nervousEntries(roots(specimen.structures.map(s=>s.id)),specimen);
 assert.equal(entries.length,5);
 assert.ok(nervousVisibleInPreset(entries[3],'deep'));
 assert.ok(nervousVisibleInPreset(entries[2],'plexus'));
 assert.ok(nervousVisibleInPreset(entries[4],'lower'));
 assert.ok(!nervousVisibleInPreset(entries[4],'verified'));
 assert.notEqual(nervousColor(entries[4]),nervousColor(entries[2]));
 assert.equal(entries[4].stableId,'anatomiq-reconstruction:ANR001');
 assert.ok(Object.keys(NERVOUS_PRESETS).includes('verified'));
});
test('installed legacy 125-mesh inventory still validates unchanged',()=>{
 assert.ok(validateNervousManifest(catalog).structures.length>=125);
 assert.equal(nervousEntries(roots(catalog.structures.map(s=>s.id)),catalog).length,catalog.structures.length);
});
test('2.0.1 viewer, worker and version are coherent',()=>{
 const files=['app.js','index.html','sw.js','version.json'].map(f=>readFileSync(new URL('../'+f,import.meta.url),'utf8'));
 assert.match(files[0],/APP_VERSION = '2\.0\.1'/);
 assert.match(files[0],/anatomy-v2\.0\.1/);
 assert.match(files[1],/data-nervous-preset="deep"/);
 assert.match(files[1],/data-nervous-preset="verified"/);
 assert.match(files[2],/anatomy-v2\.0\.1/);
 assert.equal(JSON.parse(files[3]).version,'2.0.1');
});
