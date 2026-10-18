import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattleState, battleReducer} from '../src/battle/battleState.js';
import {availableTowerSets, visibleTowerSets, duplicateMoveColors, frontierSetId, towerSetById} from '../src/battle/towerSets.js';
import {towerTrainerEntries} from '../src/battle/towerTrainers.js';
import {toTowerOpponent} from '../src/battle/frontierAdapter.js';
import {createTowerRules} from '../src/battle/towerRules.js';
const reduce = (state,type,fields={}) => battleReducer(state,{type,...fields});

test('Sets defaults to all 882 ordinary sets; search is trimmed case-insensitive species prefix only', () => {
  const state=createBattleState(); assert.equal(availableTowerSets(state).length,882);
  const found=visibleTowerSets(reduce(state,'setQuery',{query:'  sNoRl '}));
  assert.ok(found.length>1); assert.ok(found.every(set=>set.species==='Snorlax'));
  assert.equal(visibleTowerSets(reduce(state,'setQuery',{query:'orlax'})).length,0);
  assert.equal(visibleTowerSets(reduce(state,'setQuery',{query:'Choice Band'})).length,0);
  assert.equal(visibleTowerSets(reduce(state,'setQuery',{query:'missing-species'})).length,0);
  assert.ok(availableTowerSets(state).every(set=>!set.brainSet));
});

test('each selected trainer and Anabel medal restricts Sets to exactly its associations', () => {
  for(const entry of towerTrainerEntries) {
    const state=reduce(createBattleState(),'trainer',{key:entry.key});
    assert.deepEqual(availableTowerSets(state).map(frontierSetId),entry.setIds);
    if(entry.symbol) assert.ok(availableTowerSets(state).every(set=>set.brainSet===`Anabel ${entry.symbol}`));
  }
});

test('single-species duplicate colors count sets, stay consistent by move, and update with hiding', () => {
  const sets=[{species:'Test',moves:['A','B','A','Unique']},{species:'Test',moves:['A','B','C','Other']}];
  const colors=duplicateMoveColors(sets);
  assert.deepEqual([...colors.keys()],['A','B']); assert.notEqual(colors.get('A'),colors.get('B'));
  assert.equal(duplicateMoveColors(sets.slice(0,1)).size,0);
  assert.equal(duplicateMoveColors([...sets,{species:'Other',moves:['A']}]).size,0);
  let state=reduce(createBattleState(),'setQuery',{query:'Snorlax'});
  const results=visibleTowerSets(state); assert.ok(duplicateMoveColors(results).size>0);
  for(const set of results.slice(1)) state=reduce(state,'hideSet',{setId:frontierSetId(set)});
  assert.equal(duplicateMoveColors(visibleTowerSets(state)).size,0);
});

test('hiding is per exact set, restores on focus/session reset, and leaves dataset/opponents intact', () => {
  const state=reduce(createBattleState(),'setQuery',{query:'Snorlax'}), before=visibleTowerSets(state);
  const id=frontierSetId(before[0]),hidden=reduce(state,'hideSet',{setId:id});
  assert.equal(visibleTowerSets(hidden).length,before.length-1);
  assert.deepEqual(hidden.opponents,[]); assert.ok(towerSetById(id));
  assert.equal(visibleTowerSets(reduce(hidden,'restoreSets')).length,before.length);
  assert.equal(reduce(hidden,'setQuery',{query:''}).setSearch.hiddenIds.length,0);
  const trainer=reduce(hidden,'trainer',{key:'Anabel Gold'});
  assert.deepEqual(trainer.setSearch,{query:'',hiddenIds:[]}); assert.equal(trainer.tab,'Sets');
});

test('adding sets preserves distinct identities, three slots, active selection, player team and rules', () => {
  let state={...createBattleState(),team:['player-id'],active:'player-id',rules:createTowerRules({levelMode:'open',openLevel:81})};
  const team=state.team,rules=state.rules,ids=['Tyranitar 1','Snorlax 1','Sunkern 1','Azurill 1'];
  for(const id of ids.slice(0,3)) { state=reduce(state,'addOpponent',{setId:id}); assert.equal(state.enemy,id); assert.equal(state.tab,'Matchup'); }
  assert.deepEqual(state.opponents,ids.slice(0,3)); assert.equal(state.team,team); assert.equal(state.rules,rules);
  assert.equal(reduce(state,'addOpponent',{setId:ids[3]}),state);
  const duplicate=reduce(state,'addOpponent',{setId:ids[0]});
  assert.equal(duplicate,state); // Selected entries are inert, including active selection.
  assert.equal(reduce(state,'addOpponent',{setId:'made-up'}),state);
  const switched=reduce(state,'activeOpponent',{setId:ids[0]}); assert.equal(switched.enemy,ids[0]);
  const removed=reduce(switched,'removeOpponent',{setId:ids[0]});
  assert.equal(removed.opponents.length,2); assert.equal(removed.enemy,ids[1]);
  assert.equal(reduce(removed,'addOpponent',{setId:ids[3]}).opponents.length,3);
});

test('trainer changes reset opponent team/search and preserve conditions and reject out-of-pool sets', () => {
  let state=reduce(createBattleState(),'addOpponent',{setId:'Snorlax 1'});
  state={...state,hpByPokemon:{'enemy-Snorlax 1':1},conditionsByPokemon:{old:{status:'burn'}},field:{weather:'rain',playerScreens:{reflect:true},enemyScreens:{lightScreen:true}}};
  const next=reduce(state,'trainer',{key:'Anabel Silver'});
  assert.deepEqual(next.opponents,[]); assert.equal(next.hpByPokemon,state.hpByPokemon); assert.equal(next.conditionsByPokemon,state.conditionsByPokemon);
  assert.equal(next.field,state.field);
  assert.equal(reduce(next,'addOpponent',{setId:'Snorlax 1'}),next);
  assert.equal(reduce(next,'addOpponent',{setId:'Anabel Gold:Snorlax'}),next);
});

test('opponent removal preserves transient records; selection survives all tabs', () => {
  const state={...createBattleState(),opponents:['Sunkern 1','Azurill 1'],enemy:'Sunkern 1',hpByPokemon:{'enemy-Sunkern 1':1,'my-id':12},conditionsByPokemon:{'enemy-Sunkern 1':{status:'burn'},'my-id':{status:'paralysis'}}};
  const removed=reduce(state,'removeOpponent',{setId:'Sunkern 1'});
  assert.equal(removed.hpByPokemon,state.hpByPokemon); assert.equal(removed.conditionsByPokemon,state.conditionsByPokemon);
  assert.equal(state.hpByPokemon['enemy-Sunkern 1'],1);
  for(const tab of ['Trainers','Sets','Teams','Rules','Matchup']) assert.equal(reduce(removed,'tab',{tab}).enemy,'Azurill 1');
});

test('set view calculates Level 50/Open Level with trainer/Brain IVs and explicit fallback', () => {
  const set=towerSetById('Sunkern 1');
  const fallback=toTowerOpponent(set); assert.deepEqual(fallback.ivAssumption,{value:31,source:'assumption',assumed:true});
  assert.equal(fallback.stats.hp,137);
  const entry=towerTrainerEntries.find(entry=>entry.name==='BRADY');
  const trainer=toTowerOpponent(set,createTowerRules(),entry.trainer); assert.equal(trainer.ivs.hp,3); assert.equal(trainer.stats.hp,123);
  for(let level=60;level<=100;level++) assert.equal(toTowerOpponent(set,createTowerRules({levelMode:'open',openLevel:level})).stats.hp,Math.floor(154*level/100)+level+10);
  assert.equal(toTowerOpponent(towerSetById('Anabel Silver:Alakazam'),createTowerRules(),'Anabel').ivs.hp,24);
  assert.equal(toTowerOpponent(towerSetById('Anabel Gold:Snorlax'),createTowerRules(),'Anabel').ivs.hp,31);
});
