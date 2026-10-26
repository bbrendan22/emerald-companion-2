import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCoreDamage,offensiveAbilityModifiers} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios,playerAbilityOptions,opponentAbilityOptions} from '../src/battle/abilityScenarios.js';
import {battleMove} from '../src/battle/reference.js';
const mon={level:50,types:['ELECTRIC'],stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const calc=(ability,extra={},name='Strength',defender=mon,critical=false,weather='none')=>
 calculateCoreDamage(battleMove(name),{...mon,...extra,ability},defender,weather,critical);
// Independent hand calculations from Emerald CalculateBaseDamage: abilities
// modify Attack before APPLY_STAT_MOD. Hustle/Guts truncate Attack*150/100.
// https://github.com/pret/pokeemerald/blob/master/src/pokemon.c

test('Huge Power/Pure Power double Attack, and Hustle truncates its 50% boost',()=>{
 for(const ability of ['Huge Power','Pure Power']) {
  assert.equal(offensiveAbilityModifiers(101,ability).attack,202);
  assert.equal(calc(ability).base,72); // 22*80*200/100/50 =>70,+2.
  assert.deepEqual(calc(ability).rolls,[61,61,62,63,64,64,65,66,66,67,68,69,69,70,71,72]);
 }
 assert.equal(offensiveAbilityModifiers(101,'Hustle').attack,151);
 assert.deepEqual([calc('Hustle').base,calc('Hustle').min,calc('Hustle').max],[54,45,54]);
});
test('Guts activates for every represented major status and suppresses burn',()=>{
 for(const status of ['burn','poison','toxic','paralysis','sleep','freeze']) {
  assert.deepEqual(offensiveAbilityModifiers(101,'Guts',status),{attack:151,ignoreBurn:true});
  assert.equal(calc('Guts',{status}).base,54);
 }
 for(const status of [undefined,'none','unknown'])assert.equal(calc('Guts',{status}).base,37);
 assert.equal(calc('Immunity',{status:'burn'}).base,19);
 assert.equal(calc('Huge Power',{status:'burn'}).base,37,'Huge Power does not suppress burn');
});
test('all four modifiers are Physical only and defender offensive abilities do not apply',()=>{
 for(const ability of ['Huge Power','Pure Power','Hustle','Guts']) {
  assert.deepEqual(calc(ability,{status:'burn'},'Surf'),calc(undefined,{},'Surf'));
  assert.deepEqual(calc(ability,{status:'burn'},'Crunch'),calc(undefined,{},'Crunch'));
  assert.equal(calc(ability,{},'Shadow Ball').base,ability==='Guts'?37:ability==='Hustle'?54:72);
  assert.deepEqual(calculateCoreDamage(battleMove('Strength'),mon,{...mon,ability,status:'burn'}),calculateCoreDamage(battleMove('Strength'),mon,mon));
 }
});
test('ability Attack is floored before stages, without capping boosted Attack at 999',()=>{
 // 101 -> Hustle151 -> +2 Attack302; EQ100 vs DEF101: subtotal131,+2=133.
 // Applying stage first would give202 -> Hustle303 and the wrong base134.
 const a={stats:{...mon.stats,attack:101},stages:{attack:2}};
 assert.equal(calc('Hustle',a,'Earthquake',{...mon,stats:{...mon.stats,defense:101}}).base,133);
 for(const ability of ['Huge Power','Pure Power']) {
  assert.equal(calc(ability,{stages:{attack:-2}}).base,37);
  assert.equal(calc(ability,{stages:{attack:2}}).base,142);
  assert.equal(calc(ability,{stats:{...mon.stats,attack:999},stages:{attack:6}}).base,2815);
 }
 assert.equal(calc('Guts',{status:'poison',stages:{attack:-2}}).base,28);
 assert.equal(calc('Guts',{status:'poison',stages:{attack:2}}).base,107);
});
test('critical stage bypass preserves ability boosts and active Guts still removes burn',()=>{
 for(const ability of ['Huge Power','Pure Power']) {
  assert.equal(calc(ability,{stages:{attack:-2}},'Strength',{...mon,stages:{defense:2}},true).max,144);
  assert.equal(calc(ability,{stages:{attack:2}},'Strength',mon,true).max,284);
 }
 const r=calc('Guts',{status:'burn',stages:{attack:-2},types:['NORMAL']},'Strength',{...mon,types:['ROCK'],stages:{defense:2}},true);
 // Guts150, stage penalties bypassed, subtotal52,+2=54, crit108, STAB162, Rock81.
 assert.deepEqual([r.base,r.min,r.max],[54,68,81]);
 assert.deepEqual(calc('Hustle',{},'Surf',mon,true,'rain'),calc(undefined,{},'Surf',mon,true,'rain'));
});
test('real ability options split Physical scenarios, combine Special ones, and respect known player ability in both directions',()=>{
 const player={...mon,dex:143,name:'Snorlax',types:['NORMAL'],ability:'Immunity'};
 const opponent={...mon,dex:184,name:'Azumarill',types:['WATER'],abilityOptions:opponentAbilityOptions({dex:184})};
 const incoming=calculateAbilityScenarios(battleMove('Strength'),opponent,{...player,abilityOptions:playerAbilityOptions(player)});
 assert.deepEqual(incoming.groups.map(g=>g.label),['Thick Fat','Huge Power']);
 assert.deepEqual(incoming.groups.map(g=>g.max),[37,72]);
 const special=calculateAbilityScenarios(battleMove('Surf'),opponent,player);
 assert.equal(special.scenarios.length,2);assert.equal(special.groups.length,1);assert.equal(special.groups[0].label,'');
 const outgoing=calculateAbilityScenarios(battleMove('Strength'),player,opponent);
 assert.equal(outgoing.groups.length,1,'defender Huge Power has no effect');
 const own={...opponent,ability:'Huge Power',abilityOptions:playerAbilityOptions({...opponent,ability:'Huge Power'})};
 const known=calculateAbilityScenarios(battleMove('Strength'),own,player);
 assert.equal(known.scenarios.length,1);assert.equal(known.groups[0].max,72);assert.equal(known.groups[0].label,'');
});
test('Guts status scenarios combine while healthy and split while burned; missing data and immunities remain intact',()=>{
 const a={...mon,abilityOptions:{status:'uncertain',source:'species',values:['Swarm','Guts']}};
 const d={...mon,ability:'Immunity'};
 assert.equal(calculateAbilityScenarios(battleMove('Strength'),a,d).groups.length,1);
 const burned=calculateAbilityScenarios(battleMove('Strength'),{...a,status:'burn'},d);
 assert.deepEqual(burned.groups.map(g=>g.max),[19,54]);
 assert.deepEqual(burned.groups.map(g=>g.label),['Swarm','Guts']);
 assert.deepEqual(calc('Huge Power',{},'Strength',{...mon,types:['GHOST']}).rolls,Array(16).fill(0));
 assert.equal(calc('Huge Power',{stats:{...mon.stats,attack:null}}),null);
 assert.equal(calc('Hustle',{},'Strength',null),null);
 const before=structuredClone(a);calculateAbilityScenarios(battleMove('Strength'),a,d);assert.deepEqual(a,before);
});
