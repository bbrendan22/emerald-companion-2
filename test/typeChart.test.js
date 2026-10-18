import test from 'node:test';
import assert from 'node:assert/strict';
import {typeChartTypes, typeChartRows} from '../src/resources/charts/typeChart.js';
import {typeMultiplier} from '../src/battle/typeMatchups.js';

const order = 'normal fighting flying poison ground rock bug steel ghost fire water grass electric psychic ice dragon dark'.split(' ');
// Independent expected nonneutral matchups, in attacking-row orientation.
const expected = {
  normal: [[], ['rock','steel'], ['ghost']],
  fighting: [['normal','rock','steel','ice','dark'], ['flying','poison','bug','psychic'], ['ghost']],
  flying: [['fighting','bug','grass'], ['rock','steel','electric'], []],
  poison: [['grass'], ['poison','ground','rock','ghost'], ['steel']],
  ground: [['poison','rock','steel','fire','electric'], ['bug','grass'], ['flying']],
  rock: [['flying','bug','fire','ice'], ['fighting','ground','steel'], []],
  bug: [['grass','psychic','dark'], ['fighting','flying','poison','steel','ghost','fire'], []],
  steel: [['rock','ice'], ['steel','fire','water','electric'], []],
  ghost: [['ghost','psychic'], ['steel','dark'], ['normal']],
  fire: [['bug','steel','grass','ice'], ['rock','fire','water','dragon'], []],
  water: [['ground','rock','fire'], ['water','grass','dragon'], []],
  grass: [['ground','rock','water'], ['flying','poison','bug','steel','fire','grass','dragon'], []],
  electric: [['flying','water'], ['grass','electric','dragon'], ['ground']],
  psychic: [['fighting','poison'], ['steel','psychic'], ['dark']],
  ice: [['flying','ground','grass','dragon'], ['steel','fire','water','ice'], []],
  dragon: [['dragon'], ['steel'], []],
  dark: [['ghost','psychic'], ['fighting','steel','dark'], []],
};

test('17×17 matrix uses exact order and every canonical Gen 3 single-type matchup', () => {
  assert.deepEqual(typeChartTypes, order);
  assert.deepEqual(typeChartRows.map(row => row.attack), order);
  for (const {attack, cells} of typeChartRows) {
    assert.deepEqual(cells.map(cell => cell.defense), order);
    const [strong, resisted, immune] = expected[attack];
    for (const {defense, multiplier, label} of cells) {
      const value = strong.includes(defense) ? 2 : resisted.includes(defense) ? 0.5 : immune.includes(defense) ? 0 : 1;
      assert.equal(multiplier, value, `${attack} → ${defense}`);
      assert.equal(multiplier, typeMultiplier(attack.toUpperCase(), [defense.toUpperCase()]));
      assert.equal(label, value === 1 ? '' : value === 0.5 ? '½×' : `${value}×`);
    }
  }
});
