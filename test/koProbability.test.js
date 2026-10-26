import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateKoProbabilities} from '../src/battle/koProbability.js';
import {calculateDeterministicDamage} from '../src/battle/deterministicDamage.js';
import {battleMove} from '../src/battle/reference.js';
import {aggregateSelectedHits} from '../src/battle/twoHitDamage.js';

const standard=rolls=>({kind:'standard-damage',rolls,min:Math.min(...rolls),max:Math.max(...rolls)});
const fixed=damage=>standard(Array(16).fill(damage));
const probabilities=(result,hp)=>calculateKoProbabilities(result,hp).chances.map(value=>value.probability);

test('impossible OHKO, possible and guaranteed 2HKO, guaranteed 3HKO',()=>{
  const result=standard([...Array(8).fill(40),...Array(8).fill(60)]);
  assert.deepEqual(probabilities(result,100),[0,0.75,1]);
  assert.deepEqual(probabilities(fixed(50),100),[0,1,1]);
  assert.deepEqual(probabilities(fixed(34),100),[0,0,1]);
  assert.deepEqual(probabilities(fixed(1),100),[0,0,0]);
});

test('possible and guaranteed OHKO respect supplied current HP',()=>{
  const result=standard([...Array(15).fill(40),60]);
  assert.deepEqual(probabilities(result,60),[1/16,1,1]);
  assert.deepEqual(probabilities(result,40),[1,1,1]);
  assert.deepEqual(probabilities(result,100),[0,31/256,1]);
  assert.deepEqual(probabilities(fixed(100),100),[1,1,1]);
});

test('repeated roll frequencies retain exact ordered-outcome counts',()=>{
  const result=standard([...Array(12).fill(0),...Array(4).fill(100)]);
  const output=calculateKoProbabilities(result,100);
  assert.deepEqual(output.chances,[
    {attacks:1,numerator:4n,denominator:16n,probability:0.25},
    {attacks:2,numerator:112n,denominator:256n,probability:0.4375},
    {attacks:3,numerator:2368n,denominator:4096n,probability:0.578125},
  ]);
  assert.equal(output.availability,'available');
});

test('weighted aggregate distributions preserve counts beyond safe Number arithmetic',()=>{
  const hit=standard([...Array(15).fill(0),100]);
  const result=aggregateSelectedHits(Array(5).fill(hit));
  const snapshot=structuredClone(result);
  const output=calculateKoProbabilities(result,100);
  assert.equal(output.chances[2].denominator,16n**15n);
  assert.equal(output.chances[2].numerator,16n**15n-15n**15n);
  assert.deepEqual(result,snapshot);
});

test('level-based rolls, zero damage and arbitrary safe integer HP',()=>{
  const rolls=Array.from({length:11},(_,i)=>i+1);
  const level={kind:'level-damage',rolls,totalOutcomes:11,min:1,max:11,
    distribution:rolls.map(damage=>({damage,count:1}))};
  assert.equal(calculateKoProbabilities(level,11).chances[0].numerator,1n);
  assert.deepEqual(probabilities(fixed(0),1),[0,0,0]);
  assert.equal(calculateKoProbabilities(fixed(0),0).reason,'invalid-current-hp');
  assert.deepEqual(probabilities(fixed(Number.MAX_SAFE_INTEGER),Number.MAX_SAFE_INTEGER),[1,1,1]);
});

test('invalid inputs and unsupported or unavailable result categories stay unavailable',()=>{
  for(const hp of [0,null,undefined,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])
    assert.equal(calculateKoProbabilities(fixed(10),hp).reason,'invalid-current-hp');
  for(const result of [null,{}, {kind:'ohko',outcome:'ohko'},
    {kind:'damage-envelope',hp:{min:10,max:100}}]) {
    assert.deepEqual(calculateKoProbabilities(result,100),{
      availability:'unavailable',reason:'unsupported-damage-result',chances:null});
  }
  for(const result of [standard([10]),{...fixed(10),min:9},
    standard([...Array(15).fill(10),-1]),standard(Array(16)),
    {kind:'aggregate-damage',hitCount:2,totalOutcomes:256,min:10,max:10,distribution:[{damage:10,count:255}]},
    {kind:'level-damage',rolls:Array(11).fill(10)}])
    assert.equal(calculateKoProbabilities(result,100).reason,'invalid-damage-result');
  assert.equal(calculateKoProbabilities({...fixed(10),availability:'unsupported'},100).reason,'unavailable-damage-result');
});

const attacker={level:50,types:['NORMAL'],ability:'Immunity',currentHp:50,stats:{hp:200}};
const defender={...attacker,types:['WATER'],currentHp:101};
test('fixed and level-based deterministic moves repeat their exact amount',()=>{
 for(const [name,damage] of [['Seismic Toss',50],['Night Shade',50],['Dragon Rage',40],['SonicBoom',20]]) {
  const move=battleMove(name), result=calculateDeterministicDamage(move,attacker,defender);
  assert.equal(result.damage,damage);
  for(const [hp,expected] of [[damage,[1,1,1]],[damage*2,[0,1,1]],[damage*3,[0,0,1]],[damage*3+1,[0,0,0]]])
   assert.deepEqual(calculateKoProbabilities(result,hp,move).chances.map(x=>x.probability),expected);
  const immune=calculateDeterministicDamage(move,attacker,{...defender,types:[name==='Night Shade'?'NORMAL':'GHOST']});
  if(immune.outcome==='immune')assert.deepEqual(calculateKoProbabilities(immune,100,move).chances.map(x=>x.probability),[0,0,0]);
 }
});
test('HP-dependent deterministic moves and missing provenance stay explicitly unavailable',()=>{
 for(const name of ['Super Fang','Endeavor']) {
  const move=battleMove(name),result=calculateDeterministicDamage(move,attacker,defender);
  assert.equal(calculateKoProbabilities(result,101,move).reason,'unsupported-deterministic-move');
 }
 const result=calculateDeterministicDamage(battleMove('Seismic Toss'),attacker,defender);
 assert.equal(calculateKoProbabilities(result,101).reason,'unsupported-deterministic-move');
 for(const name of ['Fissure','Guillotine','Horn Drill','Sheer Cold'])
  assert.equal(calculateKoProbabilities({kind:'ohko',outcome:'ohko'},101,battleMove(name)).reason,'unsupported-damage-result');
});

test('False Swipe explicitly excludes all KO probabilities without altering rolls',()=>{
 const result=fixed(49),before=structuredClone(result);
 assert.deepEqual(calculateKoProbabilities(result,50,battleMove('False Swipe')),
  {availability:'unavailable',reason:'false-swipe-cannot-ko',chances:null});
 assert.deepEqual(result,before);
});
