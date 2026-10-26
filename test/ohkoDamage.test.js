import test from 'node:test';
import assert from 'node:assert/strict';
import {battleMove} from '../src/battle/reference.js';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios,opponentAbilityOptions} from '../src/battle/abilityScenarios.js';
import {calculateOhkoDamage,isOhkoMove,isOhkoResult} from '../src/battle/ohkoDamage.js';
import {coreDamageDisplayParts} from '../src/battle/coreDamagePresentation.js';
import {movePopupValues} from '../src/battle/matchupPresentation.js';
import baseline from './fixtures/damageFinalizationBaseline.json' with {type:'json'};
const mon=baseline.mon;
const names=['Guillotine','Horn Drill','Fissure','Sheer Cold'];
const calc=(name,a=mon,d=mon)=>calculateCoreDamage(battleMove(name),a,d);
const options=values=>({status:'uncertain',source:'species',values});
for(const name of names)test(`${name}: explicit OHKO, Sturdy immunity and level blocking without numerical damage`,()=>{
 const move=battleMove(name);assert.equal(isOhkoMove(move),true);
 for(const level of [50,51,100])assert.deepEqual(calc(name,{...mon,level}),{kind:'ohko',outcome:'ohko',reason:null});
 assert.deepEqual(calc(name,{...mon,level:49}),{kind:'ohko',outcome:'blocked',reason:'lower-level'});
 for(const hp of [1,200])assert.deepEqual(calc(name,mon,{...mon,ability:'Sturdy',currentHp:hp}),{kind:'ohko',outcome:'immune',reason:'sturdy'});
 assert.equal(calc(name,{...mon,level:49},{...mon,ability:'Sturdy'}).outcome,'immune','Sturdy precedes level restriction');
 for(const [a,d] of [[mon,mon],[mon,{...mon,ability:'Sturdy'}],[{...mon,level:49},mon]]){
  const result=calc(name,a,d);assert.equal(isOhkoResult(result),true);
  assert.deepEqual(coreDamageDisplayParts(result),{message:result.outcome.toUpperCase()});
  for(const field of ['damage','rolls','min','max','distribution','totalOutcomes'])assert.equal(result[field],undefined);
 }
 assert.equal(movePopupValues(move,mon,mon).accuracy,'Level-based');
 assert.equal(calculateOhkoDamage({...move,type:'FIRE',power:200,effect:'HIT'},mon,mon).kind,'ohko','canonical move ID owns the mechanic');
});

test('Emerald immunities: Normal/Ghost, Ground/Flying and Levitate; Ice targets remain vulnerable to Sheer Cold',()=>{
 for(const name of ['Guillotine','Horn Drill']){
  assert.equal(calc(name,mon,{...mon,types:['GHOST']}).reason,'type-immunity');
  assert.equal(calc(name,{...mon,level:49},{...mon,types:['GHOST']}).outcome,'immune');
 }
 assert.equal(calc('Fissure',mon,{...mon,types:['FLYING','NORMAL']}).reason,'type-immunity');
 assert.equal(calc('Fissure',mon,{...mon,ability:'Levitate'}).reason,'levitate');
 assert.equal(calc('Fissure',{...mon,level:49},{...mon,ability:'Levitate'}).outcome,'immune');
 assert.equal(calc('Sheer Cold',mon,{...mon,types:['ICE']}).outcome,'ohko','no later-generation Ice immunity');
 assert.equal(calc('Sheer Cold',mon,{...mon,ability:'Thick Fat'}).outcome,'ohko');
 assert.equal(calc('Fissure',mon,{...mon,types:['ROCK'],ability:'Wonder Guard'}).outcome,'ohko');
 assert.equal(calc('Fissure',mon,{...mon,ability:'Wonder Guard'}).reason,'wonder-guard');
 assert.equal(calc('Sheer Cold',mon,{...mon,types:['BUG','GHOST'],ability:'Wonder Guard'}).outcome,'immune');
});

test('OHKO ability uncertainty retains Sturdy alternatives, including lower-level and guaranteed-immunity cases',()=>{
 const onix={...mon,dex:95,types:['ROCK','GROUND'],ability:'Rock Head',abilityOptions:opponentAbilityOptions({dex:95})};
 assert.deepEqual(new Set(onix.abilityOptions.values),new Set(['Rock Head','Sturdy']));
 for(const name of names){
  const groups=calculateAbilityScenarios(battleMove(name),mon,onix).groups;
  assert.deepEqual(new Set(groups.map(g=>g.message)),new Set(['OHKO','IMMUNE']));
  assert.deepEqual(new Set(groups.map(g=>g.label)),new Set(['Rock Head','Sturdy']));
  assert.ok(groups.every(g=>g.hp===null&&g.percentage===null));
  const lower=calculateAbilityScenarios(battleMove(name),{...mon,level:49},onix).groups;
  assert.deepEqual(new Set(lower.map(g=>g.message)),new Set(['BLOCKED','IMMUNE']));
 }
 const immune=calculateAbilityScenarios(battleMove('Guillotine'),mon,{...onix,types:['GHOST']});
 assert.equal(immune.groups.length,1);assert.equal(immune.groups[0].message,'IMMUNE');assert.equal(immune.groups[0].scenarios.length,2);
 const levitate=calculateAbilityScenarios(battleMove('Fissure'),mon,{...mon,abilityOptions:options(['Immunity','Levitate'])});
 assert.deepEqual(levitate.groups.map(g=>g.message),['OHKO','IMMUNE']);
});

test('missing OHKO data and copied ability states remain unavailable; ordinary stats, IVs, stages and weather never become damage inputs',()=>{
 for(const name of names){
  for(const patch of [{level:null},{level:0},{level:101},{level:49.5},{ability:null},{ability:'Sturdy / Rock Head'},{currentHp:0}]){
   assert.equal(calc(name,{...mon,...patch}),null);assert.equal(calc(name,mon,{...mon,...patch}),null);
  }
  for(const types of [[],['???'],['NORMAL','WATER','FIRE']])assert.equal(calc(name,mon,{...mon,types}),null);
  for(const ability of ['Trace'])assert.equal(calc(name,mon,{...mon,ability}).availability,'unsupported');
  const minimal={level:50,ability:'Immunity',types:['NORMAL']};
  assert.equal(calc(name,minimal,minimal).outcome,'ohko','no need to invent stats or IVs');
  for(const weather of ['none','rain','sun','sand','hail'])assert.equal(calculateCoreDamage(battleMove(name),{...mon,ivs:null,status:'burn',stages:{attack:-6}},{...mon,screens:{reflect:true}},weather,true).outcome,'ohko');
 }
 assert.equal(calculateOhkoDamage(battleMove('Pound'),mon,mon),null);
 assert.equal(isOhkoResult({kind:'ohko',outcome:'ohko',reason:null,damage:999}),false);
 assert.equal(isOhkoResult({kind:'ohko',outcome:'immune',reason:'made-up'}),false);
 assert.equal(calculateAbilityScenarios(battleMove('Fissure'),mon,{...mon,ability:null}).groups[0].availability,'unavailable');
});
