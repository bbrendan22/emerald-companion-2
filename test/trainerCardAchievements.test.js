import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {readTrainerCardAchievements} from '../src/save/readTrainerCardAchievements.js';
import {readFrontierSymbols} from '../src/save/readFrontierSymbols.js';
import {readTrainerSnapshot} from '../src/save/readTrainerSnapshot.js';
import {makeSave} from './fixtures/synthetic.js';
function fixture() {
 const save={blocks:{saveBlock1:new Uint8Array(0x3d88),saveBlock2:new Uint8Array(0xf2c)}};
 const {saveBlock1:b1,saveBlock2:b2}=save.blocks;
 const a=new DataView(b1.buffer),b=new DataView(b2.buffer),key=0xf1234567;
 b.setUint32(0xac,key,true);for(let i=0;i<64;i++)a.setUint32(0x159c+4*i,key,true);
 return {save,b1,b2,a,b,stat:(i,value)=>a.setUint32(0x159c+4*i,(value^key)>>>0,true)};
}
const decode=f=>readTrainerCardAchievements(f.save,readFrontierSymbols(f.save));
const flag=(f,id,value=true)=>{const offset=0x1270+(id>>>3),mask=1<<(id&7);if(value)f.b1[offset]|=mask;else f.b1[offset]&=~mask;};
const hof=f=>{f.stat(10,1);f.stat(1,(24<<16)|(47<<8)|50);};
const dex=f=>{for(const [block,offset] of [[f.b2,0x28],[f.b2,0x5c],[f.b1,0x988],[f.b1,0x3b24]])block.fill(255,offset,offset+49);};
const paintings=f=>{for(const [i,species] of [25,277,300,350,376].entries())f.a.setUint16(0x2f98+32*i,species,true);};
const frontier=f=>{for(let id=0x8c4;id<=0x8d1;id++)flag(f,id);};
const names=['hallOfFame','hoennPokedex','contestMaster','battleFrontier'];
test('empty valid data is unearned, and reading never mutates blocks',()=>{
 const f=fixture(),before=structuredClone(f.save);assert.deepEqual(Object.values(decode(f).earned),[false,false,false,false]);assert.deepEqual(f.save,before);
});
for(const [index,setup] of [hof,dex,paintings,frontier].entries())test(`independent ${names[index]} achievement`,()=>{
 const f=fixture();setup(f);const result=decode(f);assert.equal(result.starCount,1);assert.deepEqual(Object.values(result.earned),names.map((_,i)=>i===index));
});
test('Hoenn excludes non-Hoenn and mythical species but requires each of the 200',()=>{
 const f=fixture();dex(f);
 for(const id of [1,385,386])for(const [block,offset] of [[f.b2,0x28],[f.b2,0x5c],[f.b1,0x988],[f.b1,0x3b24]])block[offset+((id-1)>>>3)]&=~(1<<((id-1)&7));
 assert.equal(decode(f).earned.hoennPokedex,true);
 f.b2[0x28+3]&=~1; // National #25 Pikachu, required in Hoenn.
 assert.equal(decode(f).earned.hoennPokedex,false);assert.ok(decode(f).diagnostics.hoennPokedex.missingSpecies.includes(25));
});
test('each owned/seen array is required; inconsistent mirrors are diagnosed without mutation',()=>{
 for(const [key,offset] of [['saveBlock2',0x28],['saveBlock2',0x5c],['saveBlock1',0x988],['saveBlock1',0x3b24]]){
  const f=fixture();dex(f);f.save.blocks[key][offset+3]&=~1;const before=structuredClone(f.save);
  assert.equal(decode(f).earned.hoennPokedex,false);assert.deepEqual(f.save,before);
  if(offset!==0x28)assert.equal(decode(f).diagnostics.hoennPokedex.valid,false);
 }
});
test('Frontier requires every one of 14 flags, even with all seven Gold flags set',()=>{
 for(let id=0x8c4;id<=0x8d1;id++){const f=fixture();frontier(f);flag(f,id,false);assert.equal(decode(f).earned.battleFrontier,false);}
 const f=fixture();for(let id=0x8c5;id<=0x8d1;id+=2)flag(f,id);
 assert.equal(decode(f).diagnostics.battleFrontier.valid,false);
 assert.equal(readTrainerCardAchievements(f.save,null).earned.battleFrontier,false);
 assert.equal(readTrainerCardAchievements(f.save,{symbols:Array(7).fill({id:'tower',silver:true,gold:true})}).diagnostics.battleFrontier.valid,false);
});
test('museum requires all five correct slots; invalid species cannot award a star',()=>{
 for(let i=0;i<5;i++){const f=fixture();paintings(f);f.a.setUint16(0x2f98+32*i,0,true);assert.equal(decode(f).earned.contestMaster,false);assert.equal(decode(f).diagnostics.contestMaster.paintingCount,4);}
 const f=fixture();paintings(f);f.a.setUint16(0x2f98,65535,true);assert.equal(decode(f).earned.contestMaster,false);assert.equal(decode(f).diagnostics.contestMaster.valid,false);
});
test('HOF uses unsigned XOR statistics and actual displayed debut-time behavior',()=>{
 const f=fixture();hof(f);flag(f,0x864,false);assert.equal(decode(f).earned.hallOfFame,true);
 f.stat(1,0);assert.equal(decode(f).earned.hallOfFame,false);assert.equal(decode(f).diagnostics.hallOfFame.entries,1);
 f.stat(1,(1000<<16)|10);assert.equal(decode(f).earned.hallOfFame,true);assert.deepEqual(decode(f).diagnostics.hallOfFame.displayedDebut,{hours:999,minutes:59,seconds:59});
 f.stat(1,(1<<16)|(60<<8));assert.equal(decode(f).earned.hallOfFame,false);assert.equal(decode(f).diagnostics.hallOfFame.valid,false);
 f.stat(1,1);f.stat(10,0xffffffff);assert.equal(decode(f).earned.hallOfFame,false);
 f.stat(10,0);assert.equal(decode(f).earned.hallOfFame,false);assert.equal(decode(f).diagnostics.hallOfFame.valid,false);
});
test('missing/truncated blocks fail closed with diagnostics',()=>{
 for(const value of [undefined,{}, {blocks:{saveBlock1:new Uint8Array(2),saveBlock2:new Uint8Array(2)}}]){
  const r=readTrainerCardAchievements(value);assert.equal(r.starCount,0);assert.deepEqual(Object.values(r.earned),[false,false,false,false]);assert.equal(r.diagnostics.available,false);assert.ok(r.warnings.length);
 }
});
test('snapshot integrates four stars from rotated logical sections',()=>{
 const f=fixture();[hof,dex,paintings,frontier].forEach(setup=>setup(f));
 const snapshot=readTrainerSnapshot(makeSave({rotations:[5,11],blocks:f.save.blocks}));
 assert.equal(snapshot.trainerCard.starCount,4);assert.deepEqual(Object.values(snapshot.trainerCard.earned),[true,true,true,true]);
});
const path=new URL('./fixtures/real/Pokemon - Emerald Version (USA, Europe).sav',import.meta.url);
test('private real save has one HOF star and three unearned stars',{skip:!existsSync(path)},()=>{
 const result=readTrainerSnapshot(readFileSync(path)).trainerCard;
 assert.deepEqual(Object.values(result.earned),[true,false,false,false]);assert.equal(result.starCount,1);assert.deepEqual(result.warnings,[]);
});
