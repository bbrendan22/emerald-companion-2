import test from 'node:test';
import assert from 'node:assert/strict';
import {filterMoves, moveCategory, moveTypeOptions} from '../src/resources/moves/filterMoves.js';
import {moveResources} from '../src/resources/learnset/data/moveResources.js';
const names = (...args) => filterMoves(...args).map(e => e.name);
const category = name => moveCategory(moveResources[filterMoves().find(e => e.name === name).id]);

test('move filter type order and labels match Gen 3, with Typeless last', () => {
  assert.deepEqual(moveTypeOptions.map(e => e.label), ['Type','Normal','Fighting','Flying','Poison','Ground','Rock','Bug','Steel','Ghost','Fire','Water','Grass','Electric','Psychic','Ice','Dragon','Dark','Typeless']);
});
test('move names match only a trimmed case-insensitive prefix', () => {
  assert.deepEqual(names('  THUN '), ['Thunder','Thunder Shock','Thunder Wave','Thunderbolt','ThunderPunch']);
  assert.deepEqual(names('ice'), ['Ice Ball','Ice Beam','Ice Punch']);
  assert.deepEqual(names('bolt'), []);
  assert.deepEqual(names('paralyzes'), []);
  assert.equal(names().length, 354);
});
test('Gen 3 categories preserve status and fixed/variable damage classifications', () => {
  for (const name of ['ThunderPunch','Ice Punch','Fire Punch','Bite','Crunch','Dragon Rage','Psywave','Mirror Coat']) assert.equal(category(name), 'Special', name);
  for (const name of ['Shadow Ball','Sludge Bomb','Seismic Toss','Night Shade','Counter','Bide','SonicBoom','Super Fang','Endeavor','Fissure','Hidden Power']) assert.equal(category(name), 'Physical', name);
  for (const name of ['Curse','Swords Dance','Thunder Wave','Pain Split','Nature Power','Metronome','Spikes']) assert.equal(category(name), 'Status', name);
  const all = filterMoves();
  assert.equal(all.length, ['Physical','Special','Status'].flatMap(c => filterMoves('', '', c)).length);
  assert.ok(all.every(e => Number.isInteger(moveResources[e.id].power)));
});
test('filters intersect, preserve ordering, include Curse correctly, and reset', () => {
  assert.deepEqual(names('thun','ELECTRIC','Special'), ['Thunder','Thunder Shock','Thunderbolt','ThunderPunch']);
  assert.deepEqual(names('sword','NORMAL','Status'), ['Swords Dance']);
  assert.deepEqual(names('', 'MYSTERY', 'Status'), ['Curse']);
  assert.ok(names().includes('Curse'));
  assert.ok(!names('', 'GHOST','Status').includes('Curse'));
  assert.deepEqual(names('thun','WATER','Special'), []);
  assert.equal(names('', '', '').length, 354);
  for (const type of moveTypeOptions) for (const c of ['', 'Physical','Special','Status']) {
    const result=names('', type.value,c);
    assert.deepEqual(result,[...result].sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase(),'en')));
  }
});
