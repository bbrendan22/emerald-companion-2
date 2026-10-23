import test from 'node:test';
import assert from 'node:assert/strict';
import {battleReducer,createBattleState} from '../src/battle/battleState.js';
import {searchTowerTrainers,towerTrainerEntries} from '../src/battle/towerTrainers.js';
test('Doubles excludes both stable Anabel entry keys, independently of display name',()=>{
  const renamed=towerTrainerEntries.map(entry=>({...entry,name:entry.symbol?'Renamed':entry.name}));
  const doubles=searchTowerTrainers('',{entries:renamed,format:'Doubles'});
  assert.equal(doubles.length,towerTrainerEntries.length-2);
  assert.ok(doubles.every(entry=>!['Anabel Silver','Anabel Gold'].includes(entry.key)));
  assert.equal(searchTowerTrainers('Anabel',{format:'Singles'}).length,2);
  assert.equal(searchTowerTrainers('Anabel',{format:'Doubles'}).length,0);
});
test('switching to Doubles clears only Anabel identity and prevents selecting her until Singles',()=>{
  for(const symbol of ['Silver','Gold']) {
    let state=battleReducer(createBattleState(),{type:'opponentTrainer',key:`Anabel ${symbol}`});
    state={...state,team:['owned'],active:'owned',opponentSpecies:[25,null,4],matchup:{player:'owned',opponent:25}};
    const next=battleReducer(state,{type:'rules',patch:{format:'Doubles'}});
    assert.equal(next.selectedTrainer,null);assert.equal(next.selectedBrainSymbol,null);
    for(const key of ['opponentSpecies','opponents','enemy','matchup','field'])assert.equal(next[key],state[key]);
    assert.deepEqual(next.team,state.team);
    assert.equal(battleReducer(next,{type:'opponentTrainer',key:`Anabel ${symbol}`}),next);
    const singles=battleReducer(next,{type:'rules',patch:{format:'Singles'}});
    assert.equal(singles.selectedTrainer,null);
    assert.equal(battleReducer(singles,{type:'opponentTrainer',key:`Anabel ${symbol}`}).selectedTrainer,'Anabel');
  }
});
test('ordinary selected trainers remain selected when switching format',()=>{
  const state=battleReducer(createBattleState(),{type:'opponentTrainer',key:'Youngster:BRADY'});
  assert.equal(battleReducer(state,{type:'rules',patch:{format:'Doubles'}}).selectedTrainer,state.selectedTrainer);
});
