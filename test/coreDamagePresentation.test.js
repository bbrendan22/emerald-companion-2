import test from 'node:test';
import assert from 'node:assert/strict';
import {coreDamageDisplayParts} from '../src/battle/coreDamagePresentation.js';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {battleMove} from '../src/battle/reference.js';
const result={kind:'standard-damage',min:68,max:80};
const mon={level:50,types:['NORMAL'],currentHp:1,stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
test('percentages use maximum HP, round to one decimal, and preserve exact integer HP ranges',()=>{
 const before=structuredClone(result);
 assert.deepEqual(coreDamageDisplayParts(result,161),{percentage:'42.2% – 49.7%',hp:'68–80 HP damage'});
 assert.deepEqual(coreDamageDisplayParts({...result,min:1,max:200},200),{percentage:'0.5% – 100.0%',hp:'1–200 HP damage'});
 assert.deepEqual(coreDamageDisplayParts({...result,min:201,max:400},200),{percentage:'100.5% – 200.0%',hp:'201–400 HP damage'});
 assert.deepEqual(result,before);
});
test('both directions use the defender maximum HP, regardless of either current HP',()=>{
 const other={...mon,types:['PSYCHIC'],stats:{...mon.stats,hp:140,defense:81,spAttack:180,spDefense:102}};
 assert.deepEqual(coreDamageDisplayParts(calculateCoreDamage(battleMove('Strength'),mon,other),other.stats.hp),
  {percentage:'40.0% – 47.9%',hp:'56–67 HP damage'});
 assert.deepEqual(coreDamageDisplayParts(calculateCoreDamage(battleMove('Psychic'),other,mon),mon.stats.hp),
  {percentage:'46.0% – 54.5%',hp:'92–109 HP damage'});
});
test('type immunity is a valid zero range; unavailable and uncertain maximum HP stay unavailable',()=>{
 const ghost={...mon,types:['GHOST']};
 assert.deepEqual(coreDamageDisplayParts(calculateCoreDamage(battleMove('Strength'),mon,ghost),ghost.stats.hp),
  {percentage:'0% – 0%',hp:'0–0 HP damage'});
 for(const hp of [undefined,null,0,-1,NaN,Infinity,'140','140–160',1.5])assert.equal(coreDamageDisplayParts(result,hp),null);
 for(const damage of [null,undefined,{kind:'neutral-base',base:37},{...result,min:-1},{...result,min:1.5},{...result,max:67}])
  assert.equal(coreDamageDisplayParts(damage,200),null);
 for(const move of ['Growl','Seismic Toss','Hidden Power'])assert.equal(coreDamageDisplayParts(calculateCoreDamage(battleMove(move),mon,mon),200),null);
 assert.equal(coreDamageDisplayParts(calculateCoreDamage(battleMove('Strength'),mon,null),200),null);
});
