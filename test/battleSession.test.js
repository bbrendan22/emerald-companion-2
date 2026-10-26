import test from 'node:test';
import assert from 'node:assert/strict';
import {battleReducer,createBattleState} from '../src/battle/battleState.js';
import {slotConditions} from '../src/battle/matchupConditions.js';

test('fresh session has no encounter owners, overrides, observations, activations or search state',()=>{
 const fresh=createBattleState();
 for(const key of ['team','opponents','opponentSpecies'])assert.deepEqual(fresh[key],[]);
 for(const key of ['active','enemy','selectedTrainer','selectedBrainSymbol','selectedOpponentSetId'])assert.equal(fresh[key],null);
 assert.deepEqual(fresh.matchup,{player:null,opponent:null});
 for(const key of ['opponentSetSelections','opponentObservations','hpByPokemon','conditionsByPokemon'])assert.deepEqual(fresh[key],{});
 assert.deepEqual(fresh.matchupConditions,{player:{},enemy:{}});
 assert.deepEqual(fresh.viewed,{player:0,opponent:0});
 assert.deepEqual(fresh.setSearch,{query:'',hiddenIds:[]});
 assert.equal(fresh.conditionsExpanded,false);assert.equal(fresh.observationsExpanded,false);
 assert.equal(fresh.field.weather,'none');assert.equal(fresh.field.critical,false);
 for(const side of ['player','enemy']) {
  assert.deepEqual(fresh.field[`${side}Screens`],{});assert.deepEqual(fresh.field[`${side}Stages`],{});
  assert.deepEqual(slotConditions(fresh,side,0),{currentHp:null,status:'none',stages:{},helpingHand:false,screens:{}});
 }
});

test('ability activations belong to one running encounter and never leak into a fresh session',()=>{
 let running={...createBattleState(),team:['a'],active:'a',matchup:{player:'a',opponent:null}};
 const update=patch=>{running=battleReducer(running,{type:'matchupCondition',side:'player',slot:0,...patch});};
 update({field:'abilityContext',context:'Trace'});
 update({field:'copiedAbility',context:'Trace',value:'Flash Fire'});
 update({field:'flashFireActivated',context:'Trace',value:true});
 assert.equal(slotConditions(running,'player',0).abilityState.flashFireActivated,true);
 const fresh=createBattleState();
 assert.equal(slotConditions(fresh,'player',0).abilityState,undefined);
 assert.equal(slotConditions(fresh,'player',0).currentHp,null,'null HP represents full HP for the next selected Pokémon');
 assert.equal(slotConditions(running,'player',0).abilityState.flashFireActivated,true,'a separate initialization does not mutate the running encounter');
});
