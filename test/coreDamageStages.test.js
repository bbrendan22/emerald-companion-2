import test from 'node:test';
import assert from 'node:assert/strict';
import {coreStageStat,calculateCoreDamage} from '../src/battle/coreDamage.js';
import {battleMove} from '../src/battle/reference.js';
const mon={level:50,types:['ELECTRIC'],stats:{hp:200,attack:101,defense:101,spAttack:101,spDefense:101}};
const move=type=>({id:1,effect:'HIT',power:80,type});
const calc=(type,a=mon,d=mon)=>calculateCoreDamage(move(type),a,d);
const staged=(stat,value)=>({...mon,stages:{[stat]:value}});

test('all 13 stage ratios truncate the stat before damage, and integer stages clamp to ±6',()=>{
 const stats=[25,28,33,40,50,67,101,151,202,252,303,353,404];
 const attackBases=[10,11,13,15,19,25,37,54,72,89,107,125,142];
 const defenseBases=[144,128,109,90,73,55,37,25,19,16,13,12,10];
 // Hand-worked with raw stat101: floor(101*n/d), then
 // floor(floor(22*80*stagedAttack/stagedDefense)/50)+2.
 for(let stage=-6;stage<=6;stage++) {
  assert.equal(coreStageStat(101,stage),stats[stage+6]);
  for(const [type,offense,defense] of [['NORMAL','attack','defense'],['FIRE','spAttack','spDefense']]) {
   assert.equal(calc(type,staged(offense,stage)).base,attackBases[stage+6]);
   assert.equal(calc(type,mon,staged(defense,stage)).base,defenseBases[stage+6]);
  }
 }
 assert.equal(coreStageStat(101,-100),25);assert.equal(coreStageStat(101,100),404);
 assert.deepEqual(calc('NORMAL',staged('attack',100)),calc('NORMAL',staged('attack',6)));
 assert.deepEqual(calc('FIRE',mon,staged('spDefense',-100)),calc('FIRE',mon,staged('spDefense',-6)));
});

test('stage zero exactly preserves all Step 3 fields and rolls',()=>{
 const zeros={attack:0,defense:0,spAttack:0,spDefense:0,speed:0};
 for(const type of ['NORMAL','FIRE','GHOST','DARK'])
  assert.deepEqual(calc(type,{...mon,stages:zeros},{...mon,stages:zeros}),calc(type));
 assert.deepEqual(calc('NORMAL').rolls,[31,31,32,32,32,33,33,34,34,34,35,35,35,36,36,37]);
});

test('Gen III Ghost uses ATK/DEF and Dark uses SPA/SPD, in either direction',()=>{
 const a={...mon,stages:{attack:2,spAttack:-2}},d={...mon,stages:{defense:2,spDefense:-2}};
 assert.equal(calc('GHOST',a,mon).base,72);assert.equal(calc('DARK',a,mon).base,19);
 assert.equal(calc('GHOST',mon,d).base,19);assert.equal(calc('DARK',mon,d).base,73);
 // Reversing the battlers reverses which stage keys are relevant.
 assert.equal(calc('GHOST',d,a).base,37);assert.equal(calc('DARK',d,a).base,37);
});

test('unrelated stages, speed and critical flags cannot change the selected stat pair',()=>{
 for(const [type,own,other] of [
  ['NORMAL',{defense:6,spAttack:6,spDefense:-6,speed:6,accuracy:6},{attack:6,spAttack:-6,spDefense:6,speed:-6,evasion:6}],
  ['FIRE',{attack:6,defense:-6,spDefense:6,speed:-6},{attack:6,defense:-6,spAttack:6,speed:6}],
 ]) assert.deepEqual(calc(type,{...mon,stages:own},{...mon,stages:other}),calc(type));
 const a={...staged('attack',-2),critical:true},d={...staged('defense',2),critical:true};
 assert.deepEqual(calc('NORMAL',a,d),calc('NORMAL',staged('attack',-2),staged('defense',2)));
});

test('staged defenses never reach zero, large staged stats remain valid, and raw invalid stats stay unavailable',()=>{
 const tiny={...mon,stats:{...mon.stats,defense:1,spDefense:1},stages:{defense:-6,spDefense:-6}};
 assert.equal(calc('NORMAL',mon,tiny).base,3557);
 assert.equal(calc('FIRE',mon,tiny).base,3557);
 const huge={...mon,stats:{...mon.stats,attack:999},stages:{attack:6}};
 assert.equal(coreStageStat(999,6),3996);assert.equal(calc('NORMAL',huge).base,1394);
 const tinyAttack={...mon,stats:{...mon.stats,attack:1,spAttack:1},stages:{attack:-6,spAttack:-6}};
 assert.equal(calc('NORMAL',tinyAttack).base,3);assert.equal(calc('FIRE',tinyAttack).base,2);
 for(const value of [undefined,null,0,-1,1.5,NaN,Infinity,'101','101–120']) {
  assert.equal(calc('NORMAL',{...mon,stats:{...mon.stats,attack:value}}),null);
  assert.equal(calc('FIRE',mon,{...mon,stats:{...mon.stats,spDefense:value},stages:{spDefense:-6}}),null);
 }
 for(const stage of [null,NaN,Infinity,'2',1.5])assert.equal(calc('NORMAL',staged('attack',stage)),null);
 assert.equal(calc('NORMAL',mon,{...mon,stats:undefined}),null);
 assert.equal(calc('NORMAL',null,mon),null);
});

test('stages preserve immunities and do not mutate base stats or stages',()=>{
 const a=staged('attack',6),d={...staged('defense',-6),types:['GHOST']};
 const before=structuredClone({a,d});
 const result=calculateCoreDamage(battleMove('Strength'),a,d);
 assert.deepEqual(result.rolls,Array(16).fill(0));assert.equal(result.effectiveness,0);
 assert.deepEqual({a,d},before);
});
