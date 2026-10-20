import {test} from 'node:test';
import assert from 'node:assert/strict';
import {searchHomeResources} from '../src/resources/homeSearch.js';
for (const [category, query, name] of [['pokemon','bUlBa','Bulbasaur'],['moves','thunderb','Thunderbolt'],['abilities','overg','Overgrow'],['items','rare c','Rare Candy'],['berries','oran','Oran Berry']]) {
 test(`Home prefix search finds ${category}`,()=>{
  const group=searchHomeResources(query).find(group=>group.id===category);
  assert.ok(group?.results.some(entry=>entry.name===name));
  for(const group of searchHomeResources(query))for(const entry of group.results)assert.ok(entry.name.toLowerCase().startsWith(query.toLowerCase()));
 });
}
test('blank, no matches, and cross-category grouping',()=>{
 assert.deepEqual(searchHomeResources('  '),[]);assert.deepEqual(searchHomeResources('zzzzzz'),[]);
 assert.ok(searchHomeResources('a').length>=3);
 assert.equal(searchHomeResources('bulba').find(g=>g.id==='pokemon').results[0].id,1);
});

// These are the same curated groups rendered by Useful Items and Berries.
test('Home item results contain exactly the curated databases', async()=>{
 const {battleGroups,utilityGroups,miscGroups,berryGroups}=await import('../src/resources/items/utils/itemCategories.js');
 const {machines,items}=await import('../src/resources/items/utils/itemEntries.js');
 const expectedItems=[...Object.values(battleGroups).flat(),...Object.values(utilityGroups).flat(),...Object.values(miscGroups).flat(),...machines.map(m=>Number(m.id))];
 const expectedBerries=Object.values(berryGroups).flat();
 const found={items:new Set(),berries:new Set()};
 for(const prefix of new Set([...items,...machines].map(item=>item.name[0]))) {
  for(const group of searchHomeResources(prefix))if(found[group.id])for(const entry of group.results)found[group.id].add(Number(entry.id));
 }
 assert.deepEqual([...found.items].sort((a,b)=>a-b),[...new Set(expectedItems)].sort((a,b)=>a-b));
 assert.deepEqual([...found.berries].sort((a,b)=>a-b),expectedBerries.sort((a,b)=>a-b));
 for(const query of ['Potion','Master Ball','Razz Berry']) {
  assert.equal(searchHomeResources(query).some(group=>['items','berries'].includes(group.id)),false,`${query} is outside curated lists`);
 }
});

test('five directories share Master Search data, expose complete catalogs, and exclude Frontier',async()=>{
 const {homeDirectory}=await import('../src/resources/homeSearch.js');
 const {resourceIndex}=await import('../src/resources/search.js');
 for(const category of ['pokemon','moves','abilities','items','berries']){
  const full=homeDirectory(category);assert.ok(full.results.length>0);
  const prefix=full.results[0].name.slice(0,2);
  assert.deepEqual(homeDirectory(category,prefix).results,searchHomeResources(prefix).find(g=>g.id===category).results);
  assert.deepEqual(homeDirectory(category,'zzzzzz').results,[]);
 }
 for(const group of resourceIndex)assert.deepEqual(homeDirectory(group.id).results,group.entries);
 assert.equal(homeDirectory('pokemon').results.length,386);
 assert.equal(homeDirectory('frontier'),null);assert.equal(homeDirectory('trainers'),null);
});

test('TM/HM codes resolve the same canonical item in Master Search and directories',async()=>{
 const {homeDirectory}=await import('../src/resources/homeSearch.js');
 for(const [code,name,id] of [['TM26','Earthquake',314],['HM03','Surf',341]]){
  const master=searchHomeResources(` ${code.toLowerCase()} `).find(group=>group.id==='items').results;
  assert.equal(master.length,1);assert.equal(Number(master[0].id),id);assert.equal(master[0].name,name);
  assert.deepEqual(homeDirectory('items',code).results,master);
  assert.ok(searchHomeResources(name).some(group=>group.id==='moves'&&group.results.some(entry=>entry.name===name)));
 }
});
