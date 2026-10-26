import test from 'node:test';
import assert from 'node:assert/strict';
import {battleMove} from '../src/battle/reference.js';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {calculatePsywaveDamage,isLevelDamageResult,isDeterministicResult,isDeterministicMove} from '../src/battle/deterministicDamage.js';
import {conditionalCases,presentHealingProbability,conditionalMoveNote,conditionalCaseLabel} from '../src/battle/conditionalDamage.js';
import {coreDamageDisplayParts} from '../src/battle/coreDamagePresentation.js';
const mon={level:50,types:['NORMAL'],ability:'Immunity',item:'None',currentHp:50,status:'none',
 stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const target={...mon,currentHp:101};
const calc=(name,a=mon,d=target,w='none',c=false,context={})=>calculateCoreDamage(battleMove(name),a,d,w,c,context);
const options=values=>({status:values.length===1?'known':'uncertain',source:'species',values});
const rolls=max=>Array.from({length:16},(_,i)=>Math.floor(max*(85+i)/100));
const hits=result=>result.conditions.map(c=>c.result);
test('Psywave has exactly11 uniform r values at the actual attacking levels50/60/100, not16 conventional rolls',()=>{
 for(const [level,expected] of [[50,[25,30,35,40,45,50,55,60,65,70,75]],
  [60,[30,36,42,48,54,60,66,72,78,84,90]],[100,[50,60,70,80,90,100,110,120,130,140,150]]]) {
  const result=calc('Psywave',{...mon,level});
  assert.equal(result.kind,'level-damage');assert.equal(result.totalOutcomes,11);assert.equal(isLevelDamageResult(result),true);
  assert.equal(isDeterministicResult(result),false);assert.equal(isDeterministicMove(battleMove('Psywave')),false);
  assert.deepEqual(result.rolls,expected);assert.deepEqual(result.distribution,expected.map(damage=>({damage,count:1})));
  assert.deepEqual([result.min,result.max],[expected[0],expected.at(-1)]);
  assert.deepEqual(calc('Psywave',target,{...mon,level}).rolls,calc('Psywave').rolls,'defender level irrelevant');
  assert.deepEqual(calc('Psywave',{...target,level},mon).rolls,expected,'both attack directions');
 }
});
test('Psywave truncates integer damage and preserves cartridge zero rolls and duplicate frequencies',()=>{
 assert.deepEqual(calc('Psywave',{...mon,level:1}).rolls,[0,0,0,0,0,1,1,1,1,1,1]);
 assert.deepEqual(calc('Psywave',{...mon,level:1}).distribution,[{damage:0,count:5},{damage:1,count:6}]);
 assert.deepEqual(calc('Psywave',{...mon,level:2}).rolls,[1,1,1,1,1,2,2,2,2,2,3]);
 assert.deepEqual(calc('Psywave',{...mon,level:2}).distribution,[{damage:1,count:5},{damage:2,count:5},{damage:3,count:1}]);
 assert.deepEqual(calc('Psywave',{...mon,level:5}).rolls,[2,3,3,4,4,5,5,6,6,7,7]);
 for(const level of [undefined,null,0,101,1.5,'50',NaN])assert.equal(calc('Psywave',{...mon,level}),null);
 const result=calc('Psywave');
 for(const patch of [{rolls:Array(16).fill(50)},{totalOutcomes:16},{distribution:[{damage:25,count:11}]},{min:1}])assert.equal(isLevelDamageResult({...result,...patch}),false);
 assert.equal(calculatePsywaveDamage(battleMove('Seismic Toss'),mon,target),null);
});
test('Psywave bypasses irrelevant conventional stats, STAB, items, weather, screens and criticals',()=>{
 const a={...mon,types:['PSYCHIC'],ability:'Huge Power',item:null,status:'burn',stages:{attack:6,spAttack:6},stats:{hp:200,attack:NaN,spAttack:'unknown'}};
 const d={...target,ability:'Thick Fat',types:['STEEL'],item:'Metal Powder',stages:{spDefense:6},screens:{reflect:true,lightScreen:true},stats:{hp:200,defense:NaN}};
 for(const weather of ['none','rain','sun','sand','hail',null])assert.deepEqual(calc('Psywave',a,d,weather,true,{format:'Doubles'}),calc('Psywave'));
 for(const types of [['FIGHTING'],['POISON'],['FIGHTING','POISON'],['PSYCHIC'],['STEEL']])assert.deepEqual(calc('Psywave',mon,{...target,types}).rolls,calc('Psywave').rolls);
});
test('Psywave respects Dark immunity, Wonder Guard, failure and explicit unsupported/unavailable boundaries',()=>{
 assert.deepEqual(calc('Psywave',mon,{...target,types:['DARK']}),{kind:'deterministic-damage',outcome:'immune',damage:0,reason:'type-immunity'});
 const wg={...target,ability:'Wonder Guard'};
 assert.equal(calc('Psywave',mon,wg).reason,'wonder-guard');
 assert.equal(calc('Psywave',mon,{...wg,types:['DARK']}).outcome,'immune');
 for(const types of [['FIGHTING'],['POISON']])assert.deepEqual(calc('Psywave',mon,{...wg,types}),calc('Psywave'));
 assert.equal(calc('Psywave',{...mon,currentHp:0}).outcome,'failed');
 assert.equal(calc('Psywave',mon,{...target,currentHp:0}).outcome,'failed');
 assert.equal(calc('Psywave',mon,{...target,ability:'Trace'}).availability,'unsupported');
 assert.equal(calc('Psywave',mon,{...target,ability:null}),null);
 for(const types of [[],null,['FAIRY']])assert.equal(calc('Psywave',mon,{...target,types}),null);
});
test('Psywave groups complete11-roll distributions, preserving duplicate frequencies and uncertainty in both directions',()=>{
 const same={...target,abilityOptions:options(['Immunity','Thick Fat'])};
 assert.equal(calculateAbilityScenarios(battleMove('Psywave'),mon,same).groups.length,1);
 assert.equal(calculateAbilityScenarios(battleMove('Psywave'),same,mon).groups.length,1);
 const result=calculateAbilityScenarios(battleMove('Psywave'),mon,{...target,abilityOptions:options(['Immunity','Wonder Guard'])});
 assert.deepEqual(result.groups.map(g=>g.availability),['available','blocked']);assert.equal(result.groups[0].rolls.length,11);
 const dark=calculateAbilityScenarios(battleMove('Psywave'),mon,{...same,types:['DARK']});assert.equal(dark.groups[0].availability,'immune');
 const calculate=(_m,_a,d)=>{
  const rolls=d.ability==='Immunity'?[1,2,2,2,2,2,2,2,2,2,3]:[1,1,1,1,1,1,1,1,1,2,3];
  const counts=new Map();for(const n of rolls)counts.set(n,(counts.get(n)??0)+1);
  return {kind:'level-damage',rolls,min:1,max:3,totalOutcomes:11,distribution:[...counts].map(([damage,count])=>({damage,count}))};
 };
 const different=calculateAbilityScenarios(battleMove('Psywave'),mon,same,{calculate});
 assert.equal(different.groups.length,2);assert.equal(different.groups[0].hp,different.groups[1].hp);
 assert.notDeepEqual(different.groups[0].result.distribution,different.groups[1].result.distribution);
});
test('Psywave formatter gives one percentage/HP range and level-based note, never11 cards',()=>{
 assert.deepEqual(coreDamageDisplayParts(calc('Psywave'),200),{percentage:'12.5% – 37.5%',hp:'25–75 HP damage',note:'11 possible level-based damage rolls'});
 assert.deepEqual(coreDamageDisplayParts(calc('Psywave',{...mon,level:1}),200),{percentage:'0.0% – 0.5%',hp:'0–1 HP damage',note:'11 possible level-based damage rolls'});
 assert.equal(coreDamageDisplayParts(calc('Psywave'),undefined),null);
});
test('Present keeps exact Emerald byte-selection weights, three damaging powers and healing note without a fourth hit',()=>{
 const result=calc('Present');assert.equal(result.kind,'conditional-damage');assert.equal(result.conditions.length,3);
 assert.deepEqual(result.conditions.map(c=>c.power),[40,80,120]);
 assert.deepEqual(result.conditions.map(c=>c.probability),[102,76,26].map(numerator=>({numerator,denominator:256})));
 assert.deepEqual(presentHealingProbability,{numerator:52,denominator:256});
 assert.equal(result.conditions.reduce((n,c)=>n+c.probability.numerator,52),256);
 assert.deepEqual(conditionalCases(battleMove('Present')).map(conditionalCaseLabel),[
  'DAMAGING PRESENT · 40 POWER · 39.84375%','DAMAGING PRESENT · 80 POWER · 29.6875%','DAMAGING PRESENT · 120 POWER · 10.15625%',
 ]);
 assert.equal(conditionalMoveNote(battleMove('Present')),'Healing possibility: 20.3125% (not simulated).');
 assert.ok(result.conditions.every(c=>c.formulaPower===c.power&&c.multiplier===1&&c.result.rolls.length===16));
 assert.equal(result.rolls,undefined);assert.equal(result.min,undefined);assert.equal(coreDamageDisplayParts(result,200),null);
});
test('Present uses Emerald normal damage operands, not Gold/Silver type-index/Attack5/10 substitutions',()=>{
 // Lv50 Atk/Def100, powers40/80/120 =>bases19/37/54; Normal STAB28/55/81.
 assert.deepEqual(hits(calc('Present')).map(r=>r.base),[19,37,54]);
 assert.deepEqual(hits(calc('Present')).map(r=>r.rolls),[28,55,81].map(rolls));
 const enemy={...target,stats:{...target.stats,attack:150}};
 assert.deepEqual(hits(calc('Present',enemy,mon)).map(r=>r.max),[42,81,121]);
 const a={...mon,level:53,stats:{...mon.stats,attack:123}},d={...target,types:['ROCK','STEEL'],stats:{...target.stats,defense:117}};
 for(const c of calc('Present',a,d).conditions)assert.deepEqual(c.result,calculateCoreDamage({...battleMove('Strength'),power:c.power},a,d));
 for(const types of [['NORMAL'],['ROCK'],['STEEL'],['ROCK','STEEL']])for(const c of calc('Present',mon,{...target,types}).conditions)
  assert.deepEqual(c.result,calculateCoreDamage({...battleMove('Strength'),power:c.power},mon,{...target,types}));
});
test('Present retains items/abilities/burn/screens/crit and prevention independently for each power',()=>{
 for(const [a,d] of [
  [{...mon,ability:'Guts',status:'burn',item:'Choice Band',stages:{attack:1}},{...target,ability:'Marvel Scale',status:'poison',stages:{defense:1}}],
  [{...mon,item:'Silk Scarf'},{...target,screens:{reflect:true}}],
  [{...mon,ability:'Huge Power',status:'burn'},target],
 ])for(const critical of [false,true])for(const c of calc('Present',a,d,'rain',critical).conditions)
  assert.deepEqual(c.result,calculateCoreDamage({...battleMove('Strength'),power:c.power},a,d,'rain',critical));
 assert.ok(hits(calc('Present',mon,{...target,types:['GHOST']})).every(r=>r.effectiveness===0));
 assert.ok(hits(calc('Present',mon,{...target,ability:'Wonder Guard'})).every(r=>r.reason==='wonder-guard'));
 assert.ok(hits(calc('Present',mon,{...target,stats:{defense:'unknown'}})).every(r=>r===null));
 const before=structuredClone({mon,target});calc('Present');assert.deepEqual({mon,target},before,'no healing/HP mutation');
});
test('Present power conditions remain separate from known/uncertain abilities in both directions',()=>{
 const enemy={...target,abilityOptions:options(['Immunity','Huge Power'])};
 const own=calculateAbilityScenarios(battleMove('Present'),enemy,mon);
 assert.equal(own.conditions.length,3);assert.ok(own.conditions.every(c=>c.abilityDamage.groups.length===2));
 assert.ok(calculateAbilityScenarios(battleMove('Present'),mon,enemy).conditions.every(c=>c.abilityDamage.groups.length===1));
 const prevented=calculateAbilityScenarios(battleMove('Present'),mon,{...target,abilityOptions:options(['Immunity','Wonder Guard'])});
 assert.ok(prevented.conditions.every(c=>JSON.stringify(c.abilityDamage.groups.map(g=>g.availability))===JSON.stringify(['available','blocked'])));
 const missing=calculateAbilityScenarios(battleMove('Present'),mon,{...target,ability:null});
 assert.ok(missing.conditions.every(c=>c.abilityDamage.groups[0].availability==='unavailable'));
 assert.equal(conditionalMoveNote(battleMove('Pursuit')),null);
});
test('prior conditional, deterministic and multi-hit outcomes stay intact alongside OHKO support',()=>{
 assert.equal(calc('Fissure').kind,'ohko');
 for(const [name,count] of [['Pursuit',2],['Revenge',2],['Rollout',10],['Ice Ball',10],['Fury Cutter',5],['Magnitude',7]])assert.equal(calc(name).conditions.length,count);
 assert.equal(calc('Seismic Toss').damage,50);assert.equal(calc('Strength').rolls.length,16);
 for(const [name,total] of [['Double Kick',256],['DoubleSlap',8388608],['Triple Kick',4096]])assert.equal(calc(name).totalOutcomes,total);
 for(const name of ['Counter','Mirror Coat','Bide','Future Sight','Doom Desire','Beat Up'])assert.equal(calc(name),null);
});
