import {alexasState,swampert,observe} from './fixtures/alexasAerodactyl.js';
import {analysisMatchupSets} from '../src/battle/towerSets.js';
import {opponentStatRanges} from '../src/battle/opponentStats.js';
import {evaluateFrontierCandidates} from '../src/battle/frontierCandidateDamage.js';
import {battleMove} from '../src/battle/reference.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {battleReducer,createBattleState} from '../src/battle/battleState.js';
import {slotConditions,conditionHp} from '../src/battle/matchupConditions.js';
const initial=()=>({...createBattleState(),team:['a','b'],opponentSpecies:['x','y'],matchup:{player:'a',opponent:'x'}});
const edit=(state,side,slot,patch)=>battleReducer(state,{type:'matchupCondition',side,slot,...patch});
test('per-Pokémon conditions survive switches; Reset clears shared screens and active personal conditions',()=>{
 let s=initial();
 s=edit(s,'player',0,{field:'currentHp',value:12});
 s=edit(s,'player',0,{field:'stage',stat:'attack',value:6});
 s=edit(s,'enemy',0,{field:'screen',screen:'reflect',value:true});
 s=battleReducer(s,{type:'matchupPlayer',identity:'b'});
 s=battleReducer(s,{type:'matchupOpponent',speciesId:'y'});
 s=edit(s,'player',1,{field:'status',value:'burn'});
 s=edit(s,'enemy',1,{field:'stage',stat:'speed',value:-6});
 s=battleReducer(s,{type:'conditionField',key:'weather',value:'rain'});
 s=battleReducer(s,{type:'conditionField',key:'critical',value:true});
 s=battleReducer(s,{type:'resetMatchupConditions'});
 assert.equal(slotConditions(s,'player',0).currentHp,12);
 assert.equal(slotConditions(s,'player',0).stages.attack,6);
 assert.equal(slotConditions(s,'enemy',0).screens.reflect,undefined);
 assert.equal(slotConditions(s,'player',1).status,'none');
 assert.deepEqual(slotConditions(s,'enemy',1).stages,{});
 assert.equal(s.field.weather,'none');assert.equal(s.field.critical,false);
 s=battleReducer(s,{type:'matchupPlayer',identity:'a'});
 assert.equal(slotConditions(s,'player',0).currentHp,12);
});
test('removing a slot resets it, retaining the other slots and shared conditions',()=>{
 let s=edit(initial(),'player',0,{field:'status',value:'sleep'});
 s=edit(s,'player',1,{field:'status',value:'burn'}); // stale event rejected
 s=battleReducer(s,{type:'conditionField',key:'weather',value:'sun'});
 s=edit(s,'enemy',0,{field:'currentHp',value:45});
 s=battleReducer(s,{type:'clearPlayerSlot',slot:0,identity:'a'});
 assert.equal(slotConditions(s,'player',0).status,'none');
 assert.equal(slotConditions(s,'enemy',0).currentHp,45);assert.equal(s.field.weather,'sun');
 s=battleReducer(s,{type:'clearOpponentTrainer'});
 assert.equal(slotConditions(s,'enemy',0).currentHp,null);
});
test('HP retains full uncertainty and clamps explicit input to the possible maximum',()=>{
 assert.equal(conditionHp(null,{min:100,max:150}),null);
 assert.equal(conditionHp(120,{min:100,max:150}),120);
 assert.equal(conditionHp(120,{min:110,max:110}),110);
 assert.equal(conditionHp(-10,{min:100,max:150}),0);
 let s=edit(initial(),'enemy',0,{field:'currentHp',value:999,max:150});
 assert.equal(slotConditions(s,'enemy',0).currentHp,150);
 const before=s.matchupConditions;
 s=battleReducer(s,{type:'setQuery',query:'test'});
 assert.deepEqual(s.matchupConditions,before);
});
test('replacement and trainer changes clear only the affected slot conditions',()=>{
 let s=initial();
 s=edit(s,'player',0,{field:'status',value:'sleep'});
 s=battleReducer(s,{type:'matchupPlayer',identity:'b'});
 s=edit(s,'player',1,{field:'stage',stat:'defense',value:-3});
 s=edit(s,'enemy',0,{field:'status',value:'poison'});
 s=battleReducer(s,{type:'matchupOpponent',speciesId:'y'});
 s=edit(s,'enemy',1,{field:'screen',screen:'lightScreen',value:true});
 s=battleReducer(s,{type:'clearPlayerSlot',slot:0,identity:'a'});
 s=battleReducer(s,{type:'assignPlayer',slot:0,identity:'a',pool:[{identity:'a',dex:1}]});
 assert.equal(slotConditions(s,'player',0).status,'none');
 assert.equal(slotConditions(s,'player',1).stages.defense,-3);
 assert.equal(slotConditions(s,'enemy',0).status,'poison');
 assert.equal(slotConditions(s,'enemy',1).screens.lightScreen,true);
 s=battleReducer(s,{type:'clearOpponentSpeciesSlot',slot:0,speciesId:'x'});
 assert.equal(slotConditions(s,'enemy',0).status,'none');
 assert.equal(slotConditions(s,'enemy',1).screens.lightScreen,true);
 s=battleReducer(s,{type:'opponentTrainer',key:'Cooltrainer (M):VINCE'});
 assert.deepEqual(s.matchupConditions.enemy,{});
 assert.equal(slotConditions(s,'player',1).stages.defense,-3);
});

test('Battle current HP commits clamp to zero/full HP bounds and clearing retains full HP',()=>{
 for(const [value,expected] of [[0,0],[-10,0],[1,1],[75,75],[150,150],[999,150],[12.9,12],[null,null]]) {
  const s=edit(initial(),'player',0,{field:'currentHp',value,max:150});
  assert.equal(slotConditions(s,'player',0).currentHp,expected);
 }
 assert.equal(conditionHp(200,{min:125,max:125}),125);
});

test('selected Set changes synchronize stored, displayed and calculated opponent HP',()=>{
 for(const format of ['Singles','Doubles']) {
  let state=edit(alexasState(format),'enemy',0,{field:'currentHp',value:170,max:176});
  let evaluation=evaluateFrontierCandidates(state,swampert,battleMove('Surf'));
  assert.equal(evaluation.evaluations.length,1);assert.equal(evaluation.evaluations[0].setId,'Aerodactyl 1');
  assert.equal(evaluation.evaluations[0].availability,'available');assert.equal(evaluation.evaluations[0].defender.currentHp,170);
  assert.equal(evaluation.evaluations[0].defenderMaximumHp,176);
  // The selected canonical HP, not the wider eligible pool, owns the clamp.
  state=battleReducer(state,{type:'selectOpponentSet',setId:'Aerodactyl 3'});
  const range=opponentStatRanges(state,analysisMatchupSets(state)).hp;
  assert.deepEqual(range,{min:155,max:155});
  assert.equal(slotConditions(state,'enemy',0).currentHp,155);
  assert.equal(conditionHp(slotConditions(state,'enemy',0).currentHp,range),155);
  evaluation=evaluateFrontierCandidates(state,swampert,battleMove('Surf'));
  assert.equal(evaluation.evaluations.length,1);assert.equal(evaluation.evaluations[0].setId,'Aerodactyl 3');
  assert.equal(evaluation.evaluations[0].availability,'available');assert.equal(evaluation.evaluations[0].defender.currentHp,155);
  assert.equal(evaluation.evaluations[0].defenderMaximumHp,155);
  const conditions=state.matchupConditions;
  state=battleReducer(state,{type:'setQuery',query:'hp synchronization'});
  assert.equal(state.matchupConditions,conditions);
  state=battleReducer(state,{type:'selectOpponentSet',setId:'Aerodactyl 1'});
  assert.equal(slotConditions(state,'enemy',0).currentHp,155,'larger selected HP preserves explicit current HP');
  evaluation=evaluateFrontierCandidates(state,swampert,battleMove('Surf'));
  assert.equal(evaluation.evaluations[0].defender.currentHp,155);assert.equal(evaluation.evaluations[0].defenderMaximumHp,176);
  // Evidence that eliminates Set 1 must trigger the same selected-Set clamp.
  state=edit(state,'enemy',0,{field:'currentHp',value:170,max:176});
  state=observe(state,0,'Fire Blast');
  assert.equal(analysisMatchupSets(state)[0].id,'Aerodactyl 3');assert.equal(slotConditions(state,'enemy',0).currentHp,155);
  state=observe(state,0,'');assert.equal(slotConditions(state,'enemy',0).currentHp,155,'widening evidence preserves explicit HP');
 }
});
test('candidate changes retain null-as-full HP and valid explicit values',()=>{
 for(const hp of [null,1,100,155]) {
  let state=edit(alexasState(),'enemy',0,{field:'currentHp',value:hp,max:176});
  const conditions=state.matchupConditions;
  state=observe(state,0,'Fire Blast');
  assert.equal(state.matchupConditions,conditions,'no HP update when already valid');
  assert.equal(slotConditions(state,'enemy',0).currentHp,hp);
  const evaluation=evaluateFrontierCandidates(state,swampert,battleMove('Surf'));
  assert.ok(evaluation.evaluations.every(entry=>entry.defender.currentHp===(hp===null?155:hp)));
 }
});
