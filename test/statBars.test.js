import test from 'node:test';
import assert from 'node:assert/strict';
import reference from '../src/data/reference.json' with {type: 'json'};
import {baseStatRanges,baseStatPercent,speciesBarPercents,deriveBaseStatRanges} from '../src/pokemon/statBars.js';
import {readPokemon} from '../src/save/readPokemon.js';
import {makePokemon} from './fixtures/synthetic.js';
const expected={hp:{min:1,max:255},attack:{min:5,max:160},defense:{min:5,max:230},spAttack:{min:10,max:154},spDefense:{min:20,max:230},speed:{min:5,max:180}};
test('base-stat ranges cover all 386 species independently per stat',()=>{
  assert.equal(Object.keys(reference.species).length,386);
  assert.deepEqual(baseStatRanges,expected);
  for(const [id,p] of Object.entries(reference.species)) {
    const bars=speciesBarPercents(id);
    for(const [key,{min,max}] of Object.entries(expected)) {
      assert.equal(bars[key],5+95*(p.baseStats[key]-min)/(max-min));
      assert.ok(bars[key]>=5&&bars[key]<=100);
    }
  }
});
test('each stat spans 5–100%, clamps, and rejects unavailable values',()=>{
  for(const [key,{min,max}] of Object.entries(expected)) {
    assert.equal(baseStatPercent(key,min),5);assert.equal(baseStatPercent(key,max),100);
    assert.equal(baseStatPercent(key,(min+max)/2),52.5);
    assert.equal(baseStatPercent(key,min-100),5);assert.equal(baseStatPercent(key,max+100),100);
  }
  assert.equal(baseStatPercent('hp',null),null);assert.equal(baseStatPercent('hp',NaN),null);
  assert.equal(baseStatPercent('unknown',20),null);assert.equal(speciesBarPercents(999),null);
});
test('Shedinja HP has the visible minimum; Blissey HP and Emerald Deoxys Speed reach maximum',()=>{
  const internal=dex=>Object.keys(reference.species).find(id=>reference.species[id].nationalDexId===dex);
  assert.equal(speciesBarPercents(internal(292)).hp,5);
  assert.equal(speciesBarPercents(internal(242)).hp,100);
  assert.equal(speciesBarPercents(internal(386)).speed,100);
});
test('scaling fails explicitly for missing, duplicated, or incomplete species data',()=>{
  const missing={...reference.species};delete missing[1];assert.throws(()=>deriveBaseStatRanges(missing),/386/);
  assert.throws(()=>deriveBaseStatRanges({...reference.species,1:{...reference.species[1],nationalDexId:2}}),/386/);
  assert.throws(()=>deriveBaseStatRanges({...reference.species,1:{...reference.species[1],baseStats:{}}}),/Incomplete/);
});
test('bar lengths ignore level, IVs, EVs and nature and do not change current stat calculations',()=>{
  const a=readPokemon(makePokemon({pid:0,experience:560,ivWord:0}));
  const b=readPokemon(makePokemon({pid:3,experience:100000,ivWord:1073741823,evs:[252,0,0,0,252,0]}));
  const before=structuredClone([a.calculated,b.calculated]);
  assert.notDeepEqual(a.calculated.stats,b.calculated.stats);
  assert.deepEqual(speciesBarPercents(a.internalSpeciesId),speciesBarPercents(b.internalSpeciesId));
  assert.deepEqual([a.calculated,b.calculated],before);
});
