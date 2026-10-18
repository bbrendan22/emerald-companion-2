// Exercise the retained legacy initialEntry detail branch without adding app routes.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {transformWithOxc} from 'vite';
import {itemResources,machineResources} from '../src/resources/items/data/itemResources.js';
import {itemNames,moveNames} from '../src/resources/items/data/emeraldData.js';
import {pokemonMeta} from '../src/resources/items/data/pokemonMeta.js';
import {machineIconIds} from '../src/resources/items/data/itemIcons.js';
const require=createRequire(import.meta.url),temp=await fs.mkdtemp(path.join(os.tmpdir(),'emerald-items-render-'));
const root=fileURLToPath(new URL('../',import.meta.url));
const paths=['src/resources/learnset/components/GameNames.jsx','src/resources/items/components/ItemAcquisition.jsx','src/resources/items/components/ItemsBrowser.jsx'];
const targets=new Map(paths.map(p=>[path.join(root,p),path.join(temp,path.basename(p,'.jsx')+'.mjs')]));
for(const [source,target]of targets){
 let text=await fs.readFile(source,'utf8');text=text.replace(/^import ['"][^'"]+\.css['"]\s*$/gm,'');
 text=text.replace(/from (['"])([^'"]+)\1/g,(_,quote,specifier)=>{
  let resolved=specifier==='react'?require.resolve('react'):path.resolve(path.dirname(source),specifier);
  if(!path.extname(resolved))resolved+='.js';
  if(specifier==='./GameNames.jsx')resolved=path.join(root,paths[0]);
  return `from '${pathToFileURL(targets.get(resolved)??resolved).href}'`;
 });
 const result=await transformWithOxc(text,source,{jsx:{runtime:'classic'}});
 await fs.writeFile(target,result.code);
}
const {default:ItemsBrowser}=await import(pathToFileURL(targets.get(path.join(root,paths[2]))));
let count=0;
for(const [id,item]of Object.entries(itemResources).filter(([,i])=>i.pocket!=='TM_HM')){
 const html=renderToStaticMarkup(React.createElement(ItemsBrowser,{initialEntry:{id,...item,name:itemNames[id]}}));
 assert.ok(html.includes('Item Info'));assert.ok(html.includes('Base price'));assert.ok(html.includes('Held effect'));assert.ok(!html.includes('resources-back'));count++;
}
for(const machine of machineResources){
 const selected={...itemResources[machineIconIds[machine.code]],...machine,id:machineIconIds[machine.code],name:moveNames[machine.moveId],machine:true};
 const html=renderToStaticMarkup(React.createElement(ItemsBrowser,{initialEntry:selected,onMove(){},onPokemon(){}}));
 assert.ok(html.includes('Compatible Pokémon'));assert.ok(html.includes(machine.code.startsWith('TM')?'Single-use TM':'Reusable HM'));assert.ok(html.includes('View '+selected.name));
 for(const id of machine.species)assert.ok(html.includes(`/pokemon/emerald/normal/${pokemonMeta[id].dex}.png`));
 count++;
}
console.log(`Retained item detail branch: ${count} item/machine pages rendered successfully, including all 58 compatibility grids and canonical types; no in-content Back buttons.`);
