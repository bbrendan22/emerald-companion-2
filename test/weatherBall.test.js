import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveConventionalMove} from '../src/battle/dynamicMoves.js';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {battleMove} from '../src/battle/reference.js';
const mon={dex:143,level:50,types:['NORMAL'],ability:'Immunity',item:'None',currentHp:200,
 stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const move=battleMove('Weather Ball');
const resolve=(weather,a=mon,d=mon)=>resolveConventionalMove(move,a,d,weather);
const calc=(weather,a=mon,d=mon,critical=false)=>calculateCoreDamage(move,a,d,weather,critical);
const rolls=last=>Array.from({length:16},(_,i)=>Math.floor(last*(85+i)/100));
// Independent Emerald Cmd_setweatherballtype/Cmd_damagecalc examples:
// P50 subtotal22;+2=24. Weather script2=>48; physical STAB=>72.
// Sun/rain special subtotal22->weather33;+2=35;script2=>70.
test('all five types, effective powers, Gen III categories and exact cartridge rolls',()=>{
 for(const [weather,type,power,category,last] of [
  ['none','NORMAL',50,'Physical',36],['sun','FIRE',100,'Special',70],
  ['rain','WATER',100,'Special',70],['sand','ROCK',100,'Physical',48],['hail','ICE',100,'Special',48],
 ]) {
  const resolved=resolve(weather);assert.equal(resolved.type,type);assert.equal(resolved.power,power);
  assert.equal(calc(weather).category,category);assert.deepEqual(calc(weather).rolls,rolls(last),weather);
 }
 assert.equal(move.type,'NORMAL');assert.equal(move.power,50,'reference data is immutable');
 for(const weather of [null,'snow','Rain','',0,{},'toString'])assert.equal(calc(weather),null);
});
test('resolved type selects the required attack/defense stats and stages before calculation',()=>{
 const attacker={...mon,types:['GHOST'],stats:{...mon.stats,attack:150,spAttack:80},stages:{attack:1,spAttack:-1}};
 const defender={...mon,stats:{...mon.stats,defense:120,spDefense:160},stages:{defense:1,spDefense:2}};
 // Physical Atk225 vsDef180:subtotal27;+2=29. Special SpA53 vsSpD320:subtotal3.
 assert.deepEqual(calc('none',attacker,defender).rolls,rolls(29));
 assert.deepEqual(calc('sand',attacker,defender).rolls,rolls(58));
 assert.deepEqual(calc('hail',attacker,defender).rolls,rolls(10));
 assert.deepEqual(calc('sun',attacker,defender).rolls,rolls(12)); //floor3*1.5=4;+2;script2.
 for(const weather of ['none','sand'])assert.ok(calc(weather,{...attacker,stats:{attack:150}}, {...defender,stats:{defense:120}}));
 for(const weather of ['sun','rain','hail'])assert.ok(calc(weather,{...attacker,stats:{spAttack:80}},{...defender,stats:{spDefense:160}}));
});
test('STAB, type effectiveness, burn and critical hits follow resolved type',()=>{
 for(const [weather,type,last] of [['none','NORMAL',36],['sun','FIRE',105],['rain','WATER',105],['sand','ROCK',72],['hail','ICE',72]])
  assert.deepEqual(calc(weather,{...mon,types:[type]}).rolls,rolls(last));
 assert.equal(calc('none',mon,{...mon,types:['GHOST']}).max,0);
 assert.equal(calc('sand',mon,{...mon,types:['FIRE','FLYING']}).max,192);
 assert.equal(calc('rain',mon,{...mon,types:['FIRE']}).max,140);
 assert.equal(calc('sun',mon,{...mon,types:['WATER']}).max,35);
 assert.equal(calc('hail',mon,{...mon,types:['DRAGON','FLYING']}).max,192);
 assert.deepEqual(calc('sand',{...mon,status:'burn'}).rolls,rolls(26)); //11+2;script2.
 assert.deepEqual(calc('rain',{...mon,status:'burn'}).rolls,calc('rain').rolls);
 assert.deepEqual(calc('sun',mon,mon,true).rolls,rolls(140));
});
test('offensive abilities and items see resolved type and retain exact rounding',()=>{
 for(const [weather,ability,type] of [['sun','Blaze','FIRE'],['rain','Torrent','WATER']]) {
  const a={...mon,types:[type],ability,currentHp:60};
  // P50->lowHP75:subtotal33;weather49;+2=51;script102;STAB153.
  assert.deepEqual(calc(weather,a).rolls,rolls(153));
  assert.equal(resolve(weather,a).power,100,'metadata excludes the ability boost');
 }
 for(const [weather,item,last] of [['none','Silk Scarf',39],['sun','Charcoal',76],['rain','Mystic Water',76],['sand','Hard Stone',52],['hail','NeverMeltIce',52]])
  assert.deepEqual(calc(weather,{...mon,item}).rolls,rolls(last));
 assert.deepEqual(calc('sand',{...mon,item:'Choice Band'}).rolls,rolls(70));
 assert.deepEqual(calc('sun',{...mon,item:'Choice Band'}).rolls,calc('sun').rolls);
 assert.deepEqual(calc('sand',{...mon,ability:'Huge Power'}).rolls,rolls(92));
 assert.deepEqual(calc('sun',{...mon,ability:'Huge Power'}).rolls,calc('sun').rolls);
 assert.deepEqual(calc('sand',{...mon,ability:'Guts',status:'burn'}).rolls,rolls(70));
});
test('defensive abilities and uncertainty compare complete 16-roll arrays',()=>{
 assert.equal(calc('rain',mon,{...mon,ability:'Water Absorb'}).max,0);
 assert.equal(calc('sun',mon,{...mon,ability:'Flash Fire'}).max,0);
 assert.equal(calc('sun',mon,{...mon,ability:'Flash Fire',status:'freeze'}).max,70);
 assert.equal(calc('hail',mon,{...mon,ability:'Thick Fat'}).max,26);
 assert.equal(calc('sun',mon,{...mon,ability:'Thick Fat'}).max,36);
 const target={...mon,abilityOptions:{status:'uncertain',source:'species',values:['Immunity','Thick Fat']}};
 for(const [weather,count] of [['none',1],['sand',1],['rain',1],['sun',2],['hail',2]]) {
  const scenarios=calculateAbilityScenarios(move,mon,target,{weather});
  assert.equal(scenarios.groups.length,count);
  for(const group of scenarios.groups)for(const scenario of group.scenarios)
   assert.deepEqual(group.rolls,calc(weather,mon,{...target,ability:scenario.defenderAbility}).rolls);
  assert.ok(scenarios.groups.every(g=>g.rolls.length===16));
 }
});
test('both directions and odd operands distinguish script doubling from doubling formula power',()=>{
 const player={...mon,types:['GHOST'],stats:{...mon.stats,attack:101,spAttack:101}};
 const enemy={...mon,types:['NORMAL'],stats:{...mon.stats,defense:103,spDefense:103,attack:151,spAttack:151}};
 // Outgoing:subtotal21;sun31;+2=33;script2=>66. Incoming:33;sun49;+2=51;script2=>102.
 assert.deepEqual(calc('sun',player,enemy).rolls,rolls(66));
 assert.deepEqual(calc('sun',enemy,player).rolls,rolls(102));
 assert.equal(calc('sand',player,enemy).max,46);
 // Synthetic HIT with literal power100 gives a different +2/weather rounding.
 const wrong=calculateCoreDamage({...battleMove('Ember'),power:100},mon,mon,'sun');
 assert.notDeepEqual(calc('sun').rolls,wrong.rolls);
 for(const weather of ['none','rain','sun','sand','hail'])
  assert.deepEqual(calc(weather,{...mon,ability:'Cloud Nine'},{...mon,ability:'Air Lock'}).rolls,calc('none').rolls,'weather effects suppressed without changing the selected weather');
});
