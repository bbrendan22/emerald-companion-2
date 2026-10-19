import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {itemResources,machineResources} from '../src/resources/items/data/itemResources.js';
import {pokemonMeta} from '../src/resources/items/data/pokemonMeta.js';
import types from '../src/data/pokemonTypes.json' with {type:'json'};
import {itemNames,moveNames} from '../src/resources/items/data/emeraldData.js';
import {itemCategories,itemCategory,battleGroups,utilityGroups,berryGroups,miscGroups} from '../src/resources/items/utils/itemCategories.js';
import {itemAcquisition,itemAcquisitionEntries} from '../src/resources/items/data/itemAcquisition.js';
import {machineIconIds} from '../src/resources/items/data/itemIcons.js';
import provenance from '../src/resources/items/provenance.json' with {type:'json'};
import {machineResources as canonicalMachines} from '../src/resources/learnset/data/itemResources.js';

const entries=[...Object.entries(itemResources).map(([id,item])=>({id,...item,name:itemNames[id]??item.name})).filter(item=>item.pocket!=='TM_HM'),...machineResources.map(m=>({...m,id:machineIconIds[m.code],name:moveNames[m.moveId],machine:true}))];
test('four item categories and standalone Berries retain source coverage without silent omissions',()=>{
 assert.deepEqual(itemCategories,['Battle','Utility','TMs/HMs','Misc.']);
 assert.deepEqual([...itemCategories,'Berries'].map(c=>entries.filter(i=>itemCategory(i)===c).length),[29,16,58,12,23]);
 for(const [category,groups]of Object.entries({Battle:battleGroups,Utility:utilityGroups,Berries:berryGroups,'Misc.':miscGroups})){
  assert.deepEqual(entries.filter(i=>itemCategory(i)===category).map(i=>Number(i.id)).sort((a,b)=>a-b),Object.values(groups).flat().sort((a,b)=>a-b));
 }
 assert.equal(entries.filter(i=>i.pocket==='BERRIES'&&!itemCategory(i)).length,20);
 for(const item of entries.filter(i=>itemCategory(i))){assert.ok(itemAcquisition[item.id]);assert.ok(existsSync(new URL(`../public/items/${item.id}.png`,import.meta.url)));}
});
test('machine IDs, names and compatibility reuse verified canonical Emerald data',()=>{
 assert.deepEqual(machineResources,canonicalMachines);
 assert.deepEqual(machineResources.map(m=>machineIconIds[m.code]),Array.from({length:58},(_,i)=>289+i));
 for(const machine of machineResources)for(const id of machine.species){assert.ok(pokemonMeta[id]);assert.deepEqual(pokemonMeta[id].types,types[pokemonMeta[id].dex].map(t=>t.toUpperCase()));}
 assert.equal(itemNames[200],'Leftovers'); assert.equal(moveNames[machineResources.find(m=>m.code==='TM26').moveId],'Earthquake');
});
test('source module and icon hashes remain identical to the read-only legacy checkpoint',()=>{
 const hash=b=>createHash('sha256').update(b).digest('hex');
 for(const [p,expected]of Object.entries(provenance.portHashes))assert.equal(hash(readFileSync(new URL('../src/resources/items/'+p,import.meta.url))),provenance.presentationHashes?.[p]??expected,p);
 for(const [id,expected]of Object.entries(provenance.iconHashes))assert.equal(hash(readFileSync(new URL(`../public/items/${id}.png`,import.meta.url))),expected,id);
 assert.equal(Object.keys(itemResources).length,251);assert.equal(Object.keys(itemAcquisition).length,190);
 assert.equal(Object.values(itemAcquisition).reduce((sum,d)=>sum+d.entries.length,0),1273);
 assert.equal(Object.keys(itemAcquisition).reduce((sum,id)=>sum+itemAcquisitionEntries(id).length,0),493);
});

test('presentation cleanup preserves canonical removed items and prices',()=>{
 assert.deepEqual(Object.keys(battleGroups),['Battle Items','Type Boosters']);
 assert.deepEqual(Object.keys(utilityGroups),['Training','Valuables','Vitamins']);
 assert.ok(utilityGroups.Valuables.includes(68));assert.ok(!utilityGroups.Training.includes(68));
 assert.equal(Object.values(utilityGroups).flat().filter(id=>id===68).length,1);
 for(const id of [103,104,85,86,83,84,39,40,41,42,43,190,194,80,81,46,47,193,192,202,222,223,191,225,224,71]){assert.equal(itemCategory({id,...itemResources[id]}),null);assert.ok(itemResources[id]);assert.ok(itemResources[id].price>0);}
});

test('final Useful Items collection preserves every approved entry exactly once',()=>{
 const visible=entries.filter(item=>itemCategories.includes(itemCategory(item)));
 assert.equal(visible.length,115);
 assert.equal(new Set(visible.map(item=>Number(item.id))).size,115);
 const balls=entries.filter(item=>item.pocket==='POKE_BALLS');
 assert.equal(balls.length,12);
 for(const item of balls){assert.equal(itemCategory(item),null);assert.ok(itemAcquisition[item.id]);}
 assert.deepEqual(battleGroups['Battle Items'],[179,186,196,187,221,200,185,183,198,219,180]);
 assert.deepEqual(battleGroups['Type Boosters'],[207,206,215,216,204,208,199,205,209,212,211,210,217,188,203,213,214,220]);
 assert.equal(battleGroups['Pokémon-Specific Items'],undefined);
 for(const id of [193,192,202,222,223,191,225,224]){assert.equal(itemCategory({id,...itemResources[id]}),null);assert.ok(itemResources[id]);}
 assert.deepEqual(utilityGroups,{Training:[189,195,182,197,181,184],Valuables:[110,111,69,68],Vitamins:[63,64,65,67,70,66]});
 assert.deepEqual(miscGroups,{'Evolution Stones':[93,94,95,96,97,98],'Evolution Items':[201,218],'Shards':[48,49,50,51]});
});

// Item dialogs resolve the same canonical references without a mounted browser.
import {getItemEntry} from '../src/resources/items/utils/itemEntries.js';
import {machineItemPrices} from '../src/resources/items/data/itemShopData.js';
test('item dialog identifiers reuse canonical item and machine descriptions',()=>{
 for(const entry of entries){
  const actual=getItemEntry(entry.id);
  assert.equal(actual.name,entry.name);
  assert.equal(Number(actual.id),Number(entry.id));
  assert.equal(getItemEntry(String(entry.id)),actual);
  if(entry.machine){assert.equal(actual.code,entry.code);assert.equal(actual.moveId,entry.moveId);assert.equal(actual.price,machineItemPrices[entry.id]);}
  else assert.equal(actual.description,itemResources[entry.id].description);
 }
 for(const id of [null,undefined,'',0,-1,99999,'invalid',1.5])assert.equal(getItemEntry(id),undefined);
});

import {matchesItemSearch} from '../src/resources/items/utils/itemSearch.js';
test('Useful Items search matches word starts and machine codes, never word interiors',()=>{
 const leftovers=getItemEntry(200),rareCandy=getItemEntry(68),earthquake=getItemEntry(314);
 for(const query of ['left','  LEFT  ','Leftovers',''])assert.equal(matchesItemSearch(leftovers,query),true);
 for(const query of ['over','overs','eft','held'])assert.equal(matchesItemSearch(leftovers,query),false);
 for(const query of ['rare','candy','can','  RARE   CAN  '])assert.equal(matchesItemSearch(rareCandy,query),true);
 for(const query of ['are','andy'])assert.equal(matchesItemSearch(rareCandy,query),false);
 for(const query of ['tm','TM26','earth','earthquake'])assert.equal(matchesItemSearch(earthquake,query),true);
 for(const query of ['26','quake'])assert.equal(matchesItemSearch(earthquake,query),false);
});

test('Berries retain exactly Stat Boost, Recovery and EV with 23 approved entries',()=>{
 assert.deepEqual(berryGroups,{
  'Stat Boost':[168,169,170,171,172,173,174],
  Recovery:[133,134,135,136,137,138,139,140,141,142],
  EV:[153,154,155,156,157,158],
 });
 const ids=Object.values(berryGroups).flat();assert.equal(ids.length,23);assert.equal(new Set(ids).size,23);
 for(const id of [143,144,145,146,147,148,149,150,151,152,159,160,161,162,163,164,165,166,167,175]){assert.ok(itemResources[id]);assert.ok(!ids.includes(id));assert.equal(itemCategory({id,...itemResources[id]}),null);}
});
test('excluded Nature Berry acquisition records remain unchanged',()=>{
 for(const [offset,flavor]of ['spicy','dry','sweet','bitter','sour'].entries()){
  const id=143+offset,data=itemAcquisition[id],rows=itemAcquisitionEntries(id);
  assert.match(data.note,/half HP or less.*1\/8/);assert.ok(data.note.includes(flavor));
  assert.equal(rows.length,[143,147].includes(id)?5:4);assert.ok(rows.every(row=>row.game==='Emerald'));
  assert.ok(rows.some(row=>row.location==='Route 120 · south'&&row.requirement===`Trainer ID must end in ${offset} or ${offset+5}.`));
  assert.ok(rows.some(row=>row.method.includes('Pokémon Jump')));
  assert.equal(rows.some(row=>row.method.includes('Kiri')),[143,147].includes(id));
 }
});

import {displayItemSources} from '../src/resources/items/utils/displayItemSources.js';
test('EV Berry popups omit only Game Corner sources while canonical sources remain',()=>{
 for(const id of Object.keys(itemAcquisition)){
  const canonical=itemAcquisitionEntries(id);
  if(Number(id)>=153&&Number(id)<=158){
   assert.equal(canonical.filter(e=>/game\s*corner/i.test(e.location)).length,1);
   assert.deepEqual(displayItemSources(id),canonical.filter(e=>!/game\s*corner/i.test(e.location)));
   assert.equal(displayItemSources(id).length,Number(id)===158?2:3);
  }else assert.deepEqual(displayItemSources(id),canonical);
 }
});

test('Berry search matches word beginnings and rejects mid-word matches',()=>{
 const berry=getItemEntry(142);
 for(const query of ['sit','  SIT  ','Sitrus Berry','ber','berry',''])assert.equal(matchesItemSearch(berry,query),true);
 for(const query of ['itrus','trus','erry'])assert.equal(matchesItemSearch(berry,query),false);
});
