import test from 'node:test';
import assert from 'node:assert/strict';
import {battleReducer,createBattleState} from '../src/battle/battleState.js';
import {toTowerOpponent} from '../src/battle/frontierAdapter.js';
import {towerSetById,availableTowerSets} from '../src/battle/towerSets.js';
import {towerOpponentIVs} from '../src/battle/towerRules.js';
const update=(state,patch)=>battleReducer(state,{type:'rules',patch});
test('Rules retain Open Level while toggling modes and accept every integer 60–100',()=>{
 let state=createBattleState();state=update(state,{levelMode:'open'});assert.equal(state.rules.opponentLevel,60);
 for(let level=60;level<=100;level++){
  state=update(state,{openLevel:level});assert.equal(state.rules.opponentLevel,level);
  const opponent=toTowerOpponent(towerSetById('Sunkern 1'),state.rules);
  assert.equal(opponent.level,level);assert.equal(opponent.stats.hp,Math.floor(154*level/100)+level+10);
 }
 state=update(state,{levelMode:'50'});assert.equal(state.rules.opponentLevel,50);assert.equal(state.rules.openLevel,100);
 assert.equal(update(state,{levelMode:'open'}).rules.opponentLevel,100);
 for(const patch of [{openLevel:59},{openLevel:101},{openLevel:60.5},{openLevel:'70'},{levelMode:'invalid'},{facility:'invalid'},{format:'invalid'},null])assert.equal(update(state,patch),state);
});
test('Rules survive trainer, opponent, saved-team and tab actions without mutating player records',()=>{
 let state=update(createBattleState(),{levelMode:'open',openLevel:78});const rules=state.rules;
 state=battleReducer(state,{type:'trainer',key:'Anabel Silver'});assert.equal(state.rules,rules);
 state=battleReducer(state,{type:'addOpponent',setId:'Anabel Silver:Alakazam'});assert.equal(state.rules,rules);
 const records=['a','b','c'].map(identity=>({identity,level:21,stats:{speed:50}}));const before=structuredClone(records);
 state=battleReducer(state,{type:'loadTeam',team:{name:'Team',ids:['a','b','c']},records});assert.equal(state.rules,rules);
 for(const tab of ['Trainers','Sets','Teams','Rules','Matchup']){state=battleReducer(state,{type:'tab',tab});assert.equal(state.rules,rules);}
 assert.deepEqual(records,before);
});
test('Rules use ordinary trainer, selected Anabel medal and explicit assumed IVs',()=>{
 assert.deepEqual(towerOpponentIVs(),{value:31,source:'assumption',assumed:true});
 const ordinary=battleReducer(createBattleState(),{type:'trainer',key:'Youngster:BRADY'});
 assert.equal(towerOpponentIVs(ordinary.selectedTrainer).value,3);
 for(const [symbol,value] of [['Silver',24],['Gold',31]]){
  const state=battleReducer(ordinary,{type:'trainer',key:`Anabel ${symbol}`});
  assert.deepEqual(towerOpponentIVs(state.selectedTrainer,availableTowerSets(state)[0]),{value,source:'brain',assumed:false});
 }
});


test('format changes preserve level rules and reset battle conditions', () => {
  const initial = update(createBattleState(), {levelMode:'open', openLevel:78});
  for (const facility of ['Tower']) {
    const next = update(initial, {facility, format:'Doubles'});
    assert.equal(next.rules.facility, facility);
    assert.equal(next.rules.format, 'Doubles');
    assert.equal(next.rules.opponentLevel, 78);
    assert.deepEqual(next.field, createBattleState().field);
    assert.deepEqual(next.team, []);
  }
});

test('unsupported facilities cannot change Tower rules', () => {
  const state = createBattleState();
  for (const facility of ['Dome','Factory','Palace','Arena','Pike','Pyramid']) {
    assert.equal(update(state,{facility}),state);
  }
});
