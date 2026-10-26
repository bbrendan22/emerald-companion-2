import test from 'node:test';
import assert from 'node:assert/strict';
import {battleMove} from '../src/battle/reference.js';
import {moveResources} from '../src/battle/data/moveResources.js';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {resolveBattleAbility} from '../src/battle/conditionalAbilities.js';
import {fieldAbilityBranches,fieldAbilityPresence} from '../src/battle/fieldAbilities.js';
const options=values=>({status:values.length===1?'known':'uncertain',source:'test',values});
const mon={name:'Neutral',dex:143,level:50,ability:'Immunity',abilityOptions:options(['Immunity']),types:['NORMAL'],item:'None',friendship:200,currentHp:150,
 stats:{hp:200,attack:101,defense:103,spAttack:101,spDefense:103,speed:100},ivs:{hp:31,attack:31,defense:31,spAttack:31,spDefense:31,speed:31}};
const trace={...mon,name:'Trace',dex:282,ability:'Trace',abilityOptions:options(['Trace'])};
const slot=pokemon=>({pokemon,liveness:'active'});
const field=partner=>({format:'Doubles',defenderSideAlive:2,hitCount:3,battlefield:{player:[slot(mon),slot(partner)],enemy:[slot(mon),slot(partner)],
 attacking:{side:'player',slot:0},defending:{side:'enemy',slot:0}}});
test('all canonical move paths match a neutral ability for unresolved Trace on either side in Singles and full Doubles',()=>{
 for(const context of [{hitCount:3},field(trace)])for(const id of Object.keys(moveResources))for(const side of ['attacker','defender']) {
  const move=battleMove(Number(id)),a=side==='attacker'?trace:mon,d=side==='defender'?trace:mon;
  // Keep the same species/types/stats; only the passive ability changes.
  const neutralA={...a,ability:'Immunity'},neutralD={...d,ability:'Immunity'};
  assert.deepEqual(calculateCoreDamage(move,a,d,'rain',true,context),calculateCoreDamage(move,neutralA,neutralD,'rain',true,context),`${context.format??'Singles'} ${move.name} ${side}`);
 }
});
test('fallback preserves raw Trace and null copy state; other unknown abilities remain unknown',()=>{
 const original={...trace,copiedAbility:null},before=structuredClone(original),resolved=resolveBattleAbility(original);
 assert.equal(resolved.ability,'Trace');assert.equal(resolved.traceResolved,true);assert.equal(resolved.copiedAbility,null);
 assert.deepEqual(original,before);assert.equal(resolveBattleAbility(resolved),resolved);
 for(const ability of [null,'Unknown','Synchronize / Trace']) {
  const invalid={...mon,ability};assert.equal(resolveBattleAbility(invalid),invalid);
  assert.equal(calculateAbilityScenarios(battleMove('Surf'),{...invalid,abilityOptions:undefined},mon).groups[0].availability,'unavailable');
 }
});
test('Trace/Synchronize branches merge without enumerating copies, while real copied weather effects stay distinct',()=>{
 for(const context of [{},field(trace)])for(const reverse of [false,true]) {
  const user={...trace,copiedAbility:null,abilityOptions:options(['Synchronize','Trace'])};
  const run=pokemon=>calculateAbilityScenarios(battleMove('Weather Ball'),reverse?mon:pokemon,reverse?pokemon:mon,{weather:'sun',battleContext:context});
  const neutral=run(user);assert.equal(neutral.scenarios.length,2);assert.equal(neutral.groups.length,1);
  assert.ok(neutral.scenarios.every(s=>s.availability==='available'));assert.equal(neutral.groups[0].scenarios.length,2);
  const copied=run({...user,copiedAbility:'Cloud Nine'});assert.equal(copied.scenarios.length,2);assert.equal(copied.groups.length,2);
  assert.deepEqual(new Set(copied.scenarios.map(s=>s.moveMetadata.power)),new Set([50,100]));
 }
});
test('unviewed Doubles Trace stays neutral without speculative field branches; unrelated unknown partners remain uncertain',()=>{
 const context=field({...trace,abilityOptions:options(['Synchronize','Trace'])});
 assert.equal(fieldAbilityBranches(context,{lightningRod:true}).length,1);
 for(const names of [['Cloud Nine','Air Lock'],['Damp'],['Plus','Minus'],['Lightning Rod']])assert.equal(fieldAbilityPresence(context,mon,mon,names),false);
 context.battlefield.player[1]=slot({...mon,ability:'Unknown',abilityOptions:{status:'missing',source:'test',values:[]}});
 assert.equal(fieldAbilityPresence(context,mon,mon,['Cloud Nine','Air Lock']),null);
 assert.equal(calculateCoreDamage(battleMove('Surf'),mon,mon,'rain',false,context).reason,'unknown-weather-suppression-field');
});
