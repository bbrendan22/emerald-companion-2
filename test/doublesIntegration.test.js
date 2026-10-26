import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateCoreDamage,neutralBaseDamage,applyCoreDamageModifiers} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {battleMove,speciesByName} from '../src/battle/reference.js';
import {battleReducer,createBattleState} from '../src/battle/battleState.js';
import {slotConditions,matchupBattleContext} from '../src/battle/matchupConditions.js';
import {projectAbilityConditions} from '../src/battle/conditionalAbilities.js';
import {possibleMatchupSets,matchupObservations} from '../src/battle/towerSets.js';
import {singlesSnapshot} from './fixtures/doublesSinglesSnapshot.js';
const id=name=>speciesByName.get(name.toLowerCase()).internalSpeciesId;
const mon={level:50,types:['NORMAL'],ability:'Immunity',item:'None',currentHp:200,status:'none',stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const initial=()=>({...createBattleState(),selectedTrainer:'Cooltrainer (M):KAYDEN',team:['a','b'],opponentSpecies:[id('Gardevoir'),id('Houndoom')],matchup:{player:'a',opponent:id('Gardevoir')},rules:{...createBattleState().rules,format:'Doubles',teamSize:4}});
const other=side=>side==='player'?'enemy':'player';
const edit=(state,side,field,value,extra={})=>battleReducer(state,{type:'matchupCondition',side,slot:side==='player'?state.team.indexOf(state.matchup.player):state.opponentSpecies.indexOf(state.matchup.opponent),field,value,...extra});
function setup(side,{a={},d={},count=2,screen,critical=false,weather='none'}={}) {
 let state=initial();const attacker={...mon,...a},defender={...mon,...d};
 for(const [owner,model] of [[side,attacker],[other(side),defender]]) {
  state=edit(state,owner,'helpingHand',Boolean(model.helpingHand));state=edit(state,owner,'currentHp',model.currentHp);state=edit(state,owner,'status',model.status);
  for(const [stat,value] of Object.entries(model.stages??{}))state=edit(state,owner,'stage',value,{stat});
  if(['Trace','Flash Fire'].includes(model.ability)) {
   state=edit(state,owner,'abilityContext',undefined,{context:model.ability});
   if(model.ability==='Trace')state=edit(state,owner,'copiedAbility',model.copiedAbility??null,{context:model.ability});
   state=edit(state,owner,'flashFireActivated',Boolean(model.flashFireActivated),{context:model.ability});
  }
 }
 const defendingSide=other(side);
 state={...state,matchupConditions:{...state.matchupConditions,[defendingSide]:{...state.matchupConditions[defendingSide],1:{currentHp:count===1?0:null}}}};
 if(screen)state=edit(state,other(side),'screen',true,{screen});
 state={...state,field:{weather,critical}};
 const project=(owner,m)=>{const conditions=slotConditions(state,owner,0);return projectAbilityConditions({...m,...conditions},conditions);};
 return {state,attacker:project(side,attacker),defender:project(other(side),defender)};
}
const rangeRolls=max=>Array.from({length:16},(_,i)=>Math.floor(max*(85+i)/100));
// Independent arithmetic notes below use Lv50/stats100, so the raw subtotal is
// floor(22*power/50), except explicitly modified operands. No calculator call
// supplies an expected value. Validate every roll, not only the endpoints.
const cases=[
 {label:'Surf + Light Screen + Helping Hand + STAB + 4x typing',move:'Surf',screen:'lightScreen',a:{helpingHand:true,types:['WATER']},d:{types:['FIRE','ROCK']},max:132}, //41 ->26 ->13 ->+2=15 ->HH22 ->STAB33 ->132
 {label:'one defender uses half-screen and no spread',move:'Surf',screen:'lightScreen',count:1,a:{helpingHand:true,types:['WATER']},d:{types:['FIRE','ROCK']},max:196}, //41 ->20 ->+2=22 ->33 ->49 ->196
 {label:'Razor Wind + Reflect + critical + Helping Hand',move:'Razor Wind',screen:'reflect',critical:true,a:{helpingHand:true},max:85}, //35 ->spread17 ->+2=19 ->crit38 ->57 ->STAB85
 {label:'Battle Armor restores Reflect before spread and Helping Hand',move:'Razor Wind',screen:'reflect',critical:true,a:{helpingHand:true},d:{ability:'Battle Armor'},max:28}, //35 ->22 ->11 ->+2=13 ->19 ->28
 {label:'copied Shell Armor suppresses critical and restores adverse stages',move:'Razor Wind',screen:'reflect',critical:true,a:{helpingHand:true,stages:{attack:-2}},d:{ability:'Trace',copiedAbility:'Shell Armor',stages:{defense:2}},max:9}, //Atk50/Def200 ->8 ->screen4 ->spread2 ->+2=4 ->6 ->9
 {label:'non-spread critical + Helping Hand bypasses Reflect',move:'Strength',screen:'reflect',critical:true,a:{helpingHand:true},max:166}, //35+2=37 ->74 ->111 ->166
 {label:'Flash Fire + Charcoal + spread + screen + Helping Hand + 4x; Cloud Nine suppresses sun',move:'Heat Wave',weather:'sun',screen:'lightScreen',a:{types:['FIRE'],ability:'Trace',copiedAbility:'Flash Fire',flashFireActivated:true,item:'Charcoal',helpingHand:true},d:{ability:'Cloud Nine',types:['GRASS','ICE']},max:232}, //SpA110 ->48 ->32 ->16 ->FF24 ->+2=26 ->39 ->58 ->232
 {label:'Flash Fire critical retains spread and Helping Hand; Air Lock suppresses weather',move:'Heat Wave',weather:'rain',screen:'lightScreen',critical:true,a:{types:['FIRE'],ability:'Flash Fire',flashFireActivated:true,item:'Charcoal',helpingHand:true},d:{ability:'Air Lock',types:['GRASS','ICE']},max:684}, //48 ->24 ->FF36 ->+2=38 ->crit76 ->HH114 ->STAB171 ->684
 {label:'Eruption HP67 -> power50; screen/spread/Helping Hand',move:'Eruption',screen:'lightScreen',a:{types:['FIRE'],currentHp:67,helpingHand:true},d:{types:['GRASS','ICE']},max:76}, //22 ->14 ->7 ->+2=9 ->13 ->19 ->76
 {label:'Water Spout HP133 -> power99; screen/spread/Helping Hand',move:'Water Spout',screen:'lightScreen',a:{types:['WATER'],currentHp:133,helpingHand:true},d:{types:['FIRE','ROCK']},max:144}, //43 ->28 ->14 ->+2=16 ->24 ->36 ->144
 {label:'Eruption HP1 keeps Special zero subtotal before +2',move:'Eruption',screen:'lightScreen',a:{types:['FIRE'],currentHp:1,helpingHand:true},d:{types:['GRASS','ICE']},max:16}, //0 ->+2=2 ->HH3 ->STAB4 ->16
 {label:'Earthquake remains full damage with Reflect and Helping Hand',move:'Earthquake',screen:'reflect',a:{types:['GROUND'],helpingHand:true},max:67}, //44 ->28 ->+2=30 ->HH45 ->STAB67
];
for(const side of ['player','enemy'])for(const scenario of cases)test(`${side}: ${scenario.label}`,()=>{
 const {state,attacker,defender}=setup(side,scenario);
 const r=calculateCoreDamage(battleMove(scenario.move),attacker,defender,state.field.weather,state.field.critical,matchupBattleContext(state,side));
 assert.deepEqual(r.rolls,rangeRolls(scenario.max));
});

test('weather-sensitive combined scenario has independently verified branch arithmetic and stays unavailable',()=>{
 for(const [weather,max] of [['none',132],['sun',72],['rain',184]]) {
  // Lv50 Surf: subtotal41 ->screen26 ->spread13 ->weather13/6/19 ->+2,
  // HH floor*1.5 ->STAB floor*1.5 ->Fire/Rock x4 ->random last.
  const base=neutralBaseDamage({level:50,power:95,moveId:57,type:'WATER',spAttack:100,spDefense:100,weather,ability:'Immunity',defenderAbility:'Immunity',defenderScreens:{lightScreen:true},battleContext:{format:'Doubles',defenderSideAlive:2}});
  const r=applyCoreDamageModifiers(base,'WATER',['WATER'],['FIRE','ROCK'],false,'Immunity','none',1,57,true);
  assert.deepEqual(r.rolls,rangeRolls(max));
  if(weather!=='none')for(const side of ['player','enemy']) {
   const {state,attacker,defender}=setup(side,{a:{types:['WATER'],helpingHand:true},d:{types:['FIRE','ROCK']},screen:'lightScreen',weather});
   assert.equal(calculateCoreDamage(battleMove('Surf'),attacker,defender,weather,false,matchupBattleContext(state,side)).reason,'unknown-weather-suppression-field');
  }
 }
});
function independentDistribution(maxima) {
 const counts=new Map();
 const visit=(index,sum)=>{if(index===maxima.length){counts.set(sum,(counts.get(sum)??0)+1);return;}for(let roll=85;roll<=100;roll++)visit(index+1,sum+Math.floor(maxima[index]*roll/100));};
 visit(0,0);return [...counts].sort(([a],[b])=>a-b).map(([damage,count])=>({damage,count}));
}
test('Helping Hand multi-hit and Triple Kick retain each hit’s own truncation and all outcome weights',()=>{
 for(const side of ['player','enemy'])for(const [move,maxima,screen,critical] of [
  ['Comet Punch',[19,19,19],null,false], //7+2=9 ->HH13 ->STAB19, NOT floor(total39*1.5)=58
  ['Comet Punch',[13,13,13],'reflect',false], //7 ->screen4 ->+2=6 ->HH9 ->STAB13
  ['Comet Punch',[40,40,40],'reflect',true], //7+2=9 ->crit18 ->HH27 ->STAB40
  ['Triple Kick',[18,30,44],null,false], //powers10/20/30 ->subtotals4/8/13 ->+2 ->HH9/15/22 ->Fighting vs Normal x2
 ]) {
  const {state,attacker,defender}=setup(side,{a:{helpingHand:true},screen,critical});
  const r=calculateCoreDamage(battleMove(move),attacker,defender,'none',critical,{...matchupBattleContext(state,side),hitCount:3});
  assert.deepEqual(r.distribution,independentDistribution(maxima));assert.equal(r.totalOutcomes,4096);
 }
});
test('conditional script doubling follows +2 and precedes Helping Hand, including Weather Ball’s guarded branch',()=>{
 for(const side of ['player','enemy']) {
  const {state,attacker,defender}=setup(side,{a:{helpingHand:true}}),context=matchupBattleContext(state,side);
  // Pursuit:17+2=19 ->normal HH28 / switching script38 ->HH57.
  const pursuit=calculateCoreDamage(battleMove('Pursuit'),attacker,defender,'none',false,context);
  assert.deepEqual(pursuit.conditions.map(c=>c.result.rolls),[rangeRolls(28),rangeRolls(57)]);
  // Revenge:26+2=28 ->HH42 / script56 ->HH84; Fighting vs Normal doubles next.
  const revenge=calculateCoreDamage(battleMove('Revenge'),attacker,defender,'none',false,context);
  assert.deepEqual(revenge.conditions.map(c=>c.result.rolls),[rangeRolls(84),rangeRolls(168)]);
 }
 // Hail Weather Ball is single-target Ice50 with script multiplier2. With
 // two-defender Light Screen:22 ->14 ->+2=16 ->script32 ->HH48, then random.
 const base=neutralBaseDamage({level:50,power:50,moveId:311,type:'ICE',spAttack:100,spDefense:100,weather:'hail',ability:'Immunity',defenderAbility:'Immunity',defenderScreens:{lightScreen:true},battleContext:{format:'Doubles',defenderSideAlive:2}});
 assert.deepEqual(applyCoreDamageModifiers(base,'ICE',['NORMAL'],['NORMAL'],false,'Immunity','none',2,311,true).rolls,rangeRolls(48));
 const {state,attacker,defender}=setup('player',{a:{helpingHand:true},screen:'lightScreen'});
 assert.equal(calculateCoreDamage(battleMove('Weather Ball'),attacker,defender,'hail',false,matchupBattleContext(state,'player')).reason,'unknown-weather-suppression-field');
});
test('ability alternatives combine copied armor, screens, spread and Helping Hand without duplicates',()=>{
 for(const side of ['player','enemy']) {
  const {state,attacker,defender}=setup(side,{a:{helpingHand:true},d:{ability:'Trace',copiedAbility:'Shell Armor'},screen:'reflect',critical:true});
  const r=calculateAbilityScenarios(battleMove('Razor Wind'),{...attacker,abilityOptions:{status:'known',source:'test',values:['Immunity']}},{...defender,abilityOptions:{status:'uncertain',source:'test',values:['Trace','Synchronize']}},{critical:true,battleContext:matchupBattleContext(state,side)});
  assert.deepEqual(r.groups.map(g=>g.rolls),[rangeRolls(28),rangeRolls(85)]);assert.equal(r.scenarios.length,2);
 }
});
test('Doubles combination preserves copied Plus/Minus operand order and unseen-field exclusions',()=>{
 const a={...mon,ability:'Trace',copiedAbility:'Plus',helpingHand:true,types:['WATER'],item:'Mystic Water',stats:{...mon.stats,spAttack:101}},d={...mon,ability:'Minus',screens:{lightScreen:true}};
 // SpA101 ->Mystic Water111 ->Plus166 ->subtotal69 ->screen46 ->spread23 ->+2=25 ->HH37 ->STAB55.
 const r=calculateCoreDamage(battleMove('Surf'),a,d,'none',false,{format:'Doubles',defenderSideAlive:2});assert.deepEqual(r.rolls,rangeRolls(55));
 assert.equal(calculateCoreDamage(battleMove('Surf'),a,{...d,ability:'Immunity'},'none',false,{format:'Doubles',defenderSideAlive:2}).reason,'unknown-plus-minus-field');
 assert.equal(calculateCoreDamage(battleMove('Surf'),{...a,copiedAbility:null},d,'none',false,{format:'Doubles',defenderSideAlive:2}).reason,'unresolved-trace');
});
test('fixed/OHKO/unsupported paths ignore screens, spread and Helping Hand; explosion guard never becomes spread arithmetic',()=>{
 const {state,attacker,defender}=setup('player',{a:{helpingHand:true},screen:'lightScreen',critical:true}),ctx=matchupBattleContext(state,'player');
 assert.equal(calculateCoreDamage(battleMove('Dragon Rage'),attacker,defender,'none',true,ctx).damage,40);
 assert.deepEqual([calculateCoreDamage(battleMove('Psywave'),attacker,defender,'none',true,ctx).min,calculateCoreDamage(battleMove('Psywave'),attacker,defender,'none',true,ctx).max],[25,75]);
 assert.equal(calculateCoreDamage(battleMove('Fissure'),attacker,defender,'none',true,ctx).outcome,'ohko');
 for(const name of ['Counter','Future Sight','Spit Up','Helping Hand'])assert.equal(calculateCoreDamage(battleMove(name),attacker,defender,'none',true,ctx),null);
 for(const name of ['Explosion','Self Destruct']) {
  assert.equal(calculateCoreDamage(battleMove(name),attacker,defender,'none',true,ctx).reason,'unknown-damp-field');
  assert.equal(calculateCoreDamage(battleMove(name),attacker,{...defender,ability:'Damp'},'none',true,ctx).reason,'damp');
  assert.equal(battleMove(name).target,'MOVE_TARGET_FOES_AND_ALLY');
 }
});
test('Doubles views preserve conditions and observations; format changes reset the complete battle',()=>{
 let {state}=setup('player',{a:{helpingHand:true},screen:'lightScreen'});
 state=edit(state,'player','screen',true,{screen:'reflect'});
 state=battleReducer(state,{type:'observeOpponentAbility',slot:0,speciesId:id('Gardevoir'),value:'Trace'});
 const observations=state.opponentObservations,conditions=state.matchupConditions;
 for(const slot of [1,0])for(const side of ['player','opponent']) {
  state=battleReducer(state,{type:'viewDoublesSlot',side,slot});
  assert.equal(state.opponentObservations,observations);assert.equal(state.matchupConditions,conditions);
 }
 assert.equal(slotConditions(state,'player',0).helpingHand,true);
 assert.equal(slotConditions(state,'player',0).screens.reflect,true);
 assert.equal(slotConditions(state,'enemy',0).screens.lightScreen,true);
 for(const format of ['Singles','Doubles']) {
  state=battleReducer(state,{type:'rules',patch:{format}});
  assert.ok(state.team.every(value=>!value));assert.ok(state.opponentSpecies.every(value=>!value));
  assert.deepEqual(state.opponentObservations,{});assert.equal(slotConditions(state,'player',0).helpingHand,false);
  assert.deepEqual(slotConditions(state,'enemy',0).screens,{});
 }
});
test('10,620 complete Singles results match the approved pre-integration snapshot',()=>{
 const baseline=JSON.parse(readFileSync(new URL('./fixtures/doublesSinglesBaseline.json',import.meta.url),'utf8'));
 assert.deepEqual(singlesSnapshot(),baseline.snapshots);
});
