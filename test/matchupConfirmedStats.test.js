import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattleState,battleReducer} from '../src/battle/battleState.js';
import {speciesByName} from '../src/battle/reference.js';
import {analysisMatchupSets} from '../src/battle/towerSets.js';
import {opponentStatDisplay,opponentStatRanges} from '../src/battle/opponentStats.js';
import {matchupDisplayStats} from '../src/battle/matchupDisplayStats.js';
import {playerAbilityOptions,opponentAbilityOptions} from '../src/battle/abilityScenarios.js';
import {doublesBattlefieldContext} from '../src/battle/battlefieldContext.js';

const known=ability=>({status:'known',values:[ability]});
const uncertain=(...values)=>({status:'uncertain',values});
const mon=(ability='Swift Swim',extra={})=>({identity:'kingdra',name:'Kingdra',dex:230,ability,abilityOptions:known(ability),item:'None',level:50,
 stats:{hp:214,attack:100,defense:100,spAttack:100,spDefense:100,speed:120},currentHp:null,status:'none',stages:{},...extra});
function setup(format) {
 let state=battleReducer(createBattleState(),{type:'rules',patch:{format}});
 state=battleReducer(state,{type:'opponentTrainer',key:'Cooltrainer (M):BRADEN'});
 state=battleReducer(state,{type:format==='Singles'?'selectSinglesOpponent':'assignOpponentSpecies',slot:0,speciesId:speciesByName.get('ludicolo').internalSpeciesId});
 state={...state,team:['kingdra'],matchup:{...state.matchup,player:'kingdra'},field:{...state.field,weather:'rain'}};
 const sets=analysisMatchupSets(state);
 const opponent=mon('Swift Swim / Rain Dish',{id:state.matchup.opponent,dex:272,name:'Ludicolo',identity:undefined,
  stats:opponentStatDisplay(opponentStatRanges(state,sets)),item:sets[0].item});
 opponent.abilityOptions=opponentAbilityOptions(opponent,sets,'');
 return {state,sets,opponent};
}
function project(format,{player=mon(),partner=null,otherPartner=null,opponentPatch={},weather='rain'}={}) {
 const {state,sets,opponent}=setup(format);Object.assign(opponent,opponentPatch);state.field.weather=weather;
 const battlefield=format==='Doubles'?doublesBattlefieldContext(state,[player]):undefined;
 if(battlefield) {
  const entry=pokemon=>pokemon?{pokemon,liveness:pokemon.currentHp===0?'fainted':'active'}:null;
  battlefield.player[1]=entry(partner);battlefield.enemy[1]=entry(otherPartner);
 }
 return matchupDisplayStats({player,opponent,state,sets,battlefield});
}
const scalar=result=>{for(const side of ['player','opponent'])for(const value of Object.values(result[side]))assert.ok(typeof value==='number'||value==='—',`${side}: ${value}`);};
for(const format of ['Singles','Doubles']) {
 test(`${format}: Kingdra's known Swift Swim responds to rain and confirmed suppression`,()=>{
  const player=mon();assert.equal(playerAbilityOptions(player).status,'known');
  const rainy=project(format);assert.equal(rainy.player.speed,240);scalar(rainy);
  assert.equal(project(format,{weather:'none'}).player.speed,120);
  assert.equal(project(format,{player:mon('Swift Swim',{status:'paralysis',stages:{speed:2}})}).player.speed,120);
  const blocked=project(format,{opponentPatch:{abilityOptions:known('Cloud Nine')}});
  assert.equal(blocked.player.speed,120);scalar(blocked);
  const unknown=project(format,{opponentPatch:{abilityOptions:uncertain('Cloud Nine','Damp')}});
  assert.equal(unknown.player.speed,240);scalar(unknown);
 });
 test(`${format}: opponent ability selection applies only confirmed modifiers; HP stays maximum`,()=>{
  const raw=setup(format).opponent.stats;
  const unknown=project(format);assert.equal(unknown.opponent.speed,raw.speed);scalar(unknown);
  const identified=project(format,{opponentPatch:{abilityOptions:known('Swift Swim'),currentHp:5,stages:{speed:1}}});
  assert.equal(identified.opponent.speed,raw.speed*3);assert.equal(identified.opponent.hp,raw.hp);scalar(identified);
  assert.equal(project(format,{player:mon('Swift Swim',{currentHp:5})}).player.hp,214);
  const guts=project(format,{player:mon('Guts',{status:'burn',stages:{attack:1}})});
  assert.equal(guts.player.attack,225);scalar(guts);
  const uncertainPower=project(format,{player:mon('Huge Power / Thick Fat',{abilityOptions:uncertain('Huge Power','Thick Fat')})});
  assert.equal(uncertainPower.player.attack,100);scalar(uncertainPower);
 });
}
test('Doubles: Plus/Minus requires known holders, including hidden slots and copied abilities',()=>{
 const player=mon('Plus');
 for(const [partner,expected] of [[null,100],[mon('Trace'),100],[mon('Minus'),150],
  [mon('Minus / Other',{abilityOptions:uncertain('Minus','Static')}),100],
  [mon('Trace',{copiedAbility:'Minus'}),150]]) {
  const result=project('Doubles',{player,partner});assert.equal(result.player.spAttack,expected);scalar(result);
 }
 const unknownOwner=mon('Plus / Static',{abilityOptions:uncertain('Plus','Static')});
 assert.equal(project('Doubles',{player:unknownOwner,partner:mon('Minus')}).player.spAttack,100);
 const other=project('Doubles',{opponentPatch:{abilityOptions:known('Minus')},otherPartner:mon('Plus')});
 assert.equal(other.opponent.spAttack,setup('Doubles').opponent.stats.spAttack*1.5);
});
test('Doubles: known hidden weather suppression applies; unknown or fainted suppression does not',()=>{
 for(const [partner,expected] of [[mon('Cloud Nine'),120],[mon('Air Lock'),120],
  [mon('Cloud Nine',{currentHp:0}),240],[mon('Damp / Cloud Nine',{abilityOptions:uncertain('Damp','Cloud Nine')}),240]]) {
  const result=project('Doubles',{partner});assert.equal(result.player.speed,expected);scalar(result);
 }
});
test('missing base stats stay unavailable without turning the other side into ranges',()=>{
 const result=project('Doubles',{player:mon('Swift Swim',{stats:{}})});scalar(result);
 assert.ok(Object.values(result.player).every(value=>value==='—'));
});

test('a species with one Emerald ability is known without an ability observation',()=>{
 const abilityOptions=opponentAbilityOptions({dex:230},[],'');
 assert.deepEqual(abilityOptions.values,['Swift Swim']);assert.equal(abilityOptions.status,'known');
 for(const format of ['Singles','Doubles']) {
  const raw=setup(format).opponent.stats.speed;
  const result=project(format,{opponentPatch:{abilityOptions}});
  assert.equal(result.opponent.speed,raw*2);scalar(result);
 }
});
