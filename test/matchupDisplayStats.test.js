import test from 'node:test';
import assert from 'node:assert/strict';
import {effectiveDisplayStats,displayStatValues,matchupDisplayStats,compareSpeedRanges,opponentDisplayRows} from '../src/battle/matchupDisplayStats.js';
import {createBattleState} from '../src/battle/battleState.js';
import {speciesByName} from '../src/battle/reference.js';
import {possibleMatchupSets} from '../src/battle/towerSets.js';
import {opponentStatRanges} from '../src/battle/opponentStats.js';
const options=(...values)=>({status:values.length===1?'known':'uncertain',values});
const mon=(ability='Overgrow',patch={})=>({dex:1,stats:{hp:201,attack:101,defense:101,spAttack:101,spDefense:101,speed:101},ability,abilityOptions:options(ability),item:'None',status:'none',stages:{},currentHp:null,...patch});
const state=createBattleState();
const matchup=(player,opponent,patch={})=>matchupDisplayStats({player,opponent,state:{...state,...patch},sets:[]});
test('five stats use integer stages; HP uses current/max without stages',()=>{
 const source=mon('Overgrow',{currentHp:80,stages:{hp:6,attack:2,defense:-1,spAttack:1,spDefense:-2,speed:1}}),before=structuredClone(source);
 assert.deepEqual(effectiveDisplayStats(source),{hp:201,attack:202,defense:67,spAttack:151,spDefense:50,speed:151});
 assert.equal(displayStatValues([source]).hp,'80/201');assert.deepEqual(source,before);
});
test('confirmed weather Speed abilities apply before stages; Brace then paralysis',()=>{
 for(const [ability,weather] of [['Swift Swim','rain'],['Chlorophyll','sun']]){
  const holder=mon(ability,{item:'Macho Brace',status:'paralysis',stages:{speed:-1}});
  assert.equal(effectiveDisplayStats(holder,{weather}).speed,16); // floor(202*2/3)=134, /2=67, /4=16
  assert.equal(effectiveDisplayStats(holder,{weather:'none'}).speed,8);
 }
});
test('ability and item boosts use raw stat operands before integer stages',()=>{
 assert.equal(effectiveDisplayStats(mon('Huge Power',{item:'Choice Band',stages:{attack:-1}})).attack,202);
 assert.equal(effectiveDisplayStats(mon('Pure Power')).attack,202);
 assert.equal(effectiveDisplayStats(mon('Guts',{status:'poison',stages:{attack:-1}})).attack,100);
 assert.equal(effectiveDisplayStats(mon('Marvel Scale',{status:'sleep',stages:{defense:-1}})).defense,100);
 assert.equal(effectiveDisplayStats(mon('Hustle')).attack,151);
 assert.equal(effectiveDisplayStats(mon('Guts')).attack,101);
 assert.equal(effectiveDisplayStats(mon('Plus'),{otherAbility:'Minus'}).spAttack,151);
 assert.equal(effectiveDisplayStats(mon('Plus')).spAttack,101);
});
test('species items apply to their Emerald stats; type items and Frontier Soul Dew do not',()=>{
 assert.equal(effectiveDisplayStats(mon('Static',{dex:25,item:'Light Ball'})).spAttack,202);
 assert.equal(effectiveDisplayStats(mon('Lightning Rod',{dex:104,item:'Thick Club'})).attack,202);
 assert.equal(effectiveDisplayStats(mon('Shell Armor',{dex:366,item:'DeepSeaTooth'})).spAttack,202);
 assert.equal(effectiveDisplayStats(mon('Shell Armor',{dex:366,item:'DeepSeaScale'})).spDefense,202);
 assert.equal(effectiveDisplayStats(mon('Limber',{dex:132,item:'Metal Powder',transformed:false})).defense,202);
 assert.equal(effectiveDisplayStats(mon('Levitate',{dex:380,item:'Soul Dew'})).spDefense,101);
 assert.equal(effectiveDisplayStats(mon('Overgrow',{item:'Miracle Seed'})).spAttack,101);
});
test('burn, screens, critical, Helping Hand and damage weather boosts do not alter stats',()=>{
 const healthy=effectiveDisplayStats(mon());
 assert.deepEqual(effectiveDisplayStats(mon('Overgrow',{status:'burn',screens:{reflect:true,lightScreen:true},helpingHand:true,critical:true}),{weather:'sun'}),healthy);
});
test('unknown ability and item leave display unchanged',()=>{
 const holder=mon('Swift Swim / Rain Dish',{abilityOptions:options('Swift Swim','Rain Dish'),item:null});
 assert.equal(effectiveDisplayStats(holder,{weather:'rain'}).speed,101);
 assert.equal(effectiveDisplayStats(mon('Huge Power / Thick Fat',{abilityOptions:options('Huge Power','Thick Fat')})).attack,101);
});
test('range comparison colors only guaranteed strict inequalities',()=>{
 assert.deepEqual(compareSpeedRanges({min:120,max:120},{min:80,max:110}),{player:'faster',opponent:'slower'});
 assert.deepEqual(compareSpeedRanges({min:80,max:110},{min:120,max:120}),{player:'slower',opponent:'faster'});
 for(const opponent of [{min:110,max:140},{min:120,max:120},{min:100,max:120},null])
  assert.deepEqual(compareSpeedRanges({min:120,max:120},opponent),{player:null,opponent:null});
});
const id=speciesByName.get('ludicolo').internalSpeciesId;
const frontier={...state,selectedTrainer:'Cooltrainer (F):MIRIAM',opponentSpecies:[id],matchup:{player:null,opponent:id}};
const sets=possibleMatchupSets(frontier);
const enemy=mon('Swift Swim / Rain Dish',{id,dex:272,item:null,abilityOptions:options('Swift Swim','Rain Dish')});
const project=(player,other=enemy,patch={})=>matchupDisplayStats({player,opponent:other,state:{...frontier,...patch},sets});
test('Frontier ranges apply modifiers to each canonical row without speculative items or mutation',()=>{
 assert.ok(sets.length>1);
 const before=JSON.stringify({frontier,sets});
 const staged={...enemy,stages:{attack:-1,speed:1},status:'paralysis'};
 const rows=opponentDisplayRows(frontier,sets,staged);
 const result=project(mon(),staged);
 const speeds=rows.map(row=>Math.floor(Math.floor(row.stats.speed*3/2)/4));
 const attacks=rows.map(row=>Math.floor(row.stats.attack*2/3));
 const display=values=>Math.min(...values)===Math.max(...values)?Math.min(...values):`${Math.min(...values)}–${Math.max(...values)}`;
 assert.equal(result.opponent.speed,display(speeds));assert.equal(result.opponent.attack,display(attacks));
 assert.equal(JSON.stringify({frontier,sets}),before);
 assert.equal(opponentStatRanges(frontier,sets).speed.min,Math.min(...rows.map(row=>row.stats.speed)));
});
test('uncertain Swift Swim can reverse comparison without widening displayed range',()=>{
 const result=project(mon('Overgrow',{stats:{...mon().stats,speed:120}}),enemy,{field:{weather:'rain'}});
 assert.deepEqual(result.speed,{player:null,opponent:null});
 assert.equal(result.opponent.speed,project(mon(),enemy,{field:{weather:'none'}}).opponent.speed);
 const confirmed={...enemy,abilityOptions:options('Swift Swim')};
 const boosted=project(mon('Overgrow',{stats:{...mon().stats,speed:1}}),confirmed,{field:{weather:'rain'}});
 assert.deepEqual(boosted.speed,{player:'slower',opponent:'faster'});
 assert.notEqual(boosted.opponent.speed,result.opponent.speed);
});
test('candidate items bound Speed certainty while unknown item data blocks comparison',()=>{
 // An unknown player item could be Macho Brace, so no guaranteed comparison.
 assert.deepEqual(project(mon('Overgrow',{item:null,stats:{...mon().stats,speed:999}})).speed,{player:null,opponent:null});
 assert.deepEqual(project(mon('Overgrow',{stats:{...mon().stats,speed:999}})).speed,{player:'faster',opponent:'slower'});
 assert.deepEqual(project(mon('Overgrow',{item:'Enigma Berry'})).speed,{player:null,opponent:null});
});
test('confirmed weather suppression and copied Trace use existing ability state',()=>{
 const result=project(mon('Cloud Nine'),{...enemy,abilityOptions:options('Swift Swim')},{field:{weather:'rain'}});
 assert.equal(result.opponent.speed,project(mon(),enemy).opponent.speed);
 assert.equal(effectiveDisplayStats(mon('Trace',{copiedAbility:'Swift Swim'}),{weather:'rain'}).speed,202);
 assert.equal(effectiveDisplayStats(mon('Trace'),{weather:'rain'}).speed,101);
});
test('missing candidate stats and empty matchup stay unknown and neutral',()=>{
 const result=matchup(mon(),enemy);
 assert.equal(result.opponent.speed,'—');assert.deepEqual(result.speed,{player:null,opponent:null});
 assert.equal(matchup(null,null).player.hp,'—');
});
test('unresolved candidate Macho Brace can reverse ordering without changing display',()=>{
 // Synthetic item alternatives exercise certainty without changing canonical data.
 const alternatives=sets.map((set,index)=>({...set,item:index?'Macho Brace':'None'}));
 const player=mon('Overgrow',{stats:{...mon().stats,speed:60}});
 const result=matchupDisplayStats({player,opponent:enemy,state:frontier,sets:alternatives});
 assert.equal(result.opponent.speed,project(mon(),enemy).opponent.speed);
 assert.deepEqual(result.speed,{player:null,opponent:null});
});
test('unresolved weather suppression and unseen Doubles partners retain neutral Speed',()=>{
 const player=mon('Swift Swim',{stats:{...mon().stats,speed:60}});
 const uncertainSuppressor={...enemy,abilityOptions:options('Cloud Nine','Rain Dish')};
 const result=project(player,uncertainSuppressor,{field:{weather:'rain'}});
 assert.equal(result.player.speed,60);assert.deepEqual(result.speed,{player:null,opponent:null});
 const doubles=project(player,enemy,{field:{weather:'rain'},rules:{...frontier.rules,format:'Doubles'}});
 assert.equal(doubles.player.speed,120);assert.deepEqual(doubles.speed,{player:null,opponent:null});
});
