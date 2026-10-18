import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateBasicDamage,basicDamageScenarios,prepareBasicDamage} from '../src/battle/basicDamage.js';
import {resolveSpecialMove} from '../src/battle/specialDamage.js';
import {battleMove} from '../src/battle/reference.js';
const a={level:50,types:['ELECTRIC'],ability:'None',item:'None',stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const d={...a,types:['NORMAL']};
const calc=(name,c={},own=a,other=d)=>calculateBasicDamage(battleMove(name),own,other,c);
const range=(name,c={},own=a,other=d)=>{const r=calc(name,c,own,other);return r&&[r.min,r.max];};
const resolve=(name,c={},own=a,other=d)=>resolveSpecialMove(battleMove(name),own,other,c);

test('Weather Ball: independent audit fixture, every weather, canonical50 power and category',()=>{
 // P50 quotient22. Sun/rain floor22*1.5=33; +2=35; script x2=70 =>59–70.
 // Hail/sand (22+2)*2=48 =>40–48. Clear22+2=24 =>20–24.
 for(const [weather,type,min,max,category] of [['none','NORMAL',20,24,'Physical'],['sun','FIRE',59,70,'Special'],['rain','WATER',59,70,'Special'],['hail','ICE',40,48,'Special'],['sand','ROCK',40,48,'Physical']]){
  assert.deepEqual(range('Weather Ball',{weather}),[min,max]);
  assert.deepEqual([resolve('Weather Ball',{weather}).type,resolve('Weather Ball',{weather}).power],[type,50]);
  assert.equal(prepareBasicDamage(battleMove('Weather Ball'),a,d,{weather}).category,category);
 }
 assert.equal(battleMove('Weather Ball').type,'NORMAL');assert.equal(battleMove('Weather Ball').power,50);
});
test('Weather Ball: suppression on either side, Forecast STAB and type-chart interactions',()=>{
 for(const ability of ['Cloud Nine','Air Lock'])for(const weather of ['rain','sun','hail','sand']){
  assert.deepEqual(range('Weather Ball',{weather},{...a,ability}),[20,24]);
  assert.deepEqual(range('Weather Ball',{weather},a,{...d,ability}),[20,24]);
 }
 const cast={...a,dex:351,types:['NORMAL'],ability:'Forecast'};
 assert.deepEqual(range('Weather Ball',{weather:'rain'},cast),[89,105]); // floor70*1.5=105.
 assert.deepEqual(range('Weather Ball',{weather:'rain'},cast,{...d,types:['ROCK']}),[178,210]);
 assert.deepEqual(range('Weather Ball',{weather:'rain'},cast,{...d,ability:'Cloud Nine'}),[30,36]);
 // Rain Water against Water/Ground: resistance then weakness restores70.
 assert.deepEqual(range('Weather Ball',{weather:'rain'},a,{...d,types:['WATER','GROUND']}),[59,70]);
 assert.deepEqual(range('Weather Ball',{},a,{...d,types:['GHOST']}),[0,0]);
});
test('Weather Ball: screen/crit and physical Rock use the correct integer ordering',()=>{
 // Light Screen quotient11; rain floor16.5=16; +2=18; x2=36.
 assert.deepEqual(range('Weather Ball',{weather:'rain',defender:{screens:{lightScreen:true}}}),[30,36]);
 assert.deepEqual(range('Weather Ball',{weather:'rain',critical:true,defender:{screens:{lightScreen:true}}}),[119,140]);
 assert.deepEqual(range('Weather Ball',{weather:'rain',critical:true},a,{...d,ability:'Battle Armor'}),[59,70]);
 // Sand uses Attack300, never SpA100: quotient66; Reflect33;+2=35;x2=70.
 assert.deepEqual(range('Weather Ball',{weather:'sand',defender:{screens:{reflect:true}}},{...a,stats:{...a.stats,attack:300}}),[59,70]);
 assert.deepEqual(range('Weather Ball',{weather:'sand',attacker:{status:'burn'}}),[22,26]); // floor22/2+2 =>13*2.
 assert.deepEqual(range('Weather Ball',{weather:'rain',attacker:{stages:{spAttack:1}},defender:{screens:{lightScreen:true}}}),[44,52]); //33/2=16;rain24;+2;*2.
});
test('Weather Ball: type items, ability-dependent suppression, absorption and Thick Fat',()=>{
 // MysticWater increases SpA100->110: quotient24; rain36;+2=38;*2=76.
 assert.deepEqual(range('Weather Ball',{weather:'rain'},{...a,item:'Mystic Water'}),[64,76]);
 assert.deepEqual(range('Weather Ball',{weather:'rain'},a,{...d,ability:'Water Absorb'}),[0,0]);
 assert.deepEqual(basicDamageScenarios(battleMove('Weather Ball'),a,{...d,ability:'Cloud Nine / Damp'},{weather:'rain'}).map(g=>[g.label,g.result.min,g.result.max]),[['Cloud Nine',20,24],['Damp',59,70]]);
 // ThickFat halves SpA50 ->quotient11;sun16;+2=18;*2=36.
 assert.deepEqual(range('Weather Ball',{weather:'sun'},a,{...d,ability:'Thick Fat'}),[30,36]);
});
test('Eruption/Water Spout: full/half/low HP and exact integer power boundaries',()=>{
 for(const name of ['Eruption','Water Spout']){
  for(const [hp,p,min,max] of [[200,150,57,68],[100,75,29,35],[3,2,1,2],[2,1,1,2],[1,1,1,2]]){
   const c={attacker:{currentHp:hp}};assert.equal(resolve(name,c).power,p);assert.deepEqual(range(name,c),[min,max]);
  }
  const own={...a,stats:{...a.stats,hp:300}};
  for(const [hp,p] of [[1,1],[2,1],[3,1],[4,2],[299,149],[300,150]])assert.equal(resolve(name,{attacker:{currentHp:hp}},own).power,p);
  for(const hp of [0,201,-1,1.5,NaN])assert.equal(resolve(name,{attacker:{currentHp:hp}}),null);
  assert.equal(resolve(name,{}, {...a,initialCurrentHp:100,currentHp:1}).power,75);
  assert.equal(resolve(name,{}, {...a,currentHp:100}).power,75);
 }
});
test('HP-dependent moves reuse weather, STAB, pinch abilities, items, screens, critical and immunity',()=>{
 // Full150: quotient66, sun99,+2=101; Fire STAB151 =>128–151.
 assert.deepEqual(range('Eruption',{weather:'sun'},{...a,types:['FIRE']}),[128,151]);
 assert.deepEqual(range('Water Spout',{weather:'rain'},{...a,types:['WATER']}),[128,151]);
 // Half75: quotient33; sun49;+2=51;crit102;STAB153.
 assert.deepEqual(range('Eruption',{weather:'sun',critical:true,attacker:{currentHp:100},defender:{screens:{lightScreen:true}}},{...a,types:['FIRE']}),[130,153]);
 // HP60 ->P45, Blaze/Torrent floor45*1.5=67; quotient29,+2=31;STAB46.
 assert.deepEqual(range('Eruption',{attacker:{currentHp:60}},{...a,types:['FIRE'],ability:'Blaze'}),[39,46]);
 assert.deepEqual(range('Water Spout',{attacker:{currentHp:60}},{...a,types:['WATER'],ability:'Torrent'}),[39,46]);
 assert.deepEqual(range('Eruption',{},a,{...d,ability:'Flash Fire'}),[0,0]);
 assert.deepEqual(range('Water Spout',{},a,{...d,ability:'Water Absorb'}),[0,0]);
 assert.deepEqual(range('Eruption',{}, {...a,item:'Charcoal'}),[62,74]); // quotient72;+2.
 assert.deepEqual(basicDamageScenarios(battleMove('Eruption'),a,{...d,ability:'Thick Fat / Immunity'}).map(g=>[g.label,g.result.min,g.result.max]),[['Thick Fat',29,35],['Immunity',57,68]]);
});
test('Facade: post-base doubling leaves power70 and retains Gen3 burn penalty',()=>{
 // Quotient30+2=32. Burn floor15+2=17, then x2=34 (not doubled base power).
 assert.deepEqual(range('Facade'),[27,32]);
 for(const status of ['poison','toxic','paralysis'])assert.deepEqual(range('Facade',{attacker:{status}}),[54,64]);
 assert.deepEqual(range('Facade',{attacker:{status:'burn'}}),[28,34]);
 for(const status of ['none','sleep','freeze'])assert.deepEqual(range('Facade',{attacker:{status}}),[27,32]);
 assert.equal(resolve('Facade',{attacker:{status:'poison'}}).power,70);
});
test('Facade: Guts, stages, screens, critical, STAB and type items compose once',()=>{
 const burned={attacker:{status:'burn'}},guts={...a,ability:'Guts'};
 assert.deepEqual(range('Facade',burned,guts),[81,96]); //Atk150: quotient46;+2;*2.
 assert.deepEqual(range('Facade',{attacker:{status:'burn',stages:{attack:1}},defender:{screens:{reflect:true}}},guts),[61,72]); //Atk225:69/2=34;+2;*2.
 assert.deepEqual(range('Facade',{...burned,defender:{screens:{reflect:true}}}),[15,18]); //30/2burn=15;/2screen=7;+2;*2.
 assert.deepEqual(range('Facade',{...burned,critical:true,defender:{screens:{reflect:true}}}),[57,68]); //17*crit2*script2.
 assert.deepEqual(range('Facade',{...burned,critical:true},guts),[163,192]);
 assert.deepEqual(range('Facade',{attacker:{status:'poison'}},{...a,types:['NORMAL']}),[81,96]);
 assert.deepEqual(range('Facade',{attacker:{status:'poison'}},{...a,item:'Silk Scarf'}),[59,70]); //Atk110:quotient33;+2;*2=70.
 assert.deepEqual(range('Facade',burned,a,{...d,types:['GHOST']}),[0,0]);
});
test('Brick Break ignores screens for its hit only and preserves conditions/ordinary moves',()=>{
 const c={defender:{screens:{reflect:true,lightScreen:true}}},before=structuredClone(c);
 assert.deepEqual(range('Brick Break'),[59,70]);assert.deepEqual(range('Brick Break',c),[59,70]);
 assert.deepEqual(range('Brick Break',{...c,critical:true}),[119,140]);
 assert.deepEqual(range('Brick Break',c,{...a,types:['FIGHTING']}),[88,104]);
 assert.deepEqual(range('Strength',c),[16,19]);assert.deepEqual(range('Surf',c),[18,22]);
 assert.deepEqual(c,before);
});
test('special moves use each attacking direction independently and reject all later cases',()=>{
 const other={...d,stats:{...d.stats,attack:200,spAttack:200,defense:200,spDefense:200}};
 assert.deepEqual(range('Facade',{attacker:{status:'poison'}},a,other),[28,34]);
 assert.deepEqual(range('Facade',{attacker:{status:'poison'}},other,a),[160,189]);
 for(const name of ['Counter','Mirror Coat','Present','Magnitude','Psywave','Endeavor','Double Kick','Guillotine'])assert.equal(calc(name),null);
});
