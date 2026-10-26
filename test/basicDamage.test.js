import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareBasicDamage,basicBaseDamage,basicDamageRolls,calculateBasicDamage,formatBasicDamage} from '../src/battle/basicDamage.js';
import {battleMove} from '../src/battle/reference.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';
import {readPokemon} from '../src/save/readPokemon.js';
import {makePokemon} from './fixtures/synthetic.js';
import {toTowerOpponent} from '../src/battle/frontierAdapter.js';
import {towerSetById} from '../src/battle/towerSets.js';
import {createTowerRules} from '../src/battle/towerRules.js';
const mon={level:50,types:['ELECTRIC'],stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const calc=(name,a=mon,d=mon)=>calculateBasicDamage(battleMove(name),a,d);

test('physical base 37: 22 × 80 × 100 / 100 / 50 truncates to 35, then +2; all 16 rolls',()=>{
 const r=calc('Strength');assert.equal(r.base,37);
 assert.deepEqual(r.rolls,[31,31,32,32,32,33,33,34,34,34,35,35,35,36,36,37]);
 assert.equal(formatBasicDamage(r),'15.5–18.5% · 31–37 HP');
});
test('Gen 3 uses physical Ghost and special Dark, independent of modern move categories',()=>{
 const a={...mon,stats:{...mon.stats,attack:300}},d={...mon,stats:{...mon.stats,spDefense:200}};
 // Shadow Ball: floor(5280/50)+2=107. Crunch: floor(880/50)+2=19.
 assert.deepEqual([calc('Shadow Ball',a,d).min,calc('Shadow Ball',a,d).max],[90,107]);
 assert.deepEqual([calc('Crunch',a,d).min,calc('Crunch',a,d).max],[16,19]);
 for(const type of ['NORMAL','FIGHTING','FLYING','POISON','GROUND','ROCK','BUG','GHOST','STEEL'])assert.equal(prepareBasicDamage({...battleMove('Strength'),type},a,d).category,'Physical');
 for(const type of ['FIRE','WATER','GRASS','ELECTRIC','PSYCHIC','ICE','DRAGON','DARK'])assert.equal(prepareBasicDamage({...battleMove('Strength'),type},a,d).category,'Special');
});
test('level and integer boundaries use hand-worked base values',()=>{
 // Lv47: factor20, floor(280000/82)=3414, floor(/50)=68 =>70.
 const a={...mon,level:47,stats:{...mon.stats,attack:140}},d={...mon,stats:{...mon.stats,defense:82}};
 const move={...battleMove('Strength'),power:100};
 assert.equal(calculateBasicDamage(move,a,d).base,70);
 assert.deepEqual(calculateBasicDamage(move,a,d).rolls,[59,60,60,61,62,63,63,64,65,65,66,67,67,68,69,70]);
 // Lv48 crosses the level-factor boundary: floor(294000/82)/50 =>71,+2=73.
 assert.equal(calculateBasicDamage(move,{...a,level:48},d).base,73);
 // Lv73 special: 31*95*137=403465; /113 =>3570; /50 =>71; +2 =>73.
 assert.deepEqual([calc('Ice Beam',{...mon,level:73,stats:{...mon.stats,spAttack:137}},{...mon,stats:{...mon.stats,spDefense:113}}).min,
 calc('Ice Beam',{...mon,level:73,stats:{...mon.stats,spAttack:137}},{...mon,stats:{...mon.stats,spDefense:113}}).max],[62,73]);
});
test('Emerald physical subtotal minimum differs from special before +2; final random damage remains positive',()=>{
 const input={level:1,power:20,attack:1,defense:999};
 assert.equal(basicBaseDamage({...input,category:'Physical'}),3);
 assert.equal(basicBaseDamage({...input,category:'Special'}),2);
 assert.deepEqual(basicDamageRolls(2),[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2]);
});
test('unsupported moves and incomplete data omit results instead of inventing damage',()=>{
 for(const name of ['Growl','Hidden Power','Counter','Psywave','Guillotine','Explosion','Double Kick','Fury Attack','False Swipe','Future Sight','Struggle'])assert.equal(calc(name),null,name);
 assert.equal(calculateBasicDamage(null,mon,mon),null);assert.equal(calc('Strength',null),null);assert.equal(calc('Strength',mon,null),null);
 for(const level of [0,101,1.5,NaN])assert.equal(calc('Strength',{...mon,level}),null);
 for(const defense of [0,-1,NaN,Infinity])assert.equal(calc('Strength',mon,{...mon,stats:{...mon.stats,defense}}),null);
 assert.equal(calculateBasicDamage({...battleMove('Strength'),effect:'UNKNOWN'},mon,mon),null);
 assert.equal(calculateBasicDamage({...battleMove('Strength'),type:'???'},mon,mon),null);
});
test('modifier fields on raw Pokémon are ignored without explicit conditions; inputs stay untouched',()=>{
 const a={...mon,types:['ELECTRIC'],ability:'None',item:'None',status:'burn',stages:{attack:6,spAttack:6},weather:'sun',critical:true,currentHp:1};
 const d={...mon,types:['ELECTRIC'],ability:'None',item:'Focus Band',screens:{reflect:true,lightScreen:true},stages:{defense:6,spDefense:6},currentHp:1};
 const before=structuredClone({a,d});
 assert.deepEqual(calc('Strength',a,d),calc('Strength'));assert.deepEqual(calc('Surf',a,d),calc('Surf'));
 assert.deepEqual({a,d},before);
 assert.equal(formatBasicDamage({min:85,max:101,maximumHp:175}),'48.6–57.7% · 85–101 HP');
});
test('real save/Frontier adapters in both directions and Open Level use independent literal ranges',()=>{
 const player=toBattlePokemon({...readPokemon(makePokemon({species:1,pid:0,experience:117360})),identity:'p'});
 const set=towerSetById('Azumarill 1'),enemy=toTowerOpponent(set),open=toTowerOpponent(set,createTowerRules({levelMode:'open',openLevel:73}));
 // Player Atk69 Lv50, Tackle35 vs Def132: floor(53130/132)/50 +2=10.
 assert.equal(formatBasicDamage(calc('Tackle',player,enemy)),'4.6–5.7% · 8–10 HP');
 // STAB37 then Grass resistance18; Enemy SpA70 Lv50, Bubble Beam65 vs SpD85: 100100/85 =>1177,/50 =>23,+2=25.
 assert.equal(formatBasicDamage(calc('Bubble Beam',enemy,player)),'12.5–15.0% · 15–18 HP');
 // STAB73 then Grass resistance36; Open73 SpA100 =>201500/85 =>2370,/50 =>47,+2=49.
 assert.equal(formatBasicDamage(calc('Bubble Beam',open,player)),'25.0–30.0% · 30–36 HP');
 assert.equal(formatBasicDamage(calc('Tackle',player,open)),'2.0–2.8% · 5–7 HP');
});
