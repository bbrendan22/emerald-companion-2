import test from 'node:test';
import assert from 'node:assert/strict';
import {battleMove} from '../src/battle/reference.js';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {aggregateSelectedHits,isAggregateResult,calculateVariableMultiHitDamage,calculateTripleKickDamage} from '../src/battle/twoHitDamage.js';
import {multiHitSelector,selectedHitCount,multiHitPowerLabel} from '../src/battle/multiHitSelection.js';
import {coreDamageDisplayParts} from '../src/battle/coreDamagePresentation.js';
import baseline from './fixtures/damageFinalizationBaseline.json' with {type:'json'};
const mon=baseline.mon;
const moves=[
 [3,15,'Physical',10,12],[4,18,'Physical',11,13],[31,15,'Physical',10,12],
 [42,14,'Physical',6,8],[131,20,'Physical',12,15],[140,15,'Physical',10,12],
 [154,18,'Physical',11,13],[198,25,'Physical',11,13],[292,15,'Physical',13,16],
 [331,10,'Special',5,6],[333,10,'Special',5,6],[350,25,'Physical',11,13],
];
const calc=(id,count,a=mon,d=mon,w='none',critical=false)=>calculateCoreDamage(battleMove(id),a,d,w,critical,{hitCount:count});
const stub=rolls=>({kind:'standard-damage',rolls});
const uncertain=values=>({status:'uncertain',source:'species',values});

for(const [id,power,category,min,max] of moves)test(`${battleMove(id).name}: selected 2/3/4/5 totals preserve canonical per-hit power, category and rounding`,()=>{
 for(const count of [2,3,4,5]){
  const r=calc(id,count);
  assert.equal(battleMove(id).power,power);assert.equal(r.hitCount,count);assert.equal(r.hits.length,count);
  assert.ok(r.hits.every(h=>h.category===category&&h.min===min&&h.max===max));
  assert.deepEqual([r.min,r.max],[min*count,max*count]);
  assert.equal(r.totalOutcomes,16**count);assert.equal(r.distribution.reduce((s,e)=>s+e.count,0),16**count);
  assert.equal(r.hitCounts,undefined);assert.equal(r.rolls,undefined);assert.equal(isAggregateResult(r),true);
  // Existing exact prefix distribution is another regression check; no hit-count weights enter selected totals.
  const legacy=calculateCoreDamage(battleMove(id),mon,mon);
  assert.deepEqual(r.distribution,legacy.hitCounts.find(c=>c.hitCount===count).distribution);
 }
});

test('selected aggregation preserves independent roll frequencies, including distinct per-hit inputs',()=>{
 const hits=Array.from({length:5},()=>stub([...Array(8).fill(1),...Array(8).fill(2)]));
 const binomial=[[1,2,1],[1,3,3,1],[1,4,6,4,1],[1,5,10,10,5,1]];
 for(const n of [2,3,4,5]){
  const r=aggregateSelectedHits(hits.slice(0,n));
  assert.deepEqual(r.distribution,binomial[n-2].map((coefficient,i)=>({damage:n+i,count:coefficient*8**n})));
 }
 const r=aggregateSelectedHits([stub(Array(16).fill(2)),stub(Array(16).fill(3)),stub(Array(16).fill(7))]);
 assert.deepEqual(r.distribution,[{damage:12,count:4096}]);
 assert.notEqual(calc(3,3).max,calculateCoreDamage({...battleMove('Pound'),power:45},mon,mon).max,'three rounded hits differ from one tripled-power hit');
});

test('selected damage functions calculate only the requested hits with canonical powers',()=>{
 for(const count of [2,3,4,5]){
  let calls=0;
  const r=calculateVariableMultiHitDamage(battleMove(3),mon,mon,'none',false,{hitCount:count},move=>{
   assert.equal(move.power,15);return stub(Array(16).fill(++calls));
  });
  assert.equal(calls,count);assert.equal(r.max,count*(count+1)/2);
 }
 for(const count of [1,2,3]){
  const powers=[];
  const r=calculateTripleKickDamage(battleMove(167),mon,mon,'none',false,{hitCount:count},move=>{
   powers.push(move.power);return stub(Array(16).fill(move.power));
  });
  assert.deepEqual(powers,[10,20,30].slice(0,count));assert.deepEqual(r.hitPowers,powers);
  assert.equal(r.max,powers.reduce((a,b)=>a+b,0));
 }
});

test('Triple Kick selected 1/2/3 hit distributions match independent integer arithmetic and enumeration',()=>{
 const rolled=[12,20,30].map(base=>Array.from({length:16},(_,i)=>Math.floor(base*(85+i)/100)));
 for(const n of [1,2,3]){
  const totals=[];
  function enumerate(i,sum){if(i===n){totals.push(sum);return;}for(const damage of rolled[i])enumerate(i+1,sum+damage);}
  enumerate(0,0);const counts=new Map();for(const damage of totals)counts.set(damage,(counts.get(damage)??0)+1);
  const r=calc(167,n);
  assert.deepEqual(r.distribution,[...counts].sort(([a],[b])=>a-b).map(([damage,count])=>({damage,count})));
  assert.deepEqual([r.min,r.max],[[10,12],[27,32],[52,62]][n-1]);
  assert.equal(isAggregateResult(r),true);assert.equal(r.totalOutcomes,16**n);
  assert.deepEqual(r.hitPowers,[10,20,30].slice(0,n));
  assert.equal(coreDamageDisplayParts(r,200).note,n===1?'If 1 hit connects':`If all ${n} hits connect`);
 }
});

test('selected hits retain per-hit modifiers, weather, screens, crit and category in both directions',()=>{
 const a={...mon,ability:'Guts',status:'burn',item:'Choice Band',types:['GRASS'],stages:{attack:-2,spAttack:2}};
 const d={...mon,ability:'Thick Fat',stages:{defense:2,spDefense:1},screens:{reflect:true,lightScreen:true}};
 for(const [id] of [...moves,[167]])for(const count of id===167?[1,2,3]:[2,3,4,5])for(const [attacker,defender] of [[a,d],[d,a]])for(const critical of [false,true]){
  const r=calc(id,count,attacker,defender,'rain',critical);
  for(let i=0;i<count;i++){
   const move=battleMove(id),power=id===167?[10,20,30][i]:move.power;
   const single=calculateCoreDamage({...move,id:1,effect:'HIT',power},attacker,defender,'rain',critical);
   assert.deepEqual(r.hits[i].rolls,single.rolls,`${move.name} ${count}/${i}`);
  }
  assert.equal(r.criticalPolicy,critical?'all-critical':'all-noncritical');
 }
});

test('selected ability groups preserve exact distributions and unsupported contact/copy/type transitions',()=>{
 for(const [id] of [...moves,[167]])for(const count of id===167?[1,2,3]:[2,3,4,5]){
  for(const ability of ['Color Change','Trace'])assert.equal(calc(id,count,mon,{...mon,ability}).availability,'unsupported');
  for(const ability of ['Flame Body','Static','Poison Point','Effect Spore']){
   const r=calc(id,count,mon,{...mon,ability});
   assert.equal(r.availability,[3,4,31,154,292,167].includes(id)?'unsupported':undefined);
  }
  const enemy={...mon,abilityOptions:uncertain(['Immunity','Flame Body'])};
  const groups=calculateAbilityScenarios(battleMove(id),mon,enemy,{battleContext:{hitCount:count}}).groups;
  assert.deepEqual(groups.map(g=>g.availability),[3,4,31,154,292,167].includes(id)?['available','unsupported']:['available']);
  assert.ok(groups.filter(g=>g.availability==='available').every(g=>g.result.hitCount===count));
 }
 const ice=calculateAbilityScenarios(battleMove(333),mon,{...mon,abilityOptions:uncertain(['Immunity','Thick Fat'])},{battleContext:{hitCount:4}});
 assert.deepEqual(ice.groups.map(g=>g.hp),['20–24 HP damage','12–16 HP damage']);
 const sameEndpoints=calculateAbilityScenarios(battleMove(3),mon,{...mon,abilityOptions:uncertain(['Immunity','Thick Fat'])},{
  calculate:(_m,_a,d)=>aggregateSelectedHits(Array(3).fill(stub(Array.from({length:16},(_,i)=>i===0?1:i===15?3:d.ability==='Immunity'?2:1)))),
 });
 assert.equal(sameEndpoints.groups.length,2);assert.equal(sameEndpoints.groups[0].hp,sameEndpoints.groups[1].hp);
 assert.equal(calc(3,3,mon,{...mon,types:['GHOST']}).max,0);
 assert.equal(calc(167,1,mon,{...mon,ability:'Wonder Guard'}).kind,'aggregate-damage','Fighting is super effective on Normal');
 assert.equal(calculateAbilityScenarios(battleMove(3),{...mon,ability:null},mon,{battleContext:{hitCount:3}}).groups[0].availability,'unavailable');
});

test('hit selectors default to 3, reject stale selections, and expose successive Triple Kick powers',()=>{
 for(const [id] of [...moves,[167]]){
  const move=battleMove(id),config=multiHitSelector(move);
  assert.equal(config.label,'Hits');assert.equal(config.defaultValue,'3');assert.equal(selectedHitCount(move,'stale'),3);
  assert.deepEqual(config.options.map(o=>o.value),id===167?['1','2','3']:['2','3','4','5']);
  for(const option of config.options){const n=selectedHitCount(move,option.value);assert.equal(n,Number(option.value));assert.equal(multiHitPowerLabel(move,n),id===167?[10,20,30].slice(0,n).join(' / '):move.power);}
 }
 for(const name of ['Double Kick','Pursuit','Fissure','Psywave','Growl'])assert.equal(multiHitSelector(battleMove(name)),null);
});

test('invalid counts and malformed aggregates remain unavailable without changing other moves',()=>{
 for(const count of [0,1,6,2.5,'3',null])assert.equal(calc(3,count),null);
 for(const count of [0,4,2.5,'3',null])assert.equal(calc(167,count),null);
 for(const hits of [[],Array(3),Array(6).fill(stub(Array(16).fill(1))),[stub([1])]])assert.equal(aggregateSelectedHits(hits),null);
 const r=calc(331,4);
 assert.equal(isAggregateResult({...r,totalOutcomes:16}),false);assert.equal(isAggregateResult({...r,hits:[]}),false);
 for(const name of ['Double Kick','Pursuit','Strength','Seismic Toss','Counter'])assert.deepEqual(calc(name,5),calculateCoreDamage(battleMove(name),mon,mon));
});
