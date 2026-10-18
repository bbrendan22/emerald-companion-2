import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateBasicDamage,formatBasicDamage,basicDamageRolls} from '../src/battle/basicDamage.js';
import {battleMove} from '../src/battle/reference.js';
import {toTowerOpponent} from '../src/battle/frontierAdapter.js';
import {towerSetById} from '../src/battle/towerSets.js';
const mon={level:50,types:['NORMAL'],stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const calc=(name,a=mon,d=mon)=>calculateBasicDamage(battleMove(name),a,d);
const range=r=>[r.min,r.max];

test('single/dual-type STAB, including second type and repeated type, applies once with integer truncation',()=>{
 // Strength: base37 => floor(37*1.5)=55 =>46–55.
 for(const types of [['NORMAL'],['NORMAL','FLYING'],['FLYING','NORMAL'],['NORMAL','NORMAL']])
  assert.deepEqual(range(calc('Strength',{...mon,types})),[46,55]);
 assert.deepEqual(range(calc('Strength',{...mon,types:['FIGHTING']})),[31,37]);
});
test('neutral, half, quarter, double and quadruple effects have literal independently worked ranges',()=>{
 // Ice Beam: base43 (22*95*100/100/50 truncates to41, +2).
 const a={...mon,types:['NORMAL']};
 for(const [types,expected] of [
  [['NORMAL'],[36,43]], [['WATER'],[17,21]], [['WATER','ICE'],[8,10]],
  [['GRASS'],[73,86]], [['GRASS','FLYING'],[146,172]],
 ]){
  assert.deepEqual(range(calc('Ice Beam',a,{...mon,types})),expected);
  assert.deepEqual(range(calc('Ice Beam',a,{...mon,types:[...types].reverse()})),expected);
 }
 // Duplicate mono-type slots are processed once: 43/2 =>21, not10.
 assert.deepEqual(range(calc('Ice Beam',a,{...mon,types:['WATER','WATER']})),[17,21]);
});
test('H05 Ice Beam vs Charizard: STAB then Flying before Fire yields 56–67 regardless of displayed order',()=>{
 const a={...mon,types:['ICE'],stats:{...mon.stats,spAttack:103}};
 // Base45; STAB67; Flying134; Fire67; only then random85–100%.
 for(const types of [['FIRE','FLYING'],['FLYING','FIRE']]){
  const r=calc('Ice Beam',a,{...mon,types});assert.equal(r.base,45);
  assert.deepEqual(r.rolls,[56,57,58,58,59,60,60,61,62,62,63,64,64,65,66,67]);
 }
});
test('mixed resistance then weakness must floor separately; combined-product shortcut would be wrong',()=>{
 // Ice table: Water half BEFORE Grass double. Odd43 =>21 =>42, not43.
 for(const types of [['WATER','GRASS'],['GRASS','WATER']])
  assert.deepEqual(range(calc('Ice Beam',mon,{...mon,types})),[35,42]);
 // STAB before resistance: base43 ->64 ->32. Reversing steps yields31.
 assert.deepEqual(range(calc('Ice Beam',{...mon,types:['ICE']},{...mon,types:['WATER']})),[27,32]);
});
test('type-chart and supported ability immunities remain zero; Focus Band does not reduce raw damage',()=>{
 for(const [name,types] of [['Strength',['GHOST']],['Strength',['ROCK','GHOST']],['Thunderbolt',['GROUND']],['Psychic',['DARK']],['Shadow Ball',['NORMAL']]]){
  const r=calc(name,mon,{...mon,types});assert.deepEqual(r.rolls,Array(16).fill(0));assert.equal(formatBasicDamage(r),'0.0% · 0 HP');
 }
 assert.deepEqual(basicDamageRolls(0),Array(16).fill(0));
 assert.equal(calc('Surf',mon,{...mon,ability:'Water Absorb',item:'Focus Band'}).min,0);
 // Minimum-one safeguard applies to nonzero type steps, never to immunity.
 const tiny={...mon,level:1,stats:{...mon.stats,spAttack:1}};
 assert.deepEqual(range(calc('Ice Beam',tiny,{...mon,types:['WATER','ICE'],stats:{...mon.stats,spDefense:999}})),[1,1]);
});
test('Gen 3 Steel resists Ghost and Dark; no later-generation type chart leaks',()=>{
 assert.deepEqual(range(calc('Shadow Ball',mon,{...mon,types:['STEEL']})),[15,18]); // Base37 ->18.
 assert.deepEqual(range(calc('Crunch',mon,{...mon,types:['STEEL']})),[15,18]);
});
test('Swampert Surf vs Onix1: old40–48 becomes244–288 using STAB and ordered4x',()=>{
 const a={...mon,name:'Swampert',types:['WATER','GROUND'],stats:{...mon.stats,spAttack:95}};
 const d=toTowerOpponent(towerSetById('Onix 1')),before=structuredClone({a,d});
 assert.equal(d.stats.spDefense,86);assert.equal(d.stats.hp,131);
 // Base48; STAB72; Ground144; Rock288; floor288*.85=244.
 const r=calc('Surf',a,d);assert.equal(r.base,48);assert.deepEqual(range(r),[244,288]);
 assert.equal(formatBasicDamage(r),'186.3–219.8% · 244–288 HP');assert.deepEqual({a,d},before);
 // Reverse direction: Onix Rock Slide base33; Rock STAB49; Ground resistance24 =>20–24.
 assert.deepEqual(range(calc('Rock Slide',d,{...a,stats:{...a.stats,defense:69}})),[20,24]);
});
test('unknown/missing types omit output, and weather-dependent typing stays raw',()=>{
 for(const types of [undefined,[],['FAIRY'],['WATER',null],['NORMAL','FIRE','WATER']]){
  assert.equal(calc('Strength',{...mon,types}),null);assert.equal(calc('Strength',mon,{...mon,types}),null);
 }
 const castform={...mon,ability:'Forecast',weather:'sun'};
 assert.deepEqual(calc('Flamethrower',castform),calc('Flamethrower',mon));
});
