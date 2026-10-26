import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {battleMove} from '../src/battle/reference.js';
const mon={level:50,types:['ELECTRIC'],stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const burned={...mon,status:'burn'};
const calc=(name,a=mon,d=mon,weather='none',critical=false)=>calculateCoreDamage(battleMove(name),a,d,weather,critical);
// Hand-worked references from Emerald src/pokemon.c CalculateBaseDamage:
// floor(floor(levelFactor*power*stagedAttack/stagedDefense)/50), halve for
// Physical burn, minimum1, +2; then critical, STAB, types and random rolls.
// https://github.com/pret/pokeemerald/blob/master/src/pokemon.c

test('burn halves Physical subtotal before +2, not the attack stat or final rolls',()=>{
 // Strength80: subtotal35 -> burn17 -> +2=19 -> random16..19 (not half of31..37).
 const result=calc('Strength',burned);
 assert.deepEqual([result.base,result.min,result.max],[19,16,19]);
 assert.deepEqual(result.rolls,[16,16,16,16,16,17,17,17,17,17,18,18,18,18,18,19]);
 // Odd raw ATK101 with Pound40: subtotal17 -> burn8 -> +2=10.
 // Halving ATK first would produce a different subtotal in boundary cases.
 const odd={...burned,stats:{...mon.stats,attack:101}};
 assert.equal(calc('Pound',odd).base,10);
 // Power120 vs DEF70: subtotal76 -> burn38 -> +2=40; halving ATK
 // to50 before the formula would wrongly produce subtotal37 and base39.
 assert.equal(calculateCoreDamage({...battleMove('Strength'),power:120},odd,{...mon,stats:{...mon.stats,defense:70}}).base,40);
 const tiny={...burned,level:1,stats:{...mon.stats,attack:1}};
 assert.equal(calc('Strength',tiny).base,3);
});

test('Gen III physical Ghost is reduced; Special Dark and every other Special type are unaffected',()=>{
 assert.equal(calc('Shadow Ball',burned).max,19);
 for(const type of ['FIRE','WATER','GRASS','ELECTRIC','PSYCHIC','ICE','DRAGON','DARK']) {
  const move={id:1,power:80,effect:'HIT',type};
  assert.deepEqual(calculateCoreDamage(move,burned,mon),calculateCoreDamage(move,mon,mon));
 }
});

test('burn applies only to the attacker, in either direction; no burn preserves existing results',()=>{
 assert.deepEqual(calc('Strength',mon,burned),calc('Strength'));
 assert.equal(calc('Strength',burned,mon).max,19);
 assert.equal(calc('Strength',mon,burned).max,37);
 assert.deepEqual(calc('Strength',burned,burned),calc('Strength',burned,mon));
 for(const status of [undefined,'none','poison','toxic','paralysis','sleep','freeze'])
  assert.deepEqual(calc('Strength',{...mon,status}),calc('Strength'));
 assert.deepEqual(calc('Strength').rolls,[31,31,32,32,32,33,33,34,34,34,35,35,35,36,36,37]);
});

test('critical hits retain burn and existing stage exceptions',()=>{
 // 35 -> burn17 -> +2=19 -> crit38 -> random32..38.
 const result=calc('Strength',burned,mon,'none',true);
 assert.deepEqual([result.base,result.min,result.max],[19,32,38]);
 const lowered={...burned,stages:{attack:-2}},raisedDef={...mon,stages:{defense:2}};
 assert.deepEqual(calc('Strength',lowered,raisedDef,'none',true),result);
 const boosted={...burned,stages:{attack:2}},loweredDef={...mon,stages:{defense:-2}};
 assert.equal(calc('Strength',boosted,mon,'none',true).max,74);
 assert.equal(calc('Strength',burned,loweredDef,'none',true).max,74);
});

test('stages truncate before burn, followed by STAB and type modifiers',()=>{
 const attacker={...burned,types:['NORMAL'],stats:{...mon.stats,attack:101},stages:{attack:1}};
 const defender={...mon,types:['ROCK']};
 // floor(101*3/2)=151; floor(22*80*151/100/50)=53;
 // burn26,+2=28, STAB42, Rock21, random17..21.
 const r=calc('Strength',attacker,defender);
 assert.deepEqual([r.base,r.stab,r.effectiveness,r.min,r.max],[28,1.5,0.5,17,21]);
 assert.equal(calc('Strength',{...burned,stages:{attack:2}}).base,37);
 assert.equal(calc('Strength',burned,{...mon,stages:{defense:2}}).base,10);
 for(const weather of ['none','rain','sun','sand','hail'])assert.deepEqual(calc('Strength',burned,mon,weather),calc('Strength',burned));
 assert.deepEqual(calc('Surf',burned,mon,'rain',true),calc('Surf',mon,mon,'rain',true));
});

test('immunities/unavailable results remain intact and Guts suppresses burn',()=>{
 const ghost={...mon,types:['GHOST']};
 assert.deepEqual(calc('Strength',burned,ghost,'sun',true).rolls,Array(16).fill(0));
 assert.equal(calc('Strength',burned,null),null);
 assert.equal(calc('Strength',{...burned,stats:{attack:undefined}}),null);
 assert.equal(calc('Strength',burned,{...mon,stats:{defense:'100–120'}}),null);
 assert.equal(calc('Counter',burned),null);
 const guts={...burned,ability:'Guts'},before=structuredClone(guts);
 assert.equal(calc('Strength',guts).max,54);
 assert.deepEqual(guts,before);
});
