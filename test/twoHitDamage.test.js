import test from 'node:test';
import assert from 'node:assert/strict';
import {battleMove} from '../src/battle/reference.js';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {aggregateTwoHits,isAggregateResult,calculateTwoHitDamage} from '../src/battle/twoHitDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {coreDamageDisplayParts} from '../src/battle/coreDamagePresentation.js';
const mon={level:50,dex:143,types:['NORMAL'],ability:'Immunity',item:'None',status:'none',currentHp:200,
 stats:{hp:200,attack:100,defense:100,spAttack:90,spDefense:120}};
const calc=(name,a=mon,d=mon,w='none',c=false)=>calculateCoreDamage(battleMove(name),a,d,w,c);
const counts=distribution=>distribution.map(({damage,count})=>[damage,count]);
const options=values=>({status:values.length===1?'known':'uncertain',source:'species',values});
const stub=rolls=>({kind:'standard-damage',rolls,min:Math.min(...rolls),max:Math.max(...rolls)});
test('canonical per-hit types/powers, all256 independent total outcomes and exact literal frequencies',()=>{
 //Lv50 Atk/Def100:DoubleKick P30 base15;Normal weakness30;perhit25..30.
 //Twineedle P25 base13;perhit11..13. Bonemerang P50 base24;perhit20..24.
 const expected={
  'Double Kick':{type:'FIGHTING',power:30,distribution:[[50,4],[51,12],[52,25],[53,36],[54,46],[55,46],[56,39],[57,26],[58,15],[59,6],[60,1]]},
  Twineedle:{type:'BUG',power:25,distribution:[[22,64],[23,112],[24,65],[25,14],[26,1]]},
  Bonemerang:{type:'GROUND',power:50,distribution:[[40,9],[41,24],[42,40],[43,56],[44,54],[45,40],[46,24],[47,8],[48,1]]},
 };
 for(const [name,e] of Object.entries(expected)) {
  const move=battleMove(name),r=calc(name);
  assert.equal(move.type,e.type);assert.equal(move.power,e.power);assert.equal(isAggregateResult(r),true);
  assert.equal(r.hitCount,2);assert.equal(r.rolls,undefined);assert.equal(r.totalOutcomes,256);
  assert.deepEqual(counts(r.distribution),e.distribution);
  assert.equal(r.distribution.reduce((sum,e)=>sum+e.count,0),256);
  assert.equal(r.distribution.reduce((sum,e)=>sum+e.count/256,0),1);
  assert.equal(r.hits.length,2);assert.ok(r.hits.every(hit=>hit.rolls.length===16));
  assert.ok(r.distribution.some(e=>e.damage%2===1),'independent hits permit odd totals even if identical rolls doubled would not');
 }
 assert.deepEqual(coreDamageDisplayParts(calc('Double Kick'),200),{percentage:'25.0% – 30.0%',hp:'50–60 HP damage'});
});
test('two separately calculated hit arrays are convolved, including different per-hit distributions',()=>{
 const first=stub(Array.from({length:16},(_,i)=>i)),second=stub(Array.from({length:16},(_,i)=>i+100));
 const calls=[];
 const r=calculateTwoHitDamage(battleMove('Double Kick'),mon,mon,'none',false,{},(move,...args)=>{
  calls.push({move,args});return calls.length===1?first:second;
 });
 assert.equal(calls.length,2);assert.ok(calls.every(c=>c.move.power===30&&c.move.type==='FIGHTING'));
 assert.deepEqual(r.distribution.map(e=>e.count),[...Array.from({length:16},(_,i)=>i+1),...Array.from({length:15},(_,i)=>15-i)]);
 assert.equal(r.min,100);assert.equal(r.max,130);
 assert.notDeepEqual(r.distribution,aggregateTwoHits(first,first).distribution);
 assert.equal(aggregateTwoHits(stub([1]),second),null);
 assert.equal(isAggregateResult({...r,totalOutcomes:16}),false);
 assert.equal(isAggregateResult({...r,rolls:Array(16).fill(100)}),false);
 assert.equal(isAggregateResult({...r,distribution:r.distribution.map((e,i)=>i===0?{...e,count:2}:e)}),false);
});
test('both directions, STAB, type chart and supported ability immunities apply to each hit',()=>{
 const stronger={...mon,types:['FIGHTING'],stats:{...mon.stats,attack:150}};
 assert.equal(calc('Double Kick',stronger,mon).max,124); //P30 Atk150 base21;STAB31;Normal weakness62;two hits124.
 assert.equal(calc('Double Kick',mon,stronger).max,30); //noSTAB/noNormalweakness:15 perhit.
 for(const [name,types] of [['Double Kick',['GHOST']],['Bonemerang',['FLYING']]]) {
  const r=calc(name,mon,{...mon,types});assert.deepEqual(r.distribution,[{damage:0,count:256}]);
 }
 assert.deepEqual(calc('Bonemerang',mon,{...mon,ability:'Levitate'}).distribution,[{damage:0,count:256}]);
 assert.equal(calc('Twineedle',{...mon,types:['BUG']},{...mon,types:['PSYCHIC']}).max,76); //base13 STAB19;weakness38;2hits.
});
test('per-hit burn, stages, items, abilities and weather retain ordinary integer rounding',()=>{
 for(const name of ['Double Kick','Twineedle','Bonemerang'])for(const weather of ['none','rain','sun','sand','hail']) {
  const a={...mon,ability:'Guts',status:'burn',item:'Choice Band',stages:{attack:1}};
  const d={...mon,ability:'Marvel Scale',status:'poison',stages:{defense:1}};
  const r=calc(name,a,d,weather);
  const reference=calculateCoreDamage({...battleMove(name),id:1,effect:'HIT'},a,d,weather);
  assert.deepEqual(r.hits[0].rolls,reference.rolls);assert.deepEqual(r.hits[1].rolls,reference.rolls);
 }
 assert.ok(calc('Double Kick',{...mon,item:'Black Belt'}).max>calc('Double Kick').max);
 assert.ok(calc('Twineedle',{...mon,item:'SilverPowder'}).max>calc('Twineedle').max);
 assert.ok(calc('Bonemerang',{...mon,item:'Soft Sand'}).max>calc('Bonemerang').max);
 assert.ok(calc('Double Kick',{...mon,ability:'Huge Power'}).max>calc('Double Kick').max);
 const swarm={...mon,ability:'Swarm',currentHp:60,types:['BUG']};
 assert.equal(calc('Twineedle',swarm).max,54); //floor25*1.5=37;subtotal16;+2=18;STAB27 perhit.
 assert.deepEqual(calc('Twineedle',{...swarm,currentHp:null}).distribution,calc('Twineedle',{...swarm,currentHp:200}).distribution);
});
test('Crit checkbox conditions each hit independently on both-noncritical or both-critical, never a shared random roll',()=>{
 for(const name of ['Double Kick','Twineedle','Bonemerang']) {
  const a={...mon,stages:{attack:-2}},d={...mon,stages:{defense:2}};
  const normal=calc(name,a,d),critical=calc(name,a,d,'none',true);
  assert.equal(normal.criticalPolicy,'both-noncritical');assert.equal(critical.criticalPolicy,'both-critical');
  const expected=calculateCoreDamage({...battleMove(name),id:1,effect:'HIT'},a,d,'none',true);
  assert.deepEqual(critical.hits.map(h=>h.rolls),[expected.rolls,expected.rolls]);
  assert.deepEqual(critical.distribution,aggregateTwoHits(expected,expected,true).distribution);
  assert.equal(critical.totalOutcomes,256);
 }
});
test('on-hit effects with unmodeled second-hit transitions are explicit unsupported scenarios',()=>{
 for(const name of ['Double Kick','Twineedle','Bonemerang']) {
  assert.equal(calc(name,mon,{...mon,ability:'Color Change'}).availability,'unsupported');
  assert.equal(calc(name,{...mon,ability:'Trace'}).availability,'unsupported');
 }
 for(const ability of ['Flame Body','Effect Spore','Static','Poison Point'])
  assert.equal(calc('Double Kick',mon,{...mon,ability}).availability,'unsupported');
 assert.equal(calc('Double Kick',{...mon,status:'poison'},{...mon,ability:'Flame Body'}).kind,'aggregate-damage');
 for(const name of ['Twineedle','Bonemerang'])assert.equal(calc(name,mon,{...mon,ability:'Flame Body'}).kind,'aggregate-damage','noncontact');
 assert.deepEqual(calc('Double Kick',mon,{...mon,types:['GHOST'],ability:'Flame Body'}).distribution,[{damage:0,count:256}]);
 //Rough Skin recoil and Twineedle poison are outside the requested two-connected-hit total.
 assert.equal(calc('Double Kick',mon,{...mon,ability:'Rough Skin'}).kind,'aggregate-damage');
});
test('ability scenarios compare entire distributions, not merely endpoints or formatted percentages',()=>{
 const d={...mon,abilityOptions:options(['Immunity','Thick Fat'])};
 const same=calculateAbilityScenarios(battleMove('Double Kick'),mon,d);
 assert.equal(same.groups.length,1);assert.equal(same.groups[0].scenarios.length,2);assert.equal(same.groups[0].rolls,null);
 const a={...mon,abilityOptions:options(['Immunity','Huge Power'])};
 assert.equal(calculateAbilityScenarios(battleMove('Double Kick'),a,mon).groups.length,2);
 const calculate=(_move,_a,d)=>{
  const first=stub(Array.from({length:16},(_,i)=>i===0?1:i===15?3:2));
  const second=stub(Array.from({length:16},(_,i)=>i<8?1:3));
  return aggregateTwoHits(first,d.ability==='Immunity'?first:second);
 };
 const different=calculateAbilityScenarios(battleMove('Double Kick'),mon,d,{calculate});
 assert.equal(different.groups.length,2);assert.equal(different.groups[0].hp,different.groups[1].hp);
 assert.notDeepEqual(different.groups[0].result.distribution,different.groups[1].result.distribution);
 const partial=calculateAbilityScenarios(battleMove('Double Kick'),mon,{...d,abilityOptions:options(['Immunity','Flame Body'])});
 assert.deepEqual(partial.groups.map(g=>g.availability),['available','unsupported']);
 assert.equal(calculateAbilityScenarios(battleMove('Double Kick'),{...mon,ability:null},d).groups[0].availability,'unavailable');
});
test('no target fainting stop, secondary mutation or variable-hit admission; conventional/deterministic results unchanged',()=>{
 const before=structuredClone(mon);
 assert.deepEqual(calc('Double Kick',mon,{...mon,currentHp:1}).distribution,calc('Double Kick').distribution);
 assert.deepEqual(mon,before);
 for(const name of ['Counter','Mirror Coat'])assert.equal(calc(name),null);
 assert.equal(calc('Strength').rolls.length,16);
 assert.equal(calc('Seismic Toss').kind,'deterministic-damage');
 assert.equal(calc('Seismic Toss').rolls,undefined);
 assert.equal(calc('Double Kick',{...mon,stats:{...mon.stats,attack:'100–120'}}),null);
});
