import test from 'node:test';
import assert from 'node:assert/strict';
import {battleReducer, createBattleState, battleTabs} from '../src/battle/battleState.js';
import {createTowerRules, trainerKey} from '../src/battle/towerRules.js';
import {frontierTrainers} from '../src/battle/data/frontierTrainers.js';

test('Battle shell defaults to honest empty Tower Singles state and Matchup', () => {
  const state = createBattleState();
  assert.deepEqual(state.team,[]); assert.deepEqual(state.opponents,[]);
  assert.equal(state.active,null); assert.equal(state.enemy,null); assert.equal(state.selectedTrainer,null);
  assert.equal(state.tab,'Matchup'); assert.deepEqual(state.rules,createTowerRules());
  assert.deepEqual(battleTabs,['Matchup','Trainers','Sets','Teams','Rules']);
  assert.notEqual(state.field.playerScreens,createBattleState().field.playerScreens);
});

test('real Frontier records never initialize teams; explicit selection survives collection updates', () => {
  const pool = [{identity:'ot:pid:0',dex:1},{identity:'ot:pid:1',dex:1},{identity:'b',dex:2},{identity:'c',dex:3},{identity:'d',dex:4}];
  const empty = createBattleState();
  assert.equal(battleReducer(empty,{type:'collection',records:pool,pool}),empty);
  assert.equal(battleReducer(empty,{type:'collection',records:pool,pool,autoInitialize:true}),empty);
  const state = battleReducer(empty,{type:'assignPlayer',slot:0,identity:'ot:pid:0',pool});
  assert.deepEqual(state.team,['ot:pid:0',null,null]); assert.equal(state.active,'ot:pid:0');
  assert.equal(battleReducer(state,{type:'collection',records:pool,pool:pool.toReversed(),preserveSlots:true}),state);
  assert.equal(battleReducer(empty,{type:'collection',records:pool,pool:[]}),empty);
});

test('all five tabs preserve teams, trainer, rules and both active identities', () => {
  const state = {...createBattleState(),team:['a','b'],active:'b',selectedTrainer:trainerKey(frontierTrainers[0]),opponents:['Sunkern 1','Azurill 1'],enemy:'Azurill 1',rules:createTowerRules({levelMode:'open',openLevel:73})};
  for (const tab of battleTabs) {
    const next = battleReducer(state,{type:'tab',tab});
    assert.deepEqual(next,{...state,tab});
    assert.equal(next.team,state.team); assert.equal(next.rules,state.rules);
  }
  assert.equal(battleReducer(state,{type:'tab',tab:'Factory'}),state);
});

test('player and opponent active selection only accept occupied team slots', () => {
  const state = {...createBattleState(),team:['a','b'],active:'a',opponents:['Sunkern 1','Azurill 1'],enemy:'Sunkern 1'};
  const player = battleReducer(state,{type:'activePlayer',identity:'b'});
  const enemy = battleReducer(player,{type:'activeOpponent',setId:'Azurill 1'});
  assert.equal(enemy.active,'b'); assert.equal(enemy.enemy,'Azurill 1');
  assert.deepEqual(enemy.team,state.team); assert.deepEqual(enemy.opponents,state.opponents);
  assert.equal(battleReducer(enemy,{type:'activePlayer',identity:'missing'}),enemy);
  assert.equal(battleReducer(enemy,{type:'activeOpponent',setId:'missing'}),enemy);
  assert.equal(state.active,'a');
});

test('collection refresh preserves valid selections and removes missing records without refilling', () => {
  const state = {...createBattleState(),team:['a','b','c'],active:'b',teamInitialized:true};
  const next = battleReducer(state,{type:'collection',records:[{identity:'a'},{identity:'c'},{identity:'d'}],pool:[{identity:'d',dex:4}]});
  assert.deepEqual(next.team,['a','c']); assert.equal(next.active,'a');
  const removed = battleReducer(next,{type:'collection',records:[],pool:[]});
  assert.deepEqual(removed.team,[]); assert.equal(removed.active,null);
});
