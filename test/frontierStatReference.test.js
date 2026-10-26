import test from 'node:test';
import assert from 'node:assert/strict';
import {frontierStatReference,frontierBarPercent} from '../src/battle/frontierStatReference.js';
import {frontierSetStats} from '../src/battle/frontierAdapter.js';
import {createTowerRules,towerOpponentIVs} from '../src/battle/towerRules.js';
import {towerTrainerEntries,towerTrainerSupportsFormat} from '../src/battle/towerTrainers.js';
import {towerSetById} from '../src/battle/towerSets.js';
import {battleReducer,createBattleState} from '../src/battle/battleState.js';
import {speciesByName} from '../src/battle/reference.js';

test('reference extrema cover actual legal trainer/set/IV associations at each supported rule configuration',()=>{
 for(const format of ['Singles','Doubles'])for(const level of [50,60,85,100]) {
  const rules=createTowerRules({format,levelMode:level===50?'50':'open',openLevel:level===50?60:level});
  const reference=frontierStatReference(rules);
  const expected=Object.fromEntries(Object.keys(reference).map(k=>[k,{min:Infinity,max:-Infinity}]));
  for(const trainer of towerTrainerEntries.filter(t=>towerTrainerSupportsFormat(t,format)))for(const id of trainer.setIds) {
   const set=towerSetById(id),iv=towerOpponentIVs(trainer.trainer,set);
   assert.equal(iv.assumed,false);
   const stats=frontierSetStats(set,level,iv.value);
   for(const key of Object.keys(expected)) {
    expected[key].min=Math.min(expected[key].min,stats[key]);
    expected[key].max=Math.max(expected[key].max,stats[key]);
    assert.ok(frontierBarPercent(stats[key],reference[key])>=5&&frontierBarPercent(stats[key],reference[key])<=100);
   }
  }
  assert.deepEqual(reference,expected);
  for(const range of Object.values(reference)) {
   assert.equal(frontierBarPercent(range.min,range),5);
   assert.equal(frontierBarPercent(range.max,range),100);
   assert.equal(frontierBarPercent((range.min+range.max)/2,range),52.5);
  }
 }
});

test('reference is cached by rules and stays identical through trainer, species, team and observation changes',()=>{
 let state=createBattleState();const original=frontierStatReference(state.rules);
 state=battleReducer(state,{type:'opponentTrainer',key:'Cooltrainer (M):VINCE'});
 const speciesId=speciesByName.get('metagross').internalSpeciesId;
 for(const action of [{type:'assignOpponentSpecies',slot:0,speciesId},{type:'matchupOpponent',speciesId},
  {type:'observeOpponent',field:2,value:'Psychic'},{type:'observeOpponent',field:'item',value:'Quick Claw'},
  {type:'opponentTrainer',key:'Anabel Silver'}]) {
  state=battleReducer(state,action);assert.equal(frontierStatReference(state.rules),original);
 }
 assert.equal(frontierStatReference({...state.rules,openLevel:99}),original,'unused Open Level does not change Level 50 reference');
 assert.equal(frontierStatReference({...state.rules,team:['anything'],selectedTrainer:'anything'}),original);
 const open=createTowerRules({levelMode:'open',openLevel:85});
 assert.notEqual(frontierStatReference(open),original);
 assert.equal(frontierStatReference({...open}),frontierStatReference(open));
 assert.ok(Object.isFrozen(original)&&Object.values(original).every(Object.isFrozen));
});

test('shared affine scale clamps player outliers and handles equal or missing extrema',()=>{
 const range={min:50,max:250};
 assert.equal(frontierBarPercent(100,range),28.75);
 assert.equal(frontierBarPercent(0,range),5);
 assert.equal(frontierBarPercent(999,range),100);
 assert.equal(frontierBarPercent(50,{min:50,max:50}),5);
 assert.equal(frontierBarPercent(60,{min:50,max:50}),100);
 assert.equal(frontierBarPercent(NaN,range),null);
 assert.equal(frontierBarPercent(10,null),null);
});
