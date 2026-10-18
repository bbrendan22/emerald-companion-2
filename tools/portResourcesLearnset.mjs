// Read-only source export; outputs are confined to 2.0 Learnset.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import reference from '../src/data/reference.json' with {type:'json'};
import {moveResources as canonicalMoves} from '../src/battle/data/moveResources.js';
import {pokemonMeta} from '../src/resources/locations/data/pokemonMeta.js';
const legacy=process.argv[2];assert(legacy,'Supply read-only legacy root');
const root=new URL('../src/resources/learnset/',import.meta.url),hashes={};
const read=path=>{const text=fs.readFileSync(`${legacy}/src/${path}`,'utf8');hashes[path]=createHash('sha256').update(text).digest('hex');return text;};
const write=(path,text)=>fs.writeFileSync(new URL(path,root),text);
const load=name=>import(pathToFileURL(`${legacy}/src/data/${name}.js`));
const {moveResources}=await load('moveResources'),{moveNames}=await load('emeraldData'),{pokemonMeta:oldMeta}=await load('pokemonMeta');
assert.deepEqual(moveResources,canonicalMoves,'Canonical move table differs from legacy');
for(const [id,move] of Object.entries(reference.moves)){if(+id===0)continue;assert.equal(move.name,moveNames[id]);assert.equal(move.pp,moveResources[id].pp);}
for(const [id,mon] of Object.entries(pokemonMeta)){assert.equal(mon.dex,oldMeta[id].dex);assert.equal(mon.name,oldMeta[id].name);}
for(const name of ['crossGameMoves','tutorResources'])write(`data/${name}.js`,read(`data/${name}.js`));
const {eggMoves,levelMoves}=await load('eggMoveResources'),{machineResources}=await load('itemResources');
write('data/eggMoveResources.js',`// Legacy egg and level exports only; no breeding tools imported.\nexport const eggMoves=${JSON.stringify(eggMoves)};\nexport const levelMoves=${JSON.stringify(levelMoves)};\n`);
write('data/itemResources.js',`// Legacy machine compatibility export only.\nexport const machineResources=${JSON.stringify(machineResources,null,2)};\n`);
write('data/emeraldData.js',`import reference from '../../../data/reference.json' with {type:'json'};\nexport const moveNames=Object.fromEntries(Object.entries(reference.moves).map(([id,move])=>[id,move.name]));\n`);
write('data/moveResources.js',`// Existing static canonical move data only; no Battle state or calculation code.\nexport {moveResources} from '../../../battle/data/moveResources.js';\n`);
write('data/pokemonMeta.js',`export {pokemonMeta,internalIdForDex} from '../../locations/data/pokemonMeta.js';\n`);
write('utils/evolutions.js',`export {previousEvolutions} from '../../locations/utils/evolutions.js';\n`);
write('utils/eggMoveFathers.js',`export {descendants} from '../../locations/utils/descendants.js';\n`);
for(const name of ['gameLearnsets','crossGameLearnset'])write(`utils/${name}.js`,read(`utils/${name}.js`));
write('components/GameNames.jsx',"import React from 'react';\n"+read('components/GameNames.jsx'));
let component=read('components/LearnsetSection.jsx');
component="import React from 'react';\n"+component.replace("from './GameNames'","from './GameNames.jsx'").replace("import SpeciesPanel from './SpeciesPanel'\n",'').replace('<SpeciesPanel embedded={embedded} anchor="moves" title="Learnset">','<div className="species-learnset">').replace('</SpeciesPanel>','</div>').replace('`${import.meta.env.BASE_URL}type-icons/${data.type.toLowerCase()}.png`','`/types/icons/${data.type.toLowerCase()}.png`');
write('components/LearnsetSection.jsx',component);
for(const path of ['data/eggMoveResources.js','data/itemResources.js','data/moveResources.js','data/emeraldData.js','data/pokemonMeta.js','components/SpeciesPanel.jsx','components/ResourcesPage.css','utils/evolutions.js','utils/eggMoveFathers.js'])read(path);
write('provenance.json',JSON.stringify({hashes,notes:'Read-only legacy port. Canonical 2.0 move table, names, PP, species IDs/names verified identical. Original helpers/JSX retained with import/wrapper/icon-path adaptations only. No runtime legacy dependencies.'},null,2)+'\n');
console.log('Learnset exported; canonical static move table, move names/PP and all species IDs/names match legacy exactly.');
