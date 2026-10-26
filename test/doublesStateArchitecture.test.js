import test from 'node:test';
import assert from 'node:assert/strict';
import {battleReducer as reduce,createBattleState} from '../src/battle/battleState.js';
import {availableOpponentSpecies} from '../src/battle/opponentSpecies.js';
import {possibleMatchupSets,frontierSetId,matchupObservations} from '../src/battle/towerSets.js';
import {slotConditions} from '../src/battle/matchupConditions.js';
const pool=[{identity:'a',dex:1},{identity:'b',dex:1},{identity:'c',dex:2}];
const view=(s,side,slot)=>reduce(s,{type:'viewDoublesSlot',side,slot});
const condition=(s,side,field,value,extra={})=>reduce(s,{type:'matchupCondition',side,slot:s.viewed[side==='enemy'?'opponent':side],field,value,...extra});
function setup() {
 let s=reduce(createBattleState(),{type:'rules',patch:{format:'Doubles'}});
 s=reduce(s,{type:'opponentTrainer',key:'Expert (M):ALEXAS'});
 const species=availableOpponentSpecies(s);
 for(let slot=0;slot<2;slot++) {
  s=reduce(s,{type:'selectDoublesPlayer',slot,identity:pool[slot].identity,pool});
  s=reduce(s,{type:'selectDoublesOpponent',slot,speciesId:species[slot].id});
 }
 return view(view(s,'player',0),'opponent',0);
}
test('two active slots use distinct saved identities even for the same species; empty/invalid views are rejected',()=>{
 let s=setup();assert.equal(s.rules.teamSize,4);assert.equal(s.team.length,2);assert.equal(s.opponentSpecies.slice(0,2).filter(Boolean).length,2);
 assert.ok(s.opponentSpecies.slice(2).every(id=>id===null));
 assert.deepEqual(s.team,['a','b']);
 for(const slot of [2,3,-1]) {
  assert.equal(reduce(s,{type:'selectDoublesPlayer',slot,identity:'c',pool}),s);
  assert.equal(view(s,'player',slot),s);
 }
 assert.equal(reduce(s,{type:'selectDoublesPlayer',slot:1,identity:'a',pool}),s);
 assert.equal(reduce(s,{type:'selectDoublesOpponent',slot:1,speciesId:s.opponentSpecies[0]}),s);
 s=reduce(s,{type:'selectDoublesPlayer',slot:1,identity:null,pool});
 assert.equal(view(s,'player',1),s);
});
test('views preserve independent sets, observations, abilities, HP, status and stages across all four combinations',()=>{
 let s=setup();const expected=[];
 for(let slot=0;slot<2;slot++) {
  s=view(view(s,'player',slot),'opponent',slot);
  const set=possibleMatchupSets(s).at(-1);
  s=reduce(s,{type:'selectOpponentSet',slot,setId:frontierSetId(set)});
  s=reduce(s,{type:'observeOpponent',slot,speciesId:s.opponentSpecies[slot],field:'item',value:set.item});
  s=reduce(s,{type:'observeOpponent',slot,speciesId:s.opponentSpecies[slot],field:0,value:set.moves[0]});
  assert.equal(matchupObservations(s).item,set.item);
  assert.equal(matchupObservations(s).moves[0],set.moves[0]);
  for(const side of ['player','enemy']) {
   s=condition(s,side,'currentHp',20+slot);
   s=condition(s,side,'status',slot?'sleep':'burn');
   s=condition(s,side,'stage',slot+1,{stat:'attack'});
   s=condition(s,side,'abilityContext',null,{context:'Trace'});
   s=condition(s,side,'copiedAbility','Flash Fire',{context:'Trace'});
   s=condition(s,side,'flashFireActivated',true,{context:'Trace'});
  }
  expected.push({set:frontierSetId(set),observations:matchupObservations(s)});
 }
 const assignments=[s.team,s.opponentSpecies],personal=s.matchupConditions,observations=s.opponentObservations,sets=s.opponentSetSelections;
 for(const player of [0,1])for(const opponent of [0,1]) {
  s=view(view(s,'player',player),'opponent',opponent);
  assert.deepEqual(s.viewed,{player,opponent});
  assert.equal(s.team,assignments[0]);assert.equal(s.opponentSpecies,assignments[1]);
  assert.equal(s.matchupConditions,personal);assert.equal(s.opponentObservations,observations);assert.equal(s.opponentSetSelections,sets);
  assert.equal(s.selectedOpponentSetId,expected[opponent].set);assert.deepEqual(matchupObservations(s),expected[opponent].observations);
  assert.equal(slotConditions(s,'player',player).currentHp,20+player);
  assert.equal(slotConditions(s,'enemy',opponent).stages.attack,opponent+1);
  assert.equal(slotConditions(s,'player',player).abilityState.flashFireActivated,true);
 }
});
test('canonical set changes are analysis choices, never observations',()=>{
 let s=setup();
 const sets=possibleMatchupSets(s);assert.ok(sets.length>1);
 const shared=sets.flatMap(set=>set.moves).find(move=>sets.filter(set=>set.moves.includes(move)).length>1);assert.ok(shared);
 s=reduce(s,{type:'observeOpponent',slot:0,speciesId:s.opponentSpecies[0],field:0,value:shared});
 const before=s.opponentObservations;assert.equal(matchupObservations(s).moves[0],shared);
 assert.ok(possibleMatchupSets(s).length>1);
 for(const set of possibleMatchupSets(s)) {
  s=reduce(s,{type:'selectOpponentSet',slot:0,setId:frontierSetId(set)});
  assert.equal(s.opponentObservations,before);assert.equal(s.opponentSetSelections[0],frontierSetId(set));
 }
});
test('replacement resets only the affected occupant while preserving weather and side screens',()=>{
 let s=setup();
 for(const slot of [0,1]) {
  s=view(view(s,'player',slot),'opponent',slot);
  s=condition(s,'player','status','burn');s=condition(s,'enemy','status','sleep');
  const set=possibleMatchupSets(s)[0];
  s=reduce(s,{type:'observeOpponent',slot,speciesId:s.opponentSpecies[slot],field:0,value:set.moves[0]});
 }
 s=reduce(s,{type:'conditionField',key:'weather',value:'rain'});
 s=condition(s,'player','screen',true,{screen:'reflect'});s=condition(s,'enemy','screen',true,{screen:'lightScreen'});
 const old=s;
 s=reduce(s,{type:'selectDoublesPlayer',slot:0,identity:'c',pool});
 assert.equal(slotConditions(s,'player',0).status,'none');assert.equal(s.matchupConditions.player[1],old.matchupConditions.player[1]);
 assert.equal(s.matchupConditions.enemy,old.matchupConditions.enemy);assert.equal(s.opponentObservations,old.opponentObservations);
 const replacement=availableOpponentSpecies(s).find(mon=>!s.opponentSpecies.includes(mon.id));
 s=reduce(s,{type:'selectDoublesOpponent',slot:0,speciesId:replacement.id});
 assert.equal(slotConditions(s,'enemy',0).status,'none');assert.equal(s.opponentObservations[0],undefined);
 assert.equal(s.opponentObservations[1],old.opponentObservations[1]);assert.equal(s.matchupConditions.enemy[1],old.matchupConditions.enemy[1]);
 assert.equal(s.opponentSetSelections[1],old.opponentSetSelections[1]);assert.equal(s.field,old.field);assert.equal(s.matchupSides,old.matchupSides);
 assert.equal(slotConditions(s,'player',1).screens.reflect,true);assert.equal(slotConditions(s,'enemy',1).screens.lightScreen,true);
});
test('format changes discard the complete battle in both directions without restoring sessions',()=>{
 let s=setup();s=condition(s,'player','status','burn');s=condition(s,'enemy','screen',true,{screen:'reflect'});
 s=reduce(s,{type:'conditionField',key:'weather',value:'sun'});
 s={...s,round:'2',hpByPokemon:{old:10},conditionsByPokemon:{old:{status:'burn'}}};
 for(const format of ['Singles','Doubles']) {
  s=reduce(s,{type:'rules',patch:{format}});
  assert.deepEqual(s.team,[]);assert.deepEqual(s.opponentSpecies,[]);assert.equal(s.selectedTrainer,null);
  assert.deepEqual(s.matchup,{player:null,opponent:null});assert.deepEqual(s.viewed,{player:0,opponent:0});
  assert.equal(s.selectedOpponentSetId,null);assert.deepEqual(s.opponentSetSelections,{});assert.deepEqual(s.opponentObservations,{});
  assert.deepEqual(s.matchupConditions,{player:{},enemy:{}});assert.deepEqual(s.hpByPokemon,{});assert.deepEqual(s.conditionsByPokemon,{});
  assert.equal(s.field.weather,'none');assert.deepEqual(s.matchupSides,createBattleState().matchupSides);assert.equal(s.round,'2');
 }
});

test('an unviewed opponent set can change without changing either view or recording evidence',()=>{
 let s=setup();const before=s;
 const projected={...s,matchup:{...s.matchup,opponent:s.opponentSpecies[1]}};
 const set=possibleMatchupSets(projected).at(-1);
 s=reduce(s,{type:'selectOpponentSet',slot:1,setId:frontierSetId(set)});
 assert.equal(s.matchup,before.matchup);assert.equal(s.viewed,before.viewed);assert.equal(s.selectedOpponentSetId,before.selectedOpponentSetId);
 assert.equal(s.opponentSetSelections[1],frontierSetId(set));assert.equal(s.opponentObservations,before.opponentObservations);
 const next=view(s,'opponent',1);assert.equal(next.selectedOpponentSetId,frontierSetId(set));
});

test('the first assignment selects a populated view, and clearing a viewed slot falls back independently',()=>{
 let s=reduce(createBattleState(),{type:'rules',patch:{format:'Doubles'}});
 s=reduce(s,{type:'selectDoublesPlayer',slot:1,identity:'b',pool});
 assert.equal(s.viewed.player,1);assert.equal(s.matchup.player,'b');assert.equal(s.viewed.opponent,0);
 s=reduce(s,{type:'selectDoublesPlayer',slot:0,identity:'a',pool});
 s=reduce(s,{type:'selectDoublesPlayer',slot:1,identity:null,pool});
 assert.equal(s.viewed.player,0);assert.equal(s.matchup.player,'a');
 s=reduce(s,{type:'opponentTrainer',key:'Expert (M):ALEXAS'});
 const mon=availableOpponentSpecies(s)[0];
 s=reduce(s,{type:'selectDoublesOpponent',slot:0,speciesId:mon.id});
 assert.equal(s.viewed.opponent,0);assert.equal(s.matchup.opponent,mon.id);
});
