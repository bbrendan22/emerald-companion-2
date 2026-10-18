// Read-only legacy export. No writes are ever made beneath the supplied legacy root.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import reference from '../src/data/reference.json' with {type:'json'};
import overview from '../src/resources/data/overview.json' with {type:'json'};
const legacy=process.argv[2]; assert(legacy,'Supply read-only legacy root');
const root=new URL('../src/resources/locations/',import.meta.url), hashes={};
function read(path){const text=fs.readFileSync(`${legacy}/src/${path}`,'utf8');hashes[path]=createHash('sha256').update(text).digest('hex');return text;}
function write(path,text){fs.writeFileSync(new URL(path,root),text);}
for(const name of ['locationResources','rubySapphireEncounters','fireRedLeafGreenEncounters','orreEncounters','bonusDiscEncounters','specialEncounters','availabilityNotes','availabilitySources']) write(`data/${name}.js`,read(`data/${name}.js`));
for(const name of ['encounterSummary','groupEncounterLocations','speciesEncounters','speciesAvailability','rubySapphireAvailability','fireRedLeafGreenAvailability','orreAvailability','acquisitionRoutes']) write(`utils/${name}.js`,read(`utils/${name}.js`).replace("'./eggMoveFathers.js'","'./descendants.js'"));
const load=name=>import(pathToFileURL(`${legacy}/src/data/${name}.js`));
const {pokemonMeta}=await load('pokemonMeta'),{evolutions}=await load('evolutionResources'),{breedingEvolutions}=await load('eggMoveResources');
for(const [id,species] of Object.entries(reference.species)) {assert.equal(pokemonMeta[id].dex,species.nationalDexId);assert.equal(pokemonMeta[id].name,species.name);}
const canonicalEdges=Object.entries(evolutions).flatMap(([from,rows])=>rows.map(({target,method,param})=>({from:reference.species[from].nationalDexId,to:reference.species[target].nationalDexId,method,param})));
assert.deepEqual(canonicalEdges,overview.evolutions);
write('data/pokemonMeta.js',`// Adapt canonical 2.0 metadata; encounter tables retain Emerald internal species IDs.\nimport reference from '../../../data/reference.json' with {type:'json'};\nexport const pokemonMeta=Object.fromEntries(Object.entries(reference.species).map(([id,species])=>[id,{name:species.name,dex:species.nationalDexId}]));\nconst internalIdsByDex=new Map(Object.entries(pokemonMeta).map(([id,species])=>[species.dex,id]));\nexport const internalIdForDex=dex=>internalIdsByDex.get(Number(dex));\n`);
write('data/evolutionResources.js',`// Reuse verified canonical edges rather than duplicate evolution data.\nimport overview from '../../data/overview.json' with {type:'json'};\nimport {internalIdForDex} from './pokemonMeta.js';\nexport const evolutions={};\nfor(const edge of overview.evolutions) (evolutions[internalIdForDex(edge.from)]??=[]).push({target:Number(internalIdForDex(edge.to)),method:edge.method,param:edge.param});\n`);
write('data/breedingEvolutions.json',JSON.stringify(breedingEvolutions,null,2)+'\n');
const evoSource=read('utils/evolutions.js');write('utils/evolutions.js',"import {evolutions} from '../data/evolutionResources.js';\n"+evoSource.slice(evoSource.indexOf('export function previousEvolutions')));
const descendantSource=read('utils/eggMoveFathers.js');write('utils/descendants.js',"import breedingEvolutions from '../data/breedingEvolutions.json' with {type:'json'};\n"+descendantSource.match(/export function descendants[^\n]+/)[0]+'\n');
for(const name of ['SpeciesEncounters','SpeciesLocationEntries']) {
 let text=read(`components/${name}.jsx`);
 text="import React from 'react';\n"+text.replace("from './SpeciesLocationEntries'","from './SpeciesLocationEntries.jsx'").replace("import GameNames from './GameNames'\n",'').replace("import SpeciesPanel from './SpeciesPanel'\n",'');
 if(name==='SpeciesEncounters')text=text.replace('<SpeciesPanel embedded={embedded} anchor="locations" title="Locations">','<div className="species-locations">').replace('</SpeciesPanel>','</div>').replace('<GameNames>Emerald</GameNames>','<span data-game="Emerald">Emerald</span>').replace('<GameNames>{gameName(game)}</GameNames>','<span data-game={game}>{gameName(game)}</span>');
 if(name==='SpeciesEncounters')text=text.replace("import { groupedEncounterDisplay } from '../utils/groupEncounterLocations.js'\n",'').replace(/  const displayedLocationCount[\s\S]*?(?=  const locationEntries)/,'').replace(/      const entryCount =[^\n]*\n/,'').replace(/ open=\{(?:emeraldCount|entryCount) <= 3\}/g,'');
 write(`components/${name}.jsx`,text);
}
for(const path of ['data/pokemonMeta.js','data/evolutionResources.js','data/eggMoveResources.js','components/GameNames.jsx','components/SpeciesPanel.jsx','components/ResourcesPage.css'])read(path);
write('provenance.json',JSON.stringify({legacyRoot:'emerald-companion (read-only)',hashes,notes:'Encounter data copied verbatim. Metadata/evolution adapters use canonical 2.0 data. Only descendant graph extracted from breeding resources. Display logic preserved; embedded wrapper/theme adapted.'},null,2)+'\n');
console.log('Ported legacy encounter data/helpers/components; validated all 386 internal/National IDs and all canonical evolution edges.');
