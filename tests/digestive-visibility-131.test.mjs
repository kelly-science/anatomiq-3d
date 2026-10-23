import {test} from 'node:test';
import assert from 'node:assert/strict';
import {shouldPreferDetailedWhenChoosingDigestive as prefer} from '../digestive-detail.js';
import {readFileSync} from 'node:fs';
const base={teacherMode:true,restoringScene:false,detailAvailable:true,
  previousMode:'skull',nextMode:'digestive',detailLayerExplicitlyChanged:false};
test('manual switch to Digestive displays already loaded detailed organs',()=>{
 assert.equal(prefer(base),true);
 assert.equal(prefer({...base,previousMode:'skeleton'}),true);
 assert.equal(prefer({...base,previousMode:'digestive'}),false);
});
test('older student links and saved chapters preserve their mode',()=>{
 assert.equal(prefer({...base,teacherMode:false}),false);
 assert.equal(prefer({...base,restoringScene:true}),false);
 assert.equal(prefer({...base,detailAvailable:false}),false);
 assert.equal(prefer({...base,detailLayerExplicitlyChanged:true}),false);
 assert.equal(prefer({...base,nextMode:'skeleton'}),false);
});
test('local model host and version are retained',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(app,/shouldPreferDetailedWhenChoosingDigestive/);
 assert.match(app,/detailLayerExplicitlyChanged=true/);
 assert.match(app,/restoreBonePaint\(saved.pc\|\|\[\]\)/);
 assert.match(app,/const APP_VERSION = '1.8.1'/);
});
