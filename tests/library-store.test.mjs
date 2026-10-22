import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hashForStructures, makeVisibilityBits} from '../scene-codec.js';
import {prepareBackup,parseBackup, MAX_LIBRARY_ITEMS} from '../library-store.js';
function sample(title='Skull Lab'){
 const chapter={v:1,m:'skull',n:120,f:hashForStructures(['skull']),b:makeVisibilityBits(Array(120).fill(true)),t:'Exterior',lm:'shown',x:false,te:true,ca:true,cam:[1,2,3,4,5,6],labels:[{s:0,p:[0,0,0],t:'Coronal Suture',dx:10,dy:10}],pc:[[0,'#ff0000']]};
 return {v:2,t:title,start:0,chapters:[chapter]};
}
test('library backups preserve complete multi-chapter project with labels and paint',()=>{
 const project=sample();project.chapters.push({...structuredClone(project.chapters[0]),t:'Interior',lm:'reveal',pc:[[1,'#00ff00']]});
 const date=new Date().toISOString();
 const backup=prepareBackup([{id:'abc',createdAt:date,updatedAt:date,title:project.t,project}]);
 assert.equal(backup.format,'anatomy-studio-library');
 assert.deepEqual(parseBackup(JSON.stringify(backup)),[project]);
 assert.equal(backup.lessons[0].project.chapters[1].pc[0][1],'#00ff00');
});
test('backup validator rejects invalid backup, damaged anatomy geometry, and oversized collections',()=>{
 assert.throws(()=>parseBackup(JSON.stringify({format:'wrong',version:1,lessons:[]})),/not an Anatomy Studio/i);
 assert.throws(()=>parseBackup('{invalid'),/Invalid JSON/i);
 const date=new Date().toISOString();
 const valid=prepareBackup([{id:'a',createdAt:date,updatedAt:date,title:'Skull Lab',project:sample()}]);
 valid.lessons[0].project.chapters[0].pc=[[9999,'#ff0000']];
 assert.throws(()=>parseBackup(JSON.stringify(valid)),/paint/i);
 const empty=prepareBackup([]);empty.lessons=Array(MAX_LIBRARY_ITEMS+1).fill({});
 assert.throws(()=>parseBackup(JSON.stringify(empty)),/too many/i);
});
