import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeMode, resolveRenderProfile, cappedPixelRatio} from '../render-performance.js';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('auto detects entry-level Chromebooks; all modes cap internal pixel ratios',()=>{
  assert.equal(resolveRenderProfile('auto',{deviceMemory:4,hardwareConcurrency:4}).effective,'fast');
  assert.equal(resolveRenderProfile('auto',{deviceMemory:8,hardwareConcurrency:8}).effective,'balanced');
  assert.equal(resolveRenderProfile('auto',{hardwareConcurrency:2}).dprCap,1);
  assert.equal(resolveRenderProfile('sharp',{deviceMemory:2}).effective,'sharp');
  assert.equal(cappedPixelRatio(2,1),1);
  assert.equal(cappedPixelRatio(3,1.25),1.25);
  assert.equal(cappedPixelRatio(1,2),1);
  assert.equal(normalizeMode('unexpected'),'auto');
});
test('renderer stops animating when both input and damping stop',()=>{
  const app=read('app.js');
  assert.match(app,/if\(moved \|\| drawFrames>0\)frameRequest=requestAnimationFrame\(draw\)/);
  assert.match(app,/if\(!updatingControls\)invalidate\(2\)/);
  assert.doesNotMatch(app,/controls\.addEventListener\('change',\(\)=>\{invalidate\(\);queueDraft\(\)/);
  assert.match(app,/controls\.addEventListener\('end',\(\)=>\{if\(!cardioPreviewIDs\)queueDraft\(\);\}\)/);
  assert.doesNotMatch(app,/scene\.updateMatrixWorld\(true\)/);
});
test('performance controls work in both teacher and student views and are device-only',()=>{
  const index=read('index.html'),app=read('app.js'),sw=read('sw.js');
  assert.match(index,/id="view-quality"/);
  assert.match(index,/id="settings-render-quality"/);
  assert.match(app,/localStorage\.setItem\(RENDER_MODE_KEY,renderProfile\.requested\)/);
  assert.match(app,/renderer\.setPixelRatio\(cappedPixelRatio/);
  assert.match(sw,/render-performance\.js/);
  assert.match(index,/\.\/vendor\/three\/build\/three\.module\.js/);
});
