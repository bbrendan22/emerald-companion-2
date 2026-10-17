import test from 'node:test';
import assert from 'node:assert/strict';
import {readCollection} from '../src/save/readCollection.js';
import {readSave} from '../src/save/readSave.js';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
test('identical records in different locations are preserved, including eggs and boundary PC slots',()=>{
  const saveBlock1=new Uint8Array(15752), storage=new Uint8Array(33744);
  new DataView(saveBlock1.buffer).setUint32(0x234,2,true);
  saveBlock1.set(makePokemon({party:true}),0x238);saveBlock1.set(makePokemon({party:true}),0x238+100);
  storage.set(makePokemon(),4);storage.set(makePokemon(),4+80);
  storage.set(makePokemon({egg:true}),4+80*419);
  const result=readCollection(readSave(makeSave({rotations:[7,4],blocks:{saveBlock1,storage}})));
  assert.equal(result.records.length,5);assert.equal(result.issues.length,0);
  assert.deepEqual(result.records.map(p=>p.source),[{kind:'party',slot:0},{kind:'party',slot:1},{kind:'box',box:0,slot:0},{kind:'box',box:0,slot:1},{kind:'box',box:13,slot:29}]);
  assert.equal(result.records[4].isEgg,true);
});
test('corrupt Pokémon are reported with location and bytes rather than silently discarded',()=>{
  const storage=new Uint8Array(33744), bad=makePokemon();bad[33]^=4;storage.set(bad,4);
  const result=readCollection(readSave(makeSave({blocks:{storage}})));
  assert.equal(result.records.length,0);assert.equal(result.issues.length,1);
  assert.deepEqual(result.issues[0].source,{kind:'box',box:0,slot:0});
  assert.match(result.issues[0].message,/checksum/);assert.deepEqual(result.issues[0].rawBytes,bad);
});
test('party count cannot overflow its six slots',()=>{
  const saveBlock1=new Uint8Array(15752);new DataView(saveBlock1.buffer).setUint32(0x234,7,true);
  assert.throws(()=>readCollection(readSave(makeSave({blocks:{saveBlock1}}))),/exceeds six/);
});
