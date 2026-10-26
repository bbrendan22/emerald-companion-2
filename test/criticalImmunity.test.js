import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios,opponentAbilityOptions,playerAbilityOptions} from '../src/battle/abilityScenarios.js';
import {battleMove} from '../src/battle/reference.js';
import {conditionalCases} from '../src/battle/conditionalDamage.js';
import baseline from './fixtures/damageFinalizationBaseline.json' with {type:'json'};
const mon=baseline.mon;
const calc=(name,a=mon,d=mon,critical=false,context={},weather='none')=>calculateCoreDamage(battleMove(name),a,d,weather,critical,context);
const range=r=>[r.min,r.max];
const stage=(aStage,dStage)=>[
 {...mon,stages:{attack:aStage,spAttack:aStage}},
 {...mon,stages:{defense:dStage,spDefense:dStage}},
];
// Cmd_critcalc leaves gCritMultiplier=1 for either armor ability before
// CalculateBaseDamage applies stage/screen rules and Cmd_damagecalc doubles.
// https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c#L1200-L1239

for(const ability of ['Battle Armor','Shell Armor']){
 test(`${ability}: selected critical is exactly a normal physical/special hit; attacker armor does not suppress crit`,()=>{
  const defender={...mon,ability};
  assert.deepEqual(range(calc('Strength',mon,defender,true)),[46,55]);
  assert.deepEqual(range(calc('Surf',mon,defender,true)),[36,43]);
  for(const name of ['Strength','Surf','Shadow Ball','Crunch','Slash']){
   assert.deepEqual(calc(name,mon,defender,true),calc(name,mon,defender,false));
   assert.deepEqual(calc(name,{...mon,ability},mon,true),calc(name,mon,mon,true));
  }
  assert.deepEqual(range(calc('Strength',mon,mon,true)),[94,111]);
  assert.deepEqual(range(calc('Surf',mon,mon,true)),[73,86]);
 });
 test(`${ability}: all stage signs and both screens remain active before damage, rather than halving the final crit range`,()=>{
  // Literal Lv50, stats100, Normal STAB for Strength only. Screen is before +2.
  for(const [aStage,dStage,physical,special] of [
   [-2,2,[7,9],[5,7]], [2,-2,[91,108],[72,85]],
  ]){
   const [a,d]=stage(aStage,dStage),defender={...d,ability,screens:{reflect:true,lightScreen:true}};
   assert.deepEqual(range(calc('Strength',a,defender,true)),physical);
   assert.deepEqual(range(calc('Surf',a,defender,true)),special);
  }
  for(const [aStage,dStage] of [[-6,6],[-2,-2],[2,2],[6,-6],[0,0]])for(const name of ['Strength','Surf']){
   const [a,d]=stage(aStage,dStage),defender={...d,ability,screens:{reflect:true,lightScreen:true}};
   assert.deepEqual(calc(name,a,defender,true),calc(name,a,defender,false));
  }
  const [a,d]=stage(-2,2),defender={...d,ability,screens:{reflect:true,lightScreen:true}};
  assert.notDeepEqual(range(calc('Strength',a,defender,true)),range(calc('Strength',a,{...defender,ability:'Immunity'},true)).map(n=>Math.floor(n/2)));
  assert.deepEqual(range(calc('Surf',a,defender,true,{},'rain')),[7,9]);
  assert.deepEqual(range(calc('Strength',a,{...d,ability},true)),[12,15],'without Reflect');
 });
 test(`${ability}: fixed/variable/triple multi-hit paths retain exact noncritical rolls, distributions and crit policies`,()=>{
  const [a,d]=stage(-2,2),defender={...d,ability,screens:{reflect:true,lightScreen:true}};
  for(const name of ['Double Kick','Twineedle','Bonemerang','DoubleSlap','Comet Punch','Fury Attack','Pin Missile','Spike Cannon','Barrage','Fury Swipes','Bone Rush','Arm Thrust','Bullet Seed','Icicle Spear','Rock Blast','Triple Kick']){
   const counts=name==='Triple Kick'?[undefined,1,2,3]:['Double Kick','Twineedle','Bonemerang'].includes(name)?[undefined]:[undefined,2,3,4,5];
   for(const hitCount of counts){
    const context=hitCount===undefined?{}:{hitCount},normal=calc(name,a,defender,false,context),selected=calc(name,a,defender,true,context);
    assert.deepEqual(selected,normal,`${name} ${hitCount??'legacy'}`);
    assert.equal(selected.totalOutcomes,normal.totalOutcomes);
    assert.ok(selected.hits.length>=1);
    assert.match(selected.criticalPolicy,/noncritical$/);
   }
  }
 });
 test(`${ability}: every existing conditional move uses the corrected critical state within each scenario`,()=>{
  const [a,d]=stage(-2,2),defender={...d,ability,screens:{reflect:true,lightScreen:true}};
  for(const name of ['Pursuit','Revenge','Rollout','Ice Ball','Fury Cutter','Magnitude','Present']){
   const selected=calc(name,a,defender,true),normal=calc(name,a,defender,false);
   assert.deepEqual(selected,normal,name);
   assert.deepEqual(selected.conditions.map(c=>c.id),conditionalCases(battleMove(name)).map(c=>c.id));
  }
 });
}

test('real opponent alternatives split crit-immune outcomes and collapse only equivalent complete results',()=>{
 for(const [dex,types,immuneAbility] of [[140,['ROCK','WATER'],'Battle Armor'],[138,['ROCK','WATER'],'Shell Armor']]){
  const defender={...mon,dex,types,abilityOptions:opponentAbilityOptions({dex})};
  const critical=calculateAbilityScenarios(battleMove('Strength'),mon,defender,{critical:true});
  assert.equal(critical.groups.length,2);
  const armor=critical.groups.find(g=>g.label===immuneAbility),ordinary=critical.groups.find(g=>g.label==='Swift Swim');
  assert.deepEqual([armor.min,armor.max],[22,27]);assert.deepEqual([ordinary.min,ordinary.max],[46,55]);
  const normal=calculateAbilityScenarios(battleMove('Strength'),mon,defender,{critical:false});
  assert.equal(normal.groups.length,1);assert.equal(normal.groups[0].scenarios.length,2);
  const immune=calculateAbilityScenarios(battleMove('Thunderbolt'),mon,{...defender,types:['GROUND']},{critical:true});
  assert.equal(immune.groups.length,1);assert.equal(immune.groups[0].max,0);
  const aggregate=calculateAbilityScenarios(battleMove('Bullet Seed'),mon,defender,{critical:true,battleContext:{hitCount:4}});
  assert.equal(aggregate.groups.length,2);assert.ok(aggregate.groups.every(g=>g.result.hitCount===4));
  assert.deepEqual(new Set(aggregate.groups.map(g=>g.result.criticalPolicy)),new Set(['all-critical','all-noncritical']));
 }
});

test('known imported-style abilities and both attack directions retain armor only on the defender',()=>{
 const kabuto={...mon,dex:140,types:['ROCK','WATER'],ability:'Battle Armor'};
 const known={...kabuto,abilityOptions:playerAbilityOptions(kabuto)};
 const defending=calculateAbilityScenarios(battleMove('Strength'),mon,known,{critical:true});
 assert.equal(defending.scenarios.length,1);assert.deepEqual([defending.groups[0].min,defending.groups[0].max],[22,27]);
 const attacking=calculateAbilityScenarios(battleMove('Strength'),known,mon,{critical:true});
 assert.equal(attacking.scenarios.length,1);assert.deepEqual([attacking.groups[0].min,attacking.groups[0].max],[62,74]);
});

test('armor restores unknown Doubles screen safeguards; Brick Break alone still bypasses screens',()=>{
 const defender={...mon,abilityOptions:{status:'uncertain',source:'species',values:['Swift Swim','Shell Armor']},screens:{reflect:true}};
 const result=calculateAbilityScenarios(battleMove('Strength'),mon,defender,{critical:true,battleContext:{format:'Doubles'}});
 assert.deepEqual(result.groups.map(g=>g.availability),['available','unsupported']);
 assert.equal(result.groups[1].reason,'unknown-defender-side-count');
 for(const ability of ['Battle Armor','Shell Armor'])for(const hitCount of [2,3,5]){
  const d={...mon,ability,screens:{reflect:true}};
  assert.equal(calc('DoubleSlap',mon,d,true,{format:'Doubles',hitCount}).availability,'unsupported');
  for(const defenderSideAlive of [1,2])assert.deepEqual(calc('DoubleSlap',mon,d,true,{format:'Doubles',defenderSideAlive,hitCount}),calc('DoubleSlap',mon,d,false,{format:'Doubles',defenderSideAlive,hitCount}));
  assert.deepEqual(calc('Brick Break',mon,d,true,{format:'Doubles'}),calc('Brick Break',mon,{...d,screens:{}},false));
 }
});

test('all 354 canonical moves against armor match normal hits; fixed/Psywave/OHKO and deferred cases retain their contracts',()=>{
 for(const ability of ['Battle Armor','Shell Armor']){
  const defender={...mon,ability,currentHp:150},attacker={...mon,currentHp:50};
  for(const row of baseline.moves)assert.deepEqual(calc(row.id,attacker,defender,true),calc(row.id,attacker,defender,false),`${ability}: ${row.name}`);
  assert.deepEqual(calc('Psywave',{...attacker,level:1},defender,true).rolls,[0,0,0,0,0,1,1,1,1,1,1]);
  assert.equal(calc('Seismic Toss',attacker,defender,true).damage,50);
  assert.equal(calc('Guillotine',attacker,defender,true).outcome,'ohko');
  for(const name of ['Counter','Mirror Coat','Bide','Beat Up','Future Sight','Doom Desire','Spit Up'])assert.equal(calc(name,attacker,defender,true),null);
 }
});

test('nonimmune crit arithmetic, invalid-input validation and stored conditions remain unchanged',()=>{
 const [a,d]=stage(-2,2),defender={...d,ability:'Shell Armor',screens:{reflect:true,lightScreen:true}},before=structuredClone({a,defender});
 calc('Strength',a,defender,true);assert.deepEqual({a,defender},before);
 for(const critical of [null,0,1,'true',{}])assert.equal(calc('Strength',a,defender,critical),null);
 assert.equal(calc('Strength',{...a,stats:{...a.stats,attack:null}},defender,true),null);
 assert.deepEqual(range(calc('Strength',a,{...d,screens:defender.screens},true)),[94,111]);
 assert.deepEqual(range(calc('Surf',a,{...d,screens:defender.screens},true)),[73,86]);
 assert.deepEqual(range(calc('Strength',{...a,ability:'Guts',status:'burn'},defender,true)),range(calc('Strength',{...a,ability:'Guts',status:'burn'},defender,false)));
});
