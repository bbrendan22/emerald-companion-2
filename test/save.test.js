import test from 'node:test';
import assert from 'node:assert/strict';
import {readSave} from '../src/save/readSave.js';
import {sectorChecksum} from '../src/save/binary.js';
import {makeSave} from './fixtures/synthetic.js';
const footer=(data,slot=1,sector=0)=>new DataView(data.buffer,data.byteOffset+(slot*14+sector)*4096,4096);
test('raw save sizes and input types are validated',()=>{
  for(const size of [0,65536,131071,131073]) assert.throws(()=>readSave(new Uint8Array(size)),/128 KiB/);
  assert.throws(()=>readSave('save'),/Uint8Array/);
  assert.equal(readSave(makeSave().buffer).slotIndex,1);
});
test('32-bit overflow and single-fold sector checksum arithmetic',()=>{
  assert.equal(sectorChecksum(Uint8Array.from([255,255,1,0])),0);
  assert.equal(sectorChecksum(Uint8Array.from([255,255,255,255,2,0,0,0])),1);
  assert.throws(()=>sectorChecksum(new Uint8Array(3)),/whole/);
});
test('all sections are reconstructed in logical order despite rotation',()=>{
  const storage=new Uint8Array(33744);storage[4000]=73;storage[33743]=99;
  const save=readSave(makeSave({rotations:[3,9],blocks:{storage}}));
  assert.equal(save.slotIndex,1);assert.equal(save.saveCounter,11);
  assert.deepEqual(save.blocks.storage,storage);
  assert.equal(save.blocks.saveBlock2.length,3884);assert.equal(save.blocks.saveBlock1.length,15752);
});
for(const [label,mutate,pattern] of [
  ['signature',v=>v.setUint32(4088,0,true),/signature/],
  ['checksum',v=>v.setUint8(0,1),/checksum/],
  ['out-of-range section',v=>v.setUint16(4084,14,true),/invalid section ID/],
  ['duplicate and missing section',v=>v.setUint16(4084,1,true),/Duplicate|Missing/],
  ['mixed counters',v=>v.setUint32(4092,15,true),/Inconsistent/],
]) test(`invalid newest ${label} falls back to older complete slot`,()=>{
  const data=makeSave();mutate(footer(data));const save=readSave(data);
  assert.equal(save.slotIndex,0);assert.equal(save.saveCounter,10);
  assert.ok(save.slots[1].errors.some(error=>pattern.test(error)));
});
test('incomplete slots cannot be stitched together into a valid save',()=>{
  const data=makeSave();footer(data,0,0).setUint32(4088,0,true);footer(data,1,1).setUint32(4088,0,true);
  assert.throws(()=>readSave(data),error=>error.slots.length===2 && error.slots.every(s=>!s.valid));
});
test('blank saves fail explicitly; one valid slot is sufficient',()=>{
  assert.throws(()=>readSave(new Uint8Array(131072).fill(255)),/No complete/);
  assert.equal(readSave(makeSave({counters:[null,1]})).slotIndex,1);
  assert.equal(readSave(makeSave({counters:[1,null]})).slotIndex,0);
});
test('newest selection, deterministic ties and uint32 rollover',()=>{
  for(const [counters,index] of [[[12,11],0],[[10,11],1],[[7,7],0],[[4294967295,0],1],[[0,4294967295],0]]) assert.equal(readSave(makeSave({counters})).slotIndex,index);
});
test('section-specific checksum covers the last used word, excluding padding',()=>{
  for(const [id,length] of [[0,3884],[4,3848],[13,2000]]) {
    const padding=makeSave();footer(padding,1,id).setUint8(length,99);
    assert.equal(readSave(padding).slotIndex,1);
    const used=makeSave();footer(used,1,id).setUint8(length-1,99);
    assert.equal(readSave(used).slotIndex,0);
  }
});
test('reads subarray inputs without using unrelated backing-buffer bytes; does not mutate input',()=>{
  const outer=new Uint8Array(131100), original=makeSave();outer.set(original,10);
  const input=outer.subarray(10,131082);assert.equal(readSave(input).saveCounter,11);assert.deepEqual(input,original);
});
