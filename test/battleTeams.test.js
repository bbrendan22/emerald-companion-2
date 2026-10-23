import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTeam, loadBattleTeams, storeBattleTeams, createTeamId} from '../src/storage/battleTeams.js';
import {battleReducer, createBattleState} from '../src/battle/battleState.js';
const pool=['a','b','c','d'].map((identity,index)=>({identity,dex:index+1}));
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
 assert.match(validateTeam(team,pool.map(mon=>({...mon,dex:1}))), /different species/);
});

test('Doubles teams store four distinct references and only load for the matching format',()=>{
 const doubles={id:'double',name:'Team 1',ids:['a','b','c','d']};
 const store=storage();storeBattleTeams(store,[team,doubles]);
 assert.deepEqual(loadBattleTeams(store),[team,doubles]);
 assert.equal(validateTeam(doubles,pool,4),'');
 assert.ok(validateTeam({...doubles,ids:['a','a','b','c']},pool,4));
 const singles=createBattleState();
 assert.equal(battleReducer(singles,{type:'loadTeam',team:doubles,records:pool}),singles);
 const state=battleReducer(singles,{type:'rules',patch:{format:'Doubles'}});
 assert.equal(state.rules.teamSize,4);
 assert.deepEqual(battleReducer(state,{type:'loadTeam',team:doubles,records:pool}).team,doubles.ids);
 assert.equal(battleReducer(state,{type:'loadTeam',team,records:pool}),state);
});

test('individual selection fills the requested empty slot without shifting or duplicating individuals',()=>{
 const start=createBattleState();
 const third=battleReducer(start,{type:'assignPlayer',slot:2,identity:'a',pool});
 assert.deepEqual(third.team,[null,null,'a']);
 const first=battleReducer(third,{type:'assignPlayer',slot:0,identity:'b',pool});
 assert.deepEqual(first.team,['b',null,'a']);
 for(const action of [{slot:1,identity:'a'},{slot:2,identity:'b'},{slot:3,identity:'c'},{slot:-1,identity:'c'},{slot:1,identity:'missing'}]){
  assert.equal(battleReducer(first,{type:'assignPlayer',pool,...action}),first);
 }
 assert.equal(first.rules,start.rules);assert.equal(first.opponents,start.opponents);assert.equal(first.field,start.field);
 const refreshed=battleReducer(first,{type:'collection',records:pool,pool:[pool[0]],autoInitialize:false,frontierOnly:true,preserveSlots:true});
 assert.deepEqual(refreshed.team,[null,null,'a']);
 assert.equal(battleReducer(start,{type:'collection',records:pool,pool,autoInitialize:false,frontierOnly:true,preserveSlots:true}),start);
});

test('clearing a player slot preserves its position, other members, presets and collection',()=>{
 const records=structuredClone(pool), saved=structuredClone(team);
 const state={...createBattleState(),team:[...team.ids],active:'b',teamInitialized:true};
 const next=battleReducer(state,{type:'clearPlayerSlot',slot:1,identity:'b'});
 assert.deepEqual(next.team,['a',null,'c']);assert.equal(next.active,null);
 assert.deepEqual(state.team,team.ids);assert.deepEqual(team,saved);assert.deepEqual(pool,records);
 for(const key of ['rules','field','opponents','conditionsByPokemon'])assert.equal(next[key],state[key]);
 assert.equal(battleReducer(next,{type:'clearPlayerSlot',slot:1,identity:'b'}),next);
 assert.equal(battleReducer(state,{type:'clearPlayerSlot',slot:1,identity:'a'}),state);
 assert.equal(battleReducer(state,{type:'clearPlayerSlot',slot:3,identity:'c'}),state);
 const other=battleReducer(state,{type:'clearPlayerSlot',slot:2,identity:'c'});
 assert.equal(other.active,'b');assert.deepEqual(other.team,['a','b',null]);
});

test('clearing My Team changes only the active lineup and never stored preset references',()=>{
 const saved={...team,ids:[...team.ids]}, state={...createBattleState(),team:[...team.ids],active:'b',teamInitialized:true};
 const next=battleReducer(state,{type:'clearPlayerTeam'});
 assert.deepEqual(next.team,[]);assert.equal(next.active,null);assert.equal(next.teamInitialized,true);
 assert.deepEqual(saved,team);assert.deepEqual(state.team,team.ids);
 for(const key of Object.keys(state).filter(key=>!['team','active','teamInitialized'].includes(key)))assert.equal(next[key],state[key]);
 assert.equal(battleReducer(next,{type:'clearPlayerTeam'}),next);
});
