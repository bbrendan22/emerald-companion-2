import test from 'node:test';
import assert from 'node:assert/strict';
import {candidateIsFaster} from '../src/battle/setSpeedComparison.js';
import {battleReducer, createBattleState} from '../src/battle/battleState.js';
import {opponentSetDisabled} from '../src/battle/towerSets.js';

const player = {identity:'p',stats:{speed:100},ability:'Overgrow',item:'None'};
const candidate = {setId:'c',stats:{speed:101},ability:'Swift Swim / Rain Dish',item:'None'};
test('Speed comparison highlights only strictly faster candidates of a single species', () => {
  const state=createBattleState();
  assert.equal(candidateIsFaster(candidate,player,state,true),true);
  assert.equal(candidateIsFaster({...candidate,stats:{speed:100}},player,state,true),false);
  assert.equal(candidateIsFaster({...candidate,stats:{speed:99}},player,state,true),false);
  assert.equal(candidateIsFaster(candidate,null,state,true),false);
  assert.equal(candidateIsFaster(candidate,player,state,false),false);
  assert.equal(candidateIsFaster(candidate,{...player,ability:'Unknown'},state,true),false);
});
test('Speed comparison accounts for known stages, paralysis, items and weather without guessing abilities', () => {
  const state=createBattleState(),slow={...candidate,stats:{speed:60}};
  state.field.weather='rain';
  assert.equal(candidateIsFaster(slow,player,state,true),false); // Rain Dish remains slower.
  state.conditionsByPokemon['enemy-c']={abilitySelection:'Swift Swim'};
  assert.equal(candidateIsFaster(slow,player,state,true),true);
  assert.equal(candidateIsFaster(slow,{...player,ability:'Cloud Nine'},state,true),false);
  state.conditionsByPokemon['enemy-c']={abilitySelection:'Swift Swim',status:'paralysis'};
  assert.equal(candidateIsFaster(slow,player,state,true),false);
  state.conditionsByPokemon={'my-p':{status:'paralysis'}};
  assert.equal(candidateIsFaster(slow,player,state,true),true);
  state.conditionsByPokemon={'my-p':{stages:{speed:2}}};
  assert.equal(candidateIsFaster(candidate,player,state,true),false);
  assert.equal(candidateIsFaster(candidate,{...player,item:'Macho Brace'},createBattleState(),true),true);
});
test('disabled set actions cannot navigate, select or hide; removing restores eligibility', () => {
  let state={...createBattleState(),tab:'Sets'};
  state=battleReducer(state,{type:'addOpponent',setId:'Snorlax 1'});
  state=battleReducer(state,{type:'tab',tab:'Sets'});
  assert.equal(battleReducer(state,{type:'addOpponent',setId:'Snorlax 1'}),state);
  assert.equal(battleReducer(state,{type:'hideSet',setId:'Snorlax 1'}),state);
  for(const setId of ['Sunkern 1','Azurill 1']) state=battleReducer(state,{type:'addOpponent',setId});
  state=battleReducer(state,{type:'tab',tab:'Sets'});
  assert.equal(battleReducer(state,{type:'addOpponent',setId:'Caterpie 1'}),state);
  assert.equal(battleReducer(state,{type:'hideSet',setId:'Caterpie 1'}),state);
  const removed=battleReducer(state,{type:'removeOpponent',setId:'Sunkern 1'});
  assert.equal(battleReducer(removed,{type:'addOpponent',setId:'Caterpie 1'}).opponents.length,3);
});
test('canonical species restriction blocks Tyranitar instances; selection clears candidates', () => {
  let state={...createBattleState(),setSearch:{query:'Tyranitar',hiddenIds:['Snorlax 1']}};
  state=battleReducer(state,{type:'addOpponent',setId:'Tyranitar 1'});
  assert.deepEqual(state.opponents,['Tyranitar 1']);assert.equal(state.enemy,'Tyranitar 1');
  assert.deepEqual(state.setSearch,{query:'',hiddenIds:[]});assert.equal(state.tab,'Matchup');
  assert.equal(opponentSetDisabled(state,'Tyranitar 2'),true);
  assert.equal(opponentSetDisabled(state,'Snorlax 1'),false);
  assert.equal(battleReducer(state,{type:'addOpponent',setId:'Tyranitar 2'}),state);
  state=battleReducer(state,{type:'removeOpponent',setId:'Tyranitar 1'});
  assert.equal(opponentSetDisabled(state,'Tyranitar 2'),false);
  assert.deepEqual(battleReducer(state,{type:'addOpponent',setId:'Tyranitar 2'}).opponents,['Tyranitar 2']);
});
