import test from 'node:test';
import assert from 'node:assert/strict';
import {battleReducer as reduce,createBattleState} from '../src/battle/battleState.js';
import {battlefieldSlotLiveness as live,livingBattlefieldCount as count,conditionHp,slotConditions,sideConditions,matchupBattleContext} from '../src/battle/matchupConditions.js';
import {availableOpponentSpecies} from '../src/battle/opponentSpecies.js';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {battleMove} from '../src/battle/reference.js';
const pool=[{identity:'a',dex:1},{identity:'b',dex:2},{identity:'c',dex:3}];
const view=(s,side,slot)=>reduce(s,{type:'viewDoublesSlot',side:side==='enemy'?'opponent':side,slot});
const hp=(s,side,slot,value)=>reduce(view(s,side,slot),{type:'matchupCondition',side,slot,field:'currentHp',value,max:200});
function setup() {
 let s=reduce(createBattleState(),{type:'rules',patch:{format:'Doubles'}});
 s=reduce(s,{type:'opponentTrainer',key:'Expert (M):ALEXAS'});
 const species=availableOpponentSpecies(s);
 for(const slot of [0,1]) {
  s=reduce(s,{type:'selectDoublesPlayer',slot,identity:pool[slot].identity,pool});
  s=reduce(s,{type:'selectDoublesOpponent',slot,speciesId:species[slot].id});
 }
 return s;
}
test('empty assignments override stale HP; default, full and reduced HP are active; explicit zero is fainted',()=>{
 let s=reduce(createBattleState(),{type:'rules',patch:{format:'Doubles'}});
 for(const side of ['player','enemy']) {
  assert.equal(count(s,side),0);assert.equal(live(s,side,0),'empty');
 }
 s=setup();
 for(const side of ['player','enemy'])for(const slot of [0,1]) {
  assert.equal(live(s,side,slot),'active');
  for(const value of [null,200,23]) {s=hp(s,side,slot,value);assert.equal(live(s,side,slot),'active');}
  s=hp(s,side,slot,0);assert.equal(live(s,side,slot),'fainted');
  assert.equal(slotConditions(s,side,slot).currentHp,0);
 }
 assert.equal(count(s,'player'),0);assert.equal(count(s,'enemy'),0);
 s={...s,team:[null,'b']};assert.equal(live(s,'player',0),'empty');
 for(const slot of [-1,2,3])assert.equal(live(s,'player',slot),'empty');
});
test('missing HP differs from explicit zero; normalization never turns empty or invalid input into fainting',()=>{
 for(const value of [null,undefined,'','  ',NaN,'invalid',Infinity])assert.equal(conditionHp(value,{max:200}),null);
 for(const value of [0,'0',-5])assert.equal(conditionHp(value,{max:200}),0);
 assert.equal(conditionHp(20.9,{max:200}),20);assert.equal(conditionHp(250,{max:200}),200);
 const s=setup();
 for(const conditions of [{},{status:'burn'},{currentHp:null},{currentHp:undefined}]) {
  const projected={...s,matchupConditions:{...s.matchupConditions,player:{0:conditions}}};
  assert.equal(live(projected,'player',0),'active');
 }
});
test('four slot HP overrides and liveness survive all viewed combinations without mutating other state',()=>{
 let s=setup();
 s=hp(s,'player',0,0);s=hp(s,'player',1,40);s=hp(s,'enemy',0,50);s=hp(s,'enemy',1,0);
 const before=s;
 for(const player of [0,1])for(const enemy of [0,1]) {
  s=view(view(s,'player',player),'enemy',enemy);
  assert.equal(s.matchupConditions,before.matchupConditions);
  assert.equal(count(s,'player'),1);assert.equal(count(s,'enemy'),1);
  assert.deepEqual([0,1].map(slot=>live(s,'player',slot)),['fainted','active']);
  assert.deepEqual([0,1].map(slot=>live(s,'enemy',slot)),['active','fainted']);
  assert.equal(s.team,before.team);assert.equal(s.opponentSpecies,before.opponentSpecies);
  assert.equal(s.opponentObservations,before.opponentObservations);assert.equal(s.opponentSetSelections,before.opponentSetSelections);
 }
});
test('replacing or clearing a slot resets only that occupant while preserving the other three',()=>{
 let s=setup();s=hp(s,'player',0,0);s=hp(s,'player',1,20);s=hp(s,'enemy',0,0);s=hp(s,'enemy',1,30);
 const before=s;
 s=reduce(s,{type:'selectDoublesPlayer',slot:0,identity:'c',pool});
 assert.equal(live(s,'player',0),'active');assert.equal(slotConditions(s,'player',0).currentHp,null);
 assert.equal(s.matchupConditions.player[1],before.matchupConditions.player[1]);assert.equal(s.matchupConditions.enemy,before.matchupConditions.enemy);
 const replacement=availableOpponentSpecies(s).find(mon=>!s.opponentSpecies.includes(mon.id));
 s=reduce(s,{type:'selectDoublesOpponent',slot:0,speciesId:replacement.id});
 assert.equal(live(s,'enemy',0),'active');assert.equal(slotConditions(s,'enemy',0).currentHp,null);
 assert.equal(s.matchupConditions.enemy[1],before.matchupConditions.enemy[1]);
 s=reduce(s,{type:'selectDoublesOpponent',slot:1,speciesId:null});assert.equal(count(s,'enemy'),1);assert.equal(live(s,'enemy',1),'empty');
 assert.equal(slotConditions(s,'enemy',0).currentHp,null);assert.equal(slotConditions(s,'player',1).currentHp,20);
});
test('derived counts ignore legacy overrides and exclude empty, fainted and reserve slots',()=>{
 let s=setup();s={...s,team:['a',null,'reserve'],opponentSpecies:[...s.opponentSpecies.slice(0,2),999],matchupSides:{...s.matchupSides,player:{activeCount:2,screens:{reflect:true}}}};
 assert.equal(count(s,'player'),1);assert.equal(sideConditions(s,'player').activeCount,1);
 assert.equal(reduce(s,{type:'matchupActiveCount',side:'player',value:2}),s);
 s=hp(s,'player',0,0);assert.equal(sideConditions(s,'player').activeCount,0);assert.equal(sideConditions(s,'player').screens.reflect,true);
});
test('spread and screens consume derived defending counts in both directions with existing arithmetic',()=>{
 const mon={level:50,types:['NORMAL'],ability:'Immunity',item:'None',currentHp:200,stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
 let s=setup();
 for(const direction of ['player','enemy']) {
  const side=direction==='player'?'enemy':'player';
  assert.equal(matchupBattleContext(s,direction).defenderSideAlive,2);
  assert.equal(calculateCoreDamage(battleMove('Surf'),mon,mon,'none',false,matchupBattleContext(s,direction)).max,22);
  s=hp(s,side,1,0);
  assert.equal(matchupBattleContext(s,direction).defenderSideAlive,1);
  assert.equal(calculateCoreDamage(battleMove('Surf'),mon,mon,'none',false,matchupBattleContext(s,direction)).max,43);
  const defender={...mon,screens:{reflect:true}};
  assert.equal(calculateCoreDamage(battleMove('Earthquake'),mon,defender,'none',false,matchupBattleContext(s,direction)).base,24);
 }
});
test('Singles keeps its existing rule context and full-HP defaults; zero is an explicit override',()=>{
 let s=reduce(createBattleState(),{type:'selectSinglesPlayer',identity:'a',pool});
 assert.equal(live(s,'player',0),'active');assert.equal(count(s,'player'),1);assert.equal(live(s,'player',1),'empty');
 assert.equal(matchupBattleContext(s,'player'),s.rules);
 s=reduce(s,{type:'matchupCondition',side:'player',slot:0,field:'currentHp',value:0,max:200});
 assert.equal(live(s,'player',0),'fainted');assert.equal(slotConditions(s,'player',0).currentHp,0);
 s=reduce(s,{type:'matchupCondition',side:'player',slot:0,field:'currentHp',value:null,max:200});
 assert.equal(live(s,'player',0),'active');assert.equal(slotConditions(s,'player',0).currentHp,null);
});
