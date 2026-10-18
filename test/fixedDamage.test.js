import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateFixedDamage,isFixedDamageMove} from '../src/battle/fixedDamage.js';
import {calculateBasicDamage,basicDamageScenarios,formatBasicDamage} from '../src/battle/basicDamage.js';
import {battleMove} from '../src/battle/reference.js';
import {toTowerOpponent} from '../src/battle/frontierAdapter.js';
import {towerSetById} from '../src/battle/towerSets.js';
import {createTowerRules} from '../src/battle/towerRules.js';
const a={level:47,dex:1,types:['NORMAL'],ability:'None',item:'None',stats:{hp:160,attack:100,defense:100,spAttack:100,spDefense:100},currentHp:160};
const d={...a,level:50,types:['WATER'],stats:{...a.stats,hp:200},currentHp:200};
const moves=[69,101,82,49,162];
const calc=(id,own=a,other=d,conditions={})=>calculateBasicDamage(battleMove(id),own,other,conditions);

test('Seismic Toss/Night Shade use actual level47/50/100, not offensive stats or RNG',()=>{
 for(const id of [69,101])for(const level of [47,50,100]){
  const r=calc(id,{...a,level});assert.deepEqual(r.rolls,[level]);assert.equal(r.min,level);assert.equal(r.max,level);assert.equal(r.fixed,true);
  assert.equal(formatBasicDamage(r),`${(level/2).toFixed(1)}% · ${level} HP`);
 }
 assert.equal(formatBasicDamage(calc(69,{...a,level:50})),'25.0% · 50 HP');
});
test('Dragon Rage40 and SonicBoom20 remain exact against every nonimmune resistance/weakness',()=>{
 for(const types of [['NORMAL'],['DRAGON'],['STEEL'],['ROCK','STEEL']]){
  assert.equal(calc(82,a,{...d,types}).min,40);
  assert.equal(calc(49,a,{...d,types}).min,20);
 }
 assert.equal(formatBasicDamage(calc(82,a,{...d,stats:{hp:160}})),'25.0% · 40 HP');
 assert.equal(calc(69,a,{...d,types:['NORMAL','ROCK']}).min,47); // 4x Fighting is not188.
 assert.equal(calc(101,a,{...d,types:['GHOST','PSYCHIC']}).min,47); // 4x Ghost is not188.
});
test('Super Fang floors current HP, minimum1 on a living target, percentage uses max HP',()=>{
 for(const [hp,damage] of [[200,100],[101,50],[100,50],[3,1],[2,1],[1,1]]){
  const r=calc(162,a,d,{defender:{currentHp:hp}});assert.deepEqual(r.rolls,[damage]);
  assert.equal(formatBasicDamage(r),`${(damage/2).toFixed(1)}% · ${damage} HP`);
 }
 for(const hp of [0,-1,201,1.5,NaN,Infinity])assert.equal(calc(162,a,d,{defender:{currentHp:hp}}),null);
 assert.equal(calc(162,a,{...d,currentHp:81}).min,40);
 assert.equal(calc(162,a,{...d,currentHp:81}, {defender:{currentHp:21}}).min,10);
});
test('each script preserves its relevant chart immunity, not ordinary type multipliers',()=>{
 for(const [id,types] of [[69,['GHOST']],[69,['ROCK','GHOST']],[101,['NORMAL']],[101,['NORMAL','PSYCHIC']],[49,['GHOST']],[162,['GHOST']]]){
  const r=calc(id,a,{...d,types});assert.deepEqual(r.rolls,[0]);assert.equal(formatBasicDamage(r),'0.0% · 0 HP');
 }
 // Dragon has no chart immunity among the17 Gen3 types; Steel resistance does not reduce40.
 assert.equal(calc(82,a,{...d,types:['STEEL']}).min,40);
 for(const types of [['ROCK'],['STEEL'],['ROCK','STEEL']])assert.equal(calc(162,a,{...d,types}, {defender:{currentHp:101}}).min,50);
});
test('STAB, stats, stages, critical, weather, burn, screens and item boosts cannot modify fixed damage',()=>{
 const conditions={weather:'sun',critical:true,attacker:{status:'burn',stages:{attack:6,spAttack:6}},defender:{stages:{defense:-6,spDefense:-6},screens:{reflect:true,lightScreen:true},currentHp:101}};
 for(const [id,damage] of [[69,47],[101,47],[82,40],[49,20],[162,50]]){
  for(const item of ['Choice Band','Black Belt','Spell Tag','Dragon Fang','Silk Scarf','Light Ball','Thick Club','DeepSeaTooth']){
   const own={...a,dex:25,types:[battleMove(id).type],item,ability:'Huge Power',stats:{hp:1,attack:NaN,spAttack:NaN}};
   const other={...d,item:'Metal Powder',ability:'Thick Fat',stats:{hp:200,defense:NaN,spDefense:NaN}};
   assert.equal(calc(id,own,other,conditions).min,damage,`${id}/${item}`);
  }
 }
});
test('already-supported ability immunities apply only to matching types; SonicBoom bypasses Gen3 Soundproof',()=>{
 for(const ability of ['Levitate','Water Absorb','Volt Absorb','Flash Fire','Battle Armor','Shell Armor','Thick Fat','Marvel Scale','Soundproof','Sturdy'])
  for(const [id,damage] of [[69,47],[101,47],[82,40],[49,20],[162,100]])assert.equal(calc(id,a,{...d,ability}).min,damage,`${id}/${ability}`);
 // None of these five moves uses Ground/Water/Electric/Fire, so the Step5 absorb/Levitate gates do not block them.
 assert.equal(calc(49,a,{...d,ability:'Soundproof'}).min,20);
 for(const id of moves){
  assert.equal(calc(id,a,{...d,ability:'Wonder Guard'}),null); // Step5 unsupported boundary is retained.
  assert.equal(calc(id,{...a,ability:'Trace'}),null);
 }
});
test('Forecast and suppression affect only immunity; uncertain abilities combine or split without averaging',()=>{
 const cast={...d,dex:351,types:['NORMAL'],ability:'Forecast'};
 assert.equal(calc(101,a,cast).min,0);
 assert.equal(calc(101,a,cast,{weather:'rain'}).min,47);
 assert.equal(calc(101,{...a,ability:'Cloud Nine'},cast,{weather:'rain'}).min,0);
 const own={...a,ability:'Cloud Nine / Damp'};
 const groups=basicDamageScenarios(battleMove(101),own,cast,{weather:'rain'});
 assert.deepEqual(groups.map(g=>[g.label,g.result.min]),[['Cloud Nine',0],['Damp',47]]);
 assert.equal(basicDamageScenarios(battleMove(82),own,cast,{weather:'rain'}).length,1);
});
test('stable IDs select exactly five moves; display names/effect strings cannot enable another special move',()=>{
 assert.deepEqual(moves.map(id=>isFixedDamageMove(battleMove(id))),[true,true,true,true,true]);
 assert.equal(calculateFixedDamage({...battleMove(69),name:'renamed',type:'NORMAL'},a,{...d,types:['GHOST']} ).min,0); // canonical Fighting type from ID.
 assert.equal(calculateFixedDamage({...battleMove(94),name:'Seismic Toss',effect:'LEVEL_DAMAGE'},a,d),null);
 for(const name of ['Hidden Power','Psywave','Endeavor','Guillotine'])assert.equal(calculateBasicDamage(battleMove(name),a,d),null,name);
});
test('fixed paths are informational: Focus Band/raw HP are unchanged and no survival or recovery is simulated',()=>{
 for(const id of moves){
  const own=structuredClone(a),other={...structuredClone(d),item:'Focus Band',currentHp:1},conditions={defender:{currentHp:1}},before=structuredClone({own,other,conditions});
  const r=calc(id,own,other,conditions);assert.equal(r.min,id===69||id===101?47:id===82?40:id===49?20:1);
  assert.deepEqual({own,other,conditions},before);
 }
});
test('both directions and Level50/OpenLevel use the actual selected attacker level',()=>{
 const set=towerSetById('Dusclops 1'),level50=toTowerOpponent(set),open=toTowerOpponent(set,createTowerRules({levelMode:'open',openLevel:100}));
 assert.equal(calc(69,a,{...level50,types:['WATER']}).min,47);
 assert.equal(calc(101,level50,{...a,types:['WATER']}).min,50);
 assert.equal(calc(101,open,{...a,types:['WATER']}).min,100);
 assert.equal(calc(69,a,{...open,types:['WATER']}).min,47);
 assert.equal(calc(162,open,a,{defender:{currentHp:81}}).min,40);
});
