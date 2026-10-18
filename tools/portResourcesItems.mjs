// Read legacy sources; write only the isolated 2.0 Useful Items port.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import profile from '../src/data/profileReference.json' with {type:'json'};
import reference from '../src/data/reference.json' with {type:'json'};
import {machineResources as canonicalMachines} from '../src/resources/learnset/data/itemResources.js';
const legacy=process.argv[2]; assert(legacy,'Supply read-only legacy root');
const destination=new URL('../src/resources/items/',import.meta.url);
const read=p=>fs.readFileSync(path.join(legacy,p),'utf8');
const write=(p,text)=>fs.writeFileSync(new URL(p,destination),text);
const load=p=>import(pathToFileURL(path.join(legacy,p)));
const {itemResources,machineResources}=await load('src/data/itemResources.js');
const {itemNames,moveNames}=await load('src/data/emeraldData.js');
for(const id of Object.keys(itemResources))assert.equal(profile.itemNames[id],itemNames[id],`Item name ${id}`);
for(const m of machineResources)assert.equal(reference.moves[m.moveId].name,moveNames[m.moveId]);
assert.deepEqual(canonicalMachines,machineResources);
const data=['itemAcquisition','battleItemAcquisition','utilityItemAcquisition','berryItemAcquisition','miscItemAcquisition','machineItemAcquisition','pokeBallAcquisition','battleItemWildSources','utilityItemWildSources','utilityItemMapSources','berryItemWildSources','berryItemMapSources','berryTrainerSources','miscItemMapSources','miscItemWildSources','machineMapSources','pokeBallMapSources','pickupResources','wildItemAcquisition','pokeBallCatchRates','itemShopData','itemIcons'];
for(const name of data)write(`data/${name}.js`,read(`src/data/${name}.js`));
write('data/itemResources.js',read('src/data/itemResources.js').split('\nexport const machineResources')[0]+"\nexport {machineResources} from '../../learnset/data/itemResources.js';\n");
write('data/emeraldData.js',"import reference from '../../../data/reference.json' with {type:'json'};\nimport profile from '../../../data/profileReference.json' with {type:'json'};\nexport const itemNames=profile.itemNames;\nexport const moveNames=Object.fromEntries(Object.entries(reference.moves).map(([id,move])=>[id,move.name]));\n");
write('data/moveResources.js',"export {moveResources} from '../../learnset/data/moveResources.js';\n");
write('data/pokemonMeta.js',"import {pokemonMeta as species} from '../../learnset/data/pokemonMeta.js';\nimport types from '../../../data/pokemonTypes.json' with {type:'json'};\nexport const pokemonMeta=Object.fromEntries(Object.entries(species).map(([id,meta])=>[id,{...meta,types:types[meta.dex].map(type=>type.toUpperCase())}]));\n");
write('utils/itemCategories.js',read('src/utils/itemCategories.js'));
write('components/GameNames.jsx',"export {default} from '../../learnset/components/GameNames.jsx';\n");
write('components/ItemAcquisition.jsx',"import React from 'react';\n"+read('src/components/ItemAcquisition.jsx').replace("from './GameNames'","from './GameNames.jsx'"));
let component=read('src/components/ItemsBrowser.jsx')
 .replace("import ResourceHeading from './ResourceHeading'\n",'')
 .replace("import { useState } from 'react'","import React, { useState } from 'react'\nimport '../items.css'")
 .replace(/from '(\.\.?\/[^']+)'/g,(_,p)=>`from '${p.endsWith('ItemAcquisition')?p+'.jsx':p+'.js'}'`)
 .replace('onLocationBack, onBack, ', '')
 .replace("className={`resources-page resource-items-scroll-page${selected ? ' resource-items-detail-scroll-page' : ''}`}", 'className="resource-items-page"')
 .replace(' {selected&&<button className="resources-back" onClick={onLocationBack??(()=>setSelected(null))}>← Back</button>}\n','')
 .replace('<div className="resource-list-heading"><button className="resources-back" onClick={onBack}>← Back</button><ResourceHeading>Items</ResourceHeading><span>{matches.length} entries</span></div>','<div className="resource-list-heading"><h1>Items</h1></div>')
 .replace('<div className="resource-database-controls resource-abilities-controls"><label className="resources-search"><input aria-label="Search items" type="search" placeholder="Search" value={search} onChange={e=>setSearch(e.target.value)}/></label></div>', '<div className="resources-search"><label className="resources-search-label" htmlFor="resources-items-query">Search items</label><div className="resources-search-field"><input id="resources-items-query" type="search" placeholder="Search" value={search} onChange={e=>setSearch(e.target.value)} autoComplete="off" spellCheck="false" /></div></div>')
 .replace('>{category}</button>',">{category==='TMs/HMs'?<>TMs/<wbr/>HMs</>:category}</button>")
 .replaceAll('${import.meta.env.BASE_URL}sprites/emerald/', '/pokemon/emerald/normal/')
 .replaceAll('${import.meta.env.BASE_URL}items/', '/items/');
write('components/ItemsBrowser.jsx',component);
let tests=read('tests/itemAcquisition.test.js').replaceAll('../src/data/','../src/resources/items/data/');
fs.writeFileSync(new URL('../test/itemsLegacy-acquisition.test.js',import.meta.url),'// Original legacy tests; import paths adapted only.\n'+tests);
const inventory={hashes:{}};
const sourcePaths=[...data.map(name=>`src/data/${name}.js`),...['itemResources','emeraldData','moveResources','pokemonMeta'].map(name=>`src/data/${name}.js`),'src/utils/itemCategories.js',...['ItemsBrowser','ItemAcquisition','GameNames','ResourceHeading','ResourcesPage'].map(name=>`src/components/${name}.jsx`),'src/components/ResourcesPage.css','src/resourcesNeon.css','tests/itemAcquisition.test.js',...['buildItemIcons.py','buildItemResources.mjs','buildItemShopData.py','buildLocationItems.mjs','generate-battle-item-wild-sources.py','generate-berry-trainer-sources.py'].map(name=>`tools/${name}`)];
for(const p of sourcePaths)inventory.hashes[p]=createHash('sha256').update(read(p)).digest('hex');
const hash=content=>createHash('sha256').update(content).digest('hex');
const portHashes={};for(const name of data)portHashes[`data/${name}.js`]=hash(fs.readFileSync(new URL(`data/${name}.js`,destination)));
portHashes['utils/itemCategories.js']=hash(read('src/utils/itemCategories.js'));
const {machineIconIds}=await load('src/data/itemIcons.js');
const iconHashes={};for(const id of new Set([...Object.keys(itemResources),...Object.values(machineIconIds).map(String)])){
 const bytes=fs.readFileSync(path.join(legacy,`public/items/${id}.png`));
 assert.deepEqual(bytes,fs.readFileSync(new URL(`../public/items/${id}.png`,import.meta.url)),`Icon ${id}`);
 iconHashes[id]=hash(bytes);
}
write('provenance.json',JSON.stringify({source:'Read-only Emerald Companion 1.0 Useful Items',legacyHashes:inventory.hashes,portHashes,iconHashes,notes:'Data/helpers preserved verbatim except canonical name/move/species/machine adapters. Native 2.0 header/search and normal document layout replace legacy Back/scroll controls. External location-entry detail branch retained; no integration with protected pages.'},null,2)+'\n');
console.log(`Ported ${data.length} unchanged data modules, item definitions, category helpers and original acquisition tests. Verified ${Object.keys(iconHashes).length} identical existing icons and all 58 canonical machine lists.`);
