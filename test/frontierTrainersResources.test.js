import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {frontierTrainers} from '../src/battle/data/frontierTrainers.js';
import {frontierPokemon} from '../src/battle/data/frontierPokemon.js';
import {frontierBrainPokemon} from '../src/battle/data/frontierBrains.js';
import {frontierTrainerSprite} from '../src/battle/towerTrainers.js';
import {trainerKey} from '../src/battle/towerRules.js';
import {searchResourceTrainers, resourceTrainerSets, resourceBrainTeams, resourceBrainIVRange} from '../src/resources/frontier/trainers.js';

test('Resources trainers preserve all 300 identities, order, IV tiers and sprites', () => {
  const entries = searchResourceTrainers();
  assert.deepEqual(entries, frontierTrainers);
  assert.equal(entries.length, 300);
  assert.equal(new Set(entries.map(trainerKey)).size, 300);
  for (const [index, trainer] of entries.entries()) {
    assert.equal(trainer, frontierTrainers[index]);
    assert.ok(Number.isInteger(trainer.ivs) && trainer.ivs >= 0 && trainer.ivs <= 31);
    assert.ok(existsSync(`public/trainers/frontier/${frontierTrainerSprite(trainer.trainerClass)}.png`));
  }
});
test('every trainer pool resolves exact IDs, keeps all variants, sorts global numbers and leaves data unchanged', () => {
  const before = JSON.stringify({frontierTrainers, frontierPokemon});
  const byId = new Map(frontierPokemon.map(set => [set.id, set]));
  for (const trainer of frontierTrainers) {
    const sets = resourceTrainerSets(trainer);
    assert.equal(sets.length, trainer.pokemonSetIds.length);
    assert.equal(new Set(sets).size, sets.length);
    const expected = trainer.pokemonSetIds.map(id => byId.get(id)).sort((a,b) => a.entry-b.entry);
    assert.deepEqual(sets, expected);
    assert.ok(sets.every((set, i) => set === expected[i] && Number.isInteger(set.entry)));
  }
  assert.equal(JSON.stringify({frontierTrainers, frontierPokemon}), before);
});
test('trainer searches are trimmed, case-insensitive, multiword and confined to their tab', () => {
  assert.equal(searchResourceTrainers(' bRaDy ')[0], frontierTrainers[0]);
  assert.deepEqual(searchResourceTrainers('youngster'), frontierTrainers.filter(t => t.trainerClass === 'Youngster'));
  assert.ok(searchResourceTrainers('triathlete swimmer').every(t => t.trainerClass.includes('swimmer')));
  assert.deepEqual(searchResourceTrainers('Anabel'), []);
  assert.deepEqual(searchResourceTrainers('BRADY', 'brains'), []);
  assert.equal(searchResourceTrainers('battle palace', 'brains')[0].name, 'Spenser');
  assert.deepEqual(searchResourceTrainers('missing'), []);
});
test('six Brains reuse exactly 36 special records in separate Silver/Gold teams without Noland or ordinary numbers', () => {
  const before = JSON.stringify(frontierBrainPokemon);
  const brains = searchResourceTrainers('', 'brains');
  assert.equal(brains.length, 12);
  assert.deepEqual(brains.map(b => b.key), ['Anabel','Tucker','Greta','Lucy','Spenser','Brandon'].flatMap(name => [`${name} Silver`, `${name} Gold`]));
  const all = [];
  for (const brain of brains) {
    assert.ok(existsSync(`public/trainers/frontier/${brain.sprite}.png`));
    const teams = resourceBrainTeams(brain);
    assert.deepEqual(teams.map(t => t.symbol), [brain.symbol]);
    for (const team of teams) {
      assert.equal(team.sets.length, 3);
      assert.deepEqual(team.sets, frontierBrainPokemon.filter(s => s.brainSet === `${brain.name} ${team.symbol}`));
      assert.ok(team.sets.every(s => frontierBrainPokemon.includes(s) && s.entry === undefined));
      all.push(...team.sets);
    }
  }
  assert.equal(all.length, 36); assert.equal(new Set(all).size, 36);
  assert.equal(JSON.stringify(frontierBrainPokemon), before);
  assert.deepEqual(searchResourceTrainers('Noland', 'brains'), []);
});

test('Brain IV ranges use fixed IVs from both Symbol teams', () => {
  const brains = searchResourceTrainers('', 'brains');
  assert.deepEqual(brains.map(resourceBrainIVRange), ['24','31','20','31','20','31','16','31','16','31','16','31']);
  for (const brain of brains) {
    const values = resourceBrainTeams(brain).flatMap(t => t.sets.map(s => s.fixedIVs));
    assert.equal(resourceBrainIVRange(brain), String(values[0]));
  }
});
