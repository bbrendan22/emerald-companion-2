import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {projectAbilityConditions,conditionalAbilityState} from '../src/battle/conditionalAbilities.js';
import {battleReducer,createBattleState} from '../src/battle/battleState.js';
import {slotConditions} from '../src/battle/matchupConditions.js';
import {battleMove} from '../src/battle/reference.js';
const mon={level:50,types:['NORMAL'],ability:'Immunity',item:'None',status:'none',currentHp:200,stats:{hp:200,attack:101,defense:103,spAttack:101,spDefense:103}};
const trace=ability=>({...mon,ability:'Trace',copiedAbility:ability});
const options=values=>({status:values.length===1?'known':'uncertain',source:'species',values});
const calc=(name,a=mon,d=mon,weather='none',critical=false,context={})=>calculateCoreDamage(battleMove(name),a,d,weather,critical,context);
const weatherTypes={none:'NORMAL',sun:'FIRE',rain:'WATER',hail:'ICE',sand:'NORMAL'};
test('copied armor resolves before stages, screens and every selected multi-hit critical policy',()=>{
 for(const armor of ['Battle Armor','Shell Armor'])for(const name of ['Flamethrower','Surf','Strength','Bullet Seed','Triple Kick','Pursuit','Rollout','Magnitude','Present']) {
  const a={...trace('Plus'),item:'Mystic Water',stages:{attack:-2,spAttack:-2}};
  const d={...trace(armor),stages:{defense:2,spDefense:2},screens:{reflect:true,lightScreen:true}};
  assert.deepEqual(calc(name,a,d,'rain',true,{hitCount:3}),calc(name,a,d,'rain',false,{hitCount:3}));
 }
});
test('copied Forecast obeys the Castform restriction and shares effective weather with copied suppression',()=>{
 for(const [weather,type] of Object.entries(weatherTypes))for(const ability of ['Immunity','Cloud Nine','Air Lock'])for(const name of ['Surf','Weather Ball','Night Shade','Seismic Toss','Psywave','Bullet Seed'])for(const reverse of [false,true]) {
  const cast={...trace('Forecast'),dex:351},suppressor=trace(ability);
  const effective=['Cloud Nine','Air Lock'].includes(ability)?'none':weather;
  const projected={...mon,dex:351,types:[weatherTypes[effective]]};
  assert.deepEqual(calc(name,reverse?suppressor:cast,reverse?cast:suppressor,weather,true,{hitCount:3}),calc(name,reverse?{...mon,ability}:projected,reverse?projected:{...mon,ability},effective,true,{hitCount:3}));
  assert.deepEqual(calc(name,trace('Forecast'),mon,weather),calc(name,mon,mon,weather));
 }
});
test('copied Flash Fire with activation, Charcoal, weather, screens and copied armor preserves all rounding',()=>{
 for(const activated of [false,true])for(const weather of Object.keys(weatherTypes))for(const critical of [false,true])for(const armor of ['Shell Armor','Battle Armor','Immunity']) {
  const a={...trace('Flash Fire'),types:['FIRE'],item:'Charcoal',flashFireActivated:activated,stages:{spAttack:-1}};
  const d={...trace(armor),screens:{lightScreen:true},stages:{spDefense:2}};
  assert.deepEqual(calc('Flamethrower',a,d,weather,critical),calc('Flamethrower',{...a,ability:'Flash Fire'},{...d,ability:armor},weather,critical));
  assert.deepEqual(calc('Weather Ball',a,d,weather,critical),calc('Weather Ball',{...a,ability:'Flash Fire'},{...d,ability:armor},weather,critical));
 }
});
test('copied Plus/Minus replaces rather than stacks with Flash Fire and preserves exact multi-hit calculations',()=>{
 for(const own of ['Plus','Minus'])for(const name of ['Surf','Weather Ball','Bullet Seed','Icicle Spear','Triple Kick','Dragon Rage','Fissure'])for(const critical of [false,true]) {
  const other=own==='Plus'?'Minus':'Plus',a={...trace(own),flashFireActivated:true,item:'Mystic Water',stages:{spAttack:1}},d=trace(other);
  assert.deepEqual(calc(name,a,d,'rain',critical,{hitCount:3}),calc(name,{...a,ability:own,flashFireActivated:false},{...d,ability:other},'rain',critical,{hitCount:3}));
 }
});
test('both-side uncertainty retains all four ability pairs and deduplicates only identical complete results',()=>{
 const a={...trace('Plus'),abilityOptions:options(['Trace','Synchronize'])},d={...trace('Minus'),abilityOptions:options(['Trace','Synchronize'])};
 const result=calculateAbilityScenarios(battleMove('Surf'),a,d);
 assert.equal(result.scenarios.length,4);assert.equal(result.groups.length,2);
 assert.deepEqual(result.groups.map(g=>g.scenarios.length),[1,3]);
 assert.equal(result.groups.reduce((n,g)=>n+g.scenarios.length,0),4);
 assert.deepEqual(calculateAbilityScenarios(battleMove('Strength'),a,d).groups.map(g=>g.scenarios.length),[4]);
 const doubles=calculateAbilityScenarios(battleMove('Surf'),a,d,{battleContext:{format:'Doubles',defenderSideAlive:1}});
 assert.deepEqual(doubles.scenarios.map(s=>s.availability),['available','unsupported','available','available']);
 const unresolved=calculateAbilityScenarios(battleMove('Surf'),{...a,copiedAbility:null},d);
 assert.deepEqual(unresolved.scenarios.map(s=>s.availability),['available','available','available','available']);
});
test('unresolved attacker Trace does not block fixed amounts, HP operations or Psywave distributions',()=>{
 const a={...trace(null),currentHp:75};
 for(const name of ['Dragon Rage','SonicBoom','Seismic Toss','Night Shade','Super Fang','Endeavor','Psywave'])for(const weather of Object.keys(weatherTypes))
  assert.deepEqual(calc(name,a,mon,weather,true),calc(name,{...a,ability:'Immunity'},mon,weather,true));
 const result=calculateAbilityScenarios(battleMove('Psywave'),{...a,abilityOptions:options(['Trace','Synchronize'])},mon);
 assert.equal(result.groups.length,1);assert.equal(result.groups[0].scenarios.length,2);
});
test('unresolved Trace does not speculate about weather suppression against Forecast',()=>{
 const cast={...mon,dex:351,ability:'Forecast'};
 for(const weather of ['sun','rain','hail']) {
  assert.equal(calc('Night Shade',trace(null),cast,weather).damage,50);
  assert.equal(calc('Night Shade',trace('Cloud Nine'),cast,weather).outcome,'immune');
  assert.equal(calc('Night Shade',trace('Immunity'),cast,weather).damage,50);
  assert.equal(calc('Dragon Rage',trace(null),cast,weather).damage,40);
 }
 for(const weather of ['none','sand'])assert.equal(calc('Night Shade',trace(null),cast,weather).outcome,'immune');
});
test('unresolved defender Trace preserves guaranteed fixed chart immunity but never guesses Wonder Guard',()=>{
 for(const [name,types] of [['Night Shade',['NORMAL']],['Seismic Toss',['GHOST']],['Psywave',['DARK']]]) {
  const d={...trace(null),types};
  assert.deepEqual(calc(name,mon,d),calc(name,mon,{...d,ability:'Immunity'}));
 }
 assert.equal(calc('Dragon Rage',mon,trace(null)).damage,40);
 assert.equal(calc('Dragon Rage',mon,trace('Wonder Guard')).outcome,'blocked');
});
test('resolved copied between-hit abilities keep safeguards and missing stats stay unavailable',()=>{
 assert.equal(calc('DoubleSlap',mon,trace('Color Change'),'none',false,{hitCount:3}).availability,'unsupported');
 assert.equal(calc('Surf',{...trace('Plus'),stats:{...mon.stats,spAttack:'101–120'}},trace('Minus')),null);
});
test('valid conditional ability state survives collapse, stays per-slot, and context invalidation preserves other conditions',()=>{
 let s={...createBattleState(),team:['a','b'],opponentSpecies:['x','y'],matchup:{player:'a',opponent:'x'}};
 const edit=(side,slot,field,value,context='Trace')=>{s=battleReducer(s,{type:'matchupCondition',side,slot,field,value,context});};
 edit('player',0,'abilityContext');edit('enemy',0,'abilityContext');
 edit('player',0,'copiedAbility','Flash Fire');edit('player',0,'flashFireActivated',true);edit('player',0,'status','burn');
 edit('enemy',0,'copiedAbility','Battle Armor');
 s=battleReducer(s,{type:'conditionsOpen',open:false});s=battleReducer(s,{type:'conditionsOpen',open:true});
 assert.equal(projectAbilityConditions(trace(null),slotConditions(s,'player',0)).flashFireActivated,true);
 assert.equal(projectAbilityConditions(trace(null),slotConditions(s,'enemy',0)).copiedAbility,'Battle Armor');
 s=battleReducer(s,{type:'matchupPlayer',identity:'b'});assert.equal(conditionalAbilityState(trace(null),slotConditions(s,'player',1)).copiedAbility,null);
 s=battleReducer(s,{type:'matchupPlayer',identity:'a'});edit('player',0,'abilityContext',null,'Synchronize');
 assert.equal(slotConditions(s,'player',0).status,'burn');assert.equal(slotConditions(s,'player',0).abilityState.flashFireActivated,false);
 edit('player',0,'abilityContext');assert.equal(slotConditions(s,'player',0).abilityState.copiedAbility,null);
});

test('OHKO outcomes ignore unresolved attacker Trace while preserving unknown defender ability outcomes',()=>{
 for(const name of ['Guillotine','Horn Drill','Fissure','Sheer Cold'])for(const weather of Object.keys(weatherTypes))for(const ability of ['Immunity','Sturdy','Levitate','Wonder Guard'])for(const level of [30,50,70]) {
  const a={...trace(null),level},d={...mon,ability};
  assert.deepEqual(calc(name,a,d,weather),calc(name,{...a,ability:'Immunity'},d,weather));
 }
 assert.equal(calc('Guillotine',mon,{...trace(null),types:['GHOST']}).outcome,'immune');
 assert.equal(calc('Guillotine',mon,trace(null)).outcome,'ohko');
});
