import test from 'node:test';
import assert from 'node:assert/strict';
import {traceAbilities,resolveBattleAbility,conditionalAbilityState,projectAbilityConditions} from '../src/battle/conditionalAbilities.js';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {battleMove,reference} from '../src/battle/reference.js';
import {battleReducer,createBattleState} from '../src/battle/battleState.js';
import {slotConditions} from '../src/battle/matchupConditions.js';
const mon={level:50,ability:'Immunity',types:['NORMAL'],item:'None',currentHp:200,status:'none',stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const trace={...mon,ability:'Trace'};
const fire={...mon,ability:'Flash Fire',types:['FIRE']};
const calc=(name,a=mon,d=mon,w='none',critical=false,context={})=>calculateCoreDamage(battleMove(name),a,d,w,critical,context);
const rolls=max=>Array.from({length:16},(_,i)=>Math.floor(max*(85+i)/100));
test('Emerald Trace permits every functional nonzero Gen III ability, including later-generation exclusions',()=>{
 const expected=Object.values(reference.abilityNames).filter(a=>a&&!['None','Cacophony'].includes(a));
 assert.equal(traceAbilities.length,76);assert.deepEqual([...traceAbilities].sort(),expected.sort());
 for(const copiedAbility of ['Trace','Forecast','Wonder Guard','Flash Fire','Truant'])assert.equal(resolveBattleAbility({...trace,copiedAbility}).ability,copiedAbility);
 for(const copiedAbility of ['None','Cacophony','Multitype','Levitate / Sturdy','',null])assert.equal(resolveBattleAbility({...trace,copiedAbility}).ability,'Trace');
});
test('unresolved Trace uses a neutral calculation fallback without changing the selected ability',()=>{
 const before=structuredClone(trace),resolved=resolveBattleAbility(trace);
 assert.equal(resolved.ability,'Trace');assert.equal(resolved.traceResolved,true);
 assert.equal(resolved.copiedAbility,undefined);assert.deepEqual(trace,before);
 for(const name of ['Surf','Weather Ball','Dragon Rage','Night Shade','Psywave','Rollout','Magnitude','Present','DoubleSlap','Triple Kick','Guillotine','Explosion','Struggle'])for(const side of [0,1])
  assert.deepEqual(calc(name,side?mon:trace,side?trace:mon),calc(name,mon,mon),`${name} side ${side}`);
});
test('resolved Trace replaces its ability on both sides across specialized and standard paths',()=>{
 for(const ability of ['Huge Power','Thick Fat','Levitate','Wonder Guard','Sturdy','Battle Armor','Shell Armor','Damp','Cloud Nine','Soundproof','Flash Fire'])
 for(const name of ['Surf','Flamethrower','Weather Ball','Earthquake','Dragon Rage','Night Shade','Psywave','Rollout','Magnitude','Present','DoubleSlap','Triple Kick','Fissure','Explosion','Hyper Voice','Struggle'])for(const reverse of [false,true]) {
  const copied={...trace,copiedAbility:ability},plain={...mon,ability};
  assert.deepEqual(calc(name,reverse?mon:copied,reverse?copied:mon,'rain',true,{hitCount:3}),calc(name,reverse?mon:plain,reverse?plain:mon,'rain',true,{hitCount:3}),`${ability} ${name} ${reverse}`);
 }
});
test('copied Trace itself is resolved and harmless; copied Forecast retains the species restriction',()=>{
 assert.deepEqual(calc('Surf',{...trace,copiedAbility:'Trace'}),calc('Surf'));
 assert.deepEqual(calc('Surf',{...trace,copiedAbility:'Forecast'},mon,'rain'),calc('Surf',mon,mon,'rain'));
 assert.deepEqual(calc('Surf',{...trace,dex:351,copiedAbility:'Forecast'},mon,'rain'),calc('Surf',{...mon,dex:351,ability:'Forecast'},mon,'rain'));
});
test('Trace resolution stays inside each legitimate uncertain ability branch and updates Weather Ball metadata',()=>{
 const a={...trace,abilityOptions:{status:'uncertain',values:['Trace','Synchronize'],source:'species'},copiedAbility:'Cloud Nine'};
 const result=calculateAbilityScenarios(battleMove('Weather Ball'),a,mon,{weather:'sun'});
 assert.equal(result.groups.length,2);
 assert.deepEqual(result.scenarios.map(s=>s.moveMetadata),[{type:'NORMAL',power:50},{type:'FIRE',power:100}]);
 const unresolved=calculateAbilityScenarios(battleMove('Surf'),{...a,copiedAbility:null},mon);
 assert.deepEqual(unresolved.groups.map(g=>g.availability),['available']);
 assert.equal(unresolved.groups[0].scenarios.length,2);
 const defender={...trace,abilityOptions:a.abilityOptions,copiedAbility:'Battle Armor'};
 const incoming=calculateAbilityScenarios(battleMove('Strength'),mon,defender,{critical:true});
 assert.equal(incoming.groups.length,2);assert.ok(incoming.groups[0].max<incoming.groups[1].max);
});
test('Flash Fire applies after weather before +2, with exact integer rounding rather than a SpA stage',()=>{
 assert.deepEqual(calc('Flamethrower',fire).rolls,rolls(64));
 assert.deepEqual(calc('Flamethrower',{...fire,flashFireActivated:true}).rolls,rolls(94));
 assert.notDeepEqual(calc('Flamethrower',{...fire,flashFireActivated:true}),calc('Flamethrower',{...fire,stages:{spAttack:1}}));
 assert.deepEqual(calc('Flamethrower',{...fire,flashFireActivated:true,item:'Charcoal'},mon,'sun').rolls,rolls(153));
 assert.deepEqual(calc('Weather Ball',{...fire,flashFireActivated:true},mon,'sun').rolls,rolls(153));
 for(const weather of ['none','sun','rain','hail','sand']) {
  assert.deepEqual(calc('Surf',{...fire,flashFireActivated:true},mon,weather),calc('Surf',fire,mon,weather));
  assert.deepEqual(calc('Flamethrower',{...mon,flashFireActivated:true},mon,weather),calc('Flamethrower',mon,mon,weather));
 }
});
test('Flash Fire activation respects screens, Thick Fat, crits and Trace without altering fixed or non-Fire moves',()=>{
 const copied={...trace,types:['FIRE'],copiedAbility:'Flash Fire',flashFireActivated:true};
 for(const name of ['Flamethrower','Weather Ball','Overheat','Eruption','Fire Blast','Dragon Rage','Psywave','DoubleSlap','Triple Kick','Fissure'])for(const critical of [false,true]) {
  const d={...mon,ability:'Thick Fat',screens:{lightScreen:true},stages:{spDefense:2}};
  assert.deepEqual(calc(name,copied,d,'sun',critical,{hitCount:3}),calc(name,{...fire,flashFireActivated:true},d,'sun',critical,{hitCount:3}));
 }
 const defender={...fire,flashFireActivated:true};
 assert.equal(calc('Flamethrower',mon,defender).max,0);
 assert.ok(calc('Flamethrower',mon,{...defender,status:'freeze'}).max>0);
 assert.equal(calc('Flamethrower',mon,{...trace,copiedAbility:'Flash Fire'}).max,0);
});
test('uncertain Flash Fire affects only its own branch without automatically activating',()=>{
 const a={...mon,abilityOptions:{status:'uncertain',source:'species',values:['Flash Fire','Intimidate']}};
 assert.equal(calculateAbilityScenarios(battleMove('Flamethrower'),a,mon).groups.length,1);
 const active=calculateAbilityScenarios(battleMove('Flamethrower'),{...a,flashFireActivated:true},mon);
 assert.equal(active.groups.length,2);assert.ok(active.groups[0].max>active.groups[1].max);
});
const initial=()=>({...createBattleState(),team:['a','b'],opponentSpecies:['x','y'],matchup:{player:'a',opponent:'x'}});
const edit=(s,side,slot,field,value,context='Trace')=>battleReducer(s,{type:'matchupCondition',side,slot,field,value,context});
test('conditional ability state defaults, resets on copy/context changes and is independent per side and slot',()=>{
 let s=initial();
 for(const side of ['player','enemy'])s=edit(s,side,0,'abilityContext');
 s=edit(s,'player',0,'copiedAbility','Flash Fire');s=edit(s,'player',0,'flashFireActivated',true);
 const saved=slotConditions(s,'player',0);
 assert.equal(projectAbilityConditions(trace,saved).flashFireActivated,true);
 assert.equal(projectAbilityConditions({...trace,ability:'Synchronize'},saved).copiedAbility,null);
 assert.equal(conditionalAbilityState(trace,slotConditions(s,'enemy',0)).copiedAbility,null);
 s=battleReducer(s,{type:'matchupPlayer',identity:'b'});
 assert.equal(projectAbilityConditions(trace,slotConditions(s,'player',1)).copiedAbility,null);
 s=battleReducer(s,{type:'matchupPlayer',identity:'a'});
 assert.equal(projectAbilityConditions(trace,slotConditions(s,'player',0)).flashFireActivated,true);
 s=edit(s,'player',0,'copiedAbility','Levitate');assert.equal(slotConditions(s,'player',0).abilityState.flashFireActivated,false);
 s=edit(s,'player',0,'abilityContext',null,'Synchronize');
 s=edit(s,'player',0,'copiedAbility','Flash Fire','Trace');assert.equal(slotConditions(s,'player',0).abilityState.copiedAbility,null,'stale events rejected');
 s=battleReducer(s,{type:'resetMatchupConditions'});assert.equal(slotConditions(s,'player',0).abilityState,undefined);
});
test('invalid copied ability is rejected and replacement removes stored activation',()=>{
 let s=edit(initial(),'player',0,'abilityContext');s=edit(s,'player',0,'copiedAbility','Cacophony');
 assert.equal(slotConditions(s,'player',0).abilityState.copiedAbility,null);
 s=edit(s,'player',0,'copiedAbility','Flash Fire');s=edit(s,'player',0,'flashFireActivated',true);
 s=battleReducer(s,{type:'clearPlayerSlot',slot:0,identity:'a'});assert.equal(slotConditions(s,'player',0).abilityState,undefined);
});

test('copied between-hit effects retain exactness safeguards; Plus/Minus now uses resolved copied abilities',()=>{
 for(const copiedAbility of ['Color Change','Static','Flame Body']) {
  const result=calc('DoubleSlap',mon,{...trace,copiedAbility},'none',false,{hitCount:3});
  assert.equal(result.availability,'unsupported');
 }
 assert.deepEqual(calc('Surf',{...trace,copiedAbility:'Plus'},{...mon,ability:'Minus'}),calc('Surf',{...mon,ability:'Plus'},{...mon,ability:'Minus'}));
 assert.deepEqual(calc('Surf',{...mon,ability:'Minus'},{...trace,copiedAbility:'Plus'}),calc('Surf',{...mon,ability:'Minus'},{...mon,ability:'Plus'}));
 assert.ok(calc('Strength',{...trace,copiedAbility:'Plus'},{...mon,ability:'Minus'}).rolls);
});
test('Flash Fire independently truncates item, screen, weather and activation modifiers',()=>{
 const a={...fire,item:'Charcoal',flashFireActivated:true},screen={...mon,screens:{lightScreen:true}};
 // Charcoal SpA110 -> subtotal45; screen22 -> sun33 -> activation49 -> +2=51 -> STAB76.
 assert.deepEqual(calc('Flamethrower',a,screen,'sun').rolls,rolls(76));
 // Without screen:45 -> rain22 -> activation33 -> +2=35 -> STAB52.
 assert.deepEqual(calc('Flamethrower',a,mon,'rain').rolls,rolls(52));
 // Critical bypasses screen:45 -> sun67 -> activation100 -> +2=102 -> crit204 -> STAB306.
 assert.deepEqual(calc('Flamethrower',a,screen,'sun',true).rolls,rolls(306));
});
