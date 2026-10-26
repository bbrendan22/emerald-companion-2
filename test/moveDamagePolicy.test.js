import test from 'node:test';
import assert from 'node:assert/strict';
import {battleMove,isSelectableBattleMove,speciesByName} from '../src/battle/reference.js';
import {moveDamageNotice,isUnsupportedSpecialMove,specialBattleStateMessage} from '../src/battle/moveDamagePolicy.js';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {observationChoices} from '../src/battle/towerSets.js';
import {createBattleState} from '../src/battle/battleState.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';
import {readPokemon} from '../src/save/readPokemon.js';
import {makePokemon} from './fixtures/synthetic.js';
import baseline from './fixtures/damageFinalizationBaseline.json' with {type:'json'};

test('all 138 status moves retain descriptions and eligibility for normal selection',()=>{
 const status=baseline.moves.filter(m=>m.category==='status');assert.equal(status.length,138);
 for(const row of status){
  const move=battleMove(row.id);
  assert.deepEqual(moveDamageNotice(move),{heading:'Move effect',message:move.description},move.name);
  assert.ok(move.description.trim());assert.equal(isSelectableBattleMove(move.id),true,move.name);
  assert.equal(isSelectableBattleMove(move.name),true,move.name);
  assert.equal(calculateCoreDamage(move,baseline.mon,baseline.mon),null);
 }
});

test('all seven unsupported moves have exactly the requested notice and cannot enter generic damage through modified metadata',()=>{
 for(const name of ['Counter','Mirror Coat','Bide','Beat Up','Future Sight','Doom Desire','Spit Up']){
  const move=battleMove(name);
  assert.equal(isUnsupportedSpecialMove(move),true);
  assert.deepEqual(moveDamageNotice(move),{heading:'Damage Calculation',message:'Damage unavailable: requires special battle-state handling.'});
  assert.equal(moveDamageNotice(move).message,specialBattleStateMessage);
  assert.equal(calculateCoreDamage({...move,power:100,effect:'HIT'},baseline.mon,baseline.mon),null,name);
  assert.equal(isSelectableBattleMove(name),true);
 }
 for(const name of ['Pound','Fissure','Struggle','Psywave','Triple Kick'])assert.equal(moveDamageNotice(battleMove(name)),null);
});

test('Struggle is the only real move excluded from normal selection, while lookup and imported move data remain intact',()=>{
 const all=baseline.moves.map(m=>battleMove(m.id));
 assert.deepEqual(all.filter(move=>!isSelectableBattleMove(move.id)).map(m=>m.name),['Struggle']);
 assert.equal(isSelectableBattleMove(0),false);assert.equal(isSelectableBattleMove('Struggle'),false);
 const record={...readPokemon(makePokemon({species:1,pid:0,experience:117360})),identity:'imported'};
 record.moves[0]={...record.moves[0],id:165};const before=structuredClone(record);
 const imported=toBattlePokemon(record);assert.ok(imported);assert.equal(imported.moves[0].name,'Struggle');
 assert.deepEqual(record,before);
 const result=calculateCoreDamage(imported.moves[0],baseline.mon,{...baseline.mon,types:['GHOST']});
 assert.equal(result.kind,'standard-damage');assert.equal(result.effectiveness,1);assert.equal(result.stab,1);assert.ok(result.min>0);
 const state={...createBattleState(),opponentSpecies:[speciesByName.get('smeargle').internalSpeciesId],matchup:{player:null,opponent:speciesByName.get('smeargle').internalSpeciesId}};
 const choices=observationChoices(state,0);assert.ok(choices.length);assert.equal(choices.includes('Struggle'),false);
 assert.ok(choices.every(name=>isSelectableBattleMove(name)));
});
