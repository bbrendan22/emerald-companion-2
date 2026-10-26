import test from 'node:test';
import assert from 'node:assert/strict';
import {battleMove} from '../src/battle/reference.js';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {aggregateTripleKick,calculateTripleKickDamage,isAggregateResult,tripleKickPowers} from '../src/battle/twoHitDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {coreDamageDisplayParts} from '../src/battle/coreDamagePresentation.js';
const mon={level:50,dex:143,types:['NORMAL'],ability:'Immunity',item:'None',status:'none',currentHp:200,
 stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const calc=(a=mon,d=mon,w='none',c=false)=>calculateCoreDamage(battleMove('Triple Kick'),a,d,w,c);
const stub=rolls=>({kind:'standard-damage',rolls,min:Math.min(...rolls),max:Math.max(...rolls)});
const options=values=>({status:values.length===1?'known':'uncertain',source:'species',values});
test('Triple Kick uses canonical Fighting and three separately calculated powers10/20/30',()=>{
 assert.deepEqual(tripleKickPowers,[10,20,30]);
 const powers=[];
 const result=calculateTripleKickDamage(battleMove('Triple Kick'),mon,mon,'none',false,{},move=>{
  powers.push(move.power);assert.equal(move.type,'FIGHTING');return stub(Array(16).fill(move.power));
 });
 assert.deepEqual(powers,[10,20,30]);assert.deepEqual(result.hitPowers,[10,20,30]);
 assert.deepEqual(result.distribution,[{damage:60,count:4096}]);
 assert.equal(result.totalOutcomes,4096);assert.equal(result.hitCounts,undefined);assert.equal(result.rolls,undefined);
 assert.equal(result.hitCount,3);assert.equal(result.condition,'all-three-connected');assert.equal(isAggregateResult(result),true);
});
test('independent cartridge arithmetic and literal full total-frequency table',()=>{
 //Lv50 Atk/Def100, noSTAB, Fighting vsNormal: base6/10/15; type12/20/30.
 const result=calc();assert.deepEqual(result.hits.map(h=>[h.base,h.min,h.max]),[[6,10,12],[10,17,20],[15,25,30]]);
 assert.ok(result.hits.every(h=>h.rolls.length===16));
 assert.deepEqual(result.distribution,[
  {damage:52,count:70},{damage:53,count:255},{damage:54,count:525},{damage:55,count:749},
  {damage:56,count:832},{damage:57,count:749},{damage:58,count:526},{damage:59,count:279},
  {damage:60,count:94},{damage:61,count:16},{damage:62,count:1},
 ]);
 assert.equal(result.distribution.reduce((sum,e)=>sum+e.count,0),4096);
 //Independent reference enumeration is small here; production uses convolution.
 const perHit=[12,20,30].map(base=>Array.from({length:16},(_,i)=>Math.floor(base*(85+i)/100)));
 const reference=new Map();
 for(const a of perHit[0])for(const b of perHit[1])for(const c of perHit[2])reference.set(a+b+c,(reference.get(a+b+c)??0)+1);
 assert.deepEqual(result.distribution.map(e=>[e.damage,e.count]),[...reference].sort(([a],[b])=>a-b));
 const wrong=calculateCoreDamage({...battleMove('Tackle'),type:'FIGHTING',power:60},mon,mon);
 assert.notEqual(result.max,wrong.max);assert.notEqual(result.max,result.hits[0].max*6);
});
test('efficient three-hit binomial convolution has exact4096 denominator and no accuracy mixture',()=>{
 const perHit=stub([...Array(8).fill(1),...Array(8).fill(2)]),r=aggregateTripleKick([perHit,perHit,perHit]);
 assert.deepEqual(r.distribution,[{damage:3,count:512},{damage:4,count:1536},{damage:5,count:1536},{damage:6,count:512}]);
 assert.equal(r.distribution.reduce((s,e)=>s+e.count/r.totalOutcomes,0),1);
 for(const invalid of [[],Array(3),[perHit,perHit]])assert.equal(aggregateTripleKick(invalid),null);
 assert.equal(isAggregateResult({...r,condition:undefined}),false);
 assert.equal(isAggregateResult({...r,totalOutcomes:8388608}),false);
 assert.equal(isAggregateResult({...r,rolls:Array(16).fill(3)}),false);
});
test('both directions, per-hit STAB truncation and type effectiveness including immunity',()=>{
 const stronger={...mon,stats:{...mon.stats,attack:150}};
 assert.deepEqual([calc(mon,stronger).min,calc(mon,stronger).max],[52,62]);
 assert.deepEqual([calc(stronger,mon).min,calc(stronger,mon).max],[73,88]);
 const stab=calc({...mon,types:['FIGHTING']});assert.deepEqual([stab.min,stab.max],[77,92]);
 const strongType=calc(mon,{...mon,types:['ROCK','STEEL']});assert.deepEqual([strongType.min,strongType.max],[105,124]);
 const immune=calc(mon,{...mon,types:['GHOST']});assert.deepEqual(immune.distribution,[{damage:0,count:4096}]);
});
test('abilities, held items, burn, weather and stages feed each hit independently',()=>{
 assert.deepEqual([calc({...mon,status:'burn'}).min,calc({...mon,status:'burn'}).max],[29,36]);
 assert.equal(calc({...mon,status:'burn',ability:'Guts'}).max,88);
 assert.equal(calc({...mon,item:'Choice Band'}).max,88);
 assert.equal(calc({...mon,item:'Black Belt'}).max,66);
 assert.equal(calc({...mon,ability:'Huge Power'}).max,114);
 assert.equal(calc(mon,{...mon,ability:'Marvel Scale',status:'poison'}).max,42);
 for(const weather of ['none','rain','sun','sand','hail']) {
  const a={...mon,item:'Choice Band',ability:'Guts',status:'burn',stages:{attack:1}},d={...mon,stages:{defense:1}};
  const r=calc(a,d,weather);
  for(const [index,power] of [10,20,30].entries()) {
   const expected=calculateCoreDamage({...battleMove('Tackle'),type:'FIGHTING',power},a,d,weather);
   assert.deepEqual(r.hits[index].rolls,expected.rolls);
  }
 }
});
test('Crit conditions all three independently rolled hits and honors critical stat-stage exceptions',()=>{
 const normal=calc(),critical=calc(mon,mon,'none',true);
 assert.equal(normal.criticalPolicy,'all-noncritical');assert.equal(critical.criticalPolicy,'all-critical');
 assert.deepEqual([critical.min,critical.max],[105,124]);
 assert.deepEqual(calc({...mon,stages:{attack:-2}},{...mon,stages:{defense:2}},'none',true).distribution,critical.distribution);
 for(const [index,power] of [10,20,30].entries())
  assert.deepEqual(critical.hits[index].rolls,calculateCoreDamage({...battleMove('Tackle'),type:'FIGHTING',power},mon,mon,'none',true).rolls);
 assert.notDeepEqual(critical.distribution,normal.distribution.map(e=>({...e,damage:e.damage*2})),'random integer flooring is perhit, not doubled final totals');
});
test('full aggregate comparison preserves distinct ability scenarios and explicit unmodeled contact branches',()=>{
 const move=battleMove('Triple Kick'),d={...mon,abilityOptions:options(['Immunity','Thick Fat'])};
 const same=calculateAbilityScenarios(move,mon,d);assert.equal(same.groups.length,1);assert.equal(same.groups[0].scenarios.length,2);
 const calculate=(_move,_a,d)=>{
  const hit=stub(Array.from({length:16},(_,i)=>i===0?1:i===15?3:d.ability==='Immunity'?2:1));
  return aggregateTripleKick([hit,hit,hit]);
 };
 const different=calculateAbilityScenarios(move,mon,d,{calculate});
 assert.equal(different.groups.length,2);assert.equal(different.groups[0].hp,different.groups[1].hp);
 assert.notDeepEqual(different.groups[0].result.distribution,different.groups[1].result.distribution);
 for(const ability of ['Flame Body','Static','Poison Point','Effect Spore','Color Change'])
  assert.equal(calc(mon,{...mon,ability}).availability,'unsupported',ability);
 assert.deepEqual(calc(mon,{...mon,ability:'Trace'}),calc());
 const partial=calculateAbilityScenarios(move,mon,{...mon,abilityOptions:options(['Immunity','Flame Body'])});
 assert.deepEqual(partial.groups.map(g=>g.availability),['available','unsupported']);
 assert.equal(calc({...mon,status:'poison'}, {...mon,ability:'Flame Body'}).kind,'aggregate-damage');
 assert.equal(calculateAbilityScenarios(move,{...mon,ability:null},d).groups[0].availability,'unavailable');
});
test('conditional popup text, no partial hit sequences/state changes, and existing result regressions',()=>{
 assert.deepEqual(coreDamageDisplayParts(calc(),200),{percentage:'26.0% – 31.0%',hp:'52–62 HP damage',note:'If all 3 hits connect'});
 const before=structuredClone(mon);
 assert.deepEqual(calc(mon,{...mon,currentHp:1}).distribution,calc().distribution);assert.deepEqual(mon,before);
 assert.equal(calc({...mon,stats:{...mon.stats,attack:'100–120'}}),null);
 assert.equal(calculateCoreDamage(battleMove('Double Kick'),mon,mon).totalOutcomes,256);
 assert.equal(calculateCoreDamage(battleMove('DoubleSlap'),mon,mon).totalOutcomes,8388608);
 assert.equal(calculateCoreDamage(battleMove('Strength'),mon,mon).rolls.length,16);
 assert.equal(calculateCoreDamage(battleMove('Seismic Toss'),mon,mon).kind,'deterministic-damage');
 for(const name of ['Counter','Mirror Coat'])assert.equal(calculateCoreDamage(battleMove(name),mon,mon),null);
});
