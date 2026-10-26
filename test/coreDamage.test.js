import test from 'node:test';
import assert from 'node:assert/strict';
import {neutralBaseDamage,gen3DamageCategory,calculateCoreDamage} from '../src/battle/coreDamage.js';
import {battleMove,speciesByName} from '../src/battle/reference.js';
import {battleReducer,createBattleState} from '../src/battle/battleState.js';
import {opponentStatRanges,opponentStatDisplay} from '../src/battle/opponentStats.js';

const input={level:50,attack:150,spAttack:90,defense:100,spDefense:120,power:80};
test('all 17 Gen III types select stats by type, ignoring modern categories',()=>{
 for(const type of ['NORMAL','FIGHTING','FLYING','POISON','GROUND','ROCK','BUG','GHOST','STEEL']) {
  assert.equal(gen3DamageCategory(type),'Physical');
  assert.deepEqual(neutralBaseDamage({...input,type}),{kind:'neutral-base',category:'Physical',base:54});
 }
 for(const type of ['FIRE','WATER','GRASS','ELECTRIC','PSYCHIC','ICE','DRAGON','DARK']) {
  assert.equal(gen3DamageCategory(type),'Special');
  assert.equal(neutralBaseDamage({...input,type}).base,28);
 }
 assert.equal(gen3DamageCategory('FAIRY'),null);
});
test('integer floors, level boundaries and Emerald physical minimum subtotal',()=>{
 // Lv 53: floor(106/5)+2=23; floor(23*95*123/117)=2297;
 // floor(2297/50)+2=47 (keeping fractional level factor would give 48).
 assert.equal(neutralBaseDamage({...input,level:53,power:95,attack:123,defense:117,type:'NORMAL'}).base,47);
 for(const [level,base] of [[1,6],[50,54],[100,102]])
  assert.equal(neutralBaseDamage({...input,level,type:'NORMAL'}).base,base);
 assert.equal(neutralBaseDamage({...input,level:1,power:2,attack:1,defense:999,type:'NORMAL'}).base,3);
 assert.equal(neutralBaseDamage({...input,level:1,power:2,spAttack:1,spDefense:999,type:'WATER'}).base,2);
});
test('missing combatants, nonconventional moves and invalid inputs are unavailable',()=>{
 const mon={level:50,types:['NORMAL'],stats:input};
 assert.equal(calculateCoreDamage(battleMove('Tackle'),mon,null),null);
 assert.equal(calculateCoreDamage(battleMove('Tackle'),null,mon),null);
 for(const name of ['Swords Dance','Seismic Toss','Dragon Rage','Fissure','Counter','Hidden Power','Return','Double Slap'])
  assert.equal(calculateCoreDamage(battleMove(name),mon,mon),null,name);
 for(const patch of [{level:0},{level:101},{level:50.5},{attack:NaN},{attack:0},{defense:'100–120'},{power:0},{type:'???'}])
  assert.equal(neutralBaseDamage({...input,type:'NORMAL',...patch}),null);
 assert.equal(neutralBaseDamage(),null);
});
test('rule changes clear the opponent; reselected matchup models preserve player save level in both directions',()=>{
 let state=battleReducer(createBattleState(),{type:'opponentTrainer',key:'Anabel Silver'});
 const speciesId=speciesByName.get('alakazam').internalSpeciesId;
 state=battleReducer(state,{type:'assignOpponentSpecies',slot:0,speciesId});
 state=battleReducer(state,{type:'matchupOpponent',speciesId});
 const player={types:['GRASS','POISON'],level:37,stats:{attack:123,defense:100,spAttack:90,spDefense:120},
  ability:'Inner Focus',item:'Leftovers',status:'poison',stages:{attack:0}};
 const opponent=()=>({types:['PSYCHIC'],level:state.rules.opponentLevel,stats:opponentStatDisplay(opponentStatRanges(state))});
 assert.equal(calculateCoreDamage(battleMove('Shadow Ball'),player,opponent()).base,40);
 assert.equal(calculateCoreDamage(battleMove('Psychic'),opponent(),player).base,61);
 const savedPlayer=structuredClone(player);
 state=battleReducer(state,{type:'rules',patch:{levelMode:'open',openLevel:85}});
 assert.equal(state.rules.opponentLevel,85);assert.equal(state.selectedTrainer,null);
 assert.equal(state.matchup.opponent,null);assert.deepEqual(state.opponentSpecies,[]);
 assert.deepEqual(state.opponentObservations,{});assert.equal(state.selectedOpponentSetId,null);
 assert.equal(opponentStatRanges(state),null);
 assert.equal(calculateCoreDamage(battleMove('Psychic'),opponent(),player),null,'cleared opponent inputs cannot produce damage');
 state=battleReducer(state,{type:'opponentTrainer',key:'Anabel Silver'});
 state=battleReducer(state,{type:'assignOpponentSpecies',slot:0,speciesId});
 state=battleReducer(state,{type:'matchupOpponent',speciesId});
 assert.equal(state.matchup.opponent,speciesId);assert.equal(opponent().level,85);
 assert.deepEqual(player,savedPlayer);
 assert.equal(player.level,37);
 assert.notEqual(calculateCoreDamage(battleMove('Psychic'),opponent(),player).base,61);
 // Only the required stat must be exact; irrelevant ranges do not block it.
 assert.equal(calculateCoreDamage(battleMove('Tackle'),player,{...opponent(),stats:{defense:'81–90'}}),null);
 assert.ok(calculateCoreDamage(battleMove('Tackle'),player,{types:['PSYCHIC'],stats:{defense:81,spDefense:'100–120'}}));
});
