import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import provenance from '../src/resources/items/provenance.json' with {type:'json'};
import {itemResources,machineResources} from '../src/resources/items/data/itemResources.js';
import {itemNames,moveNames} from '../src/resources/items/data/emeraldData.js';
import {itemAcquisition,itemAcquisitionEntries} from '../src/resources/items/data/itemAcquisition.js';
import {itemCategories,itemCategory} from '../src/resources/items/utils/itemCategories.js';
import {pokemonMeta} from '../src/resources/items/data/pokemonMeta.js';
import {moveResources} from '../src/resources/items/data/moveResources.js';
import {machineIconIds} from '../src/resources/items/data/itemIcons.js';
const legacy=process.argv[2];assert(legacy,'Supply read-only legacy root');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const [relative,expected] of Object.entries(provenance.legacyHashes))assert.equal(hash(fs.readFileSync(path.join(legacy,relative))),expected,`Legacy source changed: ${relative}`);
for(const [relative,expected] of Object.entries(provenance.portHashes)){
 assert.equal(hash(fs.readFileSync(new URL('../src/resources/items/'+relative,import.meta.url))),provenance.presentationHashes?.[relative]??expected,`Port changed: ${relative}`);
 const original='src/'+relative;
 assert.equal(hash(fs.readFileSync(path.join(legacy,original))),expected,`Port differs from legacy: ${relative}`);
}
const load=relative=>import(pathToFileURL(path.join(legacy,'src',relative+'.js')));
const legacyItems=await load('data/itemResources');const names=await load('data/emeraldData');const acquisition=await load('data/itemAcquisition');const categories=await load('utils/itemCategories');
assert.deepEqual(itemResources,legacyItems.itemResources);assert.deepEqual(machineResources,legacyItems.machineResources);assert.deepEqual(Object.fromEntries(Object.entries(itemAcquisition).filter(([id])=>Number(id)<143||Number(id)>147)),acquisition.itemAcquisition);
assert.deepEqual(Object.keys(itemAcquisition).filter(id=>Number(id)>=143&&Number(id)<=147),['143','144','145','146','147']);
for(const id of Object.keys(itemResources))assert.equal(itemNames[id],names.itemNames[id]);
for(const [id,expected]of Object.entries(provenance.iconHashes)){
 assert.equal(hash(fs.readFileSync(path.join(legacy,`public/items/${id}.png`))),expected);
 assert.equal(hash(fs.readFileSync(new URL(`../public/items/${id}.png`,import.meta.url))),expected);
}
for(const id of Object.keys(acquisition.itemAcquisition))assert.deepEqual(itemAcquisitionEntries(id),acquisition.itemAcquisitionEntries(id),`Curated source rows ${id}`);
assert.equal(fs.readFileSync(new URL('../src/resources/learnset/components/GameNames.jsx',import.meta.url),'utf8'),"import React from 'react';\n"+fs.readFileSync(path.join(legacy,'src/components/GameNames.jsx'),'utf8'));
function project(data,names,moveNames){return [...Object.entries(data.itemResources).map(([id,item])=>({id,...item,name:names[id]??item.name})).sort((a,b)=>a.name.localeCompare(b.name)).filter(i=>i.pocket!=='TM_HM'),...data.machineResources.map(m=>({...data.itemResources[machineIconIds[m.code]],...m,id:machineIconIds[m.code],name:moveNames[m.moveId],machine:true}))]}
const entries=project({itemResources,machineResources},itemNames,moveNames),original=project(legacyItems,names.itemNames,names.moveNames);
const legacyMeta=await load('data/pokemonMeta'); const legacyMoves=await load('data/moveResources');
for(const [id,meta]of Object.entries(legacyMeta.pokemonMeta))for(const key of ['dex','name','types'])assert.deepEqual(pokemonMeta[id][key],meta[key],`Species mapping ${id}/${key}`);
assert.deepEqual(moveResources,legacyMoves.moveResources);
const counts={};for(const category of [...itemCategories,'Berries']){const current=entries.filter(i=>itemCategory(i)===category),expected=original.filter(i=>categories.itemCategory(i)===category && ![103,104,85,86,83,84,39,40,41,42,43,190,194,80,81,46,47,193,192,202,222,223,191,225,224,71].includes(Number(i.id)));assert.deepEqual(current,expected);counts[category]=current.length;
 for(const query of ['', '  TM  ','berry','ball','no-such-name'])assert.deepEqual(current.filter(i=>`${i.name} ${i.code??''}`.toLowerCase().includes(query.trim().toLowerCase())),expected.filter(i=>`${i.name} ${i.code??''}`.toLowerCase().includes(query.trim().toLowerCase())));
}
console.log(JSON.stringify({status:'PASS',legacyFilesUnchanged:Object.keys(provenance.legacyHashes).length,unchangedPortModules:Object.keys(provenance.portHashes).length,itemDefinitions:Object.keys(itemResources).length,identicalIcons:Object.keys(provenance.iconHashes).length,categories:counts,machines:machineResources.length,acquisitionInventories:Object.keys(itemAcquisition).length,rawSources:Object.values(itemAcquisition).reduce((s,d)=>s+d.entries.length,0),curatedSources:Object.keys(itemAcquisition).reduce((s,id)=>s+itemAcquisitionEntries(id).length,0),gameColors:'Exact existing GameNames implementation'},null,2));
