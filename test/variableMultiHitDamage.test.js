import test from 'node:test';
import assert from 'node:assert/strict';
import {battleMove} from '../src/battle/reference.js';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {aggregateVariableHits,calculateVariableMultiHitDamage,isAggregateResult,variableHitChances} from '../src/battle/twoHitDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {coreDamageDisplayParts} from '../src/battle/coreDamagePresentation.js';
const mon={level:50,dex:143,types:['NORMAL'],ability:'Immunity',item:'None',status:'none',currentHp:200,
 stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const moves=[
 [3,'DoubleSlap','NORMAL',15,20,60],[4,'Comet Punch','NORMAL',18,22,65],
 [31,'Fury Attack','NORMAL',15,20,60],[42,'Pin Missile','BUG',14,12,40],
 [131,'Spike Cannon','NORMAL',20,24,75],[140,'Barrage','NORMAL',15,20,60],
 [154,'Fury Swipes','NORMAL',18,22,65],[198,'Bone Rush','GROUND',25,22,65],
 [292,'Arm Thrust','FIGHTING',15,26,80],[331,'Bullet Seed','GRASS',10,10,30],
 [333,'Icicle Spear','ICE',10,10,30],[350,'Rock Blast','ROCK',25,22,65],
];
const calc=(id,a=mon,d=mon,w='none',c=false)=>calculateCoreDamage(battleMove(id),a,d,w,c);
const stub=rolls=>({kind:'standard-damage',rolls,min:Math.min(...rolls),max:Math.max(...rolls)});
const pairs=r=>r.distribution.map(e=>[e.damage,e.count]);
const options=values=>({status:values.length===1?'known':'uncertain',source:'species',values});
test('all12 canonical Emerald types/powers, total ranges, and exact hit-count ratios',()=>{
 assert.deepEqual(variableHitChances,[{hitCount:2,numerator:3,denominator:8},{hitCount:3,numerator:3,denominator:8},{hitCount:4,numerator:1,denominator:8},{hitCount:5,numerator:1,denominator:8}]);
 for(const [id,name,type,power,min,max] of moves) {
  const move=battleMove(id),r=calc(id);
  assert.deepEqual([move.name,move.type,move.power],[name,type,power]);
  assert.equal(isAggregateResult(r),true);assert.equal(r.hitCount,'2-5');assert.equal(r.rolls,undefined);
  assert.deepEqual([r.min,r.max],[min,max],name);
  assert.equal(r.totalOutcomes,8*16**5);
  assert.equal(r.distribution.reduce((sum,e)=>sum+e.count,0),r.totalOutcomes);
  assert.equal(r.hitCounts.length,4);assert.equal(r.hits.length,5);
  for(const branch of r.hitCounts) {
   assert.equal(branch.totalOutcomes,16**branch.hitCount);
   assert.equal(branch.distribution.reduce((sum,e)=>sum+e.count,0),branch.totalOutcomes);
   assert.equal(branch.min,r.hits[0].min*branch.hitCount);assert.equal(branch.max,r.hits[0].max*branch.hitCount);
  }
 }
});
test('closed-form binomial convolution and overlapping weighted totals retain exact integer probabilities',()=>{
 const hits=Array.from({length:5},()=>stub([...Array(8).fill(1),...Array(8).fill(2)]));
 const r=aggregateVariableHits(hits);
 assert.deepEqual(r.hitCounts.map(pairs),[
  [[2,64],[3,128],[4,64]],
  [[3,512],[4,1536],[5,1536],[6,512]],
  [[4,4096],[5,16384],[6,24576],[7,16384],[8,4096]],
  [[5,32768],[6,163840],[7,327680],[8,327680],[9,163840],[10,32768]],
 ]);
 assert.deepEqual(pairs(r),[[2,786432],[3,1966080],[4,2031616],[5,1474560],[6,950272],[7,589824],[8,393216],[9,163840],[10,32768]]);
 assert.equal(r.distribution.reduce((s,e)=>s+e.count,0),8388608);
 assert.equal(r.hitCounts[0].distribution[1].count,128,'mixed per-hit rolls contribute; hits do not share a roll');
 assert.equal(r.hitCounts[3].distribution.length,6,'compact convolution collapses a million paths into six totals');
 //Even a type immunity keeps the full hit-count probability mass without fake rolls.
 const zero=aggregateVariableHits(Array.from({length:5},()=>stub(Array(16).fill(0))));
 assert.deepEqual(zero.distribution,[{damage:0,count:8388608}]);
});
test('five independently calculated hits and exact2/3/4/5 prefix totals, without assuming five hits',()=>{
 let calls=0;
 const r=calculateVariableMultiHitDamage(battleMove(3),mon,mon,'none',false,{},move=>{
  assert.equal(move.power,15);assert.equal(move.type,'NORMAL');return stub(Array(16).fill(++calls));
 });
 assert.equal(calls,5);
 assert.deepEqual(r.hitCounts.map(b=>b.min),[3,6,10,15]);
 assert.deepEqual(pairs(r),[[3,3145728],[6,3145728],[10,1048576],[15,1048576]]);
 assert.deepEqual(r.hitCounts.map(b=>b.chance.numerator/8),[0.375,0.375,0.125,0.125]);
 for(const bad of [[],Array(5),Array(4).fill(stub(Array(16).fill(1)))])assert.equal(aggregateVariableHits(bad),null);
 assert.equal(isAggregateResult({...r,totalOutcomes:256}),false);
 assert.equal(isAggregateResult({...r,rolls:Array(16).fill(3)}),false);
 assert.equal(isAggregateResult({...r,hitCounts:r.hitCounts.map((b,i)=>i===0?{...b,chance:{numerator:1,denominator:4}}:b)}),false);
});
test('all12 both directions preserve per-hit stats, STAB/type, weather, status, stages and applicable items/abilities',()=>{
 const enemy={...mon,stats:{...mon.stats,attack:150,spAttack:150}};
 for(const [id,,type] of moves) {
  assert.ok(calc(id,enemy,mon).max>calc(id,mon,enemy).max);
  for(const weather of ['none','rain','sun','sand','hail']) {
   const a={...mon,ability:'Guts',status:'burn',item:'Choice Band',stages:{attack:1,spAttack:1},types:[type]};
   const d={...mon,ability:'Marvel Scale',status:'poison',stages:{defense:1,spDefense:1}};
   const expected=calculateCoreDamage({...battleMove(id),id:1,effect:'HIT'},a,d,weather);
   const result=calc(id,a,d,weather);
   assert.ok(result.hits.every(hit=>JSON.stringify(hit.rolls)===JSON.stringify(expected.rolls)));
  }
 }
 const high={...mon,stats:{...mon.stats,attack:200,spAttack:200}};
 assert.ok(calc(42,{...high,item:'SilverPowder'}).max>calc(42,high).max);
 assert.ok(calc(331,{...high,item:'Miracle Seed'}).max>calc(331,high).max);
 assert.ok(calc(350,{...mon,item:'Hard Stone'}).max>calc(350).max);
 assert.ok(calc(198,{...mon,item:'Soft Sand'}).max>calc(198).max);
 assert.ok(calc(3,{...mon,ability:'Huge Power'}).max>calc(3).max);
 const overgrow={...mon,ability:'Overgrow',types:['GRASS'],currentHp:60};
 assert.equal(calc(331,overgrow).max,60); //P10->15;subtotal6;+2=8;STAB12;max5*12.
 assert.deepEqual(calc(331,{...overgrow,currentHp:null}).distribution,calc(331,{...overgrow,currentHp:200}).distribution);
 assert.deepEqual(calc(198,mon,{...mon,ability:'Levitate'}).distribution,[{damage:0,count:8388608}]);
 assert.equal(calc(331,mon,{...mon,types:['WATER','GROUND']}).max,120); //P10 base6;4x24;5hits.
 assert.deepEqual(calc(3,mon,{...mon,types:['GHOST']}).distribution,[{damage:0,count:8388608}]);
});
test('Crit model explicitly conditions all hits; independent random convolution remains intact',()=>{
 for(const [id] of moves) {
  const a={...mon,stages:{attack:-2,spAttack:-2}},d={...mon,stages:{defense:2,spDefense:2}};
  const ordinary=calc(id,a,d),critical=calc(id,a,d,'none',true);
  assert.equal(ordinary.criticalPolicy,'all-noncritical');assert.equal(critical.criticalPolicy,'all-critical');
  const expected=calculateCoreDamage({...battleMove(id),id:1,effect:'HIT'},a,d,'none',true);
  assert.deepEqual(critical.distribution,aggregateVariableHits(Array(5).fill(expected),true).distribution);
 }
});
test('ability scenarios group complete weighted distributions and retain unsupported transitions',()=>{
 const d={...mon,abilityOptions:options(['Immunity','Thick Fat'])};
 assert.equal(calculateAbilityScenarios(battleMove(3),mon,d).groups.length,1);
 assert.equal(calculateAbilityScenarios(battleMove(333),mon,d).groups.length,2);
 const calculate=(_move,_a,d)=>{
  const perHit=stub(Array.from({length:16},(_,i)=>i===0?1:i===15?3:d.ability==='Immunity'?2:1));
  return aggregateVariableHits(Array(5).fill(perHit));
 };
 const groups=calculateAbilityScenarios(battleMove(3),mon,d,{calculate}).groups;
 assert.equal(groups.length,2);assert.equal(groups[0].hp,groups[1].hp);assert.notDeepEqual(groups[0].result.distribution,groups[1].result.distribution);
 const partial=calculateAbilityScenarios(battleMove(3),mon,{...mon,abilityOptions:options(['Immunity','Flame Body'])});
 assert.deepEqual(partial.groups.map(g=>g.availability),['available','unsupported']);
 for(const [id] of moves)assert.equal(calc(id,mon,{...mon,ability:'Color Change'}).availability,'unsupported');
 for(const id of [3,4,31,154,292])assert.equal(calc(id,mon,{...mon,ability:'Flame Body'}).availability,'unsupported');
 for(const id of [42,131,140,198,331,333,350])assert.equal(calc(id,mon,{...mon,ability:'Flame Body'}).kind,'aggregate-damage');
 assert.equal(calculateAbilityScenarios(battleMove(3),{...mon,ability:'Skill Link'},mon).groups[0].availability,'unavailable');
});
test('full-attack presentation and fixed two-hit/conventional/deterministic contracts stay intact',()=>{
 assert.deepEqual(coreDamageDisplayParts(calc(3),200),{percentage:'10.0% – 30.0%',hp:'20–60 HP damage'});
 const two=calc('Double Kick');assert.equal(two.hitCount,2);assert.equal(two.totalOutcomes,256);assert.equal(two.min,50);assert.equal(two.max,60);
 assert.equal(isAggregateResult(two),true);
 assert.equal(calc('Strength').rolls.length,16);
 assert.equal(calc('Seismic Toss').kind,'deterministic-damage');assert.equal(calc('Seismic Toss').rolls,undefined);
 for(const name of ['Counter','Mirror Coat'])assert.equal(calc(name),null);
 const before=structuredClone(mon);
 assert.deepEqual(calc(3,mon,{...mon,currentHp:1}).distribution,calc(3).distribution);
 assert.deepEqual(mon,before);
 assert.equal(calc(3,{...mon,stats:{...mon.stats,attack:'100–120'}}),null);
});
