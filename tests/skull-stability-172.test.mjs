import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getSkullGeometry,setSkullGeometry,SKULL_QUALITY_KEY,LEGACY_SKULL_QUALITY_KEY} from '../skull-preferences.js';
import {isDentalBearingBone,createDetailedBoneMaterial} from '../skull-geometry.js';

function storage(initial={}){
 const data=new Map(Object.entries(initial));
 return {getItem:key=>data.has(key)?data.get(key):null,setItem:(key,val)=>data.set(key,val),get data(){return data;}};
}
test('1.7.2 defaults to original skull despite the previous detailed setting',()=>{
 const store=storage({[LEGACY_SKULL_QUALITY_KEY]:'detailed'});
 assert.equal(getSkullGeometry(store),'standard');
 assert.equal(store.data.get(LEGACY_SKULL_QUALITY_KEY),'detailed');
 assert.equal(store.data.has(SKULL_QUALITY_KEY),false);
});
test('explicit experimental opt-in persists on a later visit; switching back persists',()=>{
 const store=storage({[LEGACY_SKULL_QUALITY_KEY]:'detailed'});
 assert.equal(setSkullGeometry(store,'detailed'),'detailed');
 assert.equal(getSkullGeometry(store),'detailed');
 assert.equal(setSkullGeometry(store,'standard'),'standard');
 assert.equal(getSkullGeometry(store),'standard');
});
test('unknown preference and blocked storage fail to Standard',()=>{
 assert.equal(getSkullGeometry(storage({[SKULL_QUALITY_KEY]:'invalid'})),'standard');
 assert.equal(getSkullGeometry({getItem(){throw Error('storage disabled');}}),'standard');
 assert.equal(setSkullGeometry({setItem(){throw Error('storage disabled');}},'detailed'),'detailed');
});
test('dental-bearing bones keep original Écorché shapes in experimental mode',()=>{
 for(const name of ['Mandible','Left maxilla','Right maxilla','maxillary bone','Right mandibular bone'])assert.equal(isDentalBearingBone(name),true,name);
 for(const name of ['Frontal bone','Left parietal bone','Occipital bone','Left zygomatic bone','Vomer'])assert.equal(isDentalBearingBone(name),false,name);
});
test('experimental bone materials use a neutral tone without vertex colors',()=>{
 const dummy={DoubleSide:'double',MeshStandardMaterial:class{constructor(o){Object.assign(this,o);}}};
 const result=createDetailedBoneMaterial(dummy);
 assert.equal(result.color,0xc6c5bf);
 assert.equal(result.vertexColors,false);
 assert.equal(result.side,'double');
});
test('1.7.2 app, PWA cache, metadata and UI move together; old lesson format unchanged',()=>{
 const read=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
 assert.match(read('app.js'),/const APP_VERSION = '1\.8\.4'/);
 assert.match(read('sw.js'),/anatomy-v1\.8\.4/);
 assert.match(read('sw.js'),/skull-preferences\.js/);
 assert.equal(JSON.parse(read('version.json')).version,'1.8.4');
 assert.match(read('index.html'),/STUDIO 1\.8\.4/);
 assert.match(read('index.html'),/Experimental — additional cranial bone detail/);
 assert.match(read('app.js'),/await loadHighResolutionSkull\(\)/);
 assert.match(read('app.js'),/getSkullGeometry/);
 assert.doesNotMatch(read('scene-codec.js'),/SKULL_QUALITY_KEY/);
});
