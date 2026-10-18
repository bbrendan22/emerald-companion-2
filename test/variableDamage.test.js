import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveVariableMove as resolve} from '../src/battle/variableDamage.js';
import {calculateBasicDamage as calc,basicDamageScenarios,prepareBasicDamage} from '../src/battle/basicDamage.js';
import {battleMove} from '../src/battle/reference.js';
import {toTowerOpponent} from '../src/battle/frontierAdapter.js';
import {frontierPokemon} from '../src/battle/data/frontierPokemon.js';
import {towerBrainSets} from '../src/battle/towerRules.js';
import {frontierTrainers} from '../src/battle/data/frontierTrainers.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';
import {readPokemon} from '../src/save/readPokemon.js';
import {makePokemon} from './fixtures/synthetic.js';
const mon={level:50,types:['NORMAL'],ability:'None',item:'None',stats:{hp:200,attack:100,defense:100,spAttack:200,spDefense:100}};
const ivs=n=>Object.fromEntries(['hp','attack','defense','speed','spAttack','spDefense'].map(k=>[k,n]));
const power=(name,a=mon,d=mon,c={})=>resolve(battleMove(name),a,d,c)?.power;
const range=(name,a=mon,d=mon,c={})=>{const r=calc(battleMove(name),a,d,c);return r&&[r.min,r.max];};
test('Hidden Power independently known six-bit endpoints and each IV position',()=>{
 for(const [n,type,p] of [[0,'FIGHTING',30],[1,'DARK',30],[2,'FIGHTING',70],[31,'DARK',70]]){
  const move=resolve(battleMove('Hidden Power'),{...mon,ivs:ivs(n)},mon);assert.deepEqual([move.type,move.power],[type,p]);
 }
 // One parity bit at a time: floor(bit*15/63), not displayed stat order.
 const expected=['FIGHTING','FIGHTING','FIGHTING','FLYING','GROUND','STEEL'];
 for(const [i,key] of ['hp','attack','defense','speed','spAttack','spDefense'].entries()){
  assert.equal(resolve(battleMove('Hidden Power'),{...mon,ivs:{...ivs(0),[key]:1}},mon).type,expected[i]);
 }
 assert.equal(power('Hidden Power',{...mon,ivs:{...ivs(0),speed:2}}),35); // floor(8*40/63)+30.
 assert.equal(power('Hidden Power',{...mon,ivs:{...ivs(0),spAttack:2}}),40);
 assert.equal(resolve(battleMove('Hidden Power'),mon,mon),null);
});
test('Hidden Power uses resulting physical/special category, STAB and chart before random',()=>{
 // Fighting30: floor(22*30*100/100/50)+2=15; x2 Normal =>30 =>25–30.
 assert.deepEqual(range('Hidden Power',{...mon,ivs:ivs(0)}),[25,30]);
 // Dark70 special: floor(22*70*200/100/50)+2=63 =>53–63.
 assert.deepEqual(range('Hidden Power',{...mon,ivs:ivs(31)}),[53,63]);
 // STAB floor(63*1.5)=94, Psychic weakness188 =>159–188.
 assert.deepEqual(range('Hidden Power',{...mon,types:['DARK'],ivs:ivs(31)},{...mon,types:['PSYCHIC']}),[159,188]);
 assert.equal(prepareBasicDamage(battleMove('Hidden Power'),{...mon,ivs:ivs(0)},mon).category,'Physical');
});
test('exact friendship, integer truncation, minimum1 and player-only missing fallbacks',()=>{
 for(const [f,r,u] of [[0,1,102],[1,1,101],[2,1,101],[3,1,100],[70,28,74],[127,50,51],[254,101,1],[255,102,1]]){
  assert.equal(power('Return',{...mon,friendship:f}),r);assert.equal(power('Frustration',{...mon,friendship:f}),u);
 }
 assert.equal(power('Return'),102);assert.equal(power('Frustration'),102);
 assert.equal(power('Return',{...mon,friendship:null}),102);
 assert.equal(power('Return',{...mon,setId:1}),undefined);
 assert.equal(power('Frustration',{...mon,setId:1}),undefined);
 assert.equal(power('Return',{...mon,friendship:-1}),undefined);
 // Return102: floor44.88+2=46; Normal STAB69 =>58–69. Minimum1 physical base3, STAB4=>3–4.
 assert.deepEqual(range('Return'),[58,69]);assert.deepEqual(range('Return',{...mon,friendship:0}),[3,4]);
 assert.deepEqual(range('Frustration',{...mon,friendship:255}),[3,4]);
});
test('imported exact friendship and IVs survive adaptation without mutation',()=>{
 const raw=makePokemon({friendship:70,ivWord:0});const before=raw.slice();
 const a=toBattlePokemon({...readPokemon(raw),identity:'p'});assert.equal(a.friendship,70);assert.equal(power('Return',a),28);
 assert.equal(power('Frustration',a),74);assert.equal(power('Hidden Power',a),30);assert.deepEqual(raw,before);
});
test('all supported Tower/Anabel sets use verified255 except sets containing Frustration use0',()=>{
 for(const set of [...frontierPokemon,...towerBrainSets]){
  const a=toTowerOpponent(set);assert.equal(a.friendship,set.moves.includes('Frustration')?0:255);
  assert.equal(power('Return',a),set.moves.includes('Frustration')?1:102);
  assert.equal(power('Frustration',a),set.moves.includes('Frustration')?102:1);
  // Uniform31 IVs Dark70; uniform0 Fighting30; others tested below.
 }
 const set=frontierPokemon[0];
 const assumed=toTowerOpponent(set);assert.equal(power('Hidden Power',assumed),70);
 const brain=toTowerOpponent(towerBrainSets[0],undefined,'Anabel');
 assert.equal(brain.ivAssumption.value,24);assert.equal(power('Hidden Power',brain),30);assert.equal(resolve(battleMove('Hidden Power'),brain,mon).type,'FIGHTING');
 const trainer=frontierTrainers.find(t=>t.ivs===3),owned=frontierPokemon.find(s=>trainer.pokemonSetIds.includes(s.id));
 const trained=toTowerOpponent(owned,undefined,`${trainer.trainerClass}:${trainer.name}`);
 assert.equal(power('Hidden Power',trained),70);assert.equal(resolve(battleMove('Hidden Power'),trained,mon).type,'DARK');
});
test('Low Kick every boundary and species weight uses defender, never attacker',()=>{
 for(const [weight,p] of [[.1,20],[9.9,20],[10,40],[24.9,40],[25,60],[49.9,60],[50,80],[99.9,80],[100,100],[199.9,100],[200,120],[460,120]])assert.equal(power('Low Kick',{...mon,weight:999},{...mon,weight}),p);
 for(const [dex,p] of [[25,20],[20,40],[184,60],[9,80],[68,100],[95,120]])assert.equal(power('Low Kick',mon,{...mon,dex}),p);
 assert.equal(power('Low Kick'),undefined);assert.equal(power('Low Kick',mon,{...mon,weight:NaN}),undefined);
 //120 Fighting: base54, Normal x2=108 ->91–108.
 assert.deepEqual(range('Low Kick',mon,{...mon,dex:95}),[91,108]);
});
test('Flail/Reversal all integer HP thresholds, just below/at/above, and low ratio clamp',()=>{
 const a={...mon,stats:{...mon.stats,hp:480}};
 for(const [hp,p] of [[1,200],[19,200],[20,150],[49,150],[50,100],[99,100],[100,80],[169,80],[170,40],[329,40],[330,20],[480,20]]){
  for(const name of ['Flail','Reversal'])assert.equal(power(name,a,mon,{attacker:{currentHp:hp}}),p,`${name} HP${hp}`);
 }
 assert.equal(power('Flail',a,mon,{attacker:{currentHp:0}}),undefined);
 assert.equal(power('Flail',a,mon,{attacker:{currentHp:481}}),undefined);
 assert.equal(power('Flail',{...mon,currentHp:1}),200);
 assert.equal(power('Flail',{...mon,currentHp:1,initialCurrentHp:200}),20);
 // P200 base90; Flail STAB135=>114–135; Reversal weakness180=>153–180.
 assert.deepEqual(range('Flail',mon,mon,{attacker:{currentHp:1}}),[114,135]);
 assert.deepEqual(range('Reversal',mon,mon,{attacker:{currentHp:1}}),[153,180]);
});
test('variable moves reuse stages, burn, screens, critical, weather, items and ability branches',()=>{
 // Return102 +1Atk=150: base69; STAB103=>87–103, no double staging.
 assert.deepEqual(range('Return',mon,mon,{attacker:{stages:{attack:1}}}),[87,103]);
 assert.deepEqual(range('Return',mon,mon,{attacker:{status:'burn'}}),[30,36]);
 assert.deepEqual(range('Return',mon,mon,{defender:{screens:{reflect:true}}}),[30,36]);
 assert.deepEqual(range('Return',mon,mon,{critical:true}),[117,138]);
 assert.deepEqual(range('Return',{...mon,item:'Choice Band'}),[87,103]);
 const a={...mon,types:['FIGHTING'],ability:'Swarm',ivs:ivs(0)};
 // Reversal200 Fighting STAB floor90*1.5=135; Normal weakness270.
 assert.deepEqual(range('Reversal',a,mon,{attacker:{currentHp:1}}),[229,270]);
 const hpIce={...mon,ivs:{...ivs(31),hp:30,attack:30,defense:30},types:['ICE']}; // bits56 =>Ice70.
 assert.deepEqual(basicDamageScenarios(battleMove('Hidden Power'),hpIce,{...mon,ability:'Thick Fat / Immunity'}).map(g=>[g.label,g.result.min,g.result.max]),[['Thick Fat',40,48],['Immunity',79,94]]);
 const hpBug={...mon,types:['BUG'],ability:'Swarm',ivs:{...ivs(2),speed:3,spAttack:3}};
 assert.deepEqual(range('Hidden Power',hpBug,mon,{attacker:{currentHp:1}}),[61,72]);
 const hpFire={...mon,ivs:{...ivs(2),spDefense:3,defense:3},types:['FIRE']}; //bits36=>Fire70.
 assert.equal(resolve(battleMove('Hidden Power'),hpFire,mon).type,'FIRE');
 assert.deepEqual(range('Hidden Power',hpFire,mon,{weather:'sun'}),[118,139]);
});
test('both directions use their own inputs; later special moves remain excluded',()=>{
 assert.deepEqual(range('Return',mon,{...mon,stats:{...mon.stats,defense:200}}),[30,36]);
 assert.deepEqual(range('Return',{...mon,stats:{...mon.stats,attack:200}},mon),[115,136]);
 for(const name of ['Magnitude','Psywave','Endeavor','Double Kick','Guillotine'])assert.equal(calc(battleMove(name),mon,mon),null,name);
});
