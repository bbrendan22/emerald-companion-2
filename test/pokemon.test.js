import test from 'node:test';
import assert from 'node:assert/strict';
import reference from '../src/data/reference.json' with {type:'json'};
import {readPokemon,pokemonChecksum} from '../src/save/readPokemon.js';
import {expForLevel,levelFromExperience,calculateStats} from '../src/save/stats.js';
import {makePokemon} from './fixtures/synthetic.js';
import {readFileSync} from 'node:fs';
const golden=()=>Uint8Array.from(Buffer.from(readFileSync(new URL('./fixtures/bulbasaur.hex',import.meta.url),'utf8').trim(),'hex'));
test('fixed golden record: independently calculated checksum, species, level and stats',()=>{
  const bytes=golden(), p=readPokemon(bytes);
  assert.equal(new DataView(bytes.buffer).getUint16(28,true),0x432e);
  assert.equal(p.internalSpeciesId,1);assert.equal(p.nationalDexId,1);assert.equal(p.speciesName,'Bulbasaur');
  assert.equal(p.nickname,'AB');assert.equal(p.ot.name,'C');assert.equal(p.nature,'Hardy');assert.equal(p.gender,'female');assert.equal(p.shiny,true);
  assert.equal(p.experience,560);assert.equal(p.derivedLevel,10);assert.equal(p.recorded,null);
  assert.deepEqual(p.calculated,{level:10,stats:{hp:32,attack:17,defense:17,speed:17,spAttack:21,spDefense:21}});
  assert.equal(p.checksumValid,true);assert.deepEqual(p.warnings,[]);
});
test('all 24 secure substructure orders and nonzero XOR keys decode correctly',()=>{
  for(let pid=0;pid<24;pid++) {
    const p=readPokemon(makePokemon({pid,otId:0x12345678}));
    assert.equal(p.internalSpeciesId,1);assert.equal(p.experience,560);
    assert.deepEqual(p.moves.map(m=>m.id),[33,0,45,0]);assert.equal(p.ivs.spDefense,31);
    assert.equal(p.origin.metLocationId,12);assert.equal(p.contest.feel,6);
    assert.equal(p.ot.trainerId,0x5678);assert.equal(p.ot.secretId,0x1234);
  }
});
test('checksum mismatch and corrupt record sizes are rejected',()=>{
  const data=golden();data[32]^=1;assert.throws(()=>readPokemon(data),/checksum/);
  for(const size of [0,79,81,99,101]) assert.throws(()=>readPokemon(new Uint8Array(size)),/80-byte/);
  assert.throws(()=>pokemonChecksum(new Uint8Array(47)),/48/);
  assert.equal(pokemonChecksum(new Uint8Array(48).fill(255)),65512);
});
test('empty records differ from invalid species, bad eggs and invalid species flags',()=>{
  assert.equal(readPokemon(new Uint8Array(80)),null);assert.equal(readPokemon(new Uint8Array(80).fill(255)),null);
  assert.throws(()=>readPokemon(makePokemon({species:252})),/Unsupported internal/);
  assert.throws(()=>readPokemon(makePokemon({flags:3})),/Bad Egg/);
  assert.throws(()=>readPokemon(makePokemon({flags:0})),/hasSpecies/);
  assert.throws(()=>readPokemon(makePokemon({species:0})),/empty record/);
});
test('four move slots preserve gaps and each slot’s PP Ups',()=>{
  const p=readPokemon(golden());
  assert.deepEqual(p.moves.map(m=>m.id),[33,0,45,0]);assert.deepEqual(p.moves.map(m=>m.ppUps),[1,2,0,3]);
  assert.deepEqual(p.moves.map(m=>m.maxPp),[42,null,40,null]);assert.deepEqual(p.moves.map(m=>m.currentPp),[17,0,25,0]);
});
test('recorded party stats stay separate from recalculated values',()=>{
  const p=readPokemon(makePokemon({party:true}));
  assert.deepEqual(p.recorded,{level:10,status:8,currentHp:12,stats:{hp:31,attack:16,defense:18,speed:20,spAttack:22,spDefense:24}});
  assert.equal(p.calculated.stats.hp,32);assert.equal(p.recorded.stats.hp,31);
  const mismatch=readPokemon(makePokemon({party:true,recordedLevel:11}));
  assert.ok(mismatch.warnings.some(w=>w.includes('differs')));assert.equal(mismatch.calculated.level,11);
  assert.throws(()=>readPokemon(makePokemon({party:true,recordedLevel:0})),/Invalid recorded/);
});
test('explicit egg status, hatch cycles and inconsistent egg flags',()=>{
  const egg=readPokemon(makePokemon({egg:true,friendship:20}));
  assert.equal(egg.isEgg,true);assert.equal(egg.hatchCycles,20);assert.equal(egg.friendship,null);assert.equal(egg.calculated,null);
  assert.ok(readPokemon(makePokemon({egg:true,flags:2})).warnings.some(w=>w.includes('egg flags')));
});
test('internal IDs map to National Dex IDs without treating old Unown IDs as species',()=>{
  assert.equal(readPokemon(makePokemon({species:277})).nationalDexId,252);
  const deoxys=readPokemon(makePokemon({species:410,experience:1250}));assert.equal(deoxys.nationalDexId,386);
  assert.deepEqual(deoxys.calculated.stats,{hp:33,attack:27,defense:26,speed:44,spAttack:27,spDefense:26});
  assert.equal(Object.keys(reference.species).length,386);
  assert.deepEqual(Object.values(reference.species).map(s=>s.nationalDexId).sort((a,b)=>a-b),Array.from({length:386},(_,i)=>i+1));
});
test('IV/EV bit ordering, second ability, origin, OT gender, Pokérus and ribbons',()=>{
  const ivWord=(0x80000000 | 1 | (2<<5) | (3<<10) | (4<<15) | (5<<20) | (6<<25))>>>0;
  const p=readPokemon(makePokemon({species:19,ivWord,evs:[4,8,12,16,20,24],origins:0xa185}));
  assert.deepEqual(p.ivs,{hp:1,attack:2,defense:3,speed:4,spAttack:5,spDefense:6});
  assert.deepEqual(p.evs,{hp:4,attack:8,defense:12,speed:16,spAttack:20,spDefense:24});
  assert.equal(p.ability.slot,1);assert.equal(p.ability.id,62);assert.equal(p.origin.gameId,3);assert.equal(p.origin.ballId,4);assert.equal(p.origin.metLevel,5);
  assert.equal(p.ot.gender,'female');assert.equal(p.pokerus,33);assert.equal(p.ribbons.raw,32770);assert.deepEqual(p.ribbons.contestRanks,[2,0,0,0,0]);
});
test('gender-only species, genderless species and shiny XOR boundary',()=>{
  assert.equal(readPokemon(makePokemon({species:29,pid:255})).gender,'female');
  assert.equal(readPokemon(makePokemon({species:32,pid:0})).gender,'male');
  assert.equal(readPokemon(makePokemon({species:81})).gender,'genderless');
  assert.equal(readPokemon(makePokemon({pid:7})).shiny,true);assert.equal(readPokemon(makePokemon({pid:8})).shiny,false);
});
test('growth thresholds from independent level-100 experience constants',()=>{
  for(const [curve,expected] of [['ERRATIC',600000],['FAST',800000],['MEDIUM_FAST',1000000],['MEDIUM_SLOW',1059860],['SLOW',1250000],['FLUCTUATING',1640000]]) {
    assert.equal(expForLevel(100,'GROWTH_'+curve),expected);
    assert.equal(levelFromExperience(expected,'GROWTH_'+curve),100);
    assert.equal(levelFromExperience(expected-1,'GROWTH_'+curve),99);
  }
  assert.equal(expForLevel(10,'GROWTH_MEDIUM_SLOW'),560);
});
test('nature rounding, EV quartering and Shedinja HP use independent arithmetic',()=>{
  const base={hp:45,attack:49,defense:49,speed:45,spAttack:65,spDefense:65};
  const iv=Object.fromEntries(Object.keys(base).map(k=>[k,31]));
  const ev=Object.fromEntries(Object.keys(base).map(k=>[k,7]));
  const stats=calculateStats(base,iv,ev,10,3); // Adamant: attack up, special attack down.
  assert.equal(stats.attack,19);assert.equal(stats.spAttack,18);assert.equal(stats.hp,32);
  assert.equal(calculateStats(base,iv,ev,10,3,true).hp,1);
});
