import test from 'node:test';
import assert from 'node:assert/strict';
import reference from '../src/data/reference.json' with {type: 'json'};
import overview from '../src/resources/data/overview.json' with {type: 'json'};
import {speciesOverview, evolutionFamily, evolutionRequirement, genderSummary} from '../src/resources/speciesOverview.js';

test('all 386 profiles resolve the National ID, original abilities and verified Emerald text', () => {
  for (const species of Object.values(reference.species)) {
    const detail = speciesOverview(species.nationalDexId);
    assert.equal(detail.name, species.name);
    assert.deepEqual(detail.abilities.map(ability => ability.id), species.abilities);
    assert.ok(detail.abilities.every(ability => ability.name && ability.description));
    assert.ok(detail.entry.length > 20);
    assert.ok(detail.types.every(type => type !== 'fairy'));
    assert.ok(detail.family.flat().some(member => member.id === detail.dex));
  }
  assert.equal(speciesOverview(358).name, 'Chimecho');
  assert.equal(speciesOverview(386).name, 'Deoxys');
  assert.equal(speciesOverview(387), null);
  assert.equal(Object.keys(overview.emeraldEntries).length, 386);
  assert.equal(overview.evolutions.length, 184);
});
test('complete evolution families include ancestors, descendants and branches from every member', () => {
  for (const dex of [1, 2, 3]) assert.deepEqual(evolutionFamily(dex).map(stage => stage.map(member => member.id)), [[1], [2], [3]]);
  for (const dex of [133, 134, 135, 136, 196, 197]) assert.deepEqual(new Set(evolutionFamily(dex).flat().map(member => member.id)), new Set([133, 134, 135, 136, 196, 197]));
  assert.deepEqual(evolutionFamily(132).flat().map(member => member.id), [132]);
  assert.deepEqual(evolutionFamily(358).flat().map(member => member.id), [358]);
  assert.deepEqual(evolutionFamily(183).map(stage => stage.map(member => member.id)), [[298], [183], [184]]);
  assert.deepEqual(evolutionFamily(366).map(stage => stage.map(member => member.id)), [[366], [367, 368]]);
});
test('special Emerald evolution requirements stay separate from modern mechanics', () => {
  assert.match(evolutionFamily(25).flat().find(member => member.id === 26).requirement, /Thunder Stone/);
  assert.match(evolutionFamily(64).flat().find(member => member.id === 65).requirement, /^Trade$/);
  assert.match(evolutionFamily(117).flat().find(member => member.id === 230).requirement, /Trade holding Dragon Scale/);
  const eevee = evolutionFamily(133).flat();
  assert.match(eevee.find(member => member.id === 196).requirement, /Noon–11:59 PM/);
  assert.match(eevee.find(member => member.id === 197).requirement, /Midnight–11:59 AM/);
  assert.match(evolutionFamily(349).flat().find(member => member.id === 350).requirement, /Beauty 170/);
  assert.match(evolutionFamily(290).flat().find(member => member.id === 292).requirement, /Empty party slot/);
  assert.doesNotMatch(evolutionFamily(290).flat().find(member => member.id === 292).requirement, /ball/i);
  for (const edge of overview.evolutions) assert.doesNotMatch(evolutionRequirement(edge), /undefined|unavailable/);
});
test('gender ratios use nominal Gen 3 ratios and handle genderless/single-gender species', () => {
  assert.equal(speciesOverview(1).gender, '87.5% male · 12.5% female');
  assert.equal(speciesOverview(25).gender, '50% male · 50% female');
  assert.equal(speciesOverview(81).gender, 'Genderless');
  assert.equal(speciesOverview(29).gender, 'Female only');
  assert.equal(speciesOverview(32).gender, 'Male only');
  assert.equal(genderSummary(null), 'Gender ratio unavailable');
  assert.equal(speciesOverview(19).abilities.length, 2);
  assert.equal(speciesOverview(1).abilities.length, 1);
});
