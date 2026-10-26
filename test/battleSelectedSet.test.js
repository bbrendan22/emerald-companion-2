import test from 'node:test';
import assert from 'node:assert/strict';
import {battleReducer} from '../src/battle/battleState.js';
import {eligibleMatchupSets,possibleMatchupSets,analysisMatchupSets,frontierSetId,identifiedMatchup,matchupObservations,observationChoices} from '../src/battle/towerSets.js';
import {frontierMatchupCandidates} from '../src/battle/frontierCandidates.js';
import {evaluateFrontierCandidates} from '../src/battle/frontierCandidateDamage.js';
import {alexasState,swampert,observe} from './fixtures/alexasAerodactyl.js';
import {battleMove} from '../src/battle/reference.js';

const choose=(state,set)=>battleReducer(state,{type:'selectOpponentSet',setId:frontierSetId(set)});
test('Tower Singles defaults to canonical first set; manual analysis updates canonical inputs and both damage directions without evidence',()=>{
 let state=alexasState();
 const sets=eligibleMatchupSets(state);
 assert.ok(sets.length>1);assert.equal(sets[0].instance,1);
 assert.equal(state.selectedOpponentSetId,frontierSetId(sets[0]));
 for(const set of sets) {
  state=choose(state,set);
  assert.deepEqual(analysisMatchupSets(state),[set]);
  assert.deepEqual(identifiedMatchup(state).moves,set.moves);
  assert.equal(identifiedMatchup(state).item,set.item);
  const constructed=frontierMatchupCandidates(state);
  assert.equal(constructed.candidates.length,1);
  assert.equal(constructed.candidates[0].sourceSet,set);
  assert.equal(constructed.candidates[0].availability,'available');
  const enemy=constructed.candidates[0].opponent;
  assert.ok(Object.values(enemy.stats).every(Number.isInteger));
  for(const direction of ['player','enemy']) {
   const move=direction==='player'?battleMove('Surf'):battleMove(set.moves[0]);
   const result=evaluateFrontierCandidates(state,swampert,move,{direction});
   assert.equal(result.evaluations.length,1);
   assert.equal(result.evaluations[0].sourceSet,set);
   assert.equal(result.evaluations[0].availability,'available');
  }
  assert.deepEqual(matchupObservations(state),{moves:['','','',''],item:''});
  assert.equal(possibleMatchupSets(state).length,sets.length);
 }
});
test('observations intersect sets, preserve eligible manual choice, switch eliminated choice, and reject stale contradictory evidence with safe external recovery',()=>{
 let state=alexasState();const sets=eligibleMatchupSets(state);
 const target=sets.find(set=>set.item==="King’s Rock"||set.item==="King's Rock")??sets[0];
 state=choose(state,target);
 state=observe(state,0,target.moves[0]);
 assert.equal(state.selectedOpponentSetId,frontierSetId(target));
 assert.ok(possibleMatchupSets(state).every(set=>set.moves.includes(target.moves[0])));
 state=observe(state,'item',target.item);
 assert.ok(possibleMatchupSets(state).every(set=>set.item===target.item));
 for(let i=0;i<4;i++)state=observe(state,i,target.moves[i]);
 assert.equal(possibleMatchupSets(state).length,1);
 assert.equal(state.selectedOpponentSetId,frontierSetId(target));
 const other=sets.find(set=>set.item!==target.item);
 assert.ok(other);
 assert.equal(observe(state,'item',other.item),state,'reject stale incompatible selection');
 state={...state,opponentObservations:{0:{...matchupObservations(state),item:other.item}}};
 state=battleReducer(state,{type:'observationsOpen',open:true});
 assert.equal(possibleMatchupSets(state).length,0);
 assert.equal(state.selectedOpponentSetId,null);
 assert.deepEqual(identifiedMatchup(state).moves,[]);
 assert.equal(frontierMatchupCandidates(state).candidates.length,0);
 state=battleReducer(state,{type:'resetObservations'});
 assert.equal(state.selectedOpponentSetId,frontierSetId(sets[0]));
 const move=sets.flatMap(set=>set.moves).find(move=>!sets[0].moves.includes(move));
 state=observe(state,0,move);
 assert.equal(state.selectedOpponentSetId,frontierSetId(possibleMatchupSets(state)[0]));
});
test('trainer, species, Round and rules reset evidence; Doubles also uses its selected canonical set',()=>{
 const original=observe(alexasState(),0,'Earthquake');
 for(const action of [{type:'opponentTrainer',key:'Youngster:BRADY'},{type:'round',value:'1'},{type:'rules',patch:{levelMode:'open',openLevel:70}},{type:'selectSinglesOpponent',speciesId:null}]) {
  const next=battleReducer(original,action);
  assert.deepEqual(next.opponentObservations,{});
  assert.equal(next.selectedOpponentSetId,null);
 }
 const doubles=alexasState('Doubles');
 assert.ok(possibleMatchupSets(doubles).length>1);
 assert.equal(analysisMatchupSets(doubles).length,1);
 assert.equal(frontierMatchupCandidates(doubles).candidates.length,1);
});

test('every offered compact observation preserves compatibility and choices ignore analysis selection',()=>{
 const check=state=>{
  const observations=matchupObservations(state),field=observations.moves.findIndex(move=>!move);
  for(const key of [field,'item'].filter(key=>key!==-1)) {
   for(const value of observationChoices(state,key,{replace:false})) {
    const next=observe(state,key,value);
    assert.notEqual(next,state);
    assert.ok(possibleMatchupSets(next).length>0);
   }
  }
 };
 let state=alexasState();check(state);
 const initial=observationChoices(state,0,{replace:false});
 for(const set of eligibleMatchupSets(state))assert.deepEqual(observationChoices(choose(state,set),0,{replace:false}),initial);
 state=observe(state,0,'Earthquake');check(state);
 assert.ok(!observationChoices(state,'item',{replace:false}).includes('Leftovers'));
 state=observe(state,'item','Kings Rock');check(state);
 assert.deepEqual(possibleMatchupSets(state).map(set=>set.instance),[4]);
 assert.ok(!observationChoices(state,1,{replace:false}).includes('Roar'));
 assert.ok(!observationChoices(state,1,{replace:false}).includes('Earthquake'));
 const narrow=observationChoices(state,1,{replace:false});
 state=observe(state,'item','');check(state);
 assert.ok(observationChoices(state,1,{replace:false}).length>narrow.length);
 state=observe(state,0,'');check(state);
 assert.deepEqual(observationChoices(state,0,{replace:false}),initial);
});
