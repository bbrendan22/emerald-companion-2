import test from 'node:test';
import assert from 'node:assert/strict';
import {loadBattleRules, storeBattleRules} from '../src/storage/battleRules.js';
import {createTowerRules} from '../src/battle/towerRules.js';

test('battle rules persist in one key, validate stored data and retain manual Open Level', () => {
  const entries = new Map();
  const storage = {getItem:key => entries.get(key) ?? null, setItem:(key,value) => entries.set(key,value)};
  assert.deepEqual(loadBattleRules(storage),createTowerRules());
  const rules = createTowerRules({facility:'Tower',format:'Doubles',levelMode:'open',openLevel:78});
  storeBattleRules(storage,rules);
  assert.deepEqual(loadBattleRules(storage),rules);
  assert.equal(entries.size,1);
  const key = [...entries.keys()][0];
  for (const value of ['broken','null','{"facility":"invalid"}','{"levelMode":"wrong"}']) {
    entries.set(key,value);
    assert.deepEqual(loadBattleRules(storage),createTowerRules());
  }
});

test('old facility choices migrate to Tower without discarding format or level', () => {
  const storage = {getItem:() => JSON.stringify({facility:'Pike',format:'Doubles',levelMode:'open',openLevel:78})};
  assert.deepEqual(loadBattleRules(storage),createTowerRules({format:'Doubles',levelMode:'open',openLevel:78}));
});

test('failed preference writes do not crash Battle or discard existing stored rules', () => {
  const existing = JSON.stringify({facility:'Tower',format:'Doubles',levelMode:'open',openLevel:78});
  const storage = {getItem:() => existing, setItem:() => {throw new Error('quota exceeded');}};
  assert.equal(storeBattleRules(storage,createTowerRules()),false);
  assert.equal(storage.getItem(),existing);
  assert.equal(loadBattleRules(storage).openLevel,78);
});
