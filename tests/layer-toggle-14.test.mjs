import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {activeSystemTabs,effectiveSystemLayers,toggleAnatomySystem} from '../system-layers.js';
import {encodeScene,decodeScene,validateScene,makeVisibilityBits} from '../scene-codec.js';
const off={skeletal:false,superficial:false,deep:false,digestive:false,cardiovascular:false};
test('system buttons independently toggle skeletal and detailed digestive layers',()=>{
 let layers={...off};
 layers=toggleAnatomySystem('systems',layers,'skeletal',true);
 assert.deepEqual(activeSystemTabs('systems',layers),{skeletal:true,muscular:false,digestive:false,cardiovascular:false});
 layers=toggleAnatomySystem('systems',layers,'digestive',true);
 assert.deepEqual(activeSystemTabs('systems',layers),{skeletal:true,muscular:false,digestive:true,cardiovascular:false});
 layers=toggleAnatomySystem('systems',layers,'skeletal',true);
 assert.deepEqual(activeSystemTabs('systems',layers),{skeletal:false,muscular:false,digestive:true,cardiovascular:false});
 layers=toggleAnatomySystem('systems',layers,'digestive',true);
 assert.deepEqual(layers,off);
});
test('muscular button enables default superficial muscles; deep muscle layer also highlights button',()=>{
 const combined=toggleAnatomySystem('systems',off,'muscular',true);
 assert.equal(combined.superficial,true);
 assert.deepEqual(activeSystemTabs('systems',{...off,deep:true}),{skeletal:false,muscular:true,digestive:false,cardiovascular:false});
 assert.equal(toggleAnatomySystem('systems',{...off,deep:true},'muscular',true).deep,false);
});
test('historic skull, skeletal, muscular and digestive modes map to the correct toggles',()=>{
 const raw={skeletal:true,superficial:true,deep:false,digestive:true,cardiovascular:false};
 assert.deepEqual(activeSystemTabs('skull',raw),{skeletal:true,muscular:false,digestive:false,cardiovascular:false});
 assert.deepEqual(activeSystemTabs('muscular',raw),{skeletal:false,muscular:true,digestive:false,cardiovascular:false});
 assert.deepEqual(activeSystemTabs('digestive',raw),{skeletal:false,muscular:false,digestive:true,cardiovascular:false});
 assert.equal(toggleAnatomySystem('skull',raw,'digestive',true).superficial,false);
 assert.throws(()=>toggleAnatomySystem('systems',off,'digestive',false),/Detailed digestive/);
});
test('new combined-layer scenes still use the stable project format and retain chapter visibility',async()=>{
 const scene={v:1,m:'systems',n:8,f:'a1bc2',b:makeVisibilityBits([true,true,false,false,false,true,true,true]),t:'Muscles plus organs',lm:'reveal',x:false,te:true,ca:true,sb:true,sm:false,dm:true,dg:true,hd:true,cam:[0,1,2,0,1,0],labels:[],pc:[]};
 validateScene(scene);
 assert.deepEqual(await decodeScene(await encodeScene(scene)),scene);
});
test('interface has precisely four layer buttons and View menu has Skull and Full Skeleton presets',()=>{
 const read=n=>readFileSync(new URL('../'+n,import.meta.url),'utf8');
 const html=read('index.html'),js=read('app.js'),sw=read('sw.js');
 assert.equal((html.match(/class="mode-tab(?: active)?"/g)||[]).length,4);
 assert.doesNotMatch(html,/id="mode-skull"|id="mode-systems"/);
 assert.match(html,/data-anatomy-preset="skull"/);assert.match(html,/data-anatomy-preset="skeleton"/);
 assert.doesNotMatch(html,/id="system-detail"|id="system-digestive"/);
 assert.match(js,/detailEnabled=true;detailLayerExplicitlyChanged=true/);
 assert.match(sw,/system-layers\.js/);
});
