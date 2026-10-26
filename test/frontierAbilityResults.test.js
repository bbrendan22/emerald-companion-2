import test from 'node:test';
import assert from 'node:assert/strict';
import {battleReducer,createBattleState} from '../src/battle/battleState.js';
import {speciesByName,battleMove} from '../src/battle/reference.js';
import {identifiedMatchup,analysisMatchupSets,frontierSetId} from '../src/battle/towerSets.js';
import {frontierMatchupCandidates} from '../src/battle/frontierCandidates.js';
import {evaluateFrontierCandidates} from '../src/battle/frontierCandidateDamage.js';
import {aggregateFrontierDamage,frontierAbilityResults} from '../src/battle/frontierDamageAggregation.js';
import {swampert} from './fixtures/alexasAerodactyl.js';

function snorlaxState(trainer='PKMN Ranger (M):JOVAN') {
 let state=battleReducer(createBattleState(),{type:'opponentTrainer',key:trainer});
 state=battleReducer(state,{type:'selectSinglesPlayer',identity:swampert.identity,pool:[swampert]});
 return battleReducer(state,{type:'selectSinglesOpponent',speciesId:speciesByName.get('snorlax').internalSpeciesId});
}
const summary=(state,name='Ice Beam',direction='player',player=swampert)=>aggregateFrontierDamage(evaluateFrontierCandidates(state,player,battleMove(name),{direction}));
const ability=(state,value)=>battleReducer(state,{type:'observeOpponentAbility',slot:0,speciesId:state.matchup.opponent,value});

test('Snorlax Ice Beam splits exact Immunity/Thick Fat outcomes and retains per-ability KO chances',()=>{
 const state=snorlaxState(),result=summary(state),rows=frontierAbilityResults(result);
 assert.equal(result.availability,'available');assert.equal(rows.length,2);
 assert.deepEqual(new Set(rows.map(row=>row.label)),new Set(['Immunity','Thick Fat']));
 const immunity=rows.find(row=>row.label==='Immunity').summary,thick=rows.find(row=>row.label==='Thick Fat').summary;
 assert.ok(immunity.hp.min>thick.hp.max);
 for(const row of rows) {
  assert.equal(row.summary.ko.availability,'available');
  assert.deepEqual(row.summary.hp,summary(ability(state,row.label)).hp);
  assert.deepEqual(row.summary.ko,summary(ability(state,row.label)).ko);
 }
 for(const name of ['Immunity','Thick Fat']) {
  const selected=summary(ability(state,name));
  assert.equal(frontierAbilityResults(selected).length,0);
  assert.ok(selected.branches.every(branch=>branch.scenario.defenderAbility===name));
 }
 assert.equal(frontierAbilityResults(summary(state,'Earthquake')).length,0);
});
test('ability-specific results reflect conditions immediately and handle uncertain attackers',()=>{
 const state=snorlaxState();
 const screen=battleReducer(state,{type:'matchupCondition',side:'enemy',slot:0,field:'screen',screen:'lightScreen',value:true});
 const before=frontierAbilityResults(summary(state)),after=frontierAbilityResults(summary(screen));
 for(const row of before)assert.ok(after.find(value=>value.label===row.label).summary.hp.max<row.summary.hp.max);
 // Guts changes the unresolved opponent attacker's damage under burn.
 let heracross=battleReducer(state,{type:'selectSinglesOpponent',speciesId:speciesByName.get('heracross').internalSpeciesId});
 const set=analysisMatchupSets(heracross)[0];assert.ok(set);
 heracross=battleReducer(heracross,{type:'matchupCondition',side:'enemy',slot:0,field:'status',value:'burn'});
 const attack=set.moves.find(name=>battleMove(name)?.power>0 && ['FIGHTING','NORMAL','GROUND','ROCK'].includes(battleMove(name)?.type));assert.ok(attack);
 const result=summary(heracross,attack,'enemy');
 assert.equal(result.availability,'available');
 assert.deepEqual(new Set(frontierAbilityResults(result).map(row=>row.label)),new Set(['Guts','Swarm']));
});
test('Anabel predetermined data is preserved for both symbols',()=>{
 for(const symbol of ['Silver','Gold']) {
  const state=snorlaxState(`Anabel ${symbol}`),set=analysisMatchupSets(state)[0],identified=identifiedMatchup(state);
  assert.equal(set.brainSet,`Anabel ${symbol}`);
  assert.deepEqual(identified.moves,set.moves);assert.equal(identified.item,set.item);
  const candidate=frontierMatchupCandidates(state).candidates[0];
  assert.equal(candidate.availability,'available');
  assert.equal(candidate.opponent.setId,frontierSetId(set));
  assert.deepEqual(candidate.opponent.stats,set.level50Stats && {hp:set.level50Stats.hp,attack:set.level50Stats.atk,defense:set.level50Stats.def,spAttack:set.level50Stats.spa,spDefense:set.level50Stats.spd,speed:set.level50Stats.spe});
  assert.equal(frontierAbilityResults(summary(state)).length,2);
 }
});

test('ability equivalence compares all raw rolls even when min/max and rounded ranges agree',()=>{
 const evaluation=evaluateFrontierCandidates(snorlaxState(),swampert,battleMove('Ice Beam'),{direction:'player'});
 const scenarios=evaluation.evaluations[0].abilityDamage.scenarios;
 const result=scenarios[0].result;
 const rolls=[...result.rolls];rolls[1]=rolls[0]===rolls.at(-1)?rolls[1]:Math.min(rolls.at(-1),rolls[1]+1);
 const changed={...result,rolls};
 const entry={...evaluation.evaluations[0],abilityDamage:{scenarios:[scenarios[0],{...scenarios[1],result:changed}]}};
 const rows=frontierAbilityResults(aggregateFrontierDamage({...evaluation,evaluations:[entry]}));
 assert.equal(rows.length,2);
 assert.deepEqual(rows[0].summary.hp,rows[1].summary.hp);
 assert.notDeepEqual(rows[0].summary.branches[0].result.rolls,rows[1].summary.branches[0].result.rolls);
});

test('unresolved Trace and Synchronize collapse into the same complete result',()=>{
 let state=battleReducer(snorlaxState(),{type:'opponentTrainer',key:'Cooltrainer (M):KAYDEN'});
 state=battleReducer(state,{type:'selectSinglesOpponent',speciesId:speciesByName.get('gardevoir').internalSpeciesId});
 assert.equal(state.matchup.opponent,speciesByName.get('gardevoir').internalSpeciesId);
 const result=summary(state,'Surf');
 assert.equal(result.availability,'available');
 assert.equal(frontierAbilityResults(result).length,0,'no redundant ability rows');
 assert.equal(result.groups.length,1);
 assert.deepEqual(new Set(result.branches.map(branch=>branch.scenario.defenderAbility)),new Set(['Synchronize','Trace']));
});
