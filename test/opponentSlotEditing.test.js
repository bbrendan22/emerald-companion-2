import test from 'node:test';
import assert from 'node:assert/strict';
import {battleReducer,createBattleState} from '../src/battle/battleState.js';
import {availableOpponentSpecies,towerSpecies} from '../src/battle/opponentSpecies.js';

for(const format of ['Singles','Doubles']) test(`${format}: replacement and removal preserve other slots and enforce eligibility`,()=>{
 let state=battleReducer(createBattleState(),{type:'rules',patch:{format}});
 state=battleReducer(state,{type:'round',value:'1'});
 state=battleReducer(state,{type:'opponentTrainer',key:'Youngster:BRADY'});
 const [a,b,c]=availableOpponentSpecies(state);
 state=battleReducer(state,{type:'assignOpponentSpecies',slot:0,speciesId:a.id});
 state=battleReducer(state,{type:'assignOpponentSpecies',slot:1,speciesId:b.id});
 state=battleReducer(state,{type:'matchupOpponent',speciesId:b.id});
 state={...state,opponentObservations:{0:{item:'kept'},1:{item:'removed'}}};
 const action={type:'replaceOpponentSpecies',slot:1,previousSpeciesId:b.id,speciesId:c.id};
 const unavailable=towerSpecies.find(mon=>!availableOpponentSpecies(state).some(allowed=>allowed.id===mon.id));
 for(const invalid of [{...action,speciesId:unavailable.id},{...action,speciesId:a.id},{...action,previousSpeciesId:a.id}])
  assert.equal(battleReducer(state,invalid),state);
 const next=battleReducer(state,action);
 assert.equal(next.opponentSpecies[0],a.id);assert.equal(next.opponentSpecies[1],c.id);
 assert.equal(next.matchup.opponent,c.id);
 assert.deepEqual(next.opponentObservations,{0:{item:'kept'}});
 assert.deepEqual(next.team,state.team);assert.deepEqual(next.matchupConditions.player,state.matchupConditions.player);
 const removed=battleReducer(next,{type:'clearOpponentSpeciesSlot',slot:1,speciesId:c.id});
 assert.equal(removed.opponentSpecies[0],a.id);assert.equal(removed.opponentSpecies[1],null);
 assert.equal(removed.matchup.opponent,a.id);
});
