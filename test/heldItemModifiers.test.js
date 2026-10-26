import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCoreDamage,offensiveAbilityModifiers} from '../src/battle/coreDamage.js';
import {heldItemAttack} from '../src/battle/heldItemModifiers.js';
import {battleItemId} from '../src/battle/itemLookup.js';
import {battleMove} from '../src/battle/reference.js';
import {calculateAbilityScenarios,opponentAbilityOptions} from '../src/battle/abilityScenarios.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';
import {readPokemon} from '../src/save/readPokemon.js';
import {makePokemon} from './fixtures/synthetic.js';
import {toTowerOpponent} from '../src/battle/frontierAdapter.js';
import {towerSetById} from '../src/battle/towerSets.js';
const mon={dex:143,level:50,ability:'Immunity',types:['ELECTRIC'],currentHp:200,stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const calc=(name,item,a={},d=mon,w='none',c=false)=>calculateCoreDamage(battleMove(name),{...mon,...a,item},d,w,c);
// Independent cartridge references: pokemon.c applies Huge/Pure Power, type
// items, Choice Band, Thick Fat, Hustle/Guts, then stages and the base formula.
// items.h gives ordinary type items10%, and Sea Incense5% in Emerald.
// https://github.com/pret/pokeemerald/blob/master/src/pokemon.c
// https://github.com/pret/pokeemerald/blob/master/src/data/items.h
const typeItems=[['Mystic Water','WATER'],['Charcoal','FIRE'],['Miracle Seed','GRASS'],['Magnet','ELECTRIC'],
 ['NeverMeltIce','ICE'],['Black Belt','FIGHTING'],['Sharp Beak','FLYING'],['Poison Barb','POISON'],
 ['Soft Sand','GROUND'],['Hard Stone','ROCK'],['SilverPowder','BUG'],['Spell Tag','GHOST'],
 ['Metal Coat','STEEL'],['TwistedSpoon','PSYCHIC'],['Dragon Fang','DRAGON'],['BlackGlasses','DARK'],['Silk Scarf','NORMAL'],['Sea Incense','WATER']];

test('Choice Band boosts Physical Attack only, using the Gen III type split',()=>{
 assert.deepEqual([calc('Strength','Choice Band').base,calc('Strength','Choice Band').min,calc('Strength','Choice Band').max],[54,45,54]);
 assert.equal(calc('Shadow Ball','Choice Band').base,54);
 assert.deepEqual(calc('Crunch','Choice Band'),calc('Crunch','None'));
 assert.deepEqual(calc('Surf','Choice Band'),calc('Surf','None'));
});
test('every type item reuses canonical IDs and boosts only matching ATK/SPA operands',()=>{
 const physical=new Set(['NORMAL','FIGHTING','FLYING','POISON','GROUND','ROCK','BUG','GHOST','STEEL']);
 for(const [item,type] of typeItems) {
  const id=Number(battleItemId(item));assert.ok(id,item);
  const move={id:1,effect:'HIT',power:80,type};
  assert.equal(heldItemAttack(101,item,type,physical.has(type)),item==='Sea Incense'?106:111,item);
  const result=calculateCoreDamage(move,{...mon,item},mon);
  assert.equal(result.base,item==='Sea Incense'?38:40,item);
  assert.deepEqual(calculateCoreDamage(move,{...mon,item:id},mon),result,item);
  const otherType=type==='FIRE'?'WATER':'FIRE',other={...move,type:otherType};
  assert.deepEqual(calculateCoreDamage(other,{...mon,item},mon),calculateCoreDamage(other,mon,mon),item);
 }
 assert.equal(calc('Earthquake','Soft Sand').base,50);
 assert.equal(calc('Surf','Mystic Water').base,47);
 assert.equal(calc('Surf','Sea Incense').base,45);
});
test('Choice Band composes with Huge Power, Guts, Hustle, stages, burn and critical hits in cartridge order',()=>{
 assert.equal(calc('Strength','Choice Band',{ability:'Huge Power'}).base,107);
 assert.equal(calc('Strength','Choice Band',{ability:'Pure Power'}).base,107);
 assert.equal(calc('Strength','Choice Band',{ability:'Guts',status:'burn'}).base,81);
 assert.equal(calc('Strength','Choice Band',{ability:'Hustle'}).base,81);
 assert.equal(calc('Strength','Choice Band',{status:'burn'}).base,28);
 assert.equal(offensiveAbilityModifiers(101,'Huge Power','none','Choice Band').attack,303);
 // 101 ->Huge202 ->Band303 ->+2 stage606; EQ100 vsDEF101 gives subtotal264,+2=266.
 assert.equal(calc('Earthquake','Choice Band',{ability:'Huge Power',stats:{...mon.stats,attack:101},stages:{attack:2}},
  {...mon,stats:{...mon.stats,defense:101}}).base,266);
 assert.equal(calc('Strength','Choice Band',{ability:'Huge Power',stages:{attack:-2}},mon,'none',true).max,214);
 assert.equal(calc('Strength','Choice Band',{ability:'Guts',status:'burn',stages:{attack:2}},mon,'none',true).max,320);
});
test('type items precede Thick Fat/stages, then weather, critical, STAB and effectiveness',()=>{
 const a={types:['WATER']};
 // Mystic Water SpA110; Surf subtotal45 ->rain67,+2=69 ->crit138 ->STAB207.
 const r=calc('Surf','Mystic Water',a,mon,'rain',true);
 assert.deepEqual([r.base,r.min,r.max],[69,175,207]);
 const fire={stats:{...mon.stats,spAttack:101},stages:{spAttack:2}};
 // Charcoal101->111 ->ThickFat55 ->stage110 ->subtotal45,+2=47.
 assert.equal(calc('Flamethrower','Charcoal',fire,{...mon,ability:'Thick Fat'}).base,47);
 assert.equal(calc('Surf','Mystic Water',a,{...mon,ability:'Water Absorb'},'rain',true).max,0);
});
test('both directions and ability scenarios retain each attacker item without item alternatives',()=>{
 const a={...mon,item:'Soft Sand'},d={...mon,item:'Mystic Water'};
 assert.equal(calculateCoreDamage(battleMove('Earthquake'),a,d).base,50);
 assert.equal(calculateCoreDamage(battleMove('Surf'),d,a).base,47);
 const attacker={...mon,dex:184,item:'Choice Band',abilityOptions:opponentAbilityOptions({dex:184})};
 const groups=calculateAbilityScenarios(battleMove('Strength'),attacker,mon).groups;
 assert.deepEqual(groups.map(g=>g.label),['Thick Fat','Huge Power']);assert.deepEqual(groups.map(g=>g.max),[54,107]);
 assert.equal(calculateAbilityScenarios(battleMove('Surf'),attacker,mon).groups.length,1);
 const imported=toBattlePokemon({...readPokemon(makePokemon({heldItemId:Number(battleItemId('Choice Band')),experience:117360})),identity:'imported'});
 assert.equal(imported.item,'Choice Band');
 const importedResult=calculateCoreDamage(battleMove('Strength'),imported,mon);
 assert.ok(importedResult.max>calculateCoreDamage(battleMove('Strength'),{...imported,item:'None'},mon).max);
 const frontier=toTowerOpponent(towerSetById('Furret 2'));
 assert.equal(frontier.item,'Choice Band');
 frontier.abilityOptions=opponentAbilityOptions(frontier);
 const setResult=calculateAbilityScenarios(battleMove('Shadow Ball'),frontier,mon);
 assert.equal(setResult.groups.length,1);
 assert.ok(setResult.groups[0].max>calculateCoreDamage(battleMove('Shadow Ball'),{...frontier,item:'None'},mon).max);
 const unknown=calculateAbilityScenarios(battleMove('Shadow Ball'),{...frontier,item:null},mon);
 assert.equal(unknown.groups.length,1);assert.equal(unknown.groups[0].availability,'unavailable');
});
test('no item preserves prior results, unknown items remain unavailable, and inapplicable specialized items stay neutral',()=>{
 const baseline=calculateCoreDamage(battleMove('Strength'),mon,mon);
 for(const item of [undefined,'None',0,'Leftovers','Soul Dew','Light Ball','Thick Club','DeepSeaTooth','DeepSeaScale'])
  assert.deepEqual(calc('Strength',item),baseline,String(item));
 for(const item of [null,'','Unknown',{},999999])assert.equal(calc('Strength',item),null);
 const before=structuredClone(mon);calc('Strength','Choice Band',mon);assert.deepEqual(mon,before);
});
