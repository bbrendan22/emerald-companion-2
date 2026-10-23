import test from 'node:test';
import assert from 'node:assert/strict';
import {battleReducer, createBattleState} from '../src/battle/battleState.js';
import {validateTeam, loadBattleTeams, storeBattleTeams} from '../src/storage/battleTeams.js';
import {towerSpecies} from '../src/battle/opponentSpecies.js';

const pool = [{identity:'a',dex:25,name:'First'}, {identity:'a2',dex:25,name:'Different name'},
  {identity:'b',dex:1,name:'First'}, {identity:'c',dex:4}, {identity:'d',dex:7}];
test('manual selection and legacy add reject different individuals of the same species in either format', () => {
  for (const format of ['Singles','Doubles']) {
    let state = battleReducer(createBattleState(), {type:'rules',patch:{format}});
    state = battleReducer(state,{type:'assignPlayer',slot:0,identity:'a',pool});
    for (const type of ['assignPlayer','addPlayer'])
      assert.equal(battleReducer(state,{type,slot:1,identity:'a2',pool}),state);
    const added = battleReducer(state,{type:'assignPlayer',slot:1,identity:'b',pool});
    assert.deepEqual(added.team.slice(0,2),['a','b'],'matching names do not block different species');
    const cleared = battleReducer(state,{type:'clearPlayerSlot',slot:0,identity:'a'});
    assert.equal(battleReducer(cleared,{type:'assignPlayer',slot:1,identity:'a2',pool}).team[1],'a2');
  }
});
test('duplicate-species saved teams remain stored but cannot load; validation protects both sizes', () => {
  for (const format of ['Singles','Doubles']) {
    const state = battleReducer(createBattleState(), {type:'rules',patch:{format}});
    const team = {id:'old',name:'Team 1',ids:['a','a2','b',...(format === 'Doubles' ? ['c'] : [])]};
    let data;
    const storage = {getItem:()=>data,setItem:(_,value)=>{data=value;}};
    storeBattleTeams(storage,[team]);
    const before = data;
    assert.deepEqual(loadBattleTeams(storage),[team]);
    assert.match(validateTeam(team,pool), /different species/);
    assert.equal(battleReducer(state,{type:'loadTeam',team,records:pool}),state);
    assert.equal(data,before);assert.deepEqual(loadBattleTeams(storage)[0].ids,team.ids);
  }
});
test('opponent species are unique per lineup, independently of My Team; removal re-enables species', () => {
  for (const format of ['Singles','Doubles']) {
    let state = battleReducer(createBattleState(),{type:'rules',patch:{format}});
    state = {...state,team:['a']};
    const speciesId = towerSpecies.find(mon=>mon.dex===25).id;
    state = battleReducer(state,{type:'assignOpponentSpecies',slot:0,speciesId});
    assert.equal(state.opponentSpecies[0],speciesId,'same species can be on opposing teams');
    assert.equal(battleReducer(state,{type:'assignOpponentSpecies',slot:1,speciesId}),state);
    state = battleReducer(state,{type:'clearOpponentSpeciesSlot',slot:0,speciesId});
    assert.equal(battleReducer(state,{type:'assignOpponentSpecies',slot:1,speciesId}).opponentSpecies[1],speciesId);
  }
});
