import test from 'node:test';
import assert from 'node:assert/strict';
import {battleMove} from '../src/battle/reference.js';
import {conditionalCases,conditionalCaseLabel,conditionalPowerLabel,calculateConditionalDamage} from '../src/battle/conditionalDamage.js';
import {calculateCoreDamage,isConventionalDamageMove} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {coreDamageDisplayParts} from '../src/battle/coreDamagePresentation.js';
const mon={level:50,types:['NORMAL'],ability:'Immunity',item:'None',status:'none',currentHp:100,
 stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const move=battleMove('Magnitude'),powers=[10,30,50,70,90,110,150],weights=[5,10,20,30,20,10,5];
const calc=(a=mon,d=mon,w='none',c=false,context={})=>calculateCoreDamage(move,a,d,w,c,context);
const values=result=>result.conditions.map(c=>c.result);
const rolls=max=>Array.from({length:16},(_,i)=>Math.floor(max*(85+i)/100));
const options=values=>({status:values.length===1?'known':'uncertain',source:'species',values});
test('seven exact Magnitude levels, dynamic powers and rational selection chances remain ordered and separate',()=>{
 const before=structuredClone(move),result=calc();
 assert.equal(move.id,222);assert.equal(move.type,'GROUND');assert.equal(isConventionalDamageMove(move),false);
 assert.equal(result.kind,'conditional-damage');assert.equal(result.conditions.length,7);
 assert.deepEqual(result.conditions.map(c=>c.level),[4,5,6,7,8,9,10]);
 assert.deepEqual(result.conditions.map(c=>c.power),powers);
 assert.deepEqual(result.conditions.map(c=>c.probability),weights.map(numerator=>({numerator,denominator:100})));
 assert.equal(result.conditions.reduce((n,c)=>n+c.probability.numerator,0),100);
 assert.deepEqual(conditionalCases(move).map(conditionalCaseLabel),powers.map((p,i)=>`MAGNITUDE ${i+4} · ${p} POWER · ${weights[i]}%`));
 assert.equal(conditionalPowerLabel(move),'10–150');
 assert.equal(result.min,undefined);assert.equal(result.max,undefined);assert.equal(result.rolls,undefined);assert.equal(result.distribution,undefined);
 assert.equal(coreDamageDisplayParts(result,200),null,'never display a combined strength range');
 assert.deepEqual(move,before);assert.ok(Object.isFrozen(conditionalCases(move)[0].probability));
});
test('each power recalculates exact16 rolls, not scaled damage; chance does not weight the roll array',()=>{
 // Independent Emerald: Lv50 Atk/Def100 => floor(22*power/50)+2.
 const ends=[6,15,24,32,41,50,68],result=calc();
 for(const [index,c] of result.conditions.entries()) {
  assert.equal(c.result.category,'Physical');assert.equal(c.formulaPower,powers[index]);assert.equal(c.multiplier,1);
  assert.equal(c.result.base,ends[index]);assert.deepEqual(c.result.rolls,rolls(ends[index]));
  assert.equal(c.result.rolls.length,16,'all conditional random rolls retain equal frequency');
 }
 assert.notDeepEqual(values(result)[1].rolls,values(result)[0].rolls.map(n=>n*3));
 const calls=[];
 calculateConditionalDamage(move,mon,mon,'none',false,{},m=>{calls.push(m);return null;});
 assert.deepEqual(calls.map(m=>[m.type,m.formulaPower,m.damageMultiplier]),powers.map(p=>['GROUND',p,1]));
});
test('odd operands and levels preserve Emerald divisions independently at every strength',()=>{
 const a={...mon,level:53,stats:{...mon.stats,attack:123}},d={...mon,stats:{...mon.stats,defense:117}};
 // floor(2*53/5)+2=23. Independent integer quotients for powers10..150.
 assert.deepEqual(values(calc(a,d)).map(r=>r.base),[6,16,26,35,45,55,74]);
 for(const c of calc(a,d).conditions) {
  const ordinary=calculateCoreDamage({...battleMove('Earthquake'),power:c.power},a,d);
  assert.deepEqual(c.result.rolls,ordinary.rolls);
 }
});
test('Ground Physical stats, STAB and type effectiveness apply to each strength in both directions',()=>{
 const enemy={...mon,stats:{...mon.stats,attack:150,spAttack:1}};
 assert.deepEqual(values(calc(enemy,mon)).map(r=>r.max),[8,21,35,48,61,74,101]);
 assert.deepEqual(values(calc(mon,enemy)).map(r=>r.max),[6,15,24,32,41,50,68]);
 const a={...mon,types:['GROUND'],stats:{attack:100}},d={...mon,types:['ELECTRIC'],stats:{defense:100}};
 for(const [i,r] of values(calc(a,d)).entries())assert.deepEqual(r.rolls,rolls(Math.floor([6,15,24,32,41,50,68][i]*3/2)*2));
 assert.equal(values(calc(mon,{...mon,types:['FIRE','STEEL']})).at(-1).max,272);
 assert.equal(values(calc(mon,{...mon,types:['GRASS','BUG']})).at(-1).max,17);
});
test('burn/Guts, abilities, items and stat stages use ordinary operand ordering at every level',()=>{
 const cases=[
  [{...mon,status:'burn'},mon],
  [{...mon,ability:'Guts',status:'burn',item:'Choice Band',stages:{attack:1}},{...mon,ability:'Marvel Scale',status:'poison',stages:{defense:1}}],
  [{...mon,ability:'Huge Power',item:'Soft Sand'},mon],
  [mon,{...mon,dex:132,item:'Metal Powder',transformed:false}],
 ];
 for(const [a,d] of cases)for(const c of calc(a,d).conditions) {
  const ordinary=calculateCoreDamage({...battleMove('Earthquake'),power:c.power},a,d);
  assert.deepEqual(c.result,ordinary);
 }
 assert.equal(values(calc({...mon,status:'burn'})).at(-1).base,35);
 assert.equal(values(calc({...mon,status:'burn',ability:'Guts'})).at(-1).base,101);
 assert.equal(values(calc({...mon,item:'Soft Sand'})).at(-1).base,74);
});
test('screens and critical interactions preserve16 rolls at every level; no weather boost is invented',()=>{
 const d={...mon,screens:{reflect:true}};
 assert.deepEqual(values(calc(mon,d)).map(r=>r.base),[4,8,13,17,21,26,35]);
 assert.deepEqual(calc(mon,{...mon,screens:{lightScreen:true}}),calc());
 assert.deepEqual(calc(mon,d,'none',true),calc(mon,mon,'none',true));
 assert.deepEqual(values(calc(mon,d,'none',true)).map(r=>r.max),[12,30,48,64,82,100,136]);
 for(const sign of [-2,2])for(const critical of [false,true]) {
  const a={...mon,stages:{attack:sign}},target={...d,stages:{defense:sign}};
  for(const c of calc(a,target,'none',critical).conditions)
   assert.deepEqual(c.result.rolls,calculateCoreDamage({...battleMove('Earthquake'),power:c.power},a,target,'none',critical).rolls);
 }
 for(const weather of ['none','sun','rain','sand','hail'])assert.deepEqual(calc(mon,mon,weather),calc());
});
test('Flying/Levitate immunity, Wonder Guard prevention and unavailable data remain distinct per level',()=>{
 for(const target of [{...mon,types:['FLYING']},{...mon,ability:'Levitate'}])
  assert.ok(values(calc(mon,target)).every(r=>r.effectiveness===0&&r.rolls.every(n=>n===0)&&r.outcome!=='blocked'));
 const wg={...mon,ability:'Wonder Guard'};
 assert.ok(values(calc(mon,wg)).every(r=>r.outcome==='blocked'&&r.reason==='wonder-guard'&&r.rolls===undefined));
 assert.deepEqual(calc(mon,{...wg,types:['ELECTRIC']}),calc(mon,{...mon,types:['ELECTRIC']}));
 assert.ok(values(calc(mon,{...wg,types:['FLYING']})).every(r=>r.effectiveness===0),'ordinary immunity is not labeled Wonder Guard prevention');
 assert.ok(values(calc(mon,{...mon,stats:{defense:'100–120'}})).every(r=>r===null));
 const unknown=calculateAbilityScenarios(move,mon,{...mon,ability:null});
 assert.ok(unknown.conditions.every(c=>c.abilityDamage.groups[0].availability==='unavailable'));
 const unsupported=calculateAbilityScenarios(move,mon,dummyScreen(),{battleContext:{format:'Doubles'}});
 assert.ok(unsupported.conditions.every(c=>c.abilityDamage.groups[0].reason==='unknown-defender-side-count'));
});
const dummyScreen=()=>({...mon,screens:{reflect:true}});
test('known/uncertain ability branches group full outcomes only within each Magnitude level',()=>{
 const target={...mon,abilityOptions:options(['Immunity','Levitate'])};
 const result=calculateAbilityScenarios(move,mon,target);
 assert.equal(result.conditions.length,7);
 for(const c of result.conditions) {
  assert.deepEqual(c.abilityDamage.groups.map(g=>g.label),['Immunity','Levitate']);
  assert.deepEqual(c.probability,{numerator:weights[c.level-4],denominator:100});
  assert.equal(c.abilityDamage.groups[1].max,0);
 }
 const own={...mon,abilityOptions:options(['Immunity','Huge Power'])};
 assert.ok(calculateAbilityScenarios(move,own,mon).conditions.every(c=>c.abilityDamage.groups.length===2));
 assert.ok(calculateAbilityScenarios(move,mon,own).conditions.every(c=>c.abilityDamage.groups.length===1));
 const prevented=calculateAbilityScenarios(move,mon,{...mon,abilityOptions:options(['Immunity','Wonder Guard'])});
 assert.ok(prevented.conditions.every(c=>JSON.stringify(c.abilityDamage.groups.map(g=>g.availability))===JSON.stringify(['available','blocked'])));
 let calls=0;
 const calculate=(m,_a,d)=>{calls++;return {kind:'conditional-damage',conditions:conditionalCases(m).map(c=>({...c,
  result:{kind:'standard-damage',min:1,max:3,rolls:Array.from({length:16},(_,i)=>i===0?1:i===15?3:d.ability==='Immunity'?2:1)},
 }))};};
 const different=calculateAbilityScenarios(move,mon,target,{calculate});
 assert.equal(calls,2);assert.equal(different.conditions.length,7);
 assert.ok(different.conditions.every(c=>c.abilityDamage.groups.length===2),'same min/max never erases frequency differences');
});
test('probabilities do not leak into prior conditions, and Dig/state/other deferred mechanics remain untouched',()=>{
 const before=structuredClone(mon);
 assert.deepEqual(calc({...mon,magnitude:10},{...mon,underground:true,dig:true}),calc());assert.deepEqual(mon,before);
 for(const name of ['Pursuit','Revenge','Rollout','Ice Ball','Fury Cutter']) {
  const result=calculateCoreDamage(battleMove(name),mon,mon);
  assert.ok(result.conditions.every(c=>c.probability===undefined));
 }
 assert.equal(calculateCoreDamage(battleMove('Strength'),mon,mon).rolls.length,16);
 assert.equal(calculateCoreDamage(battleMove('Seismic Toss'),mon,mon).kind,'deterministic-damage');
 for(const [name,total] of [['Double Kick',256],['DoubleSlap',8388608],['Triple Kick',4096]])assert.equal(calculateCoreDamage(battleMove(name),mon,mon).totalOutcomes,total);
 assert.equal(calculateCoreDamage(battleMove('Fissure'),mon,mon).kind,'ohko');
 assert.equal(calculateCoreDamage(battleMove('Counter'),mon,mon),null);
});
