import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCoreDamage,neutralBaseDamage} from '../src/battle/coreDamage.js';
import {battleMove} from '../src/battle/reference.js';
const mon={level:50,types:['NORMAL'],stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const calc=(name,weather,a=mon,d=mon)=>calculateCoreDamage(battleMove(name),a,d,weather);
// Independent hand calculations follow pret/pokeemerald src/pokemon.c
// CalculateBaseDamage: floor subtotal/50, then weather, then +2.
// https://github.com/pret/pokeemerald/blob/master/src/pokemon.c
// STAB/type/random follow battle_script_commands.c Cmd_typecalc/ApplyRandomDmgMultiplier.
test('Water and Fire apply rain/sun to the integer subtotal before +2',()=>{
 // Surf95: subtotal41, neutral43, rain floor(41*3/2)+2=63, sun floor(41/2)+2=22.
 for(const [weather,base,min,max] of [['none',43,36,43],['rain',63,53,63],['sun',22,18,22]]) {
  const r=calc('Surf',weather);assert.deepEqual([r.base,r.min,r.max],[base,min,max]);
 }
 // Flamethrower also has 95 power: rain22, sun63.
 assert.deepEqual([calc('Flamethrower','rain').base,calc('Flamethrower','sun').base],[22,63]);
 assert.deepEqual(calc('Surf','rain').rolls,[53,54,54,55,56,56,57,57,58,59,59,60,61,61,62,63]);
 assert.deepEqual(calc('Flamethrower','rain').rolls,[18,18,19,19,19,19,20,20,20,20,20,21,21,21,21,22]);
});
test('none preserves prior results; sand/hail and unaffected types have no direct modifier',()=>{
 for(const name of ['Surf','Flamethrower','Earthquake','Ice Beam','Thunderbolt','Shadow Ball']) {
  const baseline=calc(name);
  for(const weather of ['none','sand','hail'])assert.deepEqual(calc(name,weather),baseline);
  if(!['Surf','Flamethrower'].includes(name))
   for(const weather of ['rain','sun'])assert.deepEqual(calc(name,weather),baseline);
 }
});
test('weather precedes STAB, type effectiveness and random truncation',()=>{
 const water={...mon,types:['WATER','GROUND']};
 const grass={...mon,types:['GRASS']};
 // Surf subtotal41 -> rain61 -> +2=63 -> STAB94 -> resistance47 -> 39..47.
 const rain=calc('Surf','rain',water,grass);
 assert.deepEqual([rain.base,rain.stab,rain.effectiveness,rain.min,rain.max],[63,1.5,0.5,39,47]);
 assert.deepEqual(rain.rolls,[39,40,40,41,41,42,42,43,43,44,44,45,45,46,46,47]);
 // Sun20 +2=22 -> STAB33 -> resistance16 -> 13..16.
 const sun=calc('Surf','sun',water,grass);
 assert.deepEqual([sun.base,sun.min,sun.max],[22,13,16]);
 const fire={...mon,types:['FIRE']};
 assert.deepEqual([calc('Flamethrower','sun',fire).min,calc('Flamethrower','sun',fire).max],[79,94]);
});
test('weather combines with stat flooring and works in either direction',()=>{
 const player={...mon,types:['WATER','GROUND'],stages:{spAttack:2}};
 const enemy={...mon,types:['PSYCHIC'],stages:{spDefense:1}};
 // Surf: floor(22*95*200/150)=2786 -> /50=55 -> rain82 -> +2=84 -> STAB126.
 const outgoing=calc('Surf','rain',player,enemy);
 assert.deepEqual([outgoing.base,outgoing.min,outgoing.max],[84,107,126]);
 // Reverse Fire Punch: subtotal33 -> sun49 -> +2=51 -> Water resistance25 -> 21..25.
 const incoming=calc('Fire Punch','sun',enemy,player);
 assert.deepEqual([incoming.base,incoming.min,incoming.max],[51,21,25]);
 // Odd stage input101: floor(101*2/3)=67; vs DEF100, Surf subtotal28, rain42,+2=44.
 const odd={...mon,stats:{...mon.stats,spAttack:101},stages:{spAttack:-1}};
 assert.equal(calc('Surf','rain',odd).base,44);
 // A zero subtotal remains zero through weather, then +2 (never weather-scaled to3).
 const tiny={...mon,level:1,stats:{...mon.stats,spAttack:1}};
 assert.equal(calc('Surf','rain',tiny).base,2);
});
test('immunities/unavailable results remain intact and invalid weather fails safely',()=>{
 for(const weather of ['none','rain','sun','sand','hail']) {
  const immune=calc('Thunderbolt',weather,mon,{...mon,types:['GROUND']});
  assert.deepEqual(immune.rolls,Array(16).fill(0));
  assert.equal(calc('Surf',weather,mon,null),null);
  assert.equal(calc('Weather Ball',weather).rolls.length,16);
  assert.equal(calc('Surf',weather,mon,{...mon,stats:{spDefense:'100–120'}}),null);
 }
 for(const weather of [null,'snow','Rain','sandstorm','',NaN,Infinity,0,{},[]]) {
  assert.equal(calc('Surf',weather),null);
  assert.equal(calc('Earthquake',weather),null);
  assert.equal(neutralBaseDamage({level:50,power:95,type:'WATER',spAttack:100,spDefense:100,weather}),null);
 }
});
test('direct weather never activates abilities, burn, critical hits, items or other weather effects',()=>{
 const a={...mon,ability:'Cloud Nine',item:'Leftovers',status:'burn',critical:true};
 const d={...mon,ability:'Air Lock',item:'Leftovers'};
 const before=structuredClone({a,d});
 assert.deepEqual(calc('Surf','rain',a,d),calc('Surf','none'));
 assert.deepEqual(calc('Thunder','rain'),calc('Thunder','none'));
 assert.deepEqual({a,d},before);
});
