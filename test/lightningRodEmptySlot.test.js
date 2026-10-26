import test from 'node:test';
import assert from 'node:assert/strict';
import {battleReducer as reduce,createBattleState} from '../src/battle/battleState.js';
import {evaluateFrontierCandidates} from '../src/battle/frontierCandidateDamage.js';
import {battleMove,speciesByName} from '../src/battle/reference.js';
import {aggregateFrontierDamage,frontierAbilityResults} from '../src/battle/frontierDamageAggregation.js';
import {frontierDamageDisplayParts} from '../src/battle/frontierDamagePresentation.js';
import {swampert} from './fixtures/alexasAerodactyl.js';
const swellow={...swampert,identity:'swellow',name:'Swellow',dex:277,level:50,types:['NORMAL','FLYING'],ability:'Guts',stats:{hp:150,attack:100,defense:80,spAttack:70,spDefense:80,speed:145}};
const partner={...swampert,level:50};
const holder={...swellow,identity:'manectric',name:'Manectric',dex:310,types:['ELECTRIC'],ability:'Lightning Rod'};
const uncertain={...swellow,identity:'trace',name:'Gardevoir',dex:282,types:['PSYCHIC'],ability:'Trace'};
const records=[swellow,partner,holder,uncertain];
function setup() {
 let s=reduce(createBattleState(),{type:'rules',patch:{format:'Doubles'}});
 s=reduce(s,{type:'opponentTrainer',key:'Expert (M):ALEXAS'});
 s=reduce(s,{type:'selectDoublesPlayer',slot:0,identity:swellow.identity,pool:records});
 s=reduce(s,{type:'selectDoublesOpponent',slot:0,speciesId:speciesByName.get('aggron').internalSpeciesId});
 return reduce(s,{type:'selectOpponentSet',slot:0,setId:'Aggron 3'});
}
const evaluate=s=>evaluateFrontierCandidates(s,records.find(mon=>mon.identity===s.matchup.player),battleMove('Thunder'),{direction:'enemy',records});
const assign=(s,mon)=>reduce(s,{type:'selectDoublesPlayer',slot:1,identity:mon?.identity??null,pool:records});

test('exact Swellow versus Aggron Set 3 Thunder: both second slots empty calculates normally',()=>{
 const s=setup(),result=evaluate(s);
 assert.equal(s.rules.opponentLevel,50);assert.equal(s.opponentSetSelections[0],'Aggron 3');
 assert.equal(result.battleContext.battlefield.player[1],null);assert.equal(result.battleContext.battlefield.enemy[1],null);
 assert.deepEqual(s.viewed,{player:0,opponent:0});
 assert.equal(result.evaluations.length,1);
 for(const scenario of result.evaluations[0].abilityDamage.scenarios) {
  assert.equal(scenario.availability,'available');assert.equal(scenario.target.status,'selected');
  assert.equal(scenario.target.name,'Swellow');assert.equal(scenario.result.rolls.length,16);assert.ok(scenario.result.max>0);
 }
 const summary=aggregateFrontierDamage(result),parts=frontierDamageDisplayParts(summary);
 assert.equal(summary.availability,'available');assert.match(parts.targetMessage,/Target: Swellow/);assert.ok(parts.percentage);
});

test('empty-slot permutations cannot change Thunder against Swellow when the added Pokémon has no relevant ability',()=>{
 const empty=setup(),expected=evaluate(empty).evaluations[0].abilityDamage.scenarios.map(s=>s.result);
 const own=assign(empty,partner);
 const enemy=reduce(empty,{type:'selectDoublesOpponent',slot:1,speciesId:speciesByName.get('aerodactyl').internalSpeciesId});
 for(const state of [own,enemy,assign(enemy,partner)]) {
  const result=evaluate(state);
  assert.deepEqual(result.evaluations[0].abilityDamage.scenarios.map(s=>s.result),expected);
  assert.ok(result.evaluations[0].abilityDamage.scenarios.every(s=>s.target.name==='Swellow'));
 }
});

test('a real eligible holder redirects; an attacking-side holder does not',()=>{
 let s=assign(setup(),holder);let result=evaluate(s);
 assert.ok(result.evaluations[0].abilityDamage.scenarios.every(s=>s.target.status==='redirected'&&s.target.name==='Manectric'&&s.result.max>0));
 s=reduce(setup(),{type:'selectDoublesOpponent',slot:1,speciesId:speciesByName.get('rhydon').internalSpeciesId});
 result=evaluate(s);assert.ok(result.evaluations[0].abilityDamage.scenarios.every(s=>s.target.name==='Swellow'&&s.availability==='available'));
});

test('populated unresolved Trace is neutral while missing populated data stays uncertain; genuine legal alternatives retain separate targets',()=>{
 let s=assign(setup(),uncertain),result=evaluate(s);
 assert.ok(result.evaluations[0].abilityDamage.scenarios.every(s=>s.availability==='available'&&s.target.name==='Swellow'));
 result=evaluateFrontierCandidates(assign(setup(),partner),swellow,battleMove('Thunder'),{direction:'enemy',records:[swellow]});
 assert.ok(result.evaluations[0].abilityDamage.scenarios.every(s=>s.reason==='unknown-lightning-rod-target'));
 const choices={...holder,ability:'Static / Lightning Rod',abilityOptions:{status:'uncertain',source:'species',values:['Static','Lightning Rod']}};
 s=assign(setup(),holder);
 result=evaluateFrontierCandidates(s,swellow,battleMove('Thunder'),{direction:'enemy',records:[swellow,choices]});
 const rows=frontierAbilityResults(aggregateFrontierDamage(result));
 assert.equal(rows.length,2);
 assert.ok(rows.some(row=>row.summary.branches.every(branch=>branch.target.name==='Swellow')));
 assert.ok(rows.some(row=>row.summary.branches.every(branch=>branch.target.name==='Manectric')));
});

test('fainted populated slots stay distinct from empty slots, and clearing a holder removes its redirection',()=>{
 for(const mon of [partner,holder]) {
  let s=assign(setup(),mon);s=reduce(s,{type:'viewDoublesSlot',side:'player',slot:1});
  s=reduce(s,{type:'matchupCondition',side:'player',slot:1,field:'currentHp',value:0});
  s=reduce(s,{type:'viewDoublesSlot',side:'player',slot:0});
  let result=evaluate(s);assert.equal(result.battleContext.battlefield.player[1].liveness,'fainted');
  if(mon===holder)assert.ok(result.evaluations[0].abilityDamage.scenarios.every(s=>s.reason==='lightning-rod-fainted-target'));
  else assert.ok(result.evaluations[0].abilityDamage.scenarios.every(s=>s.availability==='available'&&s.target.name==='Swellow'));
  s=assign(s,null);result=evaluate(s);
  assert.equal(result.battleContext.battlefield.player[1],null);
  assert.ok(result.evaluations[0].abilityDamage.scenarios.every(s=>s.availability==='available'&&s.target.name==='Swellow'));
 }
});

test('view switches and selected Set changes preserve empty-slot and targeting semantics',()=>{
 let s=assign(setup(),partner);
 for(const slot of [1,0])s=reduce(s,{type:'viewDoublesSlot',side:'player',slot});
 s=assign(s,null);s=reduce(s,{type:'selectOpponentSet',slot:0,setId:'Aggron 4'});
 s=reduce(s,{type:'selectOpponentSet',slot:0,setId:'Aggron 3'});
 const result=evaluate(s);
 assert.equal(result.evaluations[0].setId,'Aggron 3');
 assert.deepEqual(s.viewed,{player:0,opponent:0});
 assert.ok(result.evaluations[0].abilityDamage.scenarios.every(s=>s.availability==='available'&&s.target.name==='Swellow'));
});
