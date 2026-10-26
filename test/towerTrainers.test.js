import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {towerTrainerEntries, searchTowerTrainers, selectedTowerTrainer, selectedTowerSetIds, frontierTrainerSprite} from '../src/battle/towerTrainers.js';
import {battleReducer, createBattleState} from '../src/battle/battleState.js';
import {frontierTrainers} from '../src/battle/data/frontierTrainers.js';
import {towerTrainerSets, createTowerRules} from '../src/battle/towerRules.js';

test('Tower search includes 300 actual trainers and distinct Anabel Silver/Gold pools only', () => {
  assert.equal(towerTrainerEntries.length,302);
  assert.equal(new Set(towerTrainerEntries.map(entry=>entry.key)).size,302);
  assert.equal(searchTowerTrainers('  bRaDy ').length,1);
  assert.equal(searchTowerTrainers('brady')[0].name,'BRADY');
  const classes = searchTowerTrainers('youngster');
  assert.equal(classes.length,frontierTrainers.filter(t=>t.trainerClass==='Youngster').length);
  assert.ok(classes.every(entry=>entry.trainerClass==='Youngster'));
  assert.equal(searchTowerTrainers('salon maiden').length,2);
  assert.equal(searchTowerTrainers('anabel silver')[0].symbol,'Silver');
  assert.equal(searchTowerTrainers('no-such-trainer').length,0);
  assert.equal(searchTowerTrainers('').length,302);
  assert.deepEqual(towerTrainerEntries.filter(entry=>entry.symbol).map(entry=>entry.name),['Anabel','Anabel']);
});

test('trainer selection keeps player/rules, clears opponent selection and preserves temporary conditions, navigates to Sets', () => {
  for (const entry of towerTrainerEntries) {
    const before = {...createBattleState(),team:['actual-id'],active:'actual-id',opponents:['old-set'],enemy:'old-set',rules:createTowerRules({levelMode:'open',openLevel:83}),
      hpByPokemon:{old:1},conditionsByPokemon:{old:{status:'burn',stages:{speed:-6}}},field:{weather:'sun',critical:true,playerScreens:{reflect:true},enemyScreens:{lightScreen:true}}};
    const next = battleReducer(before,{type:'trainer',key:entry.key});
    assert.equal(next.team,before.team); assert.equal(next.rules,before.rules); assert.equal(next.active,before.active);
    assert.equal(next.tab,'Sets'); assert.deepEqual(next.opponents,[]); assert.equal(next.enemy,null);
    assert.equal(next.hpByPokemon,before.hpByPokemon); assert.equal(next.conditionsByPokemon,before.conditionsByPokemon);
    assert.equal(next.field,before.field);
    assert.equal(selectedTowerTrainer(next),entry);
    assert.deepEqual(selectedTowerSetIds(next),entry.setIds);
    const expected = towerTrainerSets(entry.trainer).filter(set=>!entry.symbol || set.brainSet===`Anabel ${entry.symbol}`)
      .map(set=>set.id ?? `${set.brainSet}:${set.species}`);
    assert.deepEqual(entry.setIds,expected);
    for (const tab of ['Matchup','Trainers','Teams','Rules','Sets']) assert.equal(selectedTowerTrainer(battleReducer(next,{type:'tab',tab})),entry);
    assert.equal(before.hpByPokemon.old,1);
  }
  const state=createBattleState(); assert.equal(battleReducer(state,{type:'trainer',key:'Tucker'}),state);
});

test('Anabel medals cannot inherit the other medal pool; every required sprite is local', () => {
  const silver=battleReducer(createBattleState(),{type:'trainer',key:'Anabel Silver'});
  const gold=battleReducer(silver,{type:'trainer',key:'Anabel Gold'});
  assert.equal(selectedTowerSetIds(silver).length,3); assert.equal(selectedTowerSetIds(gold).length,3);
  assert.ok(selectedTowerSetIds(silver).every(id=>id.startsWith('Anabel Silver:')));
  assert.ok(selectedTowerSetIds(gold).every(id=>id.startsWith('Anabel Gold:')));
  for (const entry of towerTrainerEntries) assert.ok(existsSync(new URL(`../public/trainers/frontier/${entry.sprite}.png`,import.meta.url)),entry.sprite);
  assert.equal(frontierTrainerSprite('Triathlete (F swimmer)'),'swimming_triathlete_f');
  assert.equal(frontierTrainerSprite('Swimmer♂'),'swimmer_m');
});

test('name-only popup search starts with every Tower entry and accepts a future candidate list',()=>{
 assert.deepEqual(searchTowerTrainers('',{nameOnly:true}),[...towerTrainerEntries].sort((a,b)=>a.name.localeCompare(b.name)));
 assert.equal(searchTowerTrainers(' bRaDy ',{nameOnly:true})[0].name,'BRADY');
 assert.equal(searchTowerTrainers('Youngster',{nameOnly:true}).length,0);
 assert.equal(searchTowerTrainers('Anabel',{nameOnly:true}).length,2);
 const entries=towerTrainerEntries.slice(0,5);
 assert.deepEqual(searchTowerTrainers('',{nameOnly:true,entries}),[...entries].sort((a,b)=>a.name.localeCompare(b.name)));
});

test('opponent trainer changes clear the lineup while preserving My Team and rules',()=>{
 const before={...createBattleState(),team:['owned'],active:'owned',opponents:['Sunkern 1','Azurill 1'],enemy:'Sunkern 1',
  selectedTrainer:'Anabel',selectedBrainSymbol:'Silver',tab:'Matchup',hpByPokemon:{'enemy-Sunkern 1':10},conditionsByPokemon:{owned:{status:'burn'}}};
 for(const entry of towerTrainerEntries.filter(entry=>!entry.symbol)){
  const next=battleReducer(before,{type:'opponentTrainer',key:entry.key});
  assert.deepEqual(next,{...before,selectedTrainer:entry.trainer,selectedBrainSymbol:entry.symbol,opponents:[],enemy:null});
  assert.deepEqual(next.opponents,[]);assert.equal(next.team,before.team);assert.equal(next.rules,before.rules);
  const cleared=battleReducer(next,{type:'clearOpponentTrainer'});
  assert.deepEqual(cleared,{...before,selectedTrainer:null,selectedBrainSymbol:null,opponents:[],enemy:null});
  assert.deepEqual(cleared.opponents,[]);assert.equal(cleared.enemy,null);
  assert.equal(cleared.team,before.team);assert.equal(cleared.rules,before.rules);
  assert.equal(battleReducer(cleared,{type:'clearOpponentTrainer'}),cleared);
 }
 assert.equal(battleReducer(before,{type:'opponentTrainer',key:'invalid'}),before);
});
