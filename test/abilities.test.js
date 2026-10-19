import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import reference from '../src/data/reference.json' with {type:'json'};
import overview from '../src/resources/data/overview.json' with {type:'json'};
import {abilityDescription, abilityPokemon} from '../src/resources/abilities/abilities.js';
import {catalogEntries} from '../src/resources/search.js';

test('all 77 canonical Emerald ability names and cartridge descriptions, alphabetically searchable', () => {
  const entries=catalogEntries('abilities'); assert.equal(entries.length,77);
  assert.deepEqual(entries.map(e=>e.id).sort((a,b)=>a-b),Array.from({length:77},(_,i)=>i+1));
  for(const query of ['', '  OVER  ', 'a']) {
    const results=catalogEntries('abilities',query);
    assert.deepEqual(results.map(e=>e.name),results.map(e=>e.name).sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase(),'en')));
    assert.ok(results.every(e=>e.name.toLowerCase().includes(query.trim().toLowerCase())));
  }
  for(const {id} of entries) {assert.equal(abilityDescription(id),overview.abilityDescriptions[id]);assert.ok(abilityDescription(id));}
  assert.deepEqual(catalogEntries('abilities','no-such-name'),[]);
  assert.equal(abilityDescription(5),'Negates 1-hit KO attacks.');
  assert.equal(abilityDescription(31),'Draws electrical moves.');
});
test('all 386 Emerald species map to exactly their canonical standard ability slots and local sprites', () => {
  const represented=new Set();
  for(const {id} of catalogEntries('abilities')) {
    const pokemon=abilityPokemon(id);
    const expected=Object.values(reference.species).filter(p=>p.abilities.includes(id)).map(p=>({dex:p.nationalDexId,name:p.name})).sort((a,b)=>a.dex-b.dex);
    assert.deepEqual(pokemon,expected);
    assert.equal(new Set(pokemon.map(p=>p.dex)).size,pokemon.length);
    for(const p of pokemon){represented.add(p.dex);assert.ok(existsSync(new URL(`../public/pokemon/emerald/normal/${p.dex}.png`,import.meta.url)));}
  }
  assert.deepEqual([...represented].sort((a,b)=>a-b),Array.from({length:386},(_,i)=>i+1));
  for(const id of [33,44])assert.ok(abilityPokemon(id).some(p=>p.dex===270)); // Lotad: both standard slots.
  assert.ok(abilityPokemon(26).some(p=>p.dex===94)); // Gen III Gengar has Levitate.
  assert.ok(abilityPokemon(65).some(p=>p.dex===1));
  assert.ok(!abilityPokemon(34).some(p=>p.dex===1)); // No hidden Chlorophyll.
  assert.deepEqual(abilityPokemon(76),[]); // Unused Cacophony.
  assert.deepEqual(abilityPokemon(0),[]); assert.deepEqual(abilityPokemon(999),[]);
  assert.equal(abilityPokemon(26),abilityPokemon(26));
});


test('ability database search is case-insensitive and prefix-only', async () => {
  const {filterAbilities}=await import('../src/resources/abilities/filterAbilities.js');
  for(const [query,names] of [['intim',['Intimidate']],['swift',['Swift Swim']],['swim',[]],['  LEV  ',['Levitate']],['',catalogEntries('abilities').map(e=>e.name)]]) {
    assert.deepEqual(filterAbilities(query).map(e=>e.name),names);
  }
});
