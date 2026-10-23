import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditCardiovascular,loadCardioReview,saveCardioReview,cardioAuditExport,LABEL_ONLY_TARGETS} from '../cardio-vascular-audit.js';
const fake=(id,name)=>({sourceName:id,name,system:'cardiovascular'});
test('vessel trunks are not inferred from wrist branches and both sides are required',()=>{
 const entries=[fake('FJ2242','Trunk of left radial artery'),fake('FJ2231','Dorsal carpal branch of left radial artery'),fake('FJ2283','Dorsal carpal branch of right radial artery'),fake('FJ2258','Trunk of left ulnar artery')];
 const report=auditCardiovascular(entries);
 assert.equal(report.targets.find(t=>t.id==='radial-arteries').status,'partial');
 assert.equal(report.targets.find(t=>t.id==='ulnar-arteries').status,'partial');
 assert.equal(report.targets.find(t=>t.id==='radial-arteries').mainTrunkIds.length,1);
 assert.equal(report.targets.find(t=>t.id==='right-auricle').labelOnly,true);
 assert.deepEqual([...LABEL_ONLY_TARGETS].sort(),['chordae-tendineae','left-auricle','right-auricle'].sort());
});
test('full left/right principal trunks are named representation, NOT proof of geometry continuity',()=>{
 const entries=[fake('FJ3','Trunk of left radial artery'),fake('FJ4','Trunk of right radial artery')];
 const report=auditCardiovascular(entries);const t=report.targets.find(t=>t.id==='radial-arteries');
 assert.equal(t.status,'represented');assert.match(t.evidence,/unverified/);
});
test('source changes invalidate teacher verification but preserve note and review intent',()=>{
 let stored='';const storage={getItem:()=>stored,setItem:(_key,val)=>{stored=val;}};
 const old=auditCardiovascular([fake('FJ11','Left external jugular vein')]).targets.find(t=>t.id==='external-jugular-veins');
 saveCardioReview({'external-jugular-veins':{signature:old.signature,status:'verified',note:'Continuity inspected'}},storage);
 const loaded=loadCardioReview(storage);
 assert.equal(auditCardiovascular([fake('FJ11','Left external jugular vein')],loaded).targets.find(t=>t.id==='external-jugular-veins').reviewed,'verified');
 const changed=auditCardiovascular([fake('FJ11','Left external jugular vein'),fake('FJ12','Right external jugular vein')],loaded).targets.find(t=>t.id==='external-jugular-veins');
 assert.equal(changed.reviewed,'unreviewed');assert.equal(changed.note,'Continuity inspected');
 const exportData=JSON.parse(cardioAuditExport([fake('FJ11','Left external jugular vein')],loaded));
 assert.equal(exportData.version,'1.8.3');assert.ok(exportData.targets.length===81);
});
test('1.8.3 app and service worker install inspector without changing student scene codec',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(app,/cardioPreviewIDs/);assert.match(app,/refreshVisibility\(true\)/);
 for(const id of ['cardio-audit-panel','cardio-audit-list','cardio-audit-export','cardio-audit-restore'])assert.match(html,new RegExp(id));
 assert.match(sw,/cardio-vascular-audit\.js/);assert.match(sw,/anatomy-v1\.8\.4/);
 const codec=readFileSync(new URL('../scene-codec.js',import.meta.url),'utf8');assert.ok(!codec.includes('cardioReviews'));
});
