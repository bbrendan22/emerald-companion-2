import test from 'node:test';
import assert from 'node:assert/strict';
import {resourceIndex, searchResources} from '../src/resources/search.js';

test('indexes every canonical reference name without empty sentinels', () => {
  assert.deepEqual(resourceIndex.map(group => group.entries.length), [386, 354, 77]);
  for (const group of resourceIndex) for (const entry of group.entries) {
    const result = searchResources(entry.name).find(result => result.id === group.id);
    assert.ok(result.results.some(match => match.id === entry.id), `${group.id}: ${entry.name}`);
  }
});
test('matches trimmed case-insensitive partial names across categories', () => {
  const groups = searchResources('  OVER  ');
  assert.ok(groups[1].results.some(entry => entry.name === 'Overheat'));
  assert.ok(groups[2].results.some(entry => entry.name === 'Overgrow'));
  assert.ok(searchResources('PIKA')[0].results.some(entry => entry.name === 'Pikachu'));
});
test('uses National numbers, including padded and hash-prefixed numbers', () => {
  for (const query of ['25', '025', '#025', '  #025  ']) assert.equal(searchResources(query)[0].results[0].name, 'Pikachu');
  assert.equal(searchResources('#358')[0].results[0].name, 'Chimecho');
  assert.equal(searchResources('#386')[0].results[0].name, 'Deoxys');
  for (const query of ['#0', '#387', '#025x']) assert.equal(searchResources(query)[0].total, 0);
});
test('bounds broad results while preserving counts and deterministic order', () => {
  const groups = searchResources('a');
  assert.ok(groups[0].total > 5);
  assert.ok(groups.every(group => group.results.length <= 5));
  assert.deepEqual(searchResources('a'), groups);
});
test('empty, whitespace, missing and long queries', () => {
  assert.deepEqual(searchResources(''), []);
  assert.deepEqual(searchResources('   '), []);
  for (const query of ['no-such-name', 'x'.repeat(10000)]) assert.ok(searchResources(query).every(group => group.total === 0));
});

test('catalogs browse complete canonical lists and filter without quick-search caps', async () => {
  const {catalogEntries} = await import('../src/resources/search.js');
  assert.deepEqual(['pokemon', 'moves', 'abilities'].map(id => catalogEntries(id).length), [386, 354, 77]);
  assert.equal(catalogEntries('pokemon', '#358')[0].name, 'Chimecho');
  assert.ok(catalogEntries('moves', '  THUNDER  ').every(entry => entry.name.toLowerCase().includes('thunder')));
  assert.equal(catalogEntries('abilities', 'overgrow')[0].name, 'Overgrow');
  assert.ok(catalogEntries('pokemon', 'a').length > 5);
  assert.deepEqual(catalogEntries('unknown'), []);
});
