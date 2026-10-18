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
test('all six categories retain source coverage and grouped records without silent omissions',()=>{
 assert.deepEqual(itemCategories,['Battle','Utility','Berries','Poké Balls','TMs/HMs','Misc.']);
 assert.deepEqual(itemCategories.map(c=>entries.filter(i=>itemCategory(i)===c).length),[37,32,23,12,58,14]);
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
 for(const [p,expected]of Object.entries(provenance.portHashes))assert.equal(hash(readFileSync(new URL('../src/resources/items/'+p,import.meta.url))),expected,p);
 for(const [id,expected]of Object.entries(provenance.iconHashes))assert.equal(hash(readFileSync(new URL(`../public/items/${id}.png`,import.meta.url))),expected,id);
 assert.equal(Object.keys(itemResources).length,251);assert.equal(Object.keys(itemAcquisition).length,185);
 assert.equal(Object.values(itemAcquisition).reduce((sum,d)=>sum+d.entries.length,0),1251);
 assert.equal(Object.keys(itemAcquisition).reduce((sum,id)=>sum+itemAcquisitionEntries(id).length,0),471);
});
