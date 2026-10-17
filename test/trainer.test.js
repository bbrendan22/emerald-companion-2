import test from 'node:test';
import assert from 'node:assert/strict';
import {readSave} from '../src/save/readSave.js';
import {readTrainer} from '../src/save/readTrainer.js';
import {makeSave} from './fixtures/synthetic.js';
test('Trainer raw offsets, unsigned encrypted money and National Dex bounds',()=>{
  const b1=new Uint8Array(15752),b2=new Uint8Array(3884),a=new DataView(b1.buffer),b=new DataView(b2.buffer);
  b2.set([187,188,255]);b.setUint16(10,123,true);b.setUint16(12,456,true);
  b.setUint16(14,1234,true);b2[16]=59;b2[17]=58;
  b.setUint32(172,0xf1234567,true);a.setUint32(1168,(123456^0xf1234567)>>>0,true);
  b1[0x1270+(0x867>>>3)]|=1<<(0x867%8);
  for(const [block,offset] of [[b2,0x5c],[b2,0x28],[b1,0x988],[b1,0x3b24]]) {block[offset]=1;block[offset+48]=255;}
  const t=readTrainer(readSave(makeSave({blocks:{saveBlock1:b1,saveBlock2:b2}})));
  assert.equal(t.name,'AB');assert.equal(t.trainerId,123);assert.equal(t.secretId,456);assert.equal(t.money,123456);
  assert.deepEqual(t.playtime,{hours:1234,minutes:59,seconds:58});assert.equal(t.badgeCount,1);
  assert.equal(t.pokedex.seen.length,386);assert.equal(t.pokedex.seenCount,3);assert.equal(t.pokedex.caughtCount,3);assert.deepEqual(t.warnings,[]);
});
test('Trainer inconsistencies are reported without changing raw Dex flags or input',()=>{
  const b1=new Uint8Array(15752),b2=new Uint8Array(3884);b2[0]=255;b2[16]=60;b2[17]=61;
  b2[0x5c]=1;b2[0x28]=2;new DataView(b1.buffer).setUint32(0x490,1000000,true);
  const save=readSave(makeSave({blocks:{saveBlock1:b1,saveBlock2:b2}}));const before=save.blocks.saveBlock2.slice();const t=readTrainer(save);
  assert.deepEqual(t.pokedex.inconsistentSeenIds,[1]);assert.deepEqual(t.pokedex.caughtWithoutSeenIds,[2]);assert.equal(t.warnings.length,4);
  assert.deepEqual(save.blocks.saveBlock2,before);assert.throws(()=>readTrainer({blocks:{saveBlock1:b1.subarray(1),saveBlock2:b2}}),/validated/);
});
