import test from 'node:test';
import assert from 'node:assert/strict';
import {doublesBattlefieldContext} from '../src/battle/battlefieldContext.js';
import {evaluateFrontierCandidates} from '../src/battle/frontierCandidateDamage.js';
import {battleReducer as reduce} from '../src/battle/battleState.js';
import {battleMove} from '../src/battle/reference.js';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {analysisMatchupSets,possibleMatchupSets,frontierSetId} from '../src/battle/towerSets.js';
import {alexasState,swampert} from './fixtures/alexasAerodactyl.js';
const partner={...swampert,identity:'partner',name:'Swellow',dex:277,types:['NORMAL','FLYING'],ability:'Guts',item:'Leftovers'};
const records=[swampert,partner];
const view=(s,side,slot)=>reduce(s,{type:'viewDoublesSlot',side:side==='enemy'?'opponent':side,slot});
function setup() {
 let s=alexasState('Doubles');
 s=reduce(s,{type:'selectDoublesPlayer',slot:1,identity:partner.identity,pool:records});
 return view(s,'player',0);
}
const sets=(s,slot)=>possibleMatchupSets({...s,matchup:{...s.matchup,opponent:s.opponentSpecies[slot]}});
const choose=(s,slot,set)=>reduce(s,{type:'selectOpponentSet',slot,setId:frontierSetId(set)});
const evaluate=(s,direction='player',move='Ice Beam')=>evaluateFrontierCandidates(s,records.find(mon=>mon.identity===s.matchup.player),battleMove(move),{direction,records});
const edit=(s,side,slot,patch)=>reduce(view(s,side,slot),{type:'matchupCondition',side,slot,...patch});

test('four slots reuse canonical construction, selected sets, saved records and condition projection without mutation',()=>{
 let s=setup();s=choose(s,0,sets(s,0).at(-1));s=choose(s,1,sets(s,1)[1]);
 s=edit(s,'player',1,{field:'status',value:'burn'});
 s=edit(s,'enemy',1,{field:'stage',stat:'defense',value:2});
 s=edit(s,'player',0,{field:'screen',screen:'reflect',value:true});
 s=reduce(s,{type:'conditionField',key:'weather',value:'rain'});
 const before=structuredClone({s,records});const field=doublesBattlefieldContext(s,records);
 assert.deepEqual(field.player.map(slot=>slot.identity),records.map(mon=>mon.identity));
 assert.deepEqual(field.enemy.map(slot=>slot.identity),s.opponentSpecies.slice(0,2));
 for(const slot of [0,1]) {
  assert.equal(field.enemy[slot].candidate.sourceSet,sets(s,slot).find(set=>frontierSetId(set)===s.opponentSetSelections[slot]));
  assert.equal(field.enemy[slot].pokemon.setId,s.opponentSetSelections[slot]);
  assert.equal(field.enemy[slot].pokemon.item,field.enemy[slot].candidate.sourceSet.item);
  assert.ok(Object.values(field.enemy[slot].pokemon.stats).every(Number.isInteger));
  assert.equal(field.player[slot].pokemon.currentHp,records[slot].stats.hp);
  assert.equal(field.player[slot].pokemon.screens.reflect,true);
 }
 assert.equal(field.player[1].pokemon.status,'burn');assert.equal(field.enemy[1].pokemon.stages.defense,2);
 assert.equal(field.field.weather,'rain');assert.equal(field.sides.player.activeCount,2);
 assert.deepEqual({s,records},before);
});

test('opponent observations and ability uncertainty stay attached to the corresponding slot',()=>{
 let s=setup();s=view(s,'enemy',0);
 s=reduce(s,{type:'observeOpponentAbility',slot:0,speciesId:s.opponentSpecies[0],value:'Pressure'});
 s=view(s,'enemy',1);const set=analysisMatchupSets(s)[0];
 s=reduce(s,{type:'observeOpponent',slot:1,speciesId:s.opponentSpecies[1],field:'item',value:set.item});
 const field=doublesBattlefieldContext(s,records);
 assert.deepEqual(field.enemy[0].pokemon.abilityOptions.values,['Pressure']);
 assert.equal(field.enemy[1].pokemon.abilityOptions.status,'uncertain');
 assert.equal(field.enemy[0].observations.item,'');assert.equal(field.enemy[1].observations.item,set.item);
 assert.equal(field.enemy[1].observations.ability??'','');
});

test('liveness includes fainted occupants, excludes empty slots and defaults missing HP to full',()=>{
 let s=setup();s=edit(s,'player',1,{field:'currentHp',value:0});
 s=edit(s,'enemy',0,{field:'currentHp',value:30});
 s=reduce(s,{type:'selectDoublesOpponent',slot:1,speciesId:null});
 s={...s,matchupConditions:{...s.matchupConditions,player:{...s.matchupConditions.player,0:{status:'none',stages:{}}}}};
 const field=doublesBattlefieldContext(s,records);
 assert.equal(field.player[0].pokemon.currentHp,swampert.stats.hp);
 assert.equal(field.player[0].liveness,'active');assert.equal(field.player[1].liveness,'fainted');
 assert.equal(field.player[1].pokemon.currentHp,0);assert.equal(field.enemy[0].pokemon.currentHp,30);
 assert.equal(field.enemy[1],null);assert.equal(field.sides.player.activeCount,1);assert.equal(field.sides.enemy.activeCount,1);
});

test('all four viewed pairings preserve teammates and choose correct attacking/defending slots in both directions',()=>{
 let s=setup();const original=doublesBattlefieldContext(s,records);
 for(const player of [0,1])for(const enemy of [0,1])for(const direction of ['player','enemy']) {
  s=view(view(s,'player',player),'enemy',enemy);
  const evaluated=evaluate(s,direction,direction==='player'?'Ice Beam':analysisMatchupSets(s)[0].moves[0]);
  const field=evaluated.battleContext.battlefield;
  assert.deepEqual(field.player,original.player);assert.deepEqual(field.enemy,original.enemy);
  assert.deepEqual(field.viewed,{player,opponent:enemy});
  assert.deepEqual(field.attacking,{side:direction,slot:direction==='player'?player:enemy});
  assert.deepEqual(field.defending,{side:direction==='player'?'enemy':'player',slot:direction==='player'?enemy:player});
  const entry=evaluated.evaluations[0];assert.equal(entry.battleContext.battlefield,field);
  assert.equal(entry.attacker.name,field[direction][field.attacking.slot].pokemon.name);
  assert.equal(entry.defender.name,field[field.defending.side][field.defending.slot].pokemon.name);
 }
});

test('an unviewed Set change updates field data without changing the viewed pair or damage',()=>{
 let s=setup();const before=evaluate(s);
 s=choose(s,1,sets(s,1).at(-1));const after=evaluate(s);
 assert.deepEqual(after.battleContext.battlefield.player,before.battleContext.battlefield.player);
 assert.deepEqual(after.battleContext.battlefield.enemy[0],before.battleContext.battlefield.enemy[0]);
 assert.notEqual(after.battleContext.battlefield.enemy[1].selectedSetId,before.battleContext.battlefield.enemy[1].selectedSetId);
 assert.deepEqual(after.evaluations[0].abilityDamage,before.evaluations[0].abilityDamage);
});

test('replacing one player updates only its field slot and retains other conditions',()=>{
 let s=setup();s=edit(s,'player',1,{field:'currentHp',value:0});
 const replacement={...partner,identity:'replacement'};const all=[...records,replacement];
 const before=doublesBattlefieldContext(s,all);
 s=reduce(s,{type:'selectDoublesPlayer',slot:1,identity:replacement.identity,pool:all});
 const after=doublesBattlefieldContext(s,all);
 assert.equal(after.player[1].identity,replacement.identity);assert.equal(after.player[1].liveness,'active');
 assert.equal(after.player[1].pokemon.currentHp,replacement.stats.hp);
 assert.deepEqual(after.player[0],before.player[0]);assert.deepEqual(after.enemy,before.enemy);
});

test('missing records and contradictory opponent evidence stay explicit, without fabricating partner data',()=>{
 let s=setup();s={...s,opponentObservations:{1:{item:'Impossible item',moves:['','','','']}}};
 const field=doublesBattlefieldContext(s,[swampert]);
 assert.equal(field.player[1].availability,'unavailable');assert.equal(field.player[1].pokemon,null);
 assert.equal(field.player[1].reason,'missing-battlefield-player-record');
 assert.equal(field.enemy[1].availability,'unavailable');assert.equal(field.enemy[1].pokemon,null);
 assert.equal(field.enemy[1].reason,'no-matching-frontier-sets');
 assert.equal(field.enemy[0].availability,'available');
});

test('field data adds no modifiers: spread/screens and existing field safeguards retain viewed-pair results; Singles has no field',()=>{
 let s=setup();s=edit(s,'enemy',0,{field:'screen',screen:'lightScreen',value:true});
 for(const count of [2,1]) {
  if(count===1)s=edit(s,'enemy',1,{field:'currentHp',value:0});
  const evaluated=evaluate(view(s,'enemy',0),'player','Surf');
  assert.equal(evaluated.battleContext.defenderSideAlive,count);
  for(const scenario of evaluated.evaluations[0].abilityDamage.scenarios) {
   const entry=evaluated.evaluations[0],{battlefield,...context}=entry.battleContext;
   assert.deepEqual(scenario.result,calculateCoreDamage(battleMove('Surf'),{...entry.attacker,ability:scenario.attackerAbility},{...entry.defender,ability:scenario.defenderAbility},'none',false,context));
  }
 }
 s=reduce(s,{type:'conditionField',key:'weather',value:'rain'});
 assert.equal(evaluate(view(s,'enemy',0),'player','Surf').evaluations[0].abilityDamage.scenarios[0].availability,'available','all four represented abilities now rule out weather suppression');
 const singles=alexasState();assert.equal(doublesBattlefieldContext(singles,records),null);
 assert.equal(Object.hasOwn(evaluateFrontierCandidates(singles,swampert,battleMove('Ice Beam')).battleContext,'battlefield'),false);
});
