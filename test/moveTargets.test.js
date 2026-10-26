import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {battleMove} from '../src/battle/reference.js';
import {moveResources} from '../src/battle/data/moveResources.js';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {isUnsupportedSpecialMove} from '../src/battle/moveDamagePolicy.js';
// Independent canonical-table fingerprint, pret/pokeemerald revision
// 731ad5bfd6e6f265508d0efcca0ba42f9dcf5881: battle_moves.h + constants/moves.h.
const all=()=>Array.from({length:354},(_,i)=>battleMove(i+1));
const counts={MOVE_TARGET_SELECTED:246,MOVE_TARGET_BOTH:22,MOVE_TARGET_USER:67,MOVE_TARGET_RANDOM:4,MOVE_TARGET_DEPENDS:9,MOVE_TARGET_FOES_AND_ALLY:5,MOVE_TARGET_OPPONENTS_FIELD:1};
const spread=[13,51,57,59,75,129,145,157,181,196,239,257,284,304,314,323,330];
const mon={level:50,dex:143,types:['NORMAL'],ability:'Immunity',item:'None',currentHp:120,friendship:255,ivs:{hp:31,attack:31,defense:31,spAttack:31,spDefense:31,speed:31},stats:{hp:200,attack:101,defense:103,spAttack:101,spDefense:103}};

test('all 354 reference moves expose the exact pinned Emerald target table without gaps or defaults',()=>{
 const moves=all();assert.equal(Object.keys(moveResources).length,354);
 assert.deepEqual(moves.reduce((c,m)=>(c[m.target]=(c[m.target]??0)+1,c),{}),counts);
 for(const move of moves){assert.ok(Object.hasOwn(counts,move.target),move.name);assert.equal(move.target,moveResources[move.id].target);assert.equal(battleMove(move.name).target,move.target);}
 const hash=createHash('sha256').update(JSON.stringify(moves.map(m=>[m.id,m.target]))).digest('hex');
 assert.equal(hash,'a782472996b34eb15fcb1eeb3ab7639f40c7664cb6ddb80694926f13739021c1');
 assert.equal(battleMove(0),null);assert.equal(battleMove(355),null);
});
test('the 17 damaging both-opponent moves are exactly the approved Gen III spread candidates',()=>{
 const actual=all().filter(m=>m.target==='MOVE_TARGET_BOTH'&&m.power>0);
 assert.deepEqual(actual.map(m=>m.id),spread);
 assert.deepEqual(actual.map(m=>m.name),['Razor Wind','Acid','Surf','Blizzard','Razor Leaf','Swift','Bubble','Rock Slide','Powder Snow','Icy Wind','Twister','Heat Wave','Eruption','Hyper Voice','Air Cutter','Water Spout','Muddy Water']);
});
test('Earthquake, Magnitude, Explosion and Selfdestruct target foes and ally, never both-opponent spread',()=>{
 const moves=all().filter(m=>m.target==='MOVE_TARGET_FOES_AND_ALLY'&&m.power>0);
 assert.deepEqual(moves.map(m=>m.id),[89,120,153,222]);
 assert.deepEqual(moves.map(m=>m.name),['Earthquake','Self Destruct','Explosion','Magnitude']);
 for(const move of moves)assert.ok(!spread.includes(move.id));
 assert.equal(battleMove('Teeter Dance').target,'MOVE_TARGET_FOES_AND_ALLY');assert.equal(battleMove('Teeter Dance').power,0);
});
test('representative selected-target attacks retain canonical targeting across damage families',()=>{
 for(const name of ['Pound','Thunderbolt','Hidden Power','Weather Ball','DoubleSlap','Triple Kick','Seismic Toss','Guillotine','Struggle','Curse'])assert.equal(battleMove(name).target,'MOVE_TARGET_SELECTED',name);
});
test('random-opponent moves retain Gen III flags rather than becoming spread attacks',()=>{
 assert.deepEqual(all().filter(m=>m.target==='MOVE_TARGET_RANDOM').map(m=>m.name),['Thrash','Petal Dance','Outrage','Uproar']);
});
test('status and special script targets preserve their raw Emerald classification',()=>{
 assert.deepEqual(all().filter(m=>m.target==='MOVE_TARGET_BOTH'&&m.power===0).map(m=>m.name),['Tail Whip','Leer','Growl','String Shot','Sweet Scent']);
 for(const name of ['Reflect','Light Screen','Helping Hand','Haze','Perish Song','Bide'])assert.equal(battleMove(name).target,'MOVE_TARGET_USER',name);
 for(const name of ['Counter','Mirror Coat','Metronome','Mirror Move','Sleep Talk','Nature Power','Assist','Magic Coat','Snatch'])assert.equal(battleMove(name).target,'MOVE_TARGET_DEPENDS',name);
 assert.equal(battleMove('Spikes').target,'MOVE_TARGET_OPPONENTS_FIELD');
});
test('every supported damaging move has target metadata; eligibility remains unchanged',()=>{
 const supported=[];
 for(const move of all().filter(m=>m.power>0)) {
  const result=calculateCoreDamage(move,mon,{...mon,currentHp:200});
  if(isUnsupportedSpecialMove(move)){assert.equal(result,null,move.name);continue;}
  assert.ok(result,move.name);assert.ok(Object.hasOwn(counts,move.target),move.name);supported.push(move.id);
 }
 assert.equal(supported.length,209);
});
test('adding target metadata leaves complete Singles and Doubles results unchanged for all 354 moves',()=>{
 // Deliberately include active screens, criticals, weather, stages and selected
 // multi-hits. This step adds data only, not spread or Helping Hand arithmetic.
 for(const move of all())for(const format of ['Singles','Doubles'])for(const weather of ['none','sun','rain','sand','hail'])for(const critical of [false,true])for(const screens of [false,true]) {
  const {target,...previousMove}=move;
  const attacker={...mon,stages:{attack:-1,spAttack:-1}},defender={...mon,stages:{defense:1,spDefense:1},screens:{reflect:screens,lightScreen:screens}};
  const context={format,defenderSideAlive:2,hitCount:3};
  assert.deepEqual(calculateCoreDamage(move,attacker,defender,weather,critical,context),calculateCoreDamage(previousMove,attacker,defender,weather,critical,context),`${move.name} ${format} ${weather} critical=${critical} screens=${screens}`);
 }
});
