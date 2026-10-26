import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCoreDamage,neutralBaseDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {battleMove} from '../src/battle/reference.js';
const mon={level:50,types:['NORMAL'],ability:'Immunity',item:'None',currentHp:200,status:'none',stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const calc=(name,a=mon,d=mon,context={},weather='none',critical=false)=>calculateCoreDamage(battleMove(name),a,d,weather,critical,context);
const rolls=max=>Array.from({length:16},(_,i)=>Math.floor(max*(85+i)/100));
for(const [own,other] of [['Plus','Minus'],['Minus','Plus']]) {
 test(`${own} versus ${other}: Singles boosts Special Attack once, never physical or fixed damage`,()=>{
  const a={...mon,ability:own},d={...mon,ability:other};
  assert.deepEqual(calc('Surf',a,d).rolls,rolls(64));
  assert.deepEqual(calc('Surf',a,d,{format:'Singles'}),calc('Surf',a,d));
  assert.deepEqual(calc('Surf',a,d,{format:'Doubles',defenderSideAlive:1}),calc('Surf',a,d));
  for(const name of ['Strength','DoubleSlap','Triple Kick','Seismic Toss','Psywave','Fissure'])assert.deepEqual(calc(name,a,d,{hitCount:3}),calc(name,mon,mon,{hitCount:3}));
  assert.equal(calc('Bullet Seed',a,d,{hitCount:3}).max,24,'Grass is Special in Gen III; each hit is boosted');
  for(const ability of [own,'Immunity','Cloud Nine','Flash Fire'])assert.deepEqual(calc('Surf',a,{...mon,ability}),calc('Surf'));
 });
 test(`${own}: incomplete Doubles field stays unavailable only where its missing opposite can change damage`,()=>{
  const a={...mon,ability:own};
  assert.deepEqual(calc('Surf',a,mon,{format:'Doubles'}),{availability:'unsupported',reason:'unknown-plus-minus-field'});
  for(const name of ['Strength','DoubleSlap','Psywave','Dragon Rage','Guillotine'])assert.deepEqual(calc(name,a,mon,{format:'Doubles',hitCount:3}),calc(name,a,mon,{hitCount:3}));
  assert.deepEqual(calc('Weather Ball',a,mon,{format:'Doubles'},'none'),calc('Weather Ball',a,mon,{},'none'));
  assert.equal(calc('Weather Ball',a,mon,{format:'Doubles'},'sun').reason,'unknown-plus-minus-field');
 });
}
test('integer operand order: item then Thick Fat then Plus/Minus then stages, before screens/weather/crit',()=>{
 // Mystic Water:floor101*1.1=111; Plus:166; stage+1:249; P95 subtotal104; +2=106.
 const a={...mon,ability:'Plus',item:'Mystic Water',stats:{...mon.stats,spAttack:101},stages:{spAttack:1}},d={...mon,ability:'Minus'};
 assert.deepEqual(calc('Surf',a,d).rolls,rolls(106));
 // Compare all rounding boundaries against an independently projected raw operand.
 for(const spAttack of [1,3,99,101,103])for(const stage of [-2,-1,0,1,2])for(const weather of ['none','rain','sun'])for(const critical of [false,true]) {
  const holder={...a,stats:{...a.stats,spAttack},stages:{spAttack:stage}};
  const projected={...holder,ability:'Immunity',item:'None',stats:{...holder.stats,spAttack:Math.floor(Math.floor(spAttack*110/100)*3/2)}};
  const target={...d,screens:{lightScreen:true}};
  assert.deepEqual(calc('Surf',holder,target,{},weather,critical),calc('Surf',projected,target,{},weather,critical));
 }
 // Thick Fat and opposite ability cannot coexist on this represented defender;
 // species items can coexist on the attacker through Trace.
 const pika={...mon,dex:25,ability:'Trace',copiedAbility:'Plus',item:'Light Ball',stats:{...mon.stats,spAttack:101}};
 assert.deepEqual(calc('Surf',pika,d),calc('Surf',{...mon,stats:{...mon.stats,spAttack:303}},mon));
});
test('Trace copied on either side and unresolved Trace preserve the effective ability boundary',()=>{
 for(const name of ['Surf','Weather Ball','Eruption','Present','DoubleSlap','Fissure']) {
  assert.deepEqual(calc(name,{...mon,ability:'Trace',copiedAbility:'Plus'},{...mon,ability:'Trace',copiedAbility:'Minus'}, {},'rain'),calc(name,{...mon,ability:'Plus'},{...mon,ability:'Minus'},{},'rain'));
 }
 assert.deepEqual(calc('Surf',{...mon,ability:'Plus'},{...mon,ability:'Trace'}),calc('Surf',{...mon,ability:'Plus'},mon));
});
test('legitimate Trace / Synchronize alternatives preserve boosted, ordinary and unknown-field outcomes',()=>{
 const own={...mon,ability:'Plus'},other={...mon,ability:'Trace',copiedAbility:'Minus',abilityOptions:{status:'uncertain',source:'species',values:['Trace','Synchronize']}};
 const singles=calculateAbilityScenarios(battleMove('Surf'),own,other);
 assert.deepEqual(singles.groups.map(g=>g.max),[64,43]);
 const doubles=calculateAbilityScenarios(battleMove('Surf'),own,other,{battleContext:{format:'Doubles',defenderSideAlive:1}});
 assert.deepEqual(doubles.groups.map(g=>g.availability),['available','unsupported']);
 const reverse=calculateAbilityScenarios(battleMove('Surf'),other,own);
 assert.deepEqual(reverse.groups.map(g=>g.max),[64,43]);
});
test('Plus/Minus does not mutate inputs and ordinary abilities retain existing base arithmetic',()=>{
 const a={...mon,ability:'Plus'},d={...mon,ability:'Minus'},before=structuredClone({a,d});calc('Surf',a,d);assert.deepEqual({a,d},before);
 assert.equal(neutralBaseDamage({level:50,power:95,type:'WATER',spAttack:100,spDefense:100,ability:'Plus',defenderAbility:'Minus'}).base,64);
});
