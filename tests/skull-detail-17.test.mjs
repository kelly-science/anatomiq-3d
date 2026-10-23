import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {skullKey,validateSkullManifest,matchedSkullGeometry,adequateSkullReplacement} from '../skeletal-detail.js';
import {catalogAnatomy} from '../structure-layout.js';
import {hashForStructures} from '../scene-codec.js';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const names=['Frontal bone','Occipital bone','Mandible','Ethmoid','Sphenoid bone','Vomer',
 'Left parietal bone','Right parietal bone','Left temporal bone','Right temporal bone',
 'Left nasal bone','Right nasal bone','Left zygomatic bone','Right zygomatic bone',
 'Left maxilla','Right maxilla'];
const fixture=names.map((name,i)=>({id:`FJ${6300+i}`,name,target:name,triangles:2000}));
const fake=n=>({name:n,isMesh:true});
const raw={version:1,structures:fixture};
test('skull names preserve laterality, normalize catalogue names',()=>{
 assert.equal(skullKey('Temporal bone','right'),skullKey('Right temporal bone'));
 assert.equal(skullKey('Ethmoid bone'),skullKey('Ethmoid'));
 assert.notEqual(skullKey('Left parietal bone'),skullKey('Right parietal bone'));
 assert.equal(adequateSkullReplacement(100,109),true);
 assert.equal(adequateSkullReplacement(100,95),false);
});
test('high-detail skull metadata rejects missing, duplicate or malformed structures',()=>{
 assert.equal(validateSkullManifest(raw),raw);
 assert.throws(()=>validateSkullManifest({...raw,structures:[...fixture,{...fixture[0]}]}),/Duplicate/);
 assert.throws(()=>validateSkullManifest({...raw,structures:fixture.slice(0,2)}),/Invalid/);
});
test('matches body geometry by name and side without changing existing catalogue',()=>{
 const bones=names.map(name=>({name:name.replace(/^(Left|Right) /,''),side:name.startsWith('Left')?'left':name.startsWith('Right')?'right':'midline',
 tissue:'bone',system:'skeletal',skull:true,layer:'skeleton',mesh:fake(name)}));
 const muscles=[{name:'Deltoid',side:'left',tissue:'muscle',system:'muscular',layer:'superficial muscles',mesh:fake('D')}];
 const original=catalogAnatomy([...bones,...muscles]);const finger=original.fullFingerprint;
 const replacement={traverse:fn=>fixture.forEach(x=>fn(fake(x.id)))};
 const matched=matchedSkullGeometry(replacement,raw,original.structures);
 assert.equal(matched.matched.length,names.length);
 assert.equal(matched.unmatched.length,0);
 const after=catalogAnatomy([...bones,...muscles]);
 assert.equal(after.fullFingerprint,finger);
 assert.equal(after.structures.length,original.structures.length);
});
test('PWA caches skull renderer code and optional geometry only on request',()=>{
 const app=read('app.js'),worker=read('sw.js'),html=read('index.html');
 assert.match(app,/await loadHighResolutionSkull\(\)/);
 assert.match(app,/skullGeometry==='detailed'/);
 assert.match(worker,/skull-geometry\.js/);assert.match(worker,/skull-detailed\.glb/);
 assert.match(html,/id="settings-skull-geometry"/);
 assert.match(app,/const APP_VERSION = '1.7.1'/);
});
