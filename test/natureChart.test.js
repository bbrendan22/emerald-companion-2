import test from 'node:test';
import assert from 'node:assert/strict';
import {natureChartRows, natureChartStats} from '../src/resources/charts/natureChart.js';
import {emeraldStat} from '../src/battle/stats.js';

test('Nature matrix matches the requested orientation and all 25 cells', () => {
  assert.deepEqual(natureChartStats.map(stat => stat.short), ['Atk','Def','SpA','SpD','Spe']);
  assert.deepEqual(natureChartRows.map(row => row.cells.map(cell => cell.name)), [
    ['Hardy','Bold','Modest','Calm','Timid'],
    ['Lonely','Docile','Mild','Gentle','Hasty'],
    ['Adamant','Impish','Bashful','Careful','Jolly'],
    ['Naughty','Lax','Rash','Quirky','Naive'],
    ['Brave','Relaxed','Quiet','Sassy','Serious'],
  ]);
  assert.equal(new Set(natureChartRows.flatMap(row => row.cells.map(cell => cell.name))).size, 25);
  assert.deepEqual(natureChartRows.flatMap(row => row.cells.filter(cell => cell.neutral).map(cell => cell.name)), ['Hardy','Docile','Bashful','Quirky','Serious']);
});

test('Every cell agrees with canonical Gen 3 modifiers; HP is unaffected', () => {
  for (const row of natureChartRows) row.cells.forEach((cell, column) => {
    for (const stat of natureChartStats) {
      const expected = cell.neutral ? 205 : stat.key === natureChartStats[column].key ? 225 : stat.key === row.key ? 184 : 205;
      assert.equal(emeraldStat(100, stat.key, 0, 0, 100, cell.name), expected, `${cell.name}: ${stat.name}`);
    }
    assert.equal(emeraldStat(100, 'hp', 0, 0, 100, cell.name), 310);
  });
});
