// Offline, read-only parity audit against original 1.0 modules.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pokemonMeta,internalIdForDex} from '../src/resources/locations/data/pokemonMeta.js';
import provenance from '../src/resources/locations/provenance.json' with {type:'json'};
const legacy=process.argv[2]; assert(legacy,'Supply read-only legacy root');
const loadOld=path=>import(pathToFileURL(`${legacy}/src/${path}.js`));
const loadNew=path=>import(new URL(`../src/resources/locations/${path}.js`,import.meta.url));
for(const [path,hash] of Object.entries(provenance.hashes))assert.equal(createHash('sha256').update(fs.readFileSync(`${legacy}/src/${path}`)).digest('hex'),hash,path);
const modules=['speciesAvailability','speciesEncounters','rubySapphireAvailability','fireRedLeafGreenAvailability','orreAvailability','acquisitionRoutes','evolutions','groupEncounterLocations','encounterSummary'];
const old={}, fresh={}; for(const name of modules){old[name]=await loadOld(`utils/${name}`);fresh[name]=await loadNew(`utils/${name}`);}
const options={combineMatchingRoutes:true,combineMatchingCities:true,splitMethodParents:['*'],independentMethods:true,combineSeviiIslands:true};
for(let dex=1;dex<=386;dex++){
 const id=internalIdForDex(dex); assert.equal(pokemonMeta[id].dex,dex);
 for(const name of ['speciesAvailability','speciesEncounters'])assert.deepEqual(fresh[name][name](id),old[name][name](id),`${dex} ${name}`);
 assert.deepEqual(fresh.evolutions.evolutionFamily(id),old.evolutions.evolutionFamily(id));
 assert.deepEqual(fresh.evolutions.previousEvolutions(id),old.evolutions.previousEvolutions(id));
 const available=fresh.speciesAvailability.speciesAvailability(id);
 assert.deepEqual(fresh.acquisitionRoutes.acquisitionRoutes(available.relatives,available.imports,id),old.acquisitionRoutes.acquisitionRoutes(available.relatives,available.imports,id));
 for(const game of ['Emerald','Ruby','Sapphire','FireRed','LeafGreen','Colosseum','XD']){
  const name=['Ruby','Sapphire'].includes(game)?'rubySapphireAvailability':['FireRed','LeafGreen'].includes(game)?'fireRedLeafGreenAvailability':'orreAvailability';
  const a=game==='Emerald'?{locations:fresh.speciesEncounters.speciesEncounters(id)}:fresh[name][name](id,game);
  const b=game==='Emerald'?{locations:old.speciesEncounters.speciesEncounters(id)}:old[name][name](id,game);
  assert.deepEqual(a,b,`${dex} ${game}`);
  assert.deepEqual(fresh.groupEncounterLocations.groupedEncounterDisplay(a.locations,options),old.groupEncounterLocations.groupedEncounterDisplay(b.locations,options));
 }
}
console.log('Parity passed for all 386 species × seven games: availability, encounter slots, special routes, evolution order, immediate predecessors, grouping, plus unchanged legacy source hashes.');
// Compare the complete display logic too, compiling JSX in memory only.
const {transformWithOxc}=await import('vite');
const React=(await import('react')).default;
const {renderToStaticMarkup}=await import('react-dom/server');
const compiled=new Map();
async function jsxModule(file){
 if(compiled.has(file))return compiled.get(file);
 let source=fs.readFileSync(file,'utf8');
 if(!source.includes("import React"))source=`import React from 'react';\n${source}`;
 for(const match of [...source.matchAll(/from ['"]([^'"]+)['"]/g)]){
  const target=match[1]; let url;
  if(target==='react')url=import.meta.resolve('react');
  else {let resolved=new URL(target,pathToFileURL(file));if(!resolved.pathname.endsWith('.js')&&!resolved.pathname.endsWith('.json')&&!resolved.pathname.endsWith('.jsx'))resolved=new URL(resolved.href+'.jsx');url=resolved.pathname.endsWith('.jsx')?await jsxModule(resolved.pathname):resolved.href;}
  source=source.replace(match[0],`from '${url}'`);
 }
 const result=await transformWithOxc(source,file,{jsx:{runtime:'classic'}});
 const url=`data:text/javascript;base64,${Buffer.from(result.code).toString('base64')}`;compiled.set(file,url);return url;
}
const LegacyComponent=(await import(await jsxModule(`${legacy}/src/components/SpeciesEncounters.jsx`))).default;
const PortComponent=(await import(await jsxModule(new URL('../src/resources/locations/components/SpeciesEncounters.jsx',import.meta.url).pathname))).default;
const normalize=html=>html.replace(/ open=""/g,'').replace(/<span(?: [^>]*)?>|<\/span>/g,'').replace('class="resource-species-embedded"','class="species-locations"');
for(let dex=1;dex<=386;dex++){
 const props={id:internalIdForDex(dex),embedded:true,onPokemon:()=>{}};
 const markup=renderToStaticMarkup(React.createElement(PortComponent,props));assert.doesNotMatch(markup,/ open=""/);
 assert.equal(normalize(markup),normalize(renderToStaticMarkup(React.createElement(LegacyComponent,props))),`${dex}: rendered Locations parity`);
}
console.log('Rendered parity passed for all 386 species, including game ordering, note suppression, requirements, form/rate text and acquisition links. Only wrapper/game-name theme markup and intentionally changed default-open attributes normalized; all ported games start closed.');
