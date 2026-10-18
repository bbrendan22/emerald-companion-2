// Verify read-only legacy candidates against a pinned, local pret/pokeemerald export.
// node tools/buildResourcesOverview.mjs /path/to/legacy /path/to/upstream-export
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import reference from '../src/data/reference.json' with {type: 'json'};
const [legacy, upstream] = process.argv.slice(2);
assert(legacy && upstream, 'Supply read-only legacy root and pinned upstream export directory.');
const source = name => fs.readFileSync(path.join(upstream, name.replaceAll('/', '__')), 'utf8');
const normalize = value => value.replace(/\s+/g, ' ').trim();
const ids = Object.fromEntries([...source('include/constants/species.h').matchAll(/#define (SPECIES_\w+)\s+(\d+)/g)].map(m => [m[1], Number(m[2])]));
const abilityIds = Object.fromEntries([...source('include/constants/abilities.h').matchAll(/#define ABILITY_(\w+)\s+(\d+)/g)].map(m => [m[1], Number(m[2])]));
const itemIds = Object.fromEntries(source('include/constants/items.h').match(/enum\s*\{([\s\S]*?)\};/)[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').split(',').map(t => t.trim().match(/^(ITEM_\w+)/)?.[1]).filter(Boolean).map((name, i) => [name, i]));
const load = async name => import(pathToFileURL(path.join(legacy, 'src/data', `${name}.js`)));
const {speciesDetails} = await load('speciesDetails');
const {pokedexEntries} = await load('pokedexEntries');
const {abilityResources} = await load('abilityResources');
const {evolutions} = await load('evolutionResources');
const text = Object.fromEntries([...source('src/data/pokemon/pokedex_text.h').matchAll(/const u8 (\w+)\[\] = _\(([\s\S]*?)\);/g)].map(m => [m[1], normalize([...m[2].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(q => JSON.parse(`"${q[1]}"`)).join(''))]));
const emeraldEntries = {};
for (const m of source('src/data/pokemon/pokedex_entries.h').matchAll(/\[NATIONAL_DEX_(\w+)\]\s*=\s*\{([\s\S]*?)\n\s*\}/g)) {
  const id = ids[`SPECIES_${m[1]}`], species = reference.species[id];
  if (!species) continue;
  const description = text[m[2].match(/\.description\s*=\s*(\w+)/)?.[1]];
  assert(description, `Missing Emerald entry: ${id}`);
  assert.equal(normalize(speciesDetails[id].description), description, `Legacy species text differs: ${id}`);
  assert.equal(normalize(pokedexEntries[id].Emerald), description, `Legacy Emerald label differs: ${id}`);
  emeraldEntries[species.nationalDexId] = description;
}
assert.equal(Object.keys(emeraldEntries).length, 386);
const abilityText = source('src/data/text/abilities.h');
const strings = Object.fromEntries([...abilityText.matchAll(/static const u8 (\w+)\[\] = _\("((?:[^"\\]|\\.)*)"\);/g)].map(m => [m[1], JSON.parse(`"${m[2]}"`)]));
const abilityDescriptions = {};
for (const m of abilityText.matchAll(/\[ABILITY_(\w+)\]\s*=\s*(s\w+Description)/g)) {
  const id = abilityIds[m[1]];
  if (!id) continue;
  assert.equal(abilityResources[id].description, strings[m[2]], `Ability differs: ${id}`);
  abilityDescriptions[id] = strings[m[2]];
}
assert.equal(Object.keys(abilityDescriptions).length, 77);
const extractedEvolutions = {};
for (const block of source('src/data/pokemon/evolution.h').matchAll(/\[(SPECIES_\w+)\]\s*=\s*\{([\s\S]*?)(?=\n\s*\[SPECIES_|\n\};)/g)) {
  const from = ids[block[1]];
  extractedEvolutions[from] = [...block[2].matchAll(/\{(EVO_\w+),\s*(\w+),\s*(SPECIES_\w+)\}/g)].map(m => ({method: m[1].replace('EVO_', ''), param: m[2].startsWith('ITEM_') ? itemIds[m[2]] : Number(m[2]), target: ids[m[3]]}));
}
assert.deepEqual(extractedEvolutions, evolutions, 'Legacy evolution table differs from pinned upstream');
const edges = Object.entries(evolutions).flatMap(([from, values]) => values.map(({target, method, param}) => {
  assert(reference.species[from] && reference.species[target]);
  assert(Number.isInteger(param));
  return {from: reference.species[from].nationalDexId, to: reference.species[target].nationalDexId, method, param};
}));
assert.equal(edges.length, 184);
const legacyHashes = Object.fromEntries(['speciesDetails', 'pokedexEntries', 'abilityResources', 'evolutionResources'].map(name => [name, createHash('sha256').update(fs.readFileSync(path.join(legacy, 'src/data', `${name}.js`))).digest('hex')]));
const revision = fs.readFileSync(path.join(upstream, 'revision.txt'), 'utf8').trim();
assert.match(revision, /^[a-f0-9]{40}$/);
fs.writeFileSync(new URL('../src/resources/data/overview.json', import.meta.url), JSON.stringify({provenance: {source: 'pret/pokeemerald', revision, legacyHashes, normalization: 'Flavor-text whitespace collapsed only; IDs remapped through existing reference.species.'}, emeraldEntries, abilityDescriptions, evolutions: edges}, null, 2) + '\n');
console.log(`Verified and projected 386 Emerald entries, 77 cartridge ability descriptions, ${edges.length} evolution edges at ${revision}.`);
