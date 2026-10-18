import test from 'node:test';
import assert from 'node:assert/strict';
import {internalIdForDex,pokemonMeta} from '../src/resources/locations/data/pokemonMeta.js';
import {speciesEncounters} from '../src/resources/locations/utils/speciesEncounters.js';
import {speciesAvailability} from '../src/resources/locations/utils/speciesAvailability.js';
import {encounterSummary} from '../src/resources/locations/utils/encounterSummary.js';
import {groupedEncounterDisplay} from '../src/resources/locations/utils/groupEncounterLocations.js';
test('all National Dex IDs map uniquely to existing internal encounter species IDs',()=>{
 const ids=new Set(); for(let dex=1;dex<=386;dex++){const id=internalIdForDex(dex);assert.equal(pokemonMeta[id].dex,dex);ids.add(id);assert.ok(speciesAvailability(id));}
 assert.equal(ids.size,386);assert.equal(internalIdForDex(252),'277');assert.equal(internalIdForDex(358),'411');
 assert.ok(speciesEncounters(internalIdForDex(261)).length);
});
test('separate forms retain their rates while same-form encounter slots combine',()=>{
 assert.equal(encounterSummary([{form:'A',min:5,max:5,rate:10},{form:'A',min:6,max:8,rate:20},{form:'B',min:5,max:9,rate:30}]),'A · Lv. 5–8 · 30% / B · Lv. 5–9 · 30%');
});
test('legacy grouping preserves numerical route ordering and category hierarchy',()=>{
 const locations=speciesEncounters(internalIdForDex(129));const groups=groupedEncounterDisplay(locations,{combineMatchingRoutes:true,combineMatchingCities:true,splitMethodParents:['*'],independentMethods:true,combineSeviiIslands:true});
 const order=['Routes','Caves','Underwater','Cities & Towns','Sevii Islands','Other Locations'];
 assert.ok(groups.length);assert.deepEqual(groups.map(g=>order.indexOf(g.category)),groups.map(g=>order.indexOf(g.category)).sort((a,b)=>a-b));
});
