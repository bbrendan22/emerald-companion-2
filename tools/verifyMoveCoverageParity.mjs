// Read-only legacy parity for data/chart and species without approved guaranteed abilities.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {coveragePokemon,coverageRoster,groupMoveCoverage} from '../src/resources/coverage/moveCoverage.js';
import {guaranteedCoverageAbility} from '../src/resources/coverage/defensiveAbilities.js';
import {GEN3_TYPE_DISPLAY_ORDER} from '../src/pokemon/typeDisplayOrder.js';
import {emeraldTypeChart} from '../src/battle/reference.js';
const legacyRoot=resolve(process.argv[2] || '../emerald-companion');
const legacy=await import(pathToFileURL(resolve(legacyRoot,'src/utils/moveCoverage.js')));
const {emeraldTypeChart:oldChart}=await import(pathToFileURL(resolve(legacyRoot,'src/data/typeChart.js')));
const types=GEN3_TYPE_DISPLAY_ORDER.map(t=>t.toUpperCase());
assert.deepEqual(coveragePokemon,legacy.coveragePokemon);
for(const a of types)for(const d of types)assert.equal(emeraldTypeChart[a]?.[d]??1,oldChart[a]?.[d]??1,`${a}/${d}`);
const selections=[[],...types.map(t=>[t]),types,['NORMAL','NORMAL'],['MYSTERY'],['NORMAL','MYSTERY']];
for(let a=0;a<types.length;a++)for(let b=a+1;b<types.length;b++)selections.push([types[a],types[b]]);
for(let a=0;a<types.length;a++)for(let b=a+1;b<types.length;b++)for(let c=b+1;c<types.length;c++)selections.push([types[a],types[b],types[c]]);
let seed=20261018;
for(let n=0;n<128;n++) {seed=(Math.imul(seed,1664525)+1013904223)>>>0;selections.push(types.filter((_,i)=>seed & (1<<i)));}
for(const mode of ['all','fully','frontier','unknown']) {
 assert.deepEqual(coverageRoster(mode),legacy.coverageRoster(mode));
 const unaffected=groups=>new Map([...groups].map(([multiplier,pokemon])=>[multiplier,pokemon.filter(p=>!guaranteedCoverageAbility(p))]));
 for(const selected of selections)assert.deepEqual(unaffected(groupMoveCoverage(selected,mode)),unaffected(legacy.groupMoveCoverage(selected,mode)),`${mode}: ${selected}`);
}
console.log(`Parity passed: 386 complete species records; rosters 386/214/376; 289 type matchups; ${selections.length} selections × 4 modes = ${selections.length*4} ordered group comparisons for the 363 species without approved guaranteed abilities. The 23 guaranteed holders are covered by focused unit tests.`);
