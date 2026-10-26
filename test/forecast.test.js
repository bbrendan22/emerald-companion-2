import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios,opponentAbilityOptions} from '../src/battle/abilityScenarios.js';
import {battleMove} from '../src/battle/reference.js';
const mon={level:50,types:['NORMAL'],ability:'Immunity',item:'None',currentHp:200,
 stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const cast={...mon,dex:351,ability:'Forecast'};
const forms={none:'NORMAL',sun:'FIRE',rain:'WATER',hail:'ICE',sand:'NORMAL'};
const calc=(name,a=cast,d=mon,w='none',critical=false,context={})=>calculateCoreDamage(battleMove(name),a,d,w,critical,context);
const rolls=max=>Array.from({length:16},(_,i)=>Math.floor(max*(85+i)/100));
for(const [weather,type] of Object.entries(forms)) {
 test(`Forecast ${weather}: outgoing STAB and incoming effectiveness use ${type}`,()=>{
  const projected={...cast,ability:'Immunity',types:[type]};
  for(const name of ['Tackle','Flamethrower','Surf','Ice Beam','Thunderbolt','Earthquake','Night Shade','Seismic Toss','Psywave','Fissure','Weather Ball']) {
   assert.deepEqual(calc(name,cast,mon,weather),calc(name,projected,mon,weather),`${name} outgoing`);
   assert.deepEqual(calc(name,mon,cast,weather),calc(name,mon,projected,weather),`${name} incoming`);
  }
  // Independent Emerald Lv50/100 stats: P95 subtotal41, weather boost61,+2=63;
  // matching STAB94. Ice has no weather boost:43*1.5 ->64.
  const matching={sun:['Flamethrower',94],rain:['Surf',94],hail:['Ice Beam',64],none:['Tackle',25],sand:['Tackle',25]}[weather];
  assert.deepEqual(calc(matching[0],cast,mon,weather).rolls,rolls(matching[1]));
 });
}
test('Forecast Weather Ball preserves post-base doubling, categories and STAB rounding',()=>{
 for(const [weather,max,category] of [['none',36,'Physical'],['sun',105,'Special'],['rain',105,'Special'],['hail',72,'Special'],['sand',48,'Physical']]) {
  const result=calc('Weather Ball',cast,mon,weather);
  assert.deepEqual(result.rolls,rolls(max));assert.equal(result.category,category);
 }
});
test('both weather suppressors restore Normal typing, STAB and immunity on either side',()=>{
 for(const ability of ['Cloud Nine','Air Lock'])for(const weather of Object.keys(forms))for(const name of ['Weather Ball','Night Shade','Surf','DoubleSlap','Triple Kick']) {
  const suppressor={...mon,ability};
  assert.deepEqual(calc(name,cast,suppressor,weather,false,{hitCount:3}),calc(name,cast,suppressor,'none',false,{hitCount:3}));
  assert.deepEqual(calc(name,suppressor,cast,weather,false,{hitCount:3}),calc(name,suppressor,cast,'none',false,{hitCount:3}));
 }
});
test('Forecast requires Castform and its actual ability; projections never mutate inputs',()=>{
 const before=structuredClone({cast,mon});
 for(const weather of Object.keys(forms)) {
  assert.deepEqual(calc('Surf',{...cast,ability:'Immunity'},mon,weather),calc('Surf',mon,mon,weather));
  assert.deepEqual(calc('Surf',{...mon,ability:'Forecast'},mon,weather),calc('Surf',mon,mon,weather));
  calc('Surf',cast,cast,weather);
 }
 assert.deepEqual({cast,mon},before);
});
test('legitimate uncertain Cloud Nine / Damp outcomes resolve Forecast independently in both directions',()=>{
 const golduck={...mon,dex:55,types:['WATER'],abilityOptions:opponentAbilityOptions({dex:55})};
 for(const weather of ['sun','rain','hail'])for(const reverse of [false,true]) {
  const a=reverse?golduck:cast,d=reverse?cast:golduck;
  const result=calculateAbilityScenarios(battleMove('Weather Ball'),a,d,{weather});
  assert.equal(result.groups.length,2);
  for(const ability of ['Damp','Cloud Nine']) {
   const pinned={...golduck,ability};delete pinned.abilityOptions;
   const expected=calc('Weather Ball',reverse?pinned:cast,reverse?cast:pinned,weather);
   assert.ok(result.groups.some(g=>JSON.stringify(g.result.rolls)===JSON.stringify(expected.rolls)));
  }
 }
});
test('Forecast fixed damage immunity follows type without changing the fixed amount or Psywave distribution',()=>{
 for(const weather of Object.keys(forms)) {
  const normal=['none','sand'].includes(weather);
  const result=calc('Night Shade',mon,cast,weather);
  assert.equal(result.damage,normal?0:50);
  assert.equal(calc('Dragon Rage',mon,cast,weather).damage,40);
  assert.deepEqual(calc('Psywave',mon,cast,weather).rolls,calc('Psywave',mon,mon).rolls);
 }
});
test('Forecast projection reaches selected multi-hit and conditional branches with armor critical immunity intact',()=>{
 for(const weather of Object.keys(forms))for(const [name,context] of [['Bullet Seed',{hitCount:3}],['Triple Kick',{hitCount:3}],['Rollout',{}],['Magnitude',{}]]) {
  assert.deepEqual(calc(name,mon,cast,weather,true,context),calc(name,mon,{...cast,ability:'Immunity',types:[forms[weather]]},weather,true,context));
 }
 for(const ability of ['Battle Armor','Shell Armor'])for(const name of ['Surf','Bullet Seed','Triple Kick']) {
  const defender={...mon,ability,stages:{defense:2,spDefense:2},screens:{reflect:true,lightScreen:true}};
  assert.deepEqual(calc(name,cast,defender,'rain',true,{hitCount:3}),calc(name,cast,defender,'rain',false,{hitCount:3}));
 }
});
