import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattleState,battleReducer} from '../src/battle/battleState.js';
import {conditionKey,conditionedBattlePokemon} from '../src/battle/conditionState.js';
import {freshBattleConditions,createTowerRules} from '../src/battle/towerRules.js';
import {toTowerOpponent} from '../src/battle/frontierAdapter.js';
import {frontierPokemon} from '../src/battle/data/frontierPokemon.js';
import {battleMove} from '../src/battle/reference.js';
import {calculateBasicDamage} from '../src/battle/basicDamage.js';
import {battleSpeed,stageStat} from '../src/battle/battleConditions.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';
import {readPokemon} from '../src/save/readPokemon.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {makePokemon} from './fixtures/synthetic.js';
const base=()=>({...createBattleState(),team:['a','b'],active:'a',opponents:['Sunkern 1','Azurill 1'],enemy:'Sunkern 1',teamInitialized:true});
const act=(state,type,patch={})=>battleReducer(state,{type,...patch});
function edited() {
 let s=base();for(const [type,patch] of [['conditionsOpen',{open:true}],['conditionField',{key:'weather',value:'rain'}],['conditionField',{key:'critical',value:true}],['conditionHp',{key:'my-a',value:12,max:100}],['conditionStatus',{key:'my-a',value:'burn'}],['conditionStage',{side:'player',stat:'attack',value:6}],['conditionStage',{side:'enemy',stat:'speed',value:-6}],['conditionScreen',{side:'player',screen:'reflect',value:true}],['conditionScreen',{side:'enemy',screen:'lightScreen',value:true}]])s=act(s,type,patch);
 return s;
}
test('conditions validate HP/status/weather/stages/screens, including all stage endpoints',()=>{
 let s=edited();assert.equal(s.field.weather,'rain');assert.equal(s.field.critical,true);assert.equal(s.conditionsExpanded,true);
 assert.equal(act(s,'conditionHp',{key:'my-a',value:-2,max:100}).hpByPokemon['my-a'],0);
 assert.equal(act(s,'conditionHp',{key:'my-a',value:1000,max:100}).hpByPokemon['my-a'],100);
 assert.equal(act(s,'conditionHp',{key:'my-a',value:12.9,max:100}).hpByPokemon['my-a'],12);
 for(let value=-6;value<=6;value++)assert.equal(act(s,'conditionStage',{side:'player',stat:'speed',value}).field.playerStages.speed,value);
 for(const [type,patch] of [['conditionStage',{side:'player',stat:'speed',value:7}],['conditionStage',{side:'bad',stat:'speed',value:0}],['conditionStatus',{key:'my-a',value:'bad'}],['conditionField',{key:'weather',value:'snow'}],['conditionHp',{key:'my-a',value:NaN,max:100}]])assert.equal(act(s,type,patch),s);
});
test('every selection/navigation/team/rules action preserves conditions and expansion',()=>{
 const s=edited();
 const actions=[['activePlayer',{identity:'b'}],['activeOpponent',{setId:'Azurill 1'}],['tab',{tab:'Rules'}],['trainer',{key:'Anabel Gold'}],['removePlayer',{identity:'a'}],['removeOpponent',{setId:'Sunkern 1'}],['addPlayer',{identity:'c',pool:[{identity:'c'}]}],['addOpponent',{setId:'Caterpie 1'}],['loadTeam',{team:{name:'Saved',ids:['a','b','c']},records:['a','b','c'].map(identity=>({identity}))}],['rules',{patch:{levelMode:'open',openLevel:73}}],['collection',{records:[{identity:'a'},{identity:'b'}],pool:[]}]];
 for(const [type,patch] of actions){const next=act(s,type,patch);for(const key of ['hpByPokemon','conditionsByPokemon','field','conditionsExpanded'])assert.equal(next[key],s[key],`${type}: ${key}`);}
});
test('HP/status follow identities; stages/screens stay on the battle side; projection never mutates Pokémon',()=>{
 const s=edited(),mon={identity:'a',stats:{hp:100,speed:80},initialCurrentHp:70,ability:'None'},before=structuredClone(mon);
 const own=conditionedBattlePokemon(mon,'player',s);assert.equal(own.currentHp,12);assert.equal(own.status,'burn');assert.equal(own.stages.attack,6);assert.equal(own.screens.reflect,true);assert.equal(own.weather,'rain');assert.equal(own.critical,true);
 const other=conditionedBattlePokemon({...mon,identity:'b'},'player',s);assert.equal(other.currentHp,70);assert.equal(other.status,'none');assert.equal(other.stages.attack,6);assert.equal(other.screens.reflect,true);assert.deepEqual(mon,before);
 assert.equal(conditionKey(mon,'player'),'my-a');assert.equal(conditionedBattlePokemon({...mon,stats:{hp:5}},'player',s).currentHp,5);assert.equal(s.hpByPokemon['my-a'],12);
});
test('Reset alone clears all conditions and keeps teams/trainer/active/rules/open state',()=>{
 const s={...edited(),selectedTrainer:'Anabel',selectedBrainSymbol:'Gold'};const reset=act(s,'resetConditions');
 for(const [key,value] of Object.entries(freshBattleConditions()))assert.deepEqual(reset[key],value);
 for(const key of ['team','opponents','active','enemy','selectedTrainer','selectedBrainSymbol','rules','conditionsExpanded'])assert.equal(reset[key],s[key]);
});
test('party HP initializes from the recorded save; PC/opponent HP initializes full without modifying imported data',()=>{
 const parsed=readPokemon(makePokemon({party:true}));parsed.source={kind:'party',slot:0};const record=identifyPokemon([parsed])[0],before=structuredClone(record),mon=toBattlePokemon(record);
 assert.equal(conditionedBattlePokemon(mon,'player',createBattleState()).currentHp,12);assert.equal(mon.currentHp,31);assert.deepEqual(record,before);
 const opponent=toTowerOpponent(frontierPokemon[0]);assert.equal(conditionedBattlePokemon(opponent,'enemy',createBattleState()).currentHp,opponent.stats.hp);
});
test('conditioned Pokémon feed the active damage calculator and shared Speed helpers',()=>{
 const attacker=toTowerOpponent(frontierPokemon.find(s=>s.species==='Machamp')),defender=toTowerOpponent(frontierPokemon.find(s=>s.species==='Snorlax'));
 const s=createBattleState();s.field.playerStages.attack=2;s.field.enemyScreens.reflect=true;s.field.weather='rain';s.field.critical=true;
 const a=conditionedBattlePokemon({...attacker,identity:'a'},'player',s),d=conditionedBattlePokemon(defender,'enemy',s);
 const conditions={weather:a.weather,critical:a.critical,attacker:{stages:a.stages,status:a.status,currentHp:a.currentHp},defender:{stages:d.stages,status:d.status,currentHp:d.currentHp,screens:d.screens}};
 const result=calculateBasicDamage(battleMove('Tackle'),a,d,conditions);assert.ok(result);assert.ok(result.min>calculateBasicDamage(battleMove('Tackle'),a,d,{...conditions,critical:false}).max);
 const baseline=calculateBasicDamage(battleMove('Tackle'),attacker,defender);assert.ok(result.min>baseline.max);
 const speedMon={...a,stages:{speed:2},status:'paralysis',ability:'None',item:'None'};assert.equal(battleSpeed(speedMon),Math.floor(stageStat(a.stats.speed,2)/4));
 assert.equal(d.screens.reflect,true);assert.equal(a.weather,'rain');assert.equal(s.field.playerStages.attack,2);
 const high=toTowerOpponent(frontierPokemon[0],createTowerRules({levelMode:'open',openLevel:100}));assert.ok(high.stats.hp>toTowerOpponent(frontierPokemon[0]).stats.hp);
});
