// Independent source-derived audit regressions.
import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateBasicDamage,prepareBasicDamage} from '../src/battle/basicDamage.js';
import {battleMove} from '../src/battle/reference.js';
test('AUD-01: zero staged SpA preserves cartridge1–2 HP damage after Thick Fat',()=>{
 // Lv1 Smeargle: SpA5; IV bits56 give Ice70. Miltank can have SpD5 at Lv1.
 const a={dex:235,level:1,types:['NORMAL'],ability:'Own Tempo',stats:{hp:12,attack:5,defense:5,spAttack:5,spDefense:5,speed:6},ivs:{hp:2,attack:2,defense:2,speed:3,spAttack:3,spDefense:3}};
 const d={dex:241,level:1,types:['NORMAL'],ability:'Thick Fat',stats:{hp:12,attack:6,defense:7,spAttack:5,spDefense:5,speed:7}};
 const c={attacker:{stages:{spAttack:-6}},defender:{stages:{spDefense:-6}}};
 // Emerald: ThickFat floor5/2=2; -6 stage floor2/4=0. Defense floor5/4=1.
 // Zero offensive operand => quotient0;+2 =>2; noSTAB or type modifier =>1–2.
 const sourceAttack=Math.floor(Math.floor(5/2)/4),sourceDefense=Math.floor(5/4);
 const sourceBase=Math.floor(Math.floor(2*70*sourceAttack/sourceDefense)/50)+2;
 const expected=[Math.max(1,Math.floor(sourceBase*85/100)),sourceBase];
 assert.deepEqual(expected,[1,2]);
 const input=prepareBasicDamage(battleMove('Hidden Power'),a,d,c),actual=calculateBasicDamage(battleMove('Hidden Power'),a,d,c);
 assert.equal(input.attack,0);assert.deepEqual([actual.min,actual.max],[1,2]);
 assert.deepEqual([actual.min,actual.max],expected);
});

import {frontierTrainers} from '../src/battle/data/frontierTrainers.js';
import {toTowerOpponent} from '../src/battle/frontierAdapter.js';
import {towerSetById} from '../src/battle/towerSets.js';
test('source audit: all300 ordinary trainer IV bands and independent Onix stat fixtures',()=>{
 assert.equal(frontierTrainers.length,300);
 for(const [id,t] of frontierTrainers.entries()){
  const expected=id<100?3:id<120?6:id<140?9:id<160?12:id<180?15:id<200?18:id<220?21:31;
  assert.equal(t.ivs,expected,`${id} ${t.name}`);
 }
 const onix=towerSetById('Onix 1');
 // Hardy, IV31, EV170 in HP/Def/SpD: floor(EV/4)=42.
 // HP=floor((70+31+42)/2)+60=131; Def=floor((320+31+42)/2)+5=201;
 // SpD=floor((90+31+42)/2)+5=86.
 assert.deepEqual(toTowerOpponent(onix).stats,{hp:131,attack:65,defense:201,spAttack:50,spDefense:86,speed:90});
 const at100=toTowerOpponent(onix,{levelMode:'open',openLevel:100});
 assert.deepEqual(at100.stats,{hp:253,attack:126,defense:398,spAttack:96,spDefense:168,speed:176});
});

test('AUD-01: Thick Fat low operands, negative-stage boundaries, critical bypass and defensive safety',()=>{
 const own={level:1,types:['STEEL'],ability:'None',stats:{hp:12,attack:5,defense:5,spAttack:5,spDefense:5,speed:5},ivs:{hp:2,attack:2,defense:2,speed:3,spAttack:3,spDefense:3}};
 const other={...own,types:['NORMAL'],ability:'Thick Fat'};
 const move=battleMove('Hidden Power'),c={attacker:{stages:{spAttack:-6}},defender:{stages:{spDefense:-6}}};
 for(const [spAttack,operand,min,max] of [[1,0,1,2],[2,0,1,2],[3,0,1,2],[4,0,1,2],[5,0,1,2],[7,0,1,2],[8,1,3,4],[9,1,3,4]]){
  const a={...own,stats:{...own.stats,spAttack}},p=prepareBasicDamage(move,a,other,c),r=calculateBasicDamage(move,a,other,c);
  assert.equal(p.attack,operand);assert.deepEqual([r.min,r.max],[min,max]);
 }
 // No Thick Fat: floor5/4=1 =>base4=>3–4.
 const plain=calculateBasicDamage(move,own,{...other,ability:'None'},c);assert.deepEqual([plain.min,plain.max],[3,4]);
 // Crit ignores negative SpA but retains negative SpD: Attack2/Def1 =>base7*2=14.
 const critical=calculateBasicDamage(move,own,other,{...c,critical:true});assert.deepEqual([critical.min,critical.max],[11,14]);
 const positiveDefense=calculateBasicDamage(move,own,other,{critical:true,attacker:c.attacker,defender:{stages:{spDefense:6}}});assert.deepEqual([positiveDefense.min,positiveDefense.max],[5,6]);
 const armored=calculateBasicDamage(move,own,{...other,ability:'Thick Fat / Shell Armor'},c);
 assert.equal(armored,null); // Alternatives genuinely differ: do not select one.
 // Physical zero still receives the existing physical subtotal minimum before+2.
 const physical=calculateBasicDamage(battleMove('Strength'),{...own,stats:{...own.stats,attack:1}},other,{attacker:{stages:{attack:-6}}});assert.deepEqual([physical.min,physical.max],[2,3]);
 const guarded={...other,stats:{...other.stats,spDefense:1}};
 assert.equal(prepareBasicDamage(move,own,guarded,c).defense,1);
 assert.ok(calculateBasicDamage(move,own,guarded,c).rolls.every(Number.isFinite));
 assert.equal(calculateBasicDamage(move,own,{...other,stats:{...other.stats,spDefense:0}},c),null);
});
