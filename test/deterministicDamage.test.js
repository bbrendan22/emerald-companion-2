import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {coreDamageDisplayParts} from '../src/battle/coreDamagePresentation.js';
import {isDeterministicResult} from '../src/battle/deterministicDamage.js';
import {battleMove} from '../src/battle/reference.js';
const mon={dex:143,level:50,types:['NORMAL'],ability:'Immunity',item:'None',currentHp:50,stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const target={...mon,types:['WATER'],currentHp:101,stats:{...mon.stats,hp:140}};
const names=['Seismic Toss','Night Shade','Dragon Rage','SonicBoom','Super Fang','Endeavor'];
const calc=(name,a=mon,d=target,w='none',c=false)=>calculateCoreDamage(battleMove(name),a,d,w,c);
const options=values=>({status:values.length===1?'known':'uncertain',source:'species',values});
test('all six deterministic results use actual Emerald values without random rolls',()=>{
 for(const [name,damage] of [['Seismic Toss',50],['Night Shade',50],['Dragon Rage',40],['SonicBoom',20],['Super Fang',50],['Endeavor',51]]) {
  const result=calc(name);assert.equal(isDeterministicResult(result),true);assert.equal(result.outcome,'damage');
  assert.equal(result.damage,damage);assert.equal(result.rolls,undefined);
 }
 for(const name of ['Seismic Toss','Night Shade'])for(const level of [1,37,50,100])assert.equal(calc(name,{...mon,level}).damage,level);
 for(const level of [undefined,0,101,2.5,'50',NaN])assert.equal(calc('Seismic Toss',{...mon,level}),null);
 assert.equal(calc('Dragon Rage',{...mon,level:undefined}).damage,40,'level not required for constant damage');
});
test('both directions preserve attacking level and independently owned current HP',()=>{
 const enemy={...target,level:73};
 for(const name of ['Seismic Toss','Night Shade']) {
  assert.equal(calc(name,mon,enemy).damage,50);
  assert.equal(calc(name,enemy,{...mon,types:['WATER']}).damage,73);
 }
 assert.equal(calc('Super Fang',mon,enemy).damage,50);
 assert.equal(calc('Super Fang',enemy,mon).damage,25);
 assert.equal(calc('Endeavor',mon,enemy).damage,51);
 assert.equal(calc('Endeavor',enemy,mon).outcome,'failed');
 for(const name of ['Dragon Rage','SonicBoom'])assert.equal(calc(name,mon,enemy).damage,calc(name,enemy,mon).damage);
});
test('Super Fang floor, minimum one, null-as-full and strict HP validation',()=>{
 for(const [hp,damage] of [[140,70],[101,50],[100,50],[51,25],[3,1],[2,1],[1,1],[null,70]])
  assert.equal(calc('Super Fang',mon,{...target,currentHp:hp}).damage,damage);
 assert.equal(calc('Super Fang',mon,{...target,currentHp:0}).outcome,'failed');
 for(const hp of [undefined,-1,141,2.5,'50','50–60',NaN,Infinity])
  assert.equal(calc('Super Fang',mon,{...target,currentHp:hp,initialCurrentHp:140}),null);
 for(const hp of [1,null])for(const maximum of [undefined,null,0,1000,'100–140',NaN])
  assert.equal(calc('Super Fang',mon,{...target,currentHp:hp,stats:{hp:maximum}}),null);
 assert.equal(calc('Super Fang',mon,{...target,currentHp:51,initialCurrentHp:140}).damage,25);
});
test('Endeavor strictly requires target HP greater than attacker HP, with failure before immunity',()=>{
 for(const [own,other,damage] of [[1,140,139],[50,101,51],[100,101,1],[null,null,null]]) {
  const result=calc('Endeavor',{...mon,currentHp:own},{...target,currentHp:other});
  if(damage===null)assert.equal(result.outcome,'failed');else assert.equal(result.damage,damage);
 }
 for(const [own,other] of [[101,101],[102,101],[0,101],[50,0]])
  assert.equal(calc('Endeavor',{...mon,currentHp:own},{...target,currentHp:other}).outcome,'failed');
 assert.equal(calc('Endeavor',{...mon,currentHp:101},{...target,currentHp:101,types:['GHOST']}).outcome,'failed');
 for(const side of ['attacker','defender'])for(const currentHp of [undefined,-1,Infinity,'50',1.1]) {
  const a=side==='attacker'?{...mon,currentHp}:mon,d=side==='defender'?{...target,currentHp}:target;
  assert.equal(calc('Endeavor',a,d),null);
 }
});
test('chart immunity is distinct from failure/unavailable; resistance and weakness never scale damage',()=>{
 for(const name of ['Seismic Toss','SonicBoom','Super Fang','Endeavor'])
  assert.equal(calc(name,mon,{...target,types:['GHOST']}).outcome,'immune');
 assert.equal(calc('Night Shade',mon,{...target,types:['NORMAL']}).outcome,'immune');
 for(const types of [['STEEL'],['ROCK','STEEL'],['DRAGON'],['GHOST','PSYCHIC']])
  assert.equal(calc('Dragon Rage',mon,{...target,types}).damage,40);
 assert.equal(calc('Seismic Toss',mon,{...target,types:['ROCK','STEEL']}).damage,50);
 assert.equal(calc('Night Shade',mon,{...target,types:['GHOST','PSYCHIC']}).damage,50);
 assert.equal(calc('Super Fang',mon,{...target,types:['STEEL']}).damage,50);
 for(const types of [null,[],['FAIRY'],Array(1)])assert.equal(calc('Dragon Rage',mon,{...target,types}),null);
 assert.equal(calc('SonicBoom',mon,{...target,ability:'Soundproof'}).damage,20,'Emerald sound list excludes SonicBoom');
 assert.equal(calc('Dragon Rage',mon,{...target,ability:'Wonder Guard'}).outcome,'blocked');
});
test('fixed/HP amounts ignore conventional operands, boosts, status, screens, weather and critical',()=>{
 const before=structuredClone({mon,target});
 for(const name of names)for(const weather of ['none','sun','rain','sand','hail'])for(const item of ['None','Choice Band','Silk Scarf','Black Belt','Spell Tag','Dragon Fang']) {
  const a={...mon,ability:'Huge Power',item,types:[battleMove(name).type],status:'burn',stages:{attack:6,spAttack:6},stats:{hp:200,attack:NaN,spAttack:'unknown'}};
  const d={...target,ability:'Thick Fat',item:'Metal Powder',stages:{defense:6},screens:{reflect:true},stats:{hp:140,defense:NaN}};
  assert.equal(calc(name,a,d,weather,true).damage,calc(name).damage);
 }
 assert.deepEqual({mon,target},before);
 for(const name of names)assert.equal(calc(name,{...mon,ability:null}),null);
 assert.deepEqual(calc('Dragon Rage',mon,{...target,ability:'Trace'}),calc('Dragon Rage',mon,target));
});
test('single percentages use defender maximum, preserve display order, and do not require fake rolls',()=>{
 assert.deepEqual(coreDamageDisplayParts(calc('Seismic Toss'),140),{percentage:'35.7%',hp:'50 HP damage'});
 assert.deepEqual(coreDamageDisplayParts(calc('Super Fang'),140),{percentage:'35.7%',hp:'50 HP damage'});
 assert.deepEqual(coreDamageDisplayParts(calc('Endeavor'),140),{percentage:'36.4%',hp:'51 HP damage'});
 assert.deepEqual(coreDamageDisplayParts(calc('Night Shade',mon,mon),200),{message:'Immune.'});
 assert.deepEqual(coreDamageDisplayParts(calc('Endeavor',target,mon),200),{message:'Move fails.'});
 for(const hp of [undefined,0,'140–160',NaN])assert.equal(coreDamageDisplayParts(calc('Dragon Rage'),hp),null);
 assert.equal(isDeterministicResult({kind:'deterministic-damage',outcome:'damage',damage:0}),false);
 assert.equal(isDeterministicResult({...calc('Dragon Rage'),rolls:Array(16).fill(40)}),false);
});
test('ability scenarios group actual deterministic outcomes and distinguish outcome kind/reason',()=>{
 const d={...target,abilityOptions:options(['Immunity','Thick Fat'])};
 const grouped=calculateAbilityScenarios(battleMove('Dragon Rage'),mon,d);
 assert.equal(grouped.groups.length,1);assert.equal(grouped.groups[0].scenarios.length,2);
 assert.equal(grouped.groups[0].rolls,null);assert.equal(grouped.groups[0].hp,'40 HP damage');
 const unsupported=calculateAbilityScenarios(battleMove('Dragon Rage'),mon,{...d,abilityOptions:options(['Immunity','Wonder Guard'])});
 assert.deepEqual(unsupported.groups.map(g=>g.availability),['available','blocked']);
 const unknown=calculateAbilityScenarios(battleMove('Seismic Toss'),mon,{...target,ability:null});
 assert.equal(unknown.groups[0].availability,'unavailable');
 assert.equal(unknown.groups[0].reason,'missing-ability');
 assert.equal(calculateAbilityScenarios(battleMove('Night Shade'),mon,mon).groups[0].availability,'immune');
 assert.equal(calculateAbilityScenarios(battleMove('Endeavor'),target,mon).groups[0].availability,'failed');
 const calculate=(_move,_a,d)=>d.ability==='Immunity'?calc('Night Shade',mon,mon):calc('Endeavor',target,mon);
 assert.equal(calculateAbilityScenarios(battleMove('Dragon Rage'),mon,d,{calculate}).groups.length,2,'immune and failed do not collapse as zero damage');
 for(const name of ['Strength','Facade','Return','Hidden Power','Flail','Eruption','Weather Ball']) {
  const a={...mon,friendship:255,ivs:{hp:31,attack:31,defense:31,spAttack:31,spDefense:31,speed:31}};
  const result=calc(name,a);assert.equal(result.kind,'standard-damage');assert.equal(result.rolls.length,16);
 }
 assert.equal(calc('Fissure').kind,'ohko');
});
