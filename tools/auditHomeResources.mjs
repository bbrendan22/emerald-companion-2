// Read-only, offline integrity audit against an explicitly supplied pret/pokeemerald
// source export. Files use path separators replaced with '__'; see docs audit note.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import reference from '../src/data/reference.json' with {type:'json'};
import {moveResources} from '../src/resources/learnset/data/moveResources.js';
import {abilityDescription} from '../src/resources/abilities/abilities.js';
import {homeDirectory,searchHomeResources} from '../src/resources/homeSearch.js';
import {itemAcquisition} from '../src/resources/items/data/itemAcquisition.js';
import {displayItemSources} from '../src/resources/items/utils/displayItemSources.js';
import {getItemEntry} from '../src/resources/items/utils/itemEntries.js';
import {moveCategory} from '../src/resources/moves/filterMoves.js';
const root=process.argv[2];assert.ok(root,'Supply a pinned upstream export directory.');
const read=p=>fs.readFileSync(path.join(root,p.replaceAll('/','__')),'utf8');
const defs=(p,prefix)=>Object.fromEntries([...read(p).matchAll(new RegExp(`#define ${prefix}_(\\w+)\\s+(\\d+)`,'g'))].map(m=>[m[1],Number(m[2])]));
const moveIds=defs('include/constants/moves.h','MOVE'),speciesIds=defs('include/constants/species.h','SPECIES'),abilityIds=defs('include/constants/abilities.h','ABILITY');
const names=(text,prefix)=>Object.fromEntries([...text.matchAll(new RegExp(`\\[${prefix}_(\\w+)\\]\\s*=\\s*_\\("([^"]*)"\\)`,'g'))].map(m=>[m[1],m[2]]));
const speciesNames=names(read('src/data/text/species_names.h'),'SPECIES'),moveNames=names(read('src/data/text/move_names.h'),'MOVE');
const abilityText=read('src/data/text/abilities.h'),abilityNames=names(abilityText,'ABILITY');
const cstrings=text=>Object.fromEntries([...text.matchAll(/(?:static )?const u8 (\w+)\[\] = _\(([\s\S]*?)\);/g)].map(m=>[m[1],[...m[2].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(q=>JSON.parse(`"${q[1]}"`)).join('')]));
const abilityStrings=cstrings(abilityText),itemStrings=cstrings(read('src/data/text/item_descriptions.h'));
const normalized=s=>String(s).normalize('NFKD').replace(/[^a-z0-9♀♂]/gi,'').toLowerCase();
const issues=[],check=(ok,message)=>{if(!ok)issues.push(message);};
const pokedex=read('include/constants/pokedex.h'),start=pokedex.indexOf('NATIONAL_DEX_NONE');
const national=[...pokedex.slice(start,pokedex.indexOf('};',start)).matchAll(/NATIONAL_DEX_(\w+)\s*,/g)].map(m=>m[1]);
for(let dex=1;dex<=386;dex++){
 const symbol=national[dex],entry=reference.species[speciesIds[symbol]];
 check(entry?.nationalDexId===dex,`National/internal species mapping ${dex}/${symbol}`);
 check(normalized(entry?.name)===normalized(speciesNames[symbol]),`Species name ${dex}: ${entry?.name} / ${speciesNames[symbol]}`);
}
let movesChecked=0;
for(const match of read('src/data/battle_moves.h').matchAll(/\[MOVE_(\w+)\]\s*=\s*\{([\s\S]*?)\}/g)){
 const id=moveIds[match[1]];if(!id)continue;
 movesChecked++;
 const actual=moveResources[id],text=match[2];
 check(normalized(reference.moves[id]?.name)===normalized(moveNames[match[1]]),`Move name ${id}`);
 for(const [field,sourceField] of [['power','power'],['accuracy','accuracy'],['pp','pp'],['effectChance','secondaryEffectChance'],['priority','priority']]){
  const expected=Number(text.match(new RegExp(`\\.${sourceField} = (-?\\d+)`))?.[1]);
  check(actual?.[field]===expected,`Move ${id} ${field}: ${actual?.[field]} / ${expected}`);
 }
 const type=text.match(/\.type = TYPE_(\w+)/)?.[1];check(actual?.type===type,`Move ${id} type`);
 check(moveCategory(actual)===(actual.power===0?'Status':['NORMAL','FIGHTING','FLYING','POISON','GROUND','ROCK','BUG','GHOST','STEEL'].includes(type)?'Physical':'Special'),`Move ${id} Gen III category`);
}
check(movesChecked===354,'Upstream audit covered all 354 moves');
let abilitiesChecked=0;
for(const [symbol,id] of Object.entries(abilityIds).filter(([,id])=>id>0&&id<=77)){
 abilitiesChecked++;
 check(normalized(reference.abilityNames[id])===normalized(abilityNames[symbol]),`Ability name ${id}`);
 const pointer=abilityText.match(new RegExp(`\\[ABILITY_${symbol}\\] = (\\w+),`))?.[1];
 check(normalized(abilityDescription(id))===normalized(abilityStrings[pointer]),`Ability description ${id}`);
}
check(abilitiesChecked===77,'Upstream audit covered all 77 abilities');
const itemSource=read('src/data/items.h');
for(const category of ['items','berries'])for(const entry of homeDirectory(category).results){
 const item=getItemEntry(entry.id);
 check(item===getItemEntry(String(entry.id)),`Canonical popup item ${entry.id}`);
 // Match by canonical itemId for machines and normalized name otherwise.
 const candidates=[...itemSource.matchAll(/\[ITEM_(\w+)\]\s*=\s*\{([\s\S]*?)\n    \}/g)];
 const source=candidates.find(m=>normalized(m[2].match(/\.name = _\("([^"]+)"\)/)?.[1])===normalized(item.machine?item.code:item.name));
 check(Boolean(source),`Upstream item name ${item.id}: ${item.name}`);
 if(source&&!item.machine){const pointer=source[2].match(/\.description = (\w+)/)?.[1];check(normalized(item.description)===normalized(itemStrings[pointer]),`Item description ${item.id}`);}
 check(Boolean(itemAcquisition[item.id]?.sources?.length),`Acquisition source citations ${item.id}`);
 const sources=displayItemSources(item.id);check(sources.length>0,`Displayed acquisition ${item.id}`);
 for(const row of sources)check(Boolean(row.game&&row.location&&row.method&&row.availability),`Incomplete acquisition record ${item.id}`);
 if(item.machine){
  check(reference.moves[item.moveId]?.name===item.name,`Machine move name ${item.code}`);
  check(Number(item.id)===(item.code.startsWith('TM')?288:338)+Number(item.code.slice(2)),`Machine item ID ${item.code}`);
  check(searchHomeResources(item.code).some(g=>g.id==='items'&&g.results.some(e=>Number(e.id)===Number(item.id))),`Machine code search ${item.code}`);
 }
}
const tmText=read('include/constants/tms_hms.h');
for(const [prefix,total] of [['TM',50],['HM',8]]){
 const part=tmText.split(`#define FOREACH_${prefix}(F)`)[1]?.split('\n\n')[0];
 const symbols=[...part.matchAll(/F\((\w+)\)/g)].map(m=>m[1]);check(symbols.length===total,`${prefix} definition count`);
 symbols.forEach((symbol,i)=>{const code=prefix+String(i+1).padStart(2,'0');const item=homeDirectory('items').results.find(item=>item.code===code);check(item?.moveId===moveIds[symbol],`${code} move mapping`);});
}
console.log(JSON.stringify({commit:fs.readFileSync(path.join(root,'commit.txt'),'utf8').trim(),counts:Object.fromEntries(['pokemon','moves','abilities','items','berries'].map(id=>[id,homeDirectory(id).results.length])),issues},null,2));
if(issues.length)process.exitCode=1;
