import test from 'node:test';
import assert from 'node:assert/strict';
import {applyCoreDamageModifiers,calculateCoreDamage} from '../src/battle/coreDamage.js';
import {battleMove} from '../src/battle/reference.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';
import {readPokemon} from '../src/save/readPokemon.js';
import {makePokemon} from './fixtures/synthetic.js';
import {toTowerOpponent} from '../src/battle/frontierAdapter.js';
import {towerSetById} from '../src/battle/towerSets.js';
import {createTowerRules} from '../src/battle/towerRules.js';

// Independent hand-worked expectations following Emerald's cartridge routines:
// https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c
// Cmd_typecalc, ModulateDmgByType, ApplyRandomDmgMultiplier; chart/table order:
// https://github.com/pret/pokeemerald/blob/master/src/battle_main.c (gTypeEffectiveness).
// Expected arrays below are literal fixtures, not outputs from another engine.
const base = value => ({kind:'neutral-base',base:value,category:'Special'});
const modify = (value,type,own,other) => applyCoreDamageModifiers(base(value),type,own,other);
const mon={level:50,types:['ELECTRIC'],stats:{attack:100,defense:100,spAttack:100,spDefense:100}};

test('non-STAB and STAB retain all 16 rolls, including duplicate outcomes',()=>{
 // Strength: floor(floor(22*80*100/100)/50)+2=37; Normal STAB => floor(55.5)=55.
 const move=battleMove('Strength');
 const plain=calculateCoreDamage(move,mon,mon);
 assert.deepEqual(plain.rolls,[31,31,32,32,32,33,33,34,34,34,35,35,35,36,36,37]);
 assert.equal(plain.stab,1);assert.equal(plain.effectiveness,1);
 assert.equal(plain.min,31);assert.equal(plain.max,37);
 const stab=calculateCoreDamage(move,{...mon,types:['NORMAL']},mon);
 assert.deepEqual(stab.rolls,[46,47,47,48,48,49,50,50,51,51,52,52,53,53,54,55]);
 assert.equal(stab.stab,1.5);assert.equal(stab.min,46);assert.equal(stab.max,55);
 for(const types of [['NORMAL','FLYING'],['FLYING','NORMAL'],['NORMAL','NORMAL']])
  assert.deepEqual(calculateCoreDamage(move,{...mon,types},mon),stab);
});

test('all effectiveness products including quarter/fourfold and Gen III Steel resistances',()=>{
 for(const [type,types,effectiveness,max] of [
  ['FIRE',['GRASS'],2,74],['FIRE',['WATER'],0.5,18],
  ['FIRE',['GRASS','STEEL'],4,148],['FIRE',['WATER','DRAGON'],0.25,9],
  ['FIRE',['WATER','GRASS'],1,36],['FIRE',['GRASS','WATER'],1,36],
  ['GHOST',['STEEL'],0.5,18],['DARK',['STEEL'],0.5,18],
  ['GHOST',['GHOST','STEEL'],1,36],['FIRE',['WATER','WATER'],0.5,18],
 ]) {
  const result=modify(37,type,['NORMAL'],types);
  assert.equal(result.effectiveness,effectiveness);assert.equal(result.max,max);
 }
});

test('every Gen III type immunity yields 16 zeroes, including dual-type weaknesses',()=>{
 for(const [type,types] of [
  ['NORMAL',['GHOST']],['FIGHTING',['NORMAL','GHOST']],
  ['POISON',['GRASS','STEEL']],['GROUND',['ROCK','FLYING']],
  ['ELECTRIC',['WATER','GROUND']],['PSYCHIC',['POISON','DARK']],['GHOST',['NORMAL','PSYCHIC']],
 ]) {
  const result=modify(37,type,[type],types);
  assert.equal(result.stab,1.5);assert.equal(result.effectiveness,0);
  assert.deepEqual(result.rolls,Array(16).fill(0));
  assert.equal(result.min,0);assert.equal(result.max,0);
 }
});

test('STAB truncates before type modifiers; table order and minimum-one precede random',()=>{
 // 37 -> STAB55 -> Water resistance27 -> random22..27.
 assert.deepEqual(modify(37,'FIRE',['FIRE'],['WATER']).rolls,
  [22,23,23,23,24,24,24,24,25,25,25,25,26,26,26,27]);
 // Fire table processes Water before Grass, regardless of defender type slots:
 // 3 -> floor(3/2)=1 -> 2, rather than combining the modifiers into 1x.
 for(const types of [['WATER','GRASS'],['GRASS','WATER']])
  assert.deepEqual(modify(3,'FIRE',['NORMAL'],types).rolls,[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2]);
 // 3 -> half1 -> half0 clamped1 -> each random roll clamped1.
 assert.deepEqual(modify(3,'FIRE',['NORMAL'],['WATER','DRAGON']).rolls,Array(16).fill(1));
});

test('actual save and Frontier adapters use their own types, stats and levels in both directions',()=>{
 const player=toBattlePokemon({...readPokemon(makePokemon({species:1,pid:0,experience:117360})),identity:'p'});
 const set=towerSetById('Azumarill 1'),enemy=toTowerOpponent(set);
 const open=toTowerOpponent(set,createTowerRules({levelMode:'open',openLevel:73}));
 // Lv50 Atk69 Tackle35 vs Def132: 53130/132=>402,/50=>8,+2=>10, no STAB.
 const outgoing=calculateCoreDamage(battleMove('Tackle'),player,enemy);
 assert.deepEqual(outgoing.rolls,[8,8,8,8,8,9,9,9,9,9,9,9,9,9,9,10]);
 assert.equal(outgoing.stab,1);assert.equal(outgoing.effectiveness,1);
 // Lv50 SpA70 Bubble Beam65 vs SpD85: base25, STAB37, Grass resistance18.
 const incoming=calculateCoreDamage(battleMove('Bubble Beam'),enemy,player);
 assert.deepEqual(incoming.rolls,[15,15,15,15,16,16,16,16,16,16,17,17,17,17,17,18]);
 assert.equal(incoming.stab,1.5);assert.equal(incoming.effectiveness,0.5);
 // Open Lv73 SpA100: base49 -> STAB73 -> resistance36 -> random30..36.
 const higher=calculateCoreDamage(battleMove('Bubble Beam'),open,player);
 assert.deepEqual(higher.rolls,[30,30,31,31,32,32,32,33,33,33,34,34,34,35,35,36]);
 assert.equal(player.level,50);
});

test('missing/uncertain/invalid types preserve unavailable, without mutating inputs or applying later mechanics',()=>{
 for(const types of [undefined,null,[],['FAIRY'],['NORMAL',null],['normal'],['NORMAL','WATER','FIRE'],Array(1)]) {
  assert.equal(calculateCoreDamage(battleMove('Strength'),{...mon,types},mon),null);
  assert.equal(calculateCoreDamage(battleMove('Strength'),mon,{...mon,types}),null);
 }
 assert.equal(calculateCoreDamage(battleMove('Strength'),mon,null),null);
 assert.equal(calculateCoreDamage(battleMove('Growl'),mon,mon),null);
 assert.equal(calculateCoreDamage(battleMove('Hidden Power'),mon,mon),null);
 assert.equal(calculateCoreDamage(battleMove('Strength'),mon,{...mon,stats:{defense:'90–100'}}),null);
 assert.equal(applyCoreDamageModifiers(null,'NORMAL',['NORMAL'],['NORMAL']),null);
 const attacker={...mon,ability:'Inner Focus',item:'Leftovers',weather:'sun',critical:true,status:'poison',stages:{speed:6}};
 const defender={...mon,ability:'Inner Focus',item:'Focus Band',stages:{speed:-6},screens:{reflect:false}};
 const before=structuredClone({attacker,defender});
 assert.deepEqual(calculateCoreDamage(battleMove('Strength'),attacker,defender),calculateCoreDamage(battleMove('Strength'),mon,mon));
 assert.deepEqual({attacker,defender},before);
});
