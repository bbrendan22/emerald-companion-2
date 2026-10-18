import test from 'node:test';
import assert from 'node:assert/strict';
import reference from '../src/data/reference.json' with {type: 'json'};
import types from '../src/data/pokemonTypes.json' with {type: 'json'};
import {baseStatRows, defensiveMatchupGroups} from '../src/resources/speciesStats.js';
import {speciesBarPercents} from '../src/pokemon/statBars.js';
import {GEN3_TYPE_DISPLAY_ORDER} from '../src/pokemon/typeDisplayOrder.js';
import {typeOptions} from '../src/ui/collectionFilters.js';
import {typeMatchups} from '../src/pokemon/profile.js';

test('canonical display ordering is shared while Pokémon typing stays untouched', () => {
  assert.deepEqual(GEN3_TYPE_DISPLAY_ORDER, ['normal','fighting','flying','poison','ground','rock','bug','steel','ghost','fire','water','grass','electric','psychic','ice','dragon','dark']);
  assert.strictEqual(typeOptions, GEN3_TYPE_DISPLAY_ORDER);
  assert.deepEqual(typeMatchups(['water']).map(entry => entry.type), GEN3_TYPE_DISPLAY_ORDER);
  assert.deepEqual(types[82], ['electric', 'steel']);
  assert.deepEqual(types[292], ['bug', 'ghost']);
});
test('all 386 species reuse My Pokémon base-stat percentages, values and totals', () => {
  for (const [internal, species] of Object.entries(reference.species)) {
    const rows = baseStatRows(species.baseStats), expected = speciesBarPercents(internal);
    assert.deepEqual(rows.map(row => row.label), ['HP','Attack','Defense','Sp. Attack','Sp. Defense','Speed']);
    for (const row of rows) {assert.equal(row.value, species.baseStats[row.key]); assert.equal(row.percent, expected[row.key]);}
    assert.equal(rows.reduce((total, row) => total + row.value, 0), Object.values(species.baseStats).reduce((a, b) => a + b, 0));
  }
  const deoxys = Object.values(reference.species).find(species => species.nationalDexId === 386);
  assert.equal(baseStatRows(deoxys.baseStats).find(row => row.key === 'speed').percent, 100);
});
test('defensive groups omit neutral types and use exact group/type ordering for every species', () => {
  for (const ownTypes of Object.values(types)) {
    const groups = defensiveMatchupGroups(ownTypes);
    assert.deepEqual(groups.map(group => group.multiplier), [4, 2, .5, .25, 0].filter(multiplier => groups.some(group => group.multiplier === multiplier)));
    for (const group of groups) {
      assert.ok(group.types.length > 0);
      assert.deepEqual(group.types, GEN3_TYPE_DISPLAY_ORDER.filter(type => group.types.includes(type)));
      assert.equal(group.types.includes('fairy'), false);
    }
  }
});
test('verified Gen 3 defensive matchups preserve Steel resistances and Shedinja actual typing', () => {
  const chart = dex => Object.fromEntries(defensiveMatchupGroups(types[dex]).flatMap(group => group.types.map(type => [type, group.multiplier])));
  assert.equal(chart(260).grass, 4); assert.equal(chart(260).electric, 0);
  assert.equal(chart(6).rock, 4);
  const magneton = chart(82);
  assert.equal(magneton.ground, 4); assert.equal(magneton.poison, 0);
  assert.equal(magneton.ghost, .5); assert.equal(magneton.dark, .5); assert.equal(magneton.flying, .25);
  const shedinja = chart(292);
  assert.equal(shedinja.normal, 0); assert.equal(shedinja.fighting, 0);
  assert.equal(shedinja.ground, .5); assert.equal(shedinja.poison, .5);
  assert.equal(shedinja.rock, 2); assert.equal(shedinja.fire, 2); assert.equal(shedinja.ghost, 2);
  assert.equal(shedinja.water, undefined); // Neutral, not Wonder Guard immunity.
});
