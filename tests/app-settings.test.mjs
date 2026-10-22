import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = filename => readFileSync(new URL('../' + filename, import.meta.url), 'utf8');
const index=read('index.html');
const app=read('app.js');
const sw=read('sw.js');
const version=JSON.parse(read('version.json'));
test('app version, UI, update endpoint and worker cache agree',()=>{
 assert.equal(version.version,'0.9.0');
 assert.match(index,/STUDIO 0\.9/);
 assert.match(app,/const APP_VERSION = '0\.9\.0'/);
 assert.match(sw,/anatomy-v0\.9\.0/);
 assert.match(index,/id="settings-dialog"/);
 assert.match(index,/id="settings-check-updates"/);
 assert.match(index,/id="settings-reload"/);
 assert.match(app,/APP_VERSION_URL}\?check=\$\{Date\.now\(\)\}/);
});
test('static importmap comes before module bootstrap and can be rewritten by installer',()=>{
 assert.ok(index.indexOf('type="importmap"')<index.indexOf('type="module"'));
 assert.match(index,/https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.169\.0\/build\/three\.module\.js/);
 assert.match(read('tools/download-self-hosted-assets.sh'),/Switching the app import map to the locally hosted renderer/);
 assert.match(read('tools/download-self-hosted-assets.sh'),/\bmodels\/ecorche\.glb/);
});
test('offline shell includes same-origin update manifest',()=>{
 assert.match(sw,/version\.json/);
 assert.match(sw,/request\.mode==='navigate'/);
 assert.match(app,/renderer:window\.__ANATOMY_RENDERER_SOURCE/);
});
