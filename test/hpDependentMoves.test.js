import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveConventionalMove} from '../src/battle/dynamicMoves.js';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {battleMove} from '../src/battle/reference.js';
import {reduceMatchupCondition,slotConditions} from '../src/battle/matchupConditions.js';
const names=['Flail','Reversal','Eruption','Water Spout'];
const mon={level:50,dex:143,types:['NORMAL'],ability:'Immunity',item:'None',currentHp:200,
 stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const resolve=(name,a=mon,d=mon)=>resolveConventionalMove(battleMove(name),a,d);
const calc=(name,a=mon,d=mon,w='none',c=false)=>calculateCoreDamage(battleMove(name),a,d,w,c);
const rolls=last=>Array.from({length:16},(_,i)=>Math.max(1,Math.floor(last*(85+i)/100)));
test('Flail and Reversal all six Emerald buckets and exact integer transition boundaries',()=>{
 // maxHP480 gives scaled fraction floor(HP/10). Inclusive upper limits1/4/9/16/32/48.
 for(const name of ['Flail','Reversal']) {
  for(const [hp,power] of [[1,200],[18,200],[19,200],[20,150],[21,150],[48,150],[49,150],[50,100],[51,100],
   [98,100],[99,100],[100,80],[101,80],[168,80],[169,80],[170,40],[171,40],[328,40],[329,40],[330,20],[331,20],[480,20]]) {
   assert.equal(resolve(name,{...mon,currentHp:hp,stats:{...mon.stats,hp:480}}).power,power,`${name} HP${hp}`);
  }
  // Non-divisible maxHP: transition at ceil(2*201/48)=9, not a rounded percent.
  assert.equal(resolve(name,{...mon,currentHp:8,stats:{...mon.stats,hp:201}}).power,200);
  assert.equal(resolve(name,{...mon,currentHp:9,stats:{...mon.stats,hp:201}}).power,150);
  assert.equal(resolve(name,{...mon,currentHp:1,stats:{...mon.stats,hp:999}}).power,200);
  assert.equal(resolve(name,{...mon,currentHp:1,stats:{...mon.stats,hp:1}}).power,20);
 }
 assert.equal(resolve('Flail').type,'NORMAL');assert.equal(resolve('Reversal').type,'FIGHTING');
});
test('Eruption/Water Spout floor HP-scaled power, including full, intermediate and minimum legal HP',()=>{
 for(const name of ['Eruption','Water Spout']) {
  for(const [hp,power] of [[200,150],[199,149],[100,75],[99,74],[60,45],[2,1],[1,1]])
   assert.equal(resolve(name,{...mon,currentHp:hp}).power,power,`${name} HP${hp}`);
  assert.equal(resolve(name,{...mon,currentHp:1,stats:{...mon.stats,hp:999}}).power,1);
  assert.equal(resolve(name,{...mon,currentHp:1,stats:{...mon.stats,hp:1}}).power,150);
  assert.equal(calc(name,{...mon,currentHp:1}).rolls.length,16);
 }
 assert.equal(resolve('Eruption').type,'FIRE');assert.equal(resolve('Water Spout').type,'WATER');
});
test('only explicit null means full HP; invalid, missing, uncertain and fainted HP are unavailable',()=>{
 for(const name of names) {
  assert.equal(resolve(name,{...mon,currentHp:null}).power,resolve(name).power);
  for(const hp of [undefined,0,-1,201,1.5,'100','100–120',NaN,Infinity])
   assert.equal(calc(name,{...mon,currentHp:hp,initialCurrentHp:200}),null,`${name} HP${hp}`);
  for(const maximum of [undefined,null,0,-1,1000,200.5,'200','180–200',NaN])
   for(const hp of [1,null])assert.equal(calc(name,{...mon,currentHp:hp,stats:{...mon.stats,hp:maximum}}),null);
  assert.equal(resolve(name,{...mon,currentHp:1,initialCurrentHp:200}).power,resolve(name,{...mon,currentHp:1}).power);
 }
});
test('both directions use attacker HP only and defender HP does not affect power or rolls',()=>{
 const opponent={...mon,currentHp:1,stats:{...mon.stats,hp:300}};
 for(const name of names) {
  assert.notEqual(resolve(name,mon,opponent).power,resolve(name,opponent,mon).power);
  assert.equal(calc(name,mon,opponent).rolls.length,16);
  assert.equal(calc(name,opponent,mon).rolls.length,16);
  assert.deepEqual(calc(name,mon,opponent),calc(name,mon,{...opponent,currentHp:300}));
 }
});
test('Flail/Reversal use ordinary Gen III critical hits, STAB, stages, items and abilities',()=>{
 // Flail200: floor(22*200/50)+2=90; STAB135; critical before STAB=>270.
 const low={...mon,currentHp:1};
 assert.deepEqual(calc('Flail',low).rolls,rolls(135));
 assert.deepEqual(calc('Flail',low,mon,'none',true).rolls,rolls(270));
 assert.deepEqual(calc('Reversal',{...low,types:['FIGHTING']}).rolls,rolls(270)); //STAB135;Normal weakness270.
 assert.deepEqual(calc('Reversal',{...low,types:['FIGHTING']},mon,'none',true).rolls,rolls(540));
 assert.deepEqual(calc('Flail',{...low,stages:{attack:-2}},{...mon,stages:{defense:2}},'none',true).rolls,rolls(270));
 assert.deepEqual(calc('Flail',{...low,item:'Choice Band'}).rolls,rolls(201)); //Atk150;132+2=134;STAB201.
 assert.deepEqual(calc('Flail',{...low,ability:'Huge Power'}).rolls,rolls(267)); //Atk200;176+2=178;STAB267.
 assert.deepEqual(calc('Reversal',low,{...mon,types:['GHOST']}).rolls,Array(16).fill(0));
});
test('Eruption/Water Spout preserve weather, STAB, abilities, items and critical integer ordering',()=>{
 // FullHP150:66+2=68;sun/rain99+2=101;STAB151.
 for(const [name,type,weather,ability,item] of [['Eruption','FIRE','sun','Blaze','Charcoal'],['Water Spout','WATER','rain','Torrent','Mystic Water']]) {
  const attacker={...mon,types:[type]},target={...mon,types:['NORMAL']};
  assert.deepEqual(calc(name,attacker,target).rolls,rolls(102));
  assert.deepEqual(calc(name,{...attacker,currentHp:null,ability},target),calc(name,{...attacker,ability},target));
  assert.deepEqual(calc(name,attacker,target,weather).rolls,rolls(151));
  assert.deepEqual(calc(name,attacker,target,weather,true).rolls,rolls(303));
  // At60/200 HP:power45;Blaze/Torrent floor67;subtotal29;+2=31;STAB46.
  assert.deepEqual(calc(name,{...attacker,currentHp:60,ability},target).rolls,rolls(46));
  assert.deepEqual(calc(name,{...attacker,item},target).rolls,rolls(111)); //SpA110;72+2;STAB111.
  assert.equal(resolve(name,{...attacker,currentHp:60,ability}).power,45,'metadata shows base power before ability boost');
 }
 assert.equal(calc('Eruption',mon,{...mon,ability:'Flash Fire'}).max,0);
 assert.equal(calc('Water Spout',mon,{...mon,ability:'Water Absorb'}).max,0);
 assert.equal(calc('Eruption',mon,{...mon,ability:'Thick Fat'}).base,35);
 assert.equal(calc('Eruption',mon,mon,'rain').base,35);
 assert.equal(calc('Water Spout',mon,mon,'sun').base,35);
 const target={...mon,abilityOptions:{status:'uncertain',source:'species',values:['Immunity','Thick Fat']}};
 const scenarios=calculateAbilityScenarios(battleMove('Eruption'),mon,target);
 assert.equal(scenarios.groups.length,2);assert.deepEqual(scenarios.groups.map(g=>g.rolls),[rolls(68),rolls(35)]);
 const grouped=calculateAbilityScenarios(battleMove('Flail'),mon,target);
 assert.equal(grouped.groups.length,1);assert.equal(grouped.groups[0].scenarios.length,2);
});
test('Battle Conditions HP overrides drive fresh power, null resets to full, without stale initial HP',()=>{
 let state={rules:{teamSize:3},team:['player'],opponentSpecies:[1],matchup:{player:'player',opponent:1},matchupConditions:{player:{},enemy:{}}};
 const staged=side=>({...mon,initialCurrentHp:200,currentHp:slotConditions(state,side,0).currentHp});
 const update=(side,value)=>{state=reduceMatchupCondition(state,{type:'matchupCondition',side,slot:0,field:'currentHp',value,max:200});};
 assert.equal(resolve('Flail',staged('player')).power,20);
 update('player',1);update('enemy',100);
 assert.equal(resolve('Flail',staged('player'),staged('enemy')).power,200);
 assert.equal(resolve('Water Spout',staged('enemy'),staged('player')).power,75);
 update('player',null);assert.equal(resolve('Eruption',staged('player')).power,150);
});
test('unapproved move guards remain intact and one-defender Doubles retains full damage',()=>{
 for(const name of ['Counter'])assert.equal(calc(name),null);
 for(const name of ['Eruption','Water Spout'])
  assert.deepEqual(calculateCoreDamage(battleMove(name),mon,mon,'none',false,{format:'Doubles',defenderSideAlive:1}),calc(name));
});
