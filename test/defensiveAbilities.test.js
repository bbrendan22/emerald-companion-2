import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios,opponentAbilityOptions} from '../src/battle/abilityScenarios.js';
import {coreDamageDisplayParts} from '../src/battle/coreDamagePresentation.js';
import {battleMove} from '../src/battle/reference.js';
const mon={level:50,currentHp:200,ability:'Immunity',types:['NORMAL'],stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const calc=(name,ability,extra={},a=mon,w='none',c=false)=>calculateCoreDamage(battleMove(name),a,{...mon,...extra,ability},w,c);
// Independent hand calculations follow Emerald src/pokemon.c CalculateBaseDamage:
// Thick Fat halves SpA; Marvel Scale floors DEF*150/100; both precede stages.
// Levitate's Ground immunity is checked in battle_script_commands.c Cmd_typecalc.
// https://github.com/pret/pokeemerald/blob/master/src/pokemon.c

test('Thick Fat halves Fire/Ice offensive operands before damage, not the final range',()=>{
 for(const name of ['Flamethrower','Ice Beam']) {
  // P95: SpA100->50; subtotal20,+2=22 =>18..22 (not half of36..43).
  const result=calc(name,'Thick Fat');
  assert.deepEqual([result.base,result.min,result.max],[22,18,22]);
 }
 // SpA101 -> Thick Fat50 -> +2 stage100; versus100 SpD, subtotal41,+2=43.
 assert.equal(calc('Flamethrower','Thick Fat',{}, {...mon,stats:{...mon.stats,spAttack:101},stages:{spAttack:2}}).base,43);
 assert.equal(calc('Flamethrower','Thick Fat',{}, {...mon,stats:{...mon.stats,spAttack:1}}).base,2);
 for(const name of ['Surf','Strength','Earthquake','Shadow Ball'])assert.deepEqual(calc(name,'Thick Fat'),calc(name,'Immunity'));
});
test('Marvel Scale activates for all six major statuses, only for physical damage',()=>{
 for(const status of ['burn','poison','toxic','paralysis','sleep','freeze']) {
  // Strength80 vs DEF150: subtotal23,+2=25, STAB37 =>31..37.
  assert.deepEqual([calc('Strength','Marvel Scale',{status}).base,calc('Strength','Marvel Scale',{status}).max],[25,37]);
  assert.deepEqual(calc('Surf','Marvel Scale',{status}),calc('Surf','Immunity'));
 }
 for(const status of [undefined,'none','unknown'])assert.deepEqual(calc('Strength','Marvel Scale',{status}),calc('Strength','Immunity'));
 // Odd DEF101 -> Marvel151 -> +2 stage302. ATK110 with EQ100 gives
 // subtotal16,+2=18; stage-first DEF303 would incorrectly give17.
 const r=calc('Earthquake','Marvel Scale',{status:'poison',stats:{...mon.stats,defense:101},stages:{defense:2}}, {...mon,stats:{...mon.stats,attack:110}});
 assert.equal(r.base,18); // floor(22*100*110/302/50)+2=18.
 const huge=calc('Strength','Marvel Scale',{status:'sleep',stats:{...mon.stats,defense:999},stages:{defense:6}});
 assert.ok(huge,'boosted defense above999 is still valid');
});
test('critical hits retain defensive ability modifiers while selectively bypassing stages',()=>{
 // Crit ignores DEF+2 but not Marvel Scale: subtotal23,+2=25 ->crit50 ->STAB75.
 const scale=calc('Strength','Marvel Scale',{status:'burn',stages:{defense:2}},mon,'none',true);
 assert.deepEqual([scale.base,scale.min,scale.max],[25,63,75]);
 // Negative DEF stages remain:150/2=75 ->subtotal46,+2=48 ->crit96 ->STAB144.
 assert.equal(calc('Strength','Marvel Scale',{status:'poison',stages:{defense:-2}},mon,'none',true).max,144);
 // Thick Fat50; negative SPA bypassed; rain boosts Fire? Rain weakens it:
 // subtotal20 ->rain10,+2=12 ->crit24 ->STAB36 =>30..36.
 const fire={...mon,types:['FIRE'],stages:{spAttack:-2}};
 assert.deepEqual([calc('Flamethrower','Thick Fat',{},fire,'rain',true).min,calc('Flamethrower','Thick Fat',{},fire,'rain',true).max],[30,36]);
 // Blaze low HP boosts P95->142; ThickFat50 ->subtotal31; sun46,+2=48 ->crit96 ->STAB144.
 assert.equal(calc('Flamethrower','Thick Fat',{}, {...fire,ability:'Blaze',currentHp:50},'sun',true).max,144);
});
test('offensive boosts and burn compose with Marvel Scale without changing either Pokémon',()=>{
 const a={...mon,ability:'Huge Power',status:'burn',stages:{attack:2}};
 const d={...mon,ability:'Marvel Scale',status:'poison'};
 const before=structuredClone({a,d});
 // Attack400 vsDEF150 subtotal93 ->burn46,+2=48 ->STAB72.
 const r=calculateCoreDamage(battleMove('Strength'),a,d);
 assert.deepEqual([r.base,r.min,r.max],[48,61,72]);
 const guts=calculateCoreDamage(battleMove('Strength'),{...a,ability:'Guts'},d);
 // Guts150*2=300 vsDEF150 subtotal70,+2=72 ->STAB108, no burn.
 assert.equal(guts.max,108);assert.deepEqual({a,d},before);
});
test('Levitate returns available 16-roll zero damage, including STAB/crit/burn and non-Flying targets',()=>{
 for(const name of ['Earthquake','Dig']) {
  const r=calc(name,'Levitate',{}, {...mon,types:['GROUND'],status:'burn',ability:'Huge Power'},'rain',true);
  assert.deepEqual(r.rolls,Array(16).fill(0));assert.equal(r.min,0);assert.equal(r.max,0);assert.equal(r.effectiveness,0);
  assert.deepEqual(coreDamageDisplayParts(r,200),{percentage:'0% – 0%',hp:'0–0 HP damage'});
 }
 for(const name of ['Strength','Surf','Ice Beam'])assert.deepEqual(calc(name,'Levitate'),calc(name,'Immunity'));
});
test('both attack directions apply only the defending ability',()=>{
 const fat={...mon,ability:'Thick Fat'};
 assert.equal(calculateCoreDamage(battleMove('Flamethrower'),mon,fat).max,22);
 assert.equal(calculateCoreDamage(battleMove('Flamethrower'),fat,mon).max,43);
 const levitate={...mon,ability:'Levitate'};
 assert.equal(calculateCoreDamage(battleMove('Earthquake'),mon,levitate).max,0);
 assert.equal(calculateCoreDamage(battleMove('Earthquake'),levitate,mon).max,46);
 const scale={...mon,ability:'Marvel Scale',status:'poison'};
 assert.equal(calculateCoreDamage(battleMove('Strength'),mon,scale).max,37);
 assert.equal(calculateCoreDamage(battleMove('Strength'),scale,mon).max,55);
});
test('real unknown defender abilities split affected moves and collapse irrelevant moves',()=>{
 const fat={...mon,dex:143,abilityOptions:opponentAbilityOptions({dex:143})};
 const fire=calculateAbilityScenarios(battleMove('Flamethrower'),mon,fat);
 assert.deepEqual(fire.groups.map(g=>g.label),['Immunity','Thick Fat']);assert.deepEqual(fire.groups.map(g=>g.max),[43,22]);
 assert.equal(calculateAbilityScenarios(battleMove('Strength'),mon,fat).groups.length,1);
 const flygon={...mon,dex:330,types:['GROUND','DRAGON'],abilityOptions:opponentAbilityOptions({dex:330})};
 assert.equal(calculateAbilityScenarios(battleMove('Earthquake'),mon,flygon).groups[0].availability,'available');
 // Controlled Gen III alternatives exercise zero-vs-normal grouping without later-generation species.
 const uncertain={...mon,abilityOptions:{status:'uncertain',source:'species',values:['Levitate','Immunity']}};
 const groups=calculateAbilityScenarios(battleMove('Earthquake'),mon,uncertain).groups;
 assert.deepEqual(groups.map(g=>g.label),['Levitate','Immunity']);assert.deepEqual(groups.map(g=>g.max),[0,46]);
 assert.equal(calculateAbilityScenarios(battleMove('Surf'),mon,uncertain).groups.length,1);
});
test('missing required stats still fail safely; other defensive abilities remain unimplemented',()=>{
 for(const ability of ['Thick Fat','Marvel Scale','Levitate'])
  assert.equal(calc('Earthquake',ability,{stats:{defense:'100–150'}}),null);
 for(const ability of ['Battle Armor','Shell Armor'])
  assert.deepEqual(calc('Surf',ability),calc('Surf','Immunity'));
 assert.equal(calc('Surf','Wonder Guard').outcome,'blocked');
});
