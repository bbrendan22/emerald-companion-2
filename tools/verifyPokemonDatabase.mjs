// Read-only comprehensive species integrity audit, supplementing Locations/Learnset parity.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import reference from '../src/data/reference.json' with {type:'json'};
import types from '../src/data/pokemonTypes.json' with {type:'json'};
import more from '../src/resources/data/more.json' with {type:'json'};
import {speciesOverview} from '../src/resources/speciesOverview.js';
import {baseStatRows,defensiveMatchupGroups} from '../src/resources/speciesStats.js';
import {speciesBarPercents} from '../src/pokemon/statBars.js';
import {GEN3_TYPE_DISPLAY_ORDER} from '../src/pokemon/typeDisplayOrder.js';
const legacy=process.argv[2];assert(legacy,'Supply read-only legacy root');
const load=path=>import(pathToFileURL(`${legacy}/src/${path}.js`));
const {speciesInfo}=await load('data/emeraldData'),{pokemonMeta}=await load('data/pokemonMeta'),{speciesDetails}=await load('data/speciesDetails'),{abilityResources}=await load('data/abilityResources'),{eggCycles}=await load('data/hatchingResources'),{eggGroups}=await load('data/breedingResources'),{evYields}=await load('data/evResources'),{typeMultiplier}=await load('utils/typeMatchups');
for(const [id,record] of Object.entries(reference.species)){
 const dex=record.nationalDexId,old=speciesInfo[id],detail=speciesOverview(dex);
 for(const key of ['genderRatio','abilities','growthRate'])assert.deepEqual(record[key],old[key],`${dex} ${key}`);
 // 1.0's raw table stores Normal Forme; 2.0 intentionally uses Emerald Speed Forme.
 assert.deepEqual(record.baseStats,dex===386?{hp:50,attack:95,defense:90,speed:180,spAttack:95,spDefense:90}:old.baseStats,`${dex} baseStats`);
 assert.equal(record.name,pokemonMeta[id].name);assert.equal(detail.generation,pokemonMeta[id].generation);assert.deepEqual(types[dex],pokemonMeta[id].types.map(t=>t.toLowerCase()));
 assert.equal(detail.entry,speciesDetails[id].description.replace(/\s+/g,' ').trim());for(const ability of detail.abilities)assert.equal(ability.description,abilityResources[ability.id].description);
 const percentages=speciesBarPercents(id);for(const row of baseStatRows(detail.baseStats))assert.equal(row.percent,percentages[row.key]);
 const groups=defensiveMatchupGroups(types[dex]);for(const type of GEN3_TYPE_DISPLAY_ORDER)assert.equal(groups.find(g=>g.types.includes(type))?.multiplier??1,typeMultiplier(type.toUpperCase(),pokemonMeta[id].types),`${dex} ${type}`);
 for(const key of ['height','weight','catchRate','expYield','friendship','commonItem','rareItem'])assert.equal(more.species[dex][key],speciesDetails[id][key]);
 assert.equal(more.species[dex].eggCycles,eggCycles[id]);assert.deepEqual(more.species[dex].eggGroups,eggGroups[id]);assert.deepEqual(more.species[dex].evYield,evYields[id]);
}
console.log('All 386 species: IDs/names/generations/types/genders/abilities/Emerald entries/More attributes verified against legacy; stat percentages match My Pokémon; all 6,562 Gen 3 matchups agree. Known intentional Deoxys Speed Forme stat exception preserved.');
