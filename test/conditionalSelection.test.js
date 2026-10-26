import test from 'node:test';
import assert from 'node:assert/strict';
import {battleMove} from '../src/battle/reference.js';
import {conditionalCases} from '../src/battle/conditionalDamage.js';
import {conditionalSelector,selectedConditionalCase,selectConditionalAbilityDamage} from '../src/battle/conditionalSelection.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import baseline from './fixtures/damageFinalizationBaseline.json' with {type:'json'};

test('specialized defaults and option labels match the approved controls only',()=>{
 for(const [name,label,options,power] of [
  ['Rollout','Turn',['1','2','3','4','5'],30],['Ice Ball','Turn',['1','2','3','4','5'],30],
  ['Fury Cutter','Power',['10','20','40','80','160'],10],['Magnitude','Magnitude',['4','5','6','7','8','9','10'],70],
  ['Present','Power',['40','80','120'],40],['Pursuit','Scenario',['Normal','Target Switching'],40],['Revenge','Scenario',['Normal','Took Damage'],60],
 ]){
  const move=battleMove(name),config=conditionalSelector(move);
  assert.equal(config.label,label);assert.deepEqual(config.options.map(o=>o.label),options);
  assert.equal(selectedConditionalCase(move,config.defaultValue).power,power);
  assert.equal(selectedConditionalCase(move,'stale-selection').power,power);
 }
 for(const name of ['Bullet Seed','Triple Kick','Fissure','Psywave','Growl','Return'])assert.equal(conditionalSelector(battleMove(name)),null);
});

test('every selector maps to the existing canonical cases including independent Curl state',()=>{
 for(const name of ['Rollout','Ice Ball','Fury Cutter','Magnitude','Present','Pursuit','Revenge']){
  const move=battleMove(name),config=conditionalSelector(move);
  for(const option of config.options)for(const curl of config.defenseCurl?[false,true]:[false]){
   const selected=selectedConditionalCase(move,option.value,curl);
   assert.ok(conditionalCases(move).includes(selected));
   if(config.defenseCurl)assert.equal(selected.power,30*2**(Number(option.label)-1)*(curl?2:1));
  }
 }
});

test('selected scenario preserves full ability uncertainty and unsupported branches without mutation',()=>{
 const mon=baseline.mon;
 for(const name of ['Rollout','Ice Ball','Fury Cutter','Magnitude','Present','Pursuit','Revenge']){
  const move=battleMove(name),enemy={...mon,abilityOptions:{status:'uncertain',source:'species',values:['Immunity','Wonder Guard']}};
  const all=calculateAbilityScenarios(move,mon,enemy),before=structuredClone(all);
  for(const condition of conditionalCases(move)){
   const selected=selectConditionalAbilityDamage(all,condition);
   assert.equal(selected.conditions.length,1);
   assert.strictEqual(selected.conditions[0],all.conditions.find(c=>c.id===condition.id));
   assert.equal(selected.conditions[0].abilityDamage.scenarios.length,2);
  }
  assert.deepEqual(all,before);
 }
 const unsupported={kind:'conditional-ability-scenarios',conditions:[{id:'normal',abilityDamage:{groups:[{availability:'unsupported',reason:'unmodeled-interaction'}]}}]};
 assert.strictEqual(selectConditionalAbilityDamage(unsupported,{id:'normal'}).conditions[0],unsupported.conditions[0]);
 const ordinary={groups:[]};assert.strictEqual(selectConditionalAbilityDamage(ordinary,null),ordinary);
});
