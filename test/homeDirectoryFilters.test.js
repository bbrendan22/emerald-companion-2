import {test} from 'node:test';
import assert from 'node:assert/strict';
import {homeDirectory} from '../src/resources/homeSearch.js';
import {directoryFilterFields} from '../src/resources/homeDirectoryFilters.js';
import {filterMoves} from '../src/resources/moves/filterMoves.js';
import {battleGroups, utilityGroups, miscGroups, berryGroups} from '../src/resources/items/utils/itemCategories.js';
const entries = (category, filters, query = '') => homeDirectory(category, query, filters).results;
test('Pokédex type includes secondary types and intersects generation and search', () => {
 assert.equal(directoryFilterFields('pokemon')[0].options.length,17);
 assert.ok(entries('pokemon',{type:'poison',generation:'1'},'bulb').some(p=>p.name==='Bulbasaur'));
 assert.deepEqual(entries('pokemon',{type:'poison',generation:'2'},'bulb'),[]);
 for (const [gen,count] of [['1',151],['2',100],['3',135]]) assert.equal(entries('pokemon',{generation:gen}).length,count);
});
test('compact moves reuse established Gen 3 mechanics for every type/category combination', () => {
 for (const type of directoryFilterFields('moves')[0].options.map(o=>o.value)) for (const category of ['Physical','Special','Status']) {
  assert.deepEqual(entries('moves',{type,category}),filterMoves('',type,category));
  assert.deepEqual(entries('moves',{type,category},'thun'),filterMoves('thun',type,category));
 }
});
test('Useful Items exposes only Category and retains complete category lists and ordering', () => {
 const fields=directoryFilterFields('items');
 assert.deepEqual(fields.map(field=>field.key),['category']);
 assert.deepEqual(fields[0].options.map(option=>option.value),['Battle','Utility','TMs/HMs','Misc.']);
 for (const [category,definitions] of Object.entries({Battle:battleGroups,Utility:utilityGroups,'Misc.':miscGroups})) {
  const ids=Object.values(definitions).flat();
  const filtered=entries('items',{category});
  assert.deepEqual(filtered.map(e=>Number(e.id)).sort((a,b)=>a-b),[...ids].sort((a,b)=>a-b));
  assert.deepEqual(filtered,entries('items',{}).filter(e=>ids.includes(Number(e.id))));
  assert.deepEqual(entries('items',{category},'rare'),filtered.filter(e=>e.name.toLowerCase().startsWith('rare')));
 }
 const machines=entries('items',{category:'TMs/HMs'});
 assert.equal(machines.length,58);
 assert.equal(machines.filter(e=>e.code.startsWith('TM')).length,50);
 assert.equal(machines.filter(e=>e.code.startsWith('HM')).length,8);
 assert.deepEqual(entries('items',{}),homeDirectory('items').results);
});
test('Berries retains its groups and Abilities has no filters', () => {
 for (const [group,ids] of Object.entries(berryGroups)) assert.deepEqual(entries('berries',{group}).map(e=>Number(e.id)).sort((a,b)=>a-b),[...ids].sort((a,b)=>a-b));
 assert.deepEqual(directoryFilterFields('abilities'),[]);
});
