import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTeam, loadBattleTeams, storeBattleTeams, createTeamId} from '../src/storage/battleTeams.js';
import {battleReducer, createBattleState} from '../src/battle/battleState.js';
const pool=['a','b','c','d'].map(identity=>({identity}));
const team={id:'team-1',name:'Tower team',ids:['a','b','c']};
const storage=()=>{let value=null;return {getItem:()=>value,setItem:(_,next)=>{value=next;}};};
test('team IDs work on HTTP LAN without randomUUID',()=>{
 assert.equal(createTeamId({getRandomValues:bytes=>bytes.fill(15)}),'0f'.repeat(16));
 assert.equal(createTeamId({randomUUID:()=> 'uuid'}),'uuid');
});
test('teams require a name and three valid distinct identities, including sparse array rejection',()=>{
 assert.equal(validateTeam(team,pool),'');
 for(const invalid of [{...team,name:' '},{...team,ids:['a','b']},{...team,ids:['a','a','b']},{...team,ids:['a','b','missing']},{...team,ids:[,'b','c']}]) assert.ok(validateTeam(invalid,pool));
});
test('saved references persist, edit and delete without storing Pokémon data',()=>{
 const store=storage();storeBattleTeams(store,[{...team,stats:{hp:20}}]);assert.deepEqual(loadBattleTeams(store),[team]);
 const edited={...team,name:'New name',ids:['d','b','c']};storeBattleTeams(store,[edited]);assert.deepEqual(loadBattleTeams(store),[edited]);
 storeBattleTeams(store,[]);assert.deepEqual(loadBattleTeams(store),[]);
});
test('corrupt saved teams and failed writes remain explicit',()=>{
 assert.throws(()=>loadBattleTeams({getItem:()=>'{broken'}));
 assert.throws(()=>loadBattleTeams({getItem:()=>JSON.stringify([{...team,ids:['a','a','c']}])}));
 const store=storage();storeBattleTeams(store,[team]);
 assert.throws(()=>storeBattleTeams({setItem:()=>{throw new Error('full');}},[]));assert.deepEqual(loadBattleTeams(store),[team]);
});
test('load changes only player team/active/tab, preserving opponents/rules/conditions',()=>{
 const state={...createBattleState(),selectedTrainer:'Anabel',selectedBrainSymbol:'Gold',opponents:['Anabel Gold:Snorlax'],enemy:'Anabel Gold:Snorlax'};
 const next=battleReducer(state,{type:'loadTeam',team,records:pool});
 assert.deepEqual(next.team,team.ids);assert.equal(next.active,'a');assert.equal(next.tab,'Matchup');
 assert.equal(next.rules,state.rules);assert.equal(next.opponents,state.opponents);assert.equal(next.enemy,state.enemy);assert.equal(next.selectedTrainer,state.selectedTrainer);
 assert.equal(battleReducer(state,{type:'loadTeam',team,records:pool.slice(1)}),state);
 assert.equal(battleReducer(next,{type:'activePlayer',identity:'c'}).active,'c');
});
test('missing collection never overwrites saved references and same-species individuals stay distinct',()=>{
 const store=storage();storeBattleTeams(store,[team]);assert.ok(validateTeam(team,[]));assert.deepEqual(loadBattleTeams(store),[team]);
 assert.equal(validateTeam(team,pool.map(mon=>({...mon,dex:1}))), '');
});
