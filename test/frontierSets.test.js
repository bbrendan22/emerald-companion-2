import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {frontierPokemon} from '../src/battle/data/frontierPokemon.js';
import {speciesByName, battleMove} from '../src/battle/reference.js';
import {itemResources} from '../src/resources/items/data/itemResources.js';
import {searchFrontierSets, frontierEVSpread, eligibleFrontierTrainers, searchFrontierBrains, frontierBrains, frontierBrainInfo, frontierResourceSetKey} from '../src/resources/frontier/sets.js';

test('Frontier resources retain all 882 original records, numbers and valid Emerald references', () => {
  const before = JSON.stringify(frontierPokemon);
  const sets = searchFrontierSets();
  assert.equal(sets.length, 882);
  assert.deepEqual(sets.map(s => s.entry), Array.from({length:882}, (_, i) => i + 1));
  assert.equal(new Set(sets.map(s => s.id)).size, 882);
  const items = new Set(Object.values(itemResources).map(i => i.name.toLowerCase().replace(/[^a-z0-9]/g, '')));
  for (const set of sets) {
    assert.equal(set, frontierPokemon[set.entry - 1]);
    const species = speciesByName.get(set.species.toLowerCase());
    assert.ok(species);
    assert.ok(existsSync(`public/pokemon/emerald/normal/${species.nationalDexId}.png`));
    assert.ok(set.nature && set.possibleAbility);
    assert.ok(items.has(set.item.toLowerCase().replace(/[^a-z0-9]/g, '')), set.item);
    assert.ok(set.moves.length >= 1 && set.moves.length <= 4);
    for (const name of set.moves) assert.ok(battleMove(name), name);
    assert.equal(Object.values(set.evs).reduce((a,b) => a+b,0), 510);
    for (const ev of Object.values(set.evs)) assert.ok(Number.isInteger(ev) && ev >= 0 && ev <= 255);
  }
  searchFrontierSets('suicune');
  assert.equal(JSON.stringify(frontierPokemon), before);
});
test('Frontier search supports trimmed species substrings and exact established set numbers', () => {
  assert.ok(searchFrontierSets('  sNoRlAx ').length > 1);
  assert.ok(searchFrontierSets('orlax').every(s => s.species === 'Snorlax'));
  assert.deepEqual(searchFrontierSets('882').map(s => s.id), ['Suicune 6']);
  assert.deepEqual(searchFrontierSets('#001').map(s => s.id), ['Sunkern 1']);
  assert.deepEqual(searchFrontierSets('883'), []);
  assert.deepEqual(searchFrontierSets('missing'), []);
  assert.equal(frontierEVSpread(frontierPokemon[0]), '255 HP / 255 SpA');
  assert.deepEqual(frontierPokemon[6].moves, ['Flail']);
});

 test('eligible trainers match exact allowed set IDs, including multiple trainers and empty Unown', async () => {
  const {frontierTrainers} = await import('../src/battle/data/frontierTrainers.js');
  for (const set of frontierPokemon) {
    assert.deepEqual(eligibleFrontierTrainers(set).map(t => `${t.trainerClass}:${t.name}`),
      frontierTrainers.filter(t => t.pokemonSetIds.includes(set.id)).map(t => `${t.trainerClass}:${t.name}`));
  }
  assert.ok(eligibleFrontierTrainers(frontierPokemon[0]).length > 1);
  assert.deepEqual(eligibleFrontierTrainers(frontierPokemon[126]), []);
  assert.notDeepEqual(eligibleFrontierTrainers(frontierPokemon.find(s => s.id === 'Snorlax 1')),
    eligibleFrontierTrainers(frontierPokemon.find(s => s.id === 'Snorlax 2')));
});


test('36 original Brain records retain distinct symbols, accurate presentation metadata and assets', async () => {
  const {frontierBrainPokemon} = await import('../src/battle/data/frontierBrains.js');
  const before = JSON.stringify(frontierBrainPokemon);
  const sets = searchFrontierBrains();
  assert.equal(sets.length, 36);
  assert.equal(new Set(sets.map(frontierResourceSetKey)).size, 36);
  assert.ok(sets.every(set => frontierBrainPokemon.includes(set) && !set.brainSet.includes('Noland') && set.entry === undefined));
  for (const brain of frontierBrains) {
    assert.ok(existsSync(`public/trainers/frontier/${brain.sprite}.png`));
    for (const symbol of ['Silver', 'Gold']) {
      const team = sets.filter(set => set.brainSet === `${brain.name} ${symbol}`);
      assert.equal(team.length, 3);
      for (const set of team) {
        assert.deepEqual(frontierBrainInfo(set), {...brain, symbol});
        assert.equal(set.moves.length, 4);
        for (const name of set.moves) assert.ok(battleMove(name));
      }
    }
  }
  assert.equal(searchFrontierBrains(' snOrlAx ').length, 2);
  assert.equal(searchFrontierBrains('Anabel Gold').length, 3);
  assert.equal(searchFrontierBrains('Battle Palace Silver').length, 3);
  assert.equal(searchFrontierBrains('Noland').length, 0);
  assert.equal(searchFrontierBrains('882').length, 0);
  assert.equal(frontierEVSpread(searchFrontierBrains('Shuckle Silver')[0]), '252 HP / 106 SpA / 252 SpD');
  assert.equal(JSON.stringify(frontierBrainPokemon), before);
  assert.equal(searchFrontierSets().length, 882);
});
