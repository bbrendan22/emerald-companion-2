import test from 'node:test';
import assert from 'node:assert/strict';
import {frontierDamageDisplayParts,frontierMoveMetadataValues} from '../src/battle/frontierDamagePresentation.js';
import {aggregateFrontierDamage} from '../src/battle/frontierDamageAggregation.js';
import {evaluateFrontierCandidates} from '../src/battle/frontierCandidateDamage.js';
import {battleReducer} from '../src/battle/battleState.js';
import {battleMove} from '../src/battle/reference.js';
import {alexasState,swampert,observe} from './fixtures/alexasAerodactyl.js';
const choose=(state,setId)=>battleReducer(state,{type:'selectOpponentSet',setId});
const summary=(name,state=alexasState(),player=swampert)=>aggregateFrontierDamage(evaluateFrontierCandidates(state,player,battleMove(name)));
for(const format of ['Singles','Doubles'])test(`${format}: selected ALEXAS Set formats its own HP denominator and damage percentage`,()=>{
 for(const [setId,ice,surf] of [
  ['Aerodactyl 1','40.3% – 47.7%',format==='Singles'?'60.8% – 71.6%':'31.8% – 37.5%'],
  ['Aerodactyl 2','40.3% – 47.7%',format==='Singles'?'60.8% – 71.6%':'31.8% – 37.5%'],
  ['Aerodactyl 3','45.8% – 54.2%',format==='Singles'?'69.0% – 81.3%':'36.1% – 42.6%'],
  ['Aerodactyl 4','45.8% – 54.2%',format==='Singles'?'69.0% – 81.3%':'36.1% – 42.6%'],
 ]) {
  const state=choose(alexasState(format),setId);
  for(const [name,percentage,hp] of [['Ice Beam',ice,'71–84 HP damage'],
   ['Surf',surf,format==='Singles'?'107–126 HP damage':'56–66 HP damage'],['Earthquake','0% – 0%','0–0 HP damage']]) {
   const value=summary(name,state),parts=frontierDamageDisplayParts(value);
   assert.equal(value.candidateCount,1);assert.deepEqual(value.setIds,[setId]);
   assert.equal(parts.percentage,percentage);assert.equal(parts.hp,hp);assert.ok(!parts.notes.some(note=>note.startsWith('Across ')));
  }
 }
});

test('identified item produces scalar-equivalent percentages and no multiple-set note',()=>{
 const parts=frontierDamageDisplayParts(summary('Ice Beam',observe(alexasState(),'item','Choice Band')));
 assert.equal(parts.percentage,'40.3% – 47.7%');assert.deepEqual(parts.notes,[]);
});
test('zero sets and incomplete selected HP return informative messages without partial numbers',()=>{
 for(const format of ['Singles','Doubles']) {
  const zero=frontierDamageDisplayParts(summary('Ice Beam',{...alexasState(format),opponentSpecies:[]}));
  assert.equal(zero.message,'No matching Frontier sets.');assert.equal(zero.percentage,undefined);assert.equal(zero.hp,undefined);
  const state=choose(alexasState(format),'Aerodactyl 3');
  state.matchupConditions.enemy[0]={currentHp:160,status:'none',stages:{}};
  const value=summary('Ice Beam',state),parts=frontierDamageDisplayParts(value);
  assert.deepEqual(value.setIds,['Aerodactyl 3']);assert.equal(value.evaluation.evaluations[0].defenderMaximumHp,155);
  assert.match(parts.message,/Entered HP is invalid/);assert.equal(parts.hp,undefined);assert.equal(parts.percentage,undefined);
 }
});
test('unrelated field safeguards remain explicit while unresolved Trace calculates',()=>{
 const state=alexasState('Doubles');state.field.weather='rain';
 assert.match(frontierDamageDisplayParts(summary('Surf',state)).message,/Unseen abilities may suppress the weather/);
 const trace={...swampert,dex:282,name:'Gardevoir',ability:'Trace'};
 const parts=frontierDamageDisplayParts(summary('Ice Beam',alexasState(),trace));
 assert.ok(parts.hp);assert.ok(parts.percentage);assert.equal(parts.message,undefined);
});
test('mixed prevention retains a zero-inclusive envelope and concise explanation',()=>{
 const input=evaluateFrontierCandidates(alexasState(),swampert,battleMove('Ice Beam'));
 const entry=input.evaluations[0],damage=entry.abilityDamage.scenarios[0];
 // Synthetic ability outcomes for one selected Set; no unselected Set pool is needed.
 entry.abilityDamage={scenarios:[damage,{...damage,defenderAbility:'Soundproof',availability:'blocked',reason:'soundproof',
  result:{kind:'deterministic-damage',outcome:'blocked',damage:0,reason:'soundproof'}}]};
 const value=aggregateFrontierDamage(input),parts=frontierDamageDisplayParts(value);
 assert.equal(value.candidateCount,1);assert.deepEqual(value.setIds,['Aerodactyl 1']);
 assert.deepEqual(value.categories,['damage','prevented']);assert.deepEqual(value.hp,{min:0,max:84});
 assert.equal(parts.percentage,'0.0% – 47.7%');assert.equal(parts.hp,'0–84 HP damage');
 assert.ok(parts.notes.includes('Some possibilities prevent damage.'));
});
test('categorical OHKO displays outcomes without HP ranges or probabilities',()=>{
 const parts=frontierDamageDisplayParts(summary('Guillotine',alexasState(),{...swampert,level:50}));
 assert.equal(parts.outcomes[0].message,'OHKO');assert.equal(parts.hp,undefined);assert.equal(parts.percentage,undefined);
});
test('candidate metadata handles known, varying and unknown type/power',()=>{
 const value=summary('Ice Beam');assert.deepEqual(frontierMoveMetadataValues(value),{type:'ICE',power:95});
 value.metadata={status:'varying',type:null,power:null,alternatives:[{value:{type:'FIRE',power:50}},{value:{type:'WATER',power:100}}]};
 assert.deepEqual(frontierMoveMetadataValues(value),{type:null,power:'50 / 100'});
 value.metadata.status='unknown';assert.deepEqual(frontierMoveMetadataValues(value),{type:null,power:'—'});
});
test('Hidden Power and friendship metadata use verified inputs rather than collapsed models',()=>{
 const player={...swampert,ivs:{hp:31,attack:31,defense:31,spAttack:31,spDefense:31,speed:31},friendship:255};
 for(const [name,type,power] of [['Hidden Power','DARK',70],['Return','NORMAL',102],['Frustration','NORMAL',1]])
  assert.deepEqual(frontierMoveMetadataValues(summary(name,alexasState(),player)),{type,power});
});
