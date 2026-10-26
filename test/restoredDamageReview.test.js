import test from 'node:test';
import assert from 'node:assert/strict';
import {restoredDamageMoves,restoredPowerRanges} from './fixtures/restoredDamageMoves.js';
import {battleMove} from '../src/battle/reference.js';
import {calculateBasicDamage as calc,prepareBasicDamage,basicDamageScenarios} from '../src/battle/basicDamage.js';
const stats={hp:200,attack:100,defense:100,spAttack:100,spDefense:100,speed:100};
const mon={level:50,types:['STEEL'],ability:'None',item:'None',stats};
const neutral=type=>({...mon,types:[['FIGHTING','GHOST'].includes(type)?'ELECTRIC':'NORMAL']});
const range=r=>r&&[r.min,r.max];
const rollRange=max=>[Math.max(1,Math.floor(max*85/100)),max];
const weakness={FLYING:'GRASS',FIGHTING:'NORMAL',GRASS:'WATER',FIRE:'GRASS',ELECTRIC:'WATER',GROUND:'ELECTRIC',WATER:'FIRE',BUG:'PSYCHIC',DRAGON:'DRAGON',GHOST:'PSYCHIC',PSYCHIC:'FIGHTING'};

test('review inventory contains39 individually specified unique Emerald moves',()=>{
 assert.equal(restoredDamageMoves.length,39);assert.equal(new Set(restoredDamageMoves.map(r=>r[0])).size,39);
});
for(const [id,name,type,power,effect,category] of restoredDamageMoves)test(`review ${id} ${name}: Gen3 metadata, both directions, STAB/chart, screens/crit/weather`,()=>{
 const move=battleMove(id),d=neutral(type),[expected,reverseExpected]=restoredPowerRanges[power];
 assert.deepEqual([move.id,move.name,move.type,move.power,move.effect],[id,name,type,power,effect]);
 const prepared=prepareBasicDamage(move,mon,d);assert.equal(prepared.category,category);
 const before=structuredClone({mon,d,move});
 assert.deepEqual(range(calc(move,mon,d)),expected);
 // Independent reverse fixture: Lv47 offensive150/defensive100, noSTAB.
 assert.deepEqual(range(calc(move,{...mon,level:47,stats:{...stats,attack:150,spAttack:150}},d)),reverseExpected);
 const unused=category==='Physical'?'spAttack':'attack',unusedDef=category==='Physical'?'spDefense':'defense';
 assert.deepEqual(range(calc(move,{...mon,stats:{...stats,[unused]:900}},{...d,stats:{...stats,[unusedDef]:900}})),expected);
 const modifier=type==='NORMAL'?.5:2,target=type==='NORMAL'?'ROCK':weakness[type];
 const stab=Math.floor(expected[1]*3/2),typed=Math.floor(stab*modifier);
 assert.deepEqual(range(calc(move,{...mon,types:[type]},{...d,types:[target]})),rollRange(typed));
 // Critical2 bypasses the matching screen. Screen is applied to quotient before+2.
 const c={defender:{screens:{reflect:true,lightScreen:true}}};
 assert.deepEqual(range(calc(move,mon,d,c)),rollRange(Math.floor((expected[1]-2)/2)+2));
 assert.deepEqual(range(calc(move,mon,d,{...c,critical:true})),rollRange(expected[1]*2));
 if(type==='FIRE'||type==='WATER')assert.deepEqual(range(calc(move,mon,d,{weather:type==='FIRE'?'sun':'rain'})),rollRange(Math.floor((expected[1]-2)*3/2)+2));
 assert.deepEqual({mon,d,move},before);
});
test('all39 still use existing items and direct abilities; no after-hit state mutation',()=>{
 for(const [id,,type,,effect,category] of restoredDamageMoves){
  const move=battleMove(id),d=neutral(type),c={attacker:{stages:{attack:1,spAttack:1},status:'burn'},defender:{screens:{reflect:true,lightScreen:true}}};
  const a={...mon,item:category==='Physical'?'Choice Band':'None',ability:category==='Physical'?'Guts':'None'},before=structuredClone({a,d,c});
  assert.ok(calc(move,a,d,c));assert.deepEqual({a,d,c},before);
  if(effect==='ABSORB')assert.deepEqual(range(calc(move,mon,{...d,ability:'Liquid Ooze'})),restoredPowerRanges[move.power][0]);
  if(['RECOIL','DOUBLE_EDGE'].includes(effect))assert.deepEqual(range(calc(move,{...mon,ability:'Rock Head'},d)),restoredPowerRanges[move.power][0]);
  if(type==='FIRE')assert.deepEqual(range(calc(move,mon,{...d,ability:'Flash Fire'})),[0,0]);
  if(type==='WATER')assert.deepEqual(range(calc(move,mon,{...d,ability:'Water Absorb'})),[0,0]);
  if(type==='ELECTRIC')assert.deepEqual(range(calc(move,mon,{...d,ability:'Volt Absorb'})),[0,0]);
  if(type==='GROUND')assert.deepEqual(range(calc(move,mon,{...d,ability:'Levitate'})),[0,0]);
  if(type==='FIRE')assert.equal(basicDamageScenarios(move,mon,{...d,ability:'Thick Fat / Immunity'}).length,2);
  assert.equal(calc(move,mon,{...d,ability:'Wonder Guard'}),null);
 }
});
test('14 common attacks cannot silently fall out of ordinary eligibility in either direction',()=>{
 for(const [id,type,power,category] of [[89,'GROUND',100,'Physical'],[57,'WATER',95,'Special'],[58,'ICE',95,'Special'],[85,'ELECTRIC',95,'Special'],[53,'FIRE',95,'Special'],[157,'ROCK',75,'Physical'],[247,'GHOST',80,'Physical'],[34,'NORMAL',85,'Physical'],[242,'DARK',80,'Special'],[127,'WATER',80,'Special'],[188,'POISON',90,'Physical'],[38,'NORMAL',120,'Physical'],[202,'GRASS',60,'Special'],[63,'NORMAL',150,'Physical']]){
  const m=battleMove(id),d=neutral(type);assert.deepEqual([m.type,m.power],[type,power]);assert.equal(prepareBasicDamage(m,mon,d).category,category);
  const base=power===75?[29,35]:restoredPowerRanges[power][0],reverse=power===75?[39,47]:restoredPowerRanges[power][1];
  assert.deepEqual(range(calc(m,mon,d)),base,m.name);assert.deepEqual(range(calc(m,{...mon,level:47,stats:{...stats,attack:150,spAttack:150}},d)),reverse,m.name);
 }
});
test('self-KO/Struggle and genuine unsupported direct-damage cases stay unavailable',()=>{
 for(const name of ['Self Destruct','Explosion','Struggle','False Swipe','Counter','Mirror Coat','Double Kick','Guillotine','Psywave','Endeavor'])assert.equal(calc(battleMove(name),mon,neutral('NORMAL')),null,name);
});

test('current canonical inventory includes178 eligible/176 excluded with neutral known context',()=>{
 const a={...mon,dex:0,ivs:{hp:31,attack:31,defense:31,speed:31,spAttack:31,spDefense:31},friendship:70,currentHp:200,weight:100},d={...a,types:['NORMAL']};
 let count=0;for(let id=1;id<=354;id++)if(calc(battleMove(id),a,d))count++;
 assert.equal(count,178);assert.equal(354-count,176);
});
