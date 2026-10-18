import test from 'node:test';
import assert from 'node:assert/strict';
import {battleMove} from '../src/battle/reference.js';
import {calculateBasicDamage as calc,basicDamageScenarios,prepareBasicDamage} from '../src/battle/basicDamage.js';
import {toTowerOpponent} from '../src/battle/frontierAdapter.js';
import {towerSetById} from '../src/battle/towerSets.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';
import {readPokemon} from '../src/save/readPokemon.js';
import {expForLevel} from '../src/save/stats.js';
import {makePokemon} from './fixtures/synthetic.js';
const mon={level:50,types:['GROUND'],ability:'None',item:'None',stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const target={...mon,types:['NORMAL']};
const range=r=>r&&[r.min,r.max];
test('Earthquake89 has correct reference metadata and physical input preparation',()=>{
 const m=battleMove('Earthquake');assert.deepEqual([m.id,m.power,m.type,m.effect],[89,100,'GROUND','EARTHQUAKE']);
 const p=prepareBasicDamage(m,{...mon,stats:{...mon.stats,spAttack:900}},{...target,stats:{...target.stats,spDefense:900}});
 assert.deepEqual([p.attack,p.defense,p.category,p.power,p.stab],[100,100,'Physical',100,true]);
 assert.deepEqual(range(calc(m,mon,target)),[58,69]); // base46; Ground STAB69;85..100%.
});
test('exact Lv47 imported Swampert vs actual Lv50 Azurill1 produces all16 independent rolls',()=>{
 const raw=makePokemon({species:285,pid:0,experience:expForLevel(47,'GROWTH_MEDIUM_SLOW')});
 const a=toBattlePokemon({...readPokemon(raw),identity:'swampert'}),d=toTowerOpponent(towerSetById('Azurill 1'));
 assert.equal(a.level,47);assert.equal(a.stats.attack,122);assert.equal(d.stats.defense,60);assert.equal(d.stats.hp,157);
 // factor20; floor(floor20*100*122/60)/50=81;+2=83;STAB124;neutralNormal.
 const groups=basicDamageScenarios(battleMove('Earthquake'),a,d);assert.equal(groups.length,1); // ThickFat/HugePower do not alter Ground damage.
 assert.deepEqual(groups[0].result.rolls,[105,106,107,109,110,111,112,114,115,116,117,119,120,121,122,124]);
});
test('Earthquake Flying and Levitate immunity, alternatives, and both directions',()=>{
 const move=battleMove('Earthquake');
 for(const d of [{...target,types:['FLYING']},{...target,types:['ROCK','FLYING']},{...target,ability:'Levitate'}])assert.deepEqual(range(calc(move,mon,d)),[0,0]);
 assert.deepEqual(basicDamageScenarios(move,mon,{...target,ability:'Levitate / Pressure'}).map(g=>[g.label,...range(g.result)]),[['Levitate',0,0],['Pressure',58,69]]);
 assert.deepEqual(range(calc(move,target,mon)),[39,46]); // reverse noSTAB.
});
test('Earthquake reuses conditions/items once without changing state or adding mechanics',()=>{
 const m=battleMove('Earthquake'),c={attacker:{stages:{attack:1}},defender:{screens:{reflect:true}}},before=structuredClone(c);
 // Atk100->Band150->stage225;subtotal99;Reflect49;+2=51;STAB76.
 assert.deepEqual(range(calc(m,{...mon,item:'Choice Band'},target,c)),[64,76]);
 assert.deepEqual(range(calc(m,mon,target,{attacker:{status:'burn'}})),[30,36]); //44/2+2=24;STAB36.
 assert.deepEqual(range(calc(m,mon,target,{critical:true,defender:{screens:{reflect:true}}})),[117,138]);
 assert.deepEqual(c,before);
});
test('all named ordinary attack families use literal ordinary-formula damage',()=>{
 const a={...mon,types:['NORMAL']};
 for(const [name,min,max] of [['Surf',36,43],['Ice Beam',36,43],['Thunderbolt',36,43],['Flamethrower',36,43],['Rock Slide',29,35],['Shadow Ball',31,37]])assert.deepEqual(range(calc(battleMove(name),a,name==='Shadow Ball'?{...target,types:['ELECTRIC']}:target)),[min,max],name);
 for(const [name,min,max] of [['Mega Drain',16,19],['Giga Drain',23,28],['Take Down',51,61],['Double Edge',68,81],['Hyper Beam',86,102],['Overheat',53,63],['Superpower',91,108],['Thunder',45,54],['Sky Uppercut',66,78],['Gust',16,19],['Twister',16,19],['Stomp',38,45],['Bind',10,12]]){
  assert.deepEqual(range(calc(battleMove(name),a,target)),[min,max],name);
 }
});
test('real formula/state exceptions remain excluded, including Struggle sharing RECOIL',()=>{
 for(const name of ['Struggle','Uproar','Explosion','Self Destruct','SolarBeam','Pursuit','Revenge','False Swipe','Dream Eater','Snore','Fake Out','Focus Punch','Dig','Fly','Double Kick','Magnitude','Counter','Mirror Coat','Guillotine','Psywave','Endeavor'])assert.equal(calc(battleMove(name),mon,target),null,name);
 assert.equal(calc({...battleMove('Earthquake'),effect:'UNREVIEWED'},mon,target),null);
});
