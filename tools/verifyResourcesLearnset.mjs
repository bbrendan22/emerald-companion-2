// Read-only all-species Learnset parity, including original rendered JSX.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {pokemonMeta,internalIdForDex} from '../src/resources/learnset/data/pokemonMeta.js';
import provenance from '../src/resources/learnset/provenance.json' with {type:'json'};
import PokemonName from '../src/ui/components/PokemonName.js';
const legacy=process.argv[2];assert(legacy,'Supply read-only legacy root');
const old=path=>import(pathToFileURL(`${legacy}/src/${path}.js`));
const fresh=path=>import(new URL(`../src/resources/learnset/${path}.js`,import.meta.url));
for(const [file,hash] of Object.entries(provenance.hashes))assert.equal(createHash('sha256').update(fs.readFileSync(`${legacy}/src/${file}`)).digest('hex'),hash,file);
for(const [file,exports] of Object.entries({crossGameMoves:['crossGameMoves'],eggMoveResources:['eggMoves','levelMoves'],itemResources:['machineResources'],tutorResources:['tutorResources'],moveResources:['moveResources']})){
 const a=await old(`data/${file}`),b=await fresh(`data/${file}`);for(const key of exports)assert.deepEqual(b[key],a[key],key);
}
const oldGame=await old('utils/gameLearnsets'),newGame=await fresh('utils/gameLearnsets'),oldCross=await old('utils/crossGameLearnset'),newCross=await fresh('utils/crossGameLearnset');
for(let dex=1;dex<=386;dex++){
 const id=internalIdForDex(dex);assert.equal(pokemonMeta[id].dex,dex);
 for(const key of ['gameLevelLearnsets','gameTutorSources','mergedLevelLearnset'])assert.deepEqual(newGame[key](id),oldGame[key](id),`${dex} ${key}`);
 for(const key of ['inheritedLevelMoves','crossGameLearnset'])assert.deepEqual(newCross[key](id),oldCross[key](id),`${dex} ${key}`);
}
console.log('Learnset data/helper parity: all 386 species, supported games, moves, levels, inheritance, machines, eggs, tutors and special sources match legacy exactly; source hashes unchanged.');
const {transformWithOxc}=await import('vite'),React=(await import('react')).default,{renderToStaticMarkup}=await import('react-dom/server');
const compiled=new Map();
async function jsx(file){
 if(compiled.has(file))return compiled.get(file);
 let source=fs.readFileSync(file,'utf8');if(!source.includes('import React'))source="import React from 'react';\n"+source;
 // Normalize only the legacy image-asset root to the existing 2.0 local icons.
 source=source.replace('`${import.meta.env.BASE_URL}type-icons/${data.type.toLowerCase()}.png`','`/types/icons/${data.type.toLowerCase()}.png`');
 for(const match of [...source.matchAll(/from ['"]([^'"]+)['"]/g)]){
  let url;if(match[1]==='react')url=import.meta.resolve('react');else{let path=new URL(match[1],pathToFileURL(file));if(!/\.(js|jsx|json)$/.test(path.pathname))path=new URL(path.href+'.jsx');url=path.pathname.endsWith('.jsx')?await jsx(path.pathname):path.href;}
  source=source.replace(match[0],`from '${url}'`);
 }
 const result=await transformWithOxc(source,file,{jsx:{runtime:'classic'}}),url=`data:text/javascript;base64,${Buffer.from(result.code).toString('base64')}`;compiled.set(file,url);return url;
}
const A=(await import(await jsx(`${legacy}/src/components/LearnsetSection.jsx`))).default;
const B=(await import(await jsx(new URL('../src/resources/learnset/components/LearnsetSection.jsx',import.meta.url).pathname))).default;
const presentationSpecies=[];
for(let dex=1;dex<=386;dex++){
 const props={id:internalIdForDex(dex),embedded:true};
 const original=renderToStaticMarkup(React.createElement(A,props)).replace('class="resource-species-embedded"','class="species-learnset"');
 // Adapt only exact Nidoran species tokens in text nodes to the approved shared
 // presentation. Keep every surrounding element, attribute and content strict.
 const expected=original.replace(/>([^<]*)</g,(node,text)=>`>${text.replace(/\bNidoran[♀♂][\uFE0E\uFE0F]?/gi,name=>renderToStaticMarkup(React.createElement(PokemonName,null,name)))}<`);
 if(expected!==original)presentationSpecies.push(dex);
 assert.equal(renderToStaticMarkup(React.createElement(B,props)),expected,`${dex} full Learnset markup`);
}
console.log(`Rendered parity: all 386 species match original rows, descriptions, counts, labels, ordering, game-name colors, empty messages and default-closed groups. Only outer wrapper, local icon paths and shared Nidoran text presentation adapted (Dex: ${presentationSpecies.join(', ')}).`);
