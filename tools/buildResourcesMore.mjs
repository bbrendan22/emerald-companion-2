// Verify read-only 1.0 candidates against the same pinned Emerald export as Overview.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import reference from '../src/data/reference.json' with {type:'json'};
const [legacy, upstream] = process.argv.slice(2);
assert(legacy && upstream, 'Supply legacy root and pinned upstream export directory');
const read = name => fs.readFileSync(`${upstream}/${name.replaceAll('/', '__')}`, 'utf8');
const revision = read('revision.txt').trim();
assert.equal(revision, '731ad5bfd6e6f265508d0efcca0ba42f9dcf5881');
const ids = Object.fromEntries([...read('include/constants/species.h').matchAll(/#define (SPECIES_\w+)\s+(\d+)/g)].map(m => [m[1], +m[2]]));
const itemIds = Object.fromEntries(read('include/constants/items.h').match(/enum\s*\{([\s\S]*?)\};/)[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').split(',').map(t => t.trim().match(/^(ITEM_\w+)/)?.[1]).filter(Boolean).map((name,i) => [name,i]));
const load = name => import(pathToFileURL(`${legacy}/src/data/${name}.js`));
const {speciesDetails} = await load('speciesDetails'), {eggCycles} = await load('hatchingResources'), {eggGroups} = await load('breedingResources'), {evYields} = await load('evResources');
const info = read('src/data/pokemon/species_info.h'), dexText = read('src/data/pokemon/pokedex_entries.h');
const entries = Object.fromEntries([...dexText.matchAll(/\[NATIONAL_DEX_(\w+)\]\s*=\s*\{([\s\S]*?)\n\s*\}/g)].map(m => [ids[`SPECIES_${m[1]}`], m[2]]));
const species = {};
for (const m of info.matchAll(/\[(SPECIES_\w+)\]\s*=\s*\{\n([\s\S]*?)\n\s*\}/g)) {
 const id = ids[m[1]], canonical = reference.species[id]; if (!canonical) continue;
 const field = key => {const value = m[2].match(new RegExp(`\\.${key}\\s*=\\s*([\\w]+)`))?.[1]; assert(value, `${id}: ${key}`); return value;};
 const number = key => +field(key);
 const height = +entries[id].match(/\.height\s*=\s*(\d+)/)[1] / 10;
 const weight = +entries[id].match(/\.weight\s*=\s*(\d+)/)[1] / 10;
 const groups = [...m[2].match(/\.eggGroups\s*=\s*\{([^}]+)/)[1].matchAll(/EGG_GROUP_(\w+)/g)].map(x => x[1]);
 const ev = Object.fromEntries(Object.entries({hp:'HP',attack:'Attack',defense:'Defense',speed:'Speed',spAttack:'SpAttack',spDefense:'SpDefense'}).map(([key,suffix]) => [key,number(`evYield_${suffix}`)]));
 const row = {height,weight,catchRate:number('catchRate'),expYield:number('expYield'),friendship:field('friendship') === 'STANDARD_FRIENDSHIP' ? 70 : number('friendship'),commonItem:itemIds[field('itemCommon')],rareItem:itemIds[field('itemRare')],eggCycles:number('eggCycles'),eggGroups:[...new Set(groups)],evYield:ev};
 for (const key of ['height','weight','catchRate','expYield','friendship','commonItem','rareItem']) assert.equal(row[key],speciesDetails[id][key],`${id}: ${key}`);
 assert.equal(row.eggCycles,eggCycles[id]); assert.deepEqual(row.eggGroups,eggGroups[id]); assert.deepEqual(ev,evYields[id]); assert.equal(field('growthRate'),canonical.growthRate);
 species[canonical.nationalDexId] = row;
}
assert.equal(Object.keys(species).length,386);
const hash = value => createHash('sha256').update(value).digest('hex');
fs.writeFileSync(new URL('../src/resources/data/more.json',import.meta.url),JSON.stringify({provenance:{source:'pret/pokeemerald',revision,speciesInfoSha256:hash(info),pokedexEntriesSha256:hash(dexText),hatchSteps:'eggCycles × 256 (1.0 approximate convention; not an exact hatch timer)'},species},null,2)+'\n');
console.log('Verified all 386 More records against pinned Emerald source and read-only legacy candidates.');
