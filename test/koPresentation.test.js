import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {battleMove} from '../src/battle/reference.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {koDisplayLabels,scalarKoDisplayResult} from '../src/battle/koPresentation.js';
const chance=(attacks,n,d=16n)=>({attacks,numerator:n,denominator:d,probability:Number(n)/Number(d)});
const ko=chances=>({availability:'available',chances});
const damage={kind:'standard-damage',min:40,max:60,rolls:[...Array(8).fill(40),...Array(8).fill(60)]};
const defender={currentHp:100,stats:{hp:100}};

test('labels omit exact zero and show all nonzero cumulative outcomes and guarantees',()=>{
 assert.deepEqual(koDisplayLabels(ko([chance(1,1n),chance(2,15n),chance(3,16n)])),['6.3% OHKO','93.8% 2HKO','Guaranteed 3HKO']);
 assert.deepEqual(koDisplayLabels(ko([chance(1,0n),chance(2,0n),chance(3,0n)])),[]);
 assert.deepEqual(koDisplayLabels({availability:'unavailable'}),[]);
 assert.deepEqual(koDisplayLabels(null),[]);
});
test('ranges retain exact classifications and compact rounding boundaries',()=>{
 assert.deepEqual(koDisplayLabels(ko([{attacks:2,min:chance(2,12n),max:chance(2,16n)}])),['75.0–100.0% 2HKO']);
 assert.deepEqual(koDisplayLabels(ko([chance(1,1n,10000n),chance(2,9999n,10000n)])),['<0.1% OHKO','>99.9% 2HKO']);
 assert.deepEqual(koDisplayLabels(ko([{attacks:2,min:chance(2,0n),max:chance(2,1n,10000n)}])),['0.0–<0.1% 2HKO']);
});
test('scalar availability and ability uncertainty use raw scenarios and current HP',()=>{
 const scenarios=[{availability:'available',result:damage}];
 assert.deepEqual(koDisplayLabels(scalarKoDisplayResult(scenarios,defender)),['75.0% 2HKO','Guaranteed 3HKO']);
 assert.deepEqual(koDisplayLabels(scalarKoDisplayResult(scenarios,{...defender,currentHp:40})),['Guaranteed OHKO']);
 assert.equal(scalarKoDisplayResult([...scenarios,{availability:'unavailable'}],defender),null);
 assert.deepEqual(koDisplayLabels(scalarKoDisplayResult(scenarios,{...defender,currentHp:0})),[]);
});
test('popup preview renders scalar, ability and Frontier rows beneath damage; unavailable is omitted',async()=>{
 const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 try {
  const {default:Preview}=await server.ssrLoadModule('/src/ui/components/BasicDamagePreview.jsx');
  const render=extra=>renderToStaticMarkup(React.createElement(Preview,{move:{id:58,power:95},defender,...extra}));
  const scalar=render({coreDamage:damage});
  assert.match(scalar,/75.0% 2HKO/);assert.match(scalar,/Guaranteed 3HKO/);
  assert.ok(scalar.indexOf('40–60 HP damage')<scalar.indexOf('battle-core-damage-ko'));
  const summary={availability:'available',kind:'damage-envelope',evaluation:{},candidateCount:2,notes:[],hp:{min:40,max:60},percentage:{min:40,max:60},
   ko:ko([{attacks:2,min:chance(2,12n),max:chance(2,16n)}, {attacks:3,min:chance(3,16n),max:chance(3,16n)}])};
  const frontier=render({frontierDamage:summary});
  assert.doesNotMatch(frontier,/Across .* possible sets/);
  assert.match(frontier,/75.0–100.0% 2HKO/);assert.match(frontier,/Guaranteed 3HKO/);
  assert.doesNotMatch(render({frontierDamage:{...summary,ko:{availability:'unavailable'}}}),/battle-core-damage-ko/);
  const scenario={availability:'available',result:damage,percentage:'40.0% – 60.0%',hp:'40–60 HP damage'};
  assert.match(render({abilityDamage:{groups:[scenario],scenarios:[scenario]}}),/75.0% 2HKO/);
  assert.doesNotMatch(render({abilityDamage:{groups:[scenario],scenarios:[scenario,{availability:'unavailable'}]}}),/battle-core-damage-ko/);
 } finally {await server.close();}
});

test('only the earliest guaranteed outcome is displayed after earlier nonzero chances',()=>{
 assert.deepEqual(koDisplayLabels(ko([chance(1,0n),chance(2,16n),chance(3,16n)])),['Guaranteed 2HKO']);
 assert.deepEqual(koDisplayLabels(ko([chance(1,1n),chance(2,16n),chance(3,16n)])),['6.3% OHKO','Guaranteed 2HKO']);
});
test('Frontier ranges stop only when the complete range guarantees the outcome',()=>{
 assert.deepEqual(koDisplayLabels(ko([
  {attacks:1,min:chance(1,0n),max:chance(1,16n)},
  {attacks:2,min:chance(2,12n),max:chance(2,16n)},
  {attacks:3,min:chance(3,16n),max:chance(3,16n)},
 ])),['0.0–100.0% OHKO','75.0–100.0% 2HKO','Guaranteed 3HKO']);
 assert.deepEqual(koDisplayLabels(ko([1,2,3].map(attacks=>({attacks,min:chance(attacks,16n),max:chance(attacks,16n)})))),['Guaranteed OHKO']);
});

test('scalar False Swipe retains its damage range and omits KO indicators',()=>{
 const mon={level:50,types:['NORMAL'],ability:'Immunity',item:'None',currentHp:200,
  stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
 const target={...mon,currentHp:50},move=battleMove('False Swipe');
 const result=calculateCoreDamage(move,mon,target);
 assert.deepEqual([result.min,result.max],[23,28]);
 assert.deepEqual(koDisplayLabels(scalarKoDisplayResult([{availability:'available',result}],target,move)),[]);
 assert.deepEqual([result.min,result.max],[23,28]);
});
