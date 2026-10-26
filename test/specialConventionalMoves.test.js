import test from 'node:test';
import assert from 'node:assert/strict';
import {battleMove} from '../src/battle/reference.js';
import {calculateCoreDamage,isConventionalDamageMove} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
const mon={dex:143,level:50,types:['NORMAL'],ability:'Immunity',item:'None',currentHp:200,
 stats:{hp:200,attack:100,defense:100,spAttack:90,spDefense:120}};
const calc=(name,a=mon,d=mon,w='none',c=false)=>calculateCoreDamage(battleMove(name),a,d,w,c);
const rolls=last=>Array.from({length:16},(_,i)=>Math.max(1,Math.floor(last*(85+i)/100)));
const options=values=>({status:values.length===1?'known':'uncertain',source:'species',values});
test('False Swipe computes and caps all16 final rolls individually, including full/low/one HP',()=>{
 //P40:floor(22*40/50)+2=19;STAB28;random23..28.
 assert.deepEqual(calc('False Swipe').rolls,rolls(28));
 for(const hp of [200,28,27,26,25,10,2,1,null]) {
  const result=calc('False Swipe',mon,{...mon,currentHp:hp,initialCurrentHp:200});
  assert.deepEqual(result.rolls,rolls(28).map(value=>Math.min(value,(hp??200)-1)));
  assert.equal(result.min,result.rolls[0]);assert.equal(result.max,result.rolls[15]);
 }
 assert.deepEqual(calc('False Swipe',mon,{...mon,currentHp:1}).rolls,Array(16).fill(0));
 const low={...mon,currentHp:10};
 assert.deepEqual(calc('False Swipe',low,mon).rolls,rolls(28));
 assert.deepEqual(calc('False Swipe',mon,low).rolls,Array(16).fill(9));
 assert.deepEqual(calc('False Swipe',mon,{...mon,types:['GHOST'],currentHp:27}).rolls,Array(16).fill(0));
 for(const hp of [undefined,0,-1,201,2.5,'27',NaN])assert.equal(calc('False Swipe',mon,{...mon,currentHp:hp}),null);
 assert.equal(calc('False Swipe',mon,{...mon,currentHp:null,stats:{...mon.stats,hp:'180–200'}}),null);
});
test('False Swipe preserves stages, crit, burn, abilities, items and exact scenario grouping after capping',()=>{
 const a={...mon,ability:'Guts',status:'burn',item:'Choice Band',stages:{attack:-2}};
 const d={...mon,currentHp:70,stages:{defense:2}};
 const baseline=calculateCoreDamage({...battleMove('Tackle'),power:40},a,d,'none',true);
 assert.deepEqual(calc('False Swipe',a,d,'none',true).rolls,baseline.rolls.map(value=>Math.min(value,69)));
 const uncertain={...mon,abilityOptions:options(['Immunity','Huge Power'])};
 assert.equal(calculateAbilityScenarios(battleMove('False Swipe'),uncertain,{...mon,currentHp:1}).groups.length,1);
 assert.equal(calculateAbilityScenarios(battleMove('False Swipe'),uncertain,mon).groups.length,2);
});
test('Explosion250/Selfdestruct200 halve raw Defense, with independent literal base and rolls',()=>{
 //AtLv50:Explosion floor(22*250*100/50/50)+2=222;STAB333.
 for(const [name,power,base,last] of [['Explosion',250,222,333],['Self Destruct',200,178,267]]) {
  assert.equal(battleMove(name).power,power);
  const result=calc(name);assert.equal(result.category,'Physical');assert.equal(result.base,base);assert.deepEqual(result.rolls,rolls(last));
  assert.deepEqual(calc(name,mon,{...mon,types:['GHOST']}).rolls,Array(16).fill(0));
  assert.equal(calc(name,{...mon,types:['WATER']}).stab,1);
 }
});
test('Explosion ordering: items/Marvel Scale, halving, stages, critical exceptions, burn and Attack boosts',()=>{
 const a={...mon,types:['WATER']},d={...mon,stats:{...mon.stats,defense:103},stages:{defense:1}};
 //103->half51->stage76:floor(550000/76/50)+2=146.
 assert.equal(calc('Explosion',a,d).base,146);
 assert.equal(calc('Explosion',a,d,'none',true).base,217); //crit ignores Def+1, uses51.
 assert.deepEqual(calc('Explosion',a,d,'none',true).rolls,rolls(434));
 assert.equal(calc('Explosion',a,{...d,stages:{defense:-1}},'none',true).base,325); //half51->stage34.
 //Marvel103->154->half77->stage115:subtotal95;+2.
 assert.equal(calc('Explosion',a,{...d,ability:'Marvel Scale',status:'poison'}).base,97);
 //Metal Powder103->206->half103->stage154:subtotal71;+2.
 assert.equal(calc('Explosion',a,{...d,dex:132,item:'Metal Powder',ability:'Limber',transformed:false}).base,73);
 assert.equal(calc('Explosion',{...a,status:'burn'},{...d,stages:{}}).base,109); //subtotal215/2+2.
 assert.equal(calc('Explosion',{...a,ability:'Guts',status:'burn'},{...d,stages:{}}).base,325); //Atk150 vs51,subtotal323+2.
 assert.equal(calc('Explosion',{...a,item:'Choice Band'},{...d,stages:{}}).base,325);
 assert.equal(calc('Explosion',{...a,ability:'Huge Power'},{...d,stages:{}}).base,433);
 assert.equal(calc('Explosion',{...a,stages:{attack:1}},{...d,stages:{}}).base,325);
 assert.deepEqual(calc('Explosion',a,d,'rain'),calc('Explosion',a,d,'sun'));
 const before=structuredClone({a,d});calc('Self Destruct',a,d);assert.deepEqual({a,d},before,'no post-move fainting');
});
test('Damp branches prevent moves from either side and are never dropped or averaged',()=>{
 for(const name of ['Explosion','Self Destruct']) {
  assert.equal(calc(name,mon,{...mon,ability:'Damp'}).outcome,'blocked');
  assert.equal(calc(name,{...mon,ability:'Damp'},mon).outcome,'blocked');
  assert.equal(calc(name,mon,{...mon,ability:'Damp / Water Absorb'}),null);
  assert.equal(calc(name,mon,{...mon,ability:undefined}),null);
  assert.equal(calc(name,{...mon,ability:'Trace'}).availability,'unsupported');
  const d={...mon,abilityOptions:options(['Water Absorb','Damp'])};
  const scenarios=calculateAbilityScenarios(battleMove(name),mon,d);
  assert.deepEqual(scenarios.groups.map(g=>g.availability),['available','blocked']);
  assert.equal(scenarios.groups[1].reason,'damp');
  assert.equal(scenarios.scenarios.length,2);
  const reverse=calculateAbilityScenarios(battleMove(name),d,mon);
  assert.deepEqual(reverse.groups.map(g=>g.availability),['available','blocked']);
 }
});
test('Struggle50 is physical with no STAB/type chart, including Ghost/Rock/Steel defenders',()=>{
 for(const types of [['NORMAL'],['GHOST'],['ROCK','STEEL'],['FIGHTING'],['WATER']]) {
  const result=calc('Struggle',mon,{...mon,types});
  assert.equal(result.category,'Physical');assert.equal(result.stab,1);assert.equal(result.effectiveness,1);
  assert.deepEqual(result.rolls,rolls(24)); //P50 subtotal22;+2=24, noSTAB.
 }
 assert.equal(battleMove('Struggle').power,50);
 assert.deepEqual(calc('Struggle',{...mon,types:['GHOST']}).rolls,rolls(24));
 const enemy={...mon,stats:{...mon.stats,attack:150}};
 assert.deepEqual(calc('Struggle',enemy,mon).rolls,rolls(35));
 assert.deepEqual(calc('Struggle',mon,enemy).rolls,rolls(24));
});
test('Struggle retains burn, Guts, attack modifiers, Defense, critical/stages and source type-item behavior',()=>{
 assert.deepEqual(calc('Struggle',{...mon,status:'burn'}).rolls,rolls(13));
 assert.deepEqual(calc('Struggle',{...mon,status:'burn',ability:'Guts'}).rolls,rolls(35));
 assert.deepEqual(calc('Struggle',{...mon,item:'Choice Band'}).rolls,rolls(35));
 assert.deepEqual(calc('Struggle',{...mon,item:'Silk Scarf'}).rolls,rolls(26)); //Formula still uses Normal for item lookup; Cmd_typecalc alone bypassesSTAB/chart.
 assert.deepEqual(calc('Struggle',{...mon,ability:'Huge Power'}).rolls,rolls(46));
 assert.deepEqual(calc('Struggle',mon,mon,'none',true).rolls,rolls(48));
 assert.deepEqual(calc('Struggle',{...mon,stages:{attack:-2}},{...mon,stages:{defense:2}},'none',true).rolls,rolls(48));
 for(const weather of ['none','sun','rain','sand','hail'])assert.deepEqual(calc('Struggle',mon,mon,weather).rolls,rolls(24));
});
test('narrow ID admission preserves legacy eligibility, deterministic outcomes and deferred moves',()=>{
 for(const name of ['False Swipe','Explosion','Self Destruct','Struggle'])assert.equal(isConventionalDamageMove(battleMove(name)),false);
 assert.equal(calc('Fissure').kind,'ohko');
 assert.equal(calc('Counter'),null);
 const fixed=calc('Seismic Toss');assert.equal(fixed.kind,'deterministic-damage');assert.equal(fixed.damage,50);assert.equal(fixed.rolls,undefined);
 const reversed={...mon,currentHp:50};assert.equal(calc('Endeavor',reversed,mon).damage,150);
 assert.equal(calc('Strength').rolls.length,16);
});
