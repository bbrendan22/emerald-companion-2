import test from 'node:test';
import assert from 'node:assert/strict';
import {battleRounds} from '../src/storage/battleRules.js';
import {battleReducer,createBattleState} from '../src/battle/battleState.js';
import {createTowerRules} from '../src/battle/towerRules.js';

test('fresh Battle initialization restores default Rules and genuinely empty Round',()=>{
 const first=createBattleState();
 assert.deepEqual(first.rules,createTowerRules());
 assert.equal(first.round,'');
 let changed=battleReducer(first,{type:'rules',patch:{format:'Doubles',levelMode:'open',openLevel:78}});
 changed=battleReducer(changed,{type:'round',value:'2'});
 assert.equal(changed.rules.format,'Doubles');
 assert.equal(changed.rules.opponentLevel,78);
 assert.equal(changed.round,'2');
 const fresh=createBattleState();
 assert.deepEqual(fresh.rules,createTowerRules());
 assert.equal(fresh.round,'');
 assert.notEqual(fresh.rules,first.rules);
 assert.equal(changed.round,'2','fresh initialization does not mutate another running session');
});

test('Round accepts every existing choice, including returning to empty, and rejects invalid values',()=>{
 let state=createBattleState();
 assert.equal(battleRounds[0],'');
 for(const round of [...battleRounds,'']) {
  state=battleReducer(state,{type:'round',value:round});
  assert.equal(state.round,round);
 }
 assert.equal(battleReducer(state,{type:'round',value:'9'}),state);
});
