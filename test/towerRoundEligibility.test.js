import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattleState,battleReducer} from '../src/battle/battleState.js';
import {createTowerRules} from '../src/battle/towerRules.js';
import {towerRoundTrainerIds,towerRoundSetIds} from '../src/battle/towerRoundEligibility.js';
import {towerTrainerEntries,searchTowerTrainers} from '../src/battle/towerTrainers.js';
import {towerTrainerIds} from '../src/battle/towerTrainerIds.js';
import {availableTowerSets,possibleMatchupSets} from '../src/battle/towerSets.js';
import {availableOpponentSpecies} from '../src/battle/opponentSpecies.js';
import {frontierTrainers} from '../src/battle/data/frontierTrainers.js';
import {frontierPokemon} from '../src/battle/data/frontierPokemon.js';
import {speciesByName} from '../src/battle/reference.js';
const stateFor = round => ({...createBattleState(),round});
const ranges=[[0,119],[80,139],[100,159],[120,179],[140,199],[160,219],[180,239],[200,299]];
const rounds=['1','2','3','4','5','6','7','8+'];
const sequence=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);

test('explicit canonical mapping covers 300 distinct trainers, including same-name identities',()=>{
  assert.equal(Object.keys(towerTrainerIds).length,300);
  assert.deepEqual(Object.values(towerTrainerIds).sort((a,b)=>a-b),sequence(0,299));
  assert.equal(towerTrainerIds['Lady:GILLIAN'],16);
  assert.equal(towerTrainerIds['Cooltrainer (F):GILLIAN'],227);
});
for (const format of ['Singles','Doubles']) for (const [index,round] of rounds.entries()) test(`Tower ${format} round ${round}: ordinary and seventh-battle union in both level modes`,()=>{
  const expected=sequence(...ranges[index]);
  assert.deepEqual([...towerRoundTrainerIds(round)],expected);
  for (const levelMode of ['50','open']) {
    const state={...stateFor(round),rules:createTowerRules({format,levelMode})};
    const results=searchTowerTrainers('',{state,format});
    const found=results.filter(t=>!t.symbol);
    assert.deepEqual(results.map(t=>t.name),results.map(t=>t.name).sort((a,b)=>a.localeCompare(b)));
    if (format==='Doubles') assert.ok(results.every(t=>!t.symbol));
    assert.deepEqual(found.map(t=>towerTrainerIds[t.key]).sort((a,b)=>a-b),expected);
    const expectedSets=new Set(frontierTrainers.filter(t=>expected.includes(towerTrainerIds[`${t.trainerClass}:${t.name}`])).flatMap(t=>t.pokemonSetIds)
      .filter(id=>levelMode!=='50'||frontierPokemon.find(p=>p.id===id).entry<=850));
    assert.deepEqual(new Set(availableTowerSets(state).filter(s=>s.id).map(s=>s.id)),expectedSets);
  }
});
test('All Rounds and unsupported rules preserve existing trainer and set pools',()=>{
  for(const state of [stateFor(''),{...stateFor(''),rules:createTowerRules({format:'Doubles'})},
    {...stateFor('1'),rules:{...createTowerRules(),format:'Multis'}},
    {...stateFor('1'),rules:{...createTowerRules(),facility:'Dome'}}]) {
    assert.equal(towerRoundSetIds(state),null);
    assert.deepEqual(availableTowerSets(state),frontierPokemon);
    assert.deepEqual(searchTowerTrainers('',{state,format:state.rules.format}),searchTowerTrainers('',{format:state.rules.format}));
  }
});
test('same-name trainer searches do not leak late canonical identities',()=>{
  assert.deepEqual(searchTowerTrainers('GILLIAN',{state:stateFor('1')}).map(t=>t.key),['Lady:GILLIAN']);
  assert.deepEqual(searchTowerTrainers('GILLIAN',{state:stateFor('8+')}).map(t=>t.key),['Cooltrainer (F):GILLIAN']);
});
test('independent species, trainer rosters and Possible Sets share the eligible set pool',()=>{
  for(const format of ['Singles','Doubles']) for(const round of rounds) {
    const state={...stateFor(round),rules:createTowerRules({format})}, pool=availableTowerSets(state);
    const allowed=new Set(pool.map(s=>s.id??`${s.brainSet}:${s.species}`));
    assert.ok(availableOpponentSpecies(state).length);
    for(const mon of availableOpponentSpecies(state)) {
      const selected={...state,opponentSpecies:[mon.id],matchup:{player:null,opponent:mon.id}};
      const candidates=possibleMatchupSets(selected);
      assert.ok(candidates.length);
      assert.ok(candidates.every(s=>allowed.has(s.id??`${s.brainSet}:${s.species}`)));
    }
    for(const trainer of searchTowerTrainers('',{state,format})) {
      const selected={...state,selectedTrainer:trainer.trainer,selectedBrainSymbol:trainer.symbol};
      assert.ok(availableTowerSets(selected).every(s=>trainer.setIds.includes(s.id??`${s.brainSet}:${s.species}`)));
    }
  }
  const early=stateFor('1'),late=stateFor('8+');
  const earlyIds=new Set(availableTowerSets(early).map(s=>s.id));
  const shared=availableTowerSets(late).find(s=>s.id&&!earlyIds.has(s.id)&&availableTowerSets(early).some(e=>e.species===s.species));
  assert.ok(shared,'shared species must exercise later variant exclusion');
  const id=speciesByName.get(shared.species.toLowerCase()).internalSpeciesId;
  assert.ok(!possibleMatchupSets({...early,opponentSpecies:[id],matchup:{opponent:id}}).some(s=>s.id===shared.id));
});
test('Anabel Silver only in round 5, Gold only in 8+; no Anabel in Doubles',()=>{
  for(const round of rounds) {
    const state=stateFor(round);
    assert.deepEqual(searchTowerTrainers('Anabel',{state}).map(t=>t.symbol),round==='5'?['Silver']:round==='8+'?['Gold']:[]);
    assert.deepEqual([...new Set(availableTowerSets(state).filter(s=>s.brainSet).map(s=>s.brainSet))],round==='5'?['Anabel Silver']:round==='8+'?['Anabel Gold']:[]);
  }
  assert.equal(searchTowerTrainers('Anabel',{state:stateFor('8+'),format:'Doubles'}).length,0);
});
test('settings changes reset all opponent choices, preserve team and conditions, and ignore active values',()=>{
  const base={...stateFor('1'),team:['a','b','c','d'],active:'a',selectedTrainer:'Youngster:BRADY',
    opponents:['Sunkern 1'],enemy:'Sunkern 1',opponentSpecies:[191],opponentObservations:{0:{item:'Lax Incense'}},
    matchup:{player:'a',opponent:191},setSearch:{query:'sunk',hiddenIds:['Sunkern 1']},
    matchupConditions:{player:{0:{status:'burn'}},enemy:{0:{status:'poison'}}}};
  for(const action of [{type:'round',value:'2'},{type:'rules',patch:{format:'Doubles'}},
    {type:'rules',patch:{levelMode:'open',openLevel:78}},{type:'rules',patch:{openLevel:80}}]) {
    const next=battleReducer(base,action);
    assert.equal(next.selectedTrainer,null);assert.equal(next.selectedBrainSymbol,null);
    assert.deepEqual(next.opponentSpecies,[]);assert.deepEqual(next.opponents,[]);assert.equal(next.enemy,null);
    assert.deepEqual(next.opponentObservations,{});assert.equal(next.matchup.opponent,null);
    assert.deepEqual(next.setSearch,{query:'',hiddenIds:[]});assert.equal(next.opponentReset,1);
    if(action.patch?.format) {
      assert.deepEqual(next.team,[]);assert.equal(next.active,null);assert.equal(next.matchup.player,null);
      assert.deepEqual(next.matchupConditions,{player:{},enemy:{}});assert.deepEqual(next.field,createBattleState().field);
    } else {
      for(const key of ['team','active','field','conditions','hpByPokemon','matchupSides','matchupConditions'])assert.equal(next[key],base[key],key);
      assert.equal(next.matchup.player,'a');
    }
  }
  for(const action of [{type:'round',value:'1'},{type:'rules',patch:{facility:'Tower'}},{type:'rules',patch:{format:'Singles'}},{type:'rules',patch:{levelMode:'50'}}])assert.equal(battleReducer(base,action),base);
  const open={...base,rules:createTowerRules({levelMode:'open',openLevel:78})};
  assert.equal(battleReducer(open,{type:'rules',patch:{levelMode:'open',openLevel:78}}),open);
  // Future supported adapters use the same rules action. Invalid facilities stay rejected today.
  assert.equal(battleReducer(base,{type:'rules',patch:{facility:'Dome'}}),base);
  assert.equal(battleReducer(stateFor('1'),{type:'opponentTrainer',key:'Cooltrainer (F):GILLIAN'}).selectedTrainer,null);
});


test('Doubles excludes Anabel in every round, including All Rounds and state-only searches',()=>{
  for(const round of ['',...rounds]) {
    const state={...stateFor(round),rules:createTowerRules({format:'Doubles'})};
    assert.equal(searchTowerTrainers('Anabel',{state,format:'Doubles'}).length,0);
    assert.equal(searchTowerTrainers('Anabel',{state}).length,0);
    assert.ok(availableTowerSets(state).every(set=>!set.brainSet));
    for(const key of ['Anabel Silver','Anabel Gold']) {
      assert.equal(battleReducer(state,{type:'opponentTrainer',key}),state);
      assert.equal(battleReducer(state,{type:'trainer',key}),state);
      const stale={...state,selectedTrainer:'Anabel',selectedBrainSymbol:key.split(' ')[1]};
      if(round)assert.deepEqual(availableTowerSets(stale),[]);
    }
  }
});
test('Doubles Level 50 excludes high tier sets while Open Level permits them',()=>{
  const level50={...stateFor('8+'),rules:createTowerRules({format:'Doubles'})};
  const open={...level50,rules:createTowerRules({format:'Doubles',levelMode:'open',openLevel:85})};
  const early=availableTowerSets(level50),late=availableTowerSets(open);
  assert.ok(late.some(set=>set.entry>850));
  assert.ok(early.every(set=>set.entry<=850));
  assert.ok(late.length>early.length);
  for(const set of late.filter(set=>set.entry>850)) {
    const id=speciesByName.get(set.species.toLowerCase()).internalSpeciesId;
    const select=state=>({...state,opponentSpecies:[id],matchup:{player:null,opponent:id}});
    assert.ok(!possibleMatchupSets(select(level50)).includes(set));
    assert.ok(possibleMatchupSets(select(open)).includes(set));
  }
});
test('Doubles format changes clear battle state while other rule resets preserve the roster',()=>{
  const base={...stateFor('1'),rules:createTowerRules({format:'Doubles'}),team:['a','b','c','d'],active:'d',
    selectedTrainer:'Youngster:BRADY',opponentSpecies:[191,null,null,298],opponents:['Sunkern 1'],enemy:'Sunkern 1',
    opponentObservations:{0:{item:'Lax Incense'}},setSearch:{query:'sunk',hiddenIds:['Sunkern 1']},
    matchup:{player:'d',opponent:191},matchupConditions:{player:{3:{status:'burn'}},enemy:{0:{status:'poison'}}}};
  for(const action of [{type:'round',value:'2'},{type:'rules',patch:{format:'Singles'}},
    {type:'rules',patch:{levelMode:'open',openLevel:78}}]) {
    const next=battleReducer(base,action);
    assert.equal(next.selectedTrainer,null);assert.equal(next.selectedBrainSymbol,null);
    assert.deepEqual(next.opponentSpecies,[]);assert.deepEqual(next.opponents,[]);assert.equal(next.enemy,null);
    assert.deepEqual(next.opponentObservations,{});assert.equal(next.matchup.opponent,null);
    assert.deepEqual(next.setSearch,{query:'',hiddenIds:[]});assert.equal(next.opponentReset,1);
    if(action.patch?.format) {
      assert.deepEqual(next.team,[]);assert.equal(next.active,null);assert.deepEqual(next.matchupConditions,{player:{},enemy:{}});
      assert.deepEqual(next.field,createBattleState().field);
    } else for(const key of ['team','active','field','conditionsByPokemon','hpByPokemon','matchupSides','matchupConditions'])assert.equal(next[key],base[key],key);
  }
  for(const action of [{type:'round',value:'1'},{type:'rules',patch:{format:'Doubles'}},
    {type:'rules',patch:{facility:'Tower'}},{type:'rules',patch:{levelMode:'50'}}])assert.equal(battleReducer(base,action),base);
  // Facility handling stays in the existing rules reducer; other adapters are not added.
  assert.equal(battleReducer(base,{type:'rules',patch:{facility:'Factory'}}),base);
});
