import test from 'node:test';
import assert from 'node:assert/strict';
import {SceneHistory} from '../scene-history.js';

test('undo/redo preserve snapshots and branch when a new edit occurs',()=>{
 const history=new SceneHistory(5);history.reset('skull');
 history.record('painted');history.record('labelled');
 assert.equal(history.undo(),'painted');assert.equal(history.undo(),'skull');
 assert.equal(history.canUndo,false);
 assert.equal(history.redo(),'painted');
 history.record('new label');assert.equal(history.canRedo,false);
 assert.equal(history.undo(),'painted');assert.equal(history.redo(),'new label');
});
test('history skips duplicate snapshots and limits memory',()=>{
 const h=new SceneHistory(3);h.reset('a');assert.equal(h.record('a'),false);
 h.record('b');h.record('c');h.record('d');
 assert.deepEqual(h.entries,['b','c','d']);assert.equal(h.undo(),'c');assert.equal(h.undo(),'b');assert.equal(h.undo(),null);
});
