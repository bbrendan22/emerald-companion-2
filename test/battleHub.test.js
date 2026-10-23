import test from 'node:test';
import assert from 'node:assert/strict';
import {battleReducer,createBattleState} from '../src/battle/battleState.js';
import {availableTowerSets} from '../src/battle/towerSets.js';
import {frontierPokemon} from '../src/battle/data/frontierPokemon.js';
const pool=['a','b','c','d'].map((identity,index)=>({identity,dex:index+1}));
const loaded=()=>({...createBattleState(),team:['a','b','c'],active:'b',teamInitialized:true});
test('player removal is idempotent, keeps order/conditions, and never selects a replacement',()=>{
 const state=loaded(), saved={id:'x',name:'Saved',ids:[...state.team]};
 const next=battleReducer(state,{type:'removePlayer',identity:'b'});
 assert.deepEqual(next.team,['a','c']);assert.equal(next.active,null);assert.equal(next.field,state.field);
 assert.equal(battleReducer(next,{type:'removePlayer',identity:'b'}),next);assert.deepEqual(saved.ids,['a','b','c']);
 const refreshed=battleReducer(next,{type:'collection',records:pool,pool});assert.equal(refreshed.active,null);assert.deepEqual(refreshed.team,['a','c']);
 assert.equal(battleReducer(state,{type:'removePlayer',identity:'a'}).active,'b');
 let empty=next;for(const identity of ['a','c'])empty=battleReducer(empty,{type:'removePlayer',identity});
 assert.deepEqual(battleReducer(empty,{type:'collection',records:pool,pool}).team,[]);
});
test('hub adds specific Frontier individuals up to three without replacing or duplicating',()=>{
 const state={...loaded(),team:['a'],active:null,tab:'Teams'};
 const added=battleReducer(state,{type:'addPlayer',identity:'b',pool});assert.deepEqual(added.team,['a','b']);assert.equal(added.active,'b');assert.equal(added.tab,'Matchup');
 assert.equal(battleReducer(added,{type:'addPlayer',identity:'b',pool}),added);
 assert.equal(battleReducer(added,{type:'addPlayer',identity:'missing',pool}),added);
 const full=battleReducer(added,{type:'addPlayer',identity:'c',pool});assert.deepEqual(full.team,['a','b','c']);assert.equal(battleReducer(full,{type:'addPlayer',identity:'d',pool}),full);
 assert.equal(added.field,state.field);assert.equal(added.rules,state.rules);
});
test('clearing trainer restores all sets without changing player, rules or any conditions',()=>{
 const state={...loaded(),selectedTrainer:'Anabel',selectedBrainSymbol:'Gold',opponents:['Anabel Gold:Raikou','Anabel Gold:Snorlax'],enemy:'Anabel Gold:Raikou',
  setSearch:{query:'Raikou',hiddenIds:['x']},field:{weather:'rain',critical:true,playerScreens:{reflect:true},enemyScreens:{lightScreen:true}},
  hpByPokemon:{'enemy-Anabel Gold:Raikou':10,a:20},conditionsByPokemon:{a:{status:'burn'},'enemy-Anabel Gold:Raikou':{status:'paralysis'}}};
 const next=battleReducer(state,{type:'clearTrainer'});
 assert.equal(next.selectedTrainer,null);assert.equal(next.selectedBrainSymbol,null);assert.deepEqual(next.opponents,[]);assert.equal(next.enemy,null);assert.equal(next.tab,'Sets');assert.deepEqual(next.setSearch,{query:'',hiddenIds:[]});
 for(const key of ['team','active','rules','field','hpByPokemon','conditionsByPokemon'])assert.equal(next[key],state[key]);
 assert.deepEqual(availableTowerSets(next),frontierPokemon);assert.equal(battleReducer(next,{type:'clearTrainer'}),next);
});
