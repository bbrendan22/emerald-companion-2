import test from 'node:test';
import assert from 'node:assert/strict';
import {battleReducer,createBattleState} from '../src/battle/battleState.js';
import {sideConditions,slotConditions,matchupBattleContext} from '../src/battle/matchupConditions.js';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {battleMove,speciesByName} from '../src/battle/reference.js';
import {possibleMatchupSets,matchupObservations} from '../src/battle/towerSets.js';
const id=name=>speciesByName.get(name.toLowerCase()).internalSpeciesId;
const initial=(format='Doubles')=>({...createBattleState(),selectedTrainer:'Cooltrainer (M):KAYDEN',team:['a','b'],opponentSpecies:[id('Gardevoir'),id('Houndoom')],matchup:{player:'a',opponent:id('Gardevoir')},rules:{...createBattleState().rules,format,teamSize:format==='Doubles'?4:3}});
// Arithmetic fixtures change actual teammate HP instead of manual counts.
const count=(s,side,value)=>({...s,matchupConditions:{...s.matchupConditions,[side]:{...s.matchupConditions[side],1:{...s.matchupConditions[side]?.[1],currentHp:value===1?0:null}}}});
const edit=(s,side,field,value,extra={})=>battleReducer(s,{type:'matchupCondition',side,slot:side==='player'?s.team.indexOf(s.matchup.player):s.opponentSpecies.indexOf(s.matchup.opponent),field,value,...extra});
const screen=(s,side,name,value=true)=>edit(s,side,'screen',value,{screen:name});
const mon={level:50,types:['NORMAL'],ability:'Immunity',item:'None',currentHp:100,stats:{hp:200,attack:25,defense:100,spAttack:27,spDefense:100}};
const calc=(name,s,side='player',a=mon,d=mon,critical=false)=>calculateCoreDamage(battleMove(name),a,{...d,screens:sideConditions(s,side==='player'?'enemy':'player').screens},'none',critical,matchupBattleContext(s,side));
test('fresh Doubles sides derive zero living Pokémon from empty assignments',()=>{
 let s=battleReducer(createBattleState(),{type:'rules',patch:{format:'Doubles'}});
 assert.equal(s.team.length,0);assert.equal(sideConditions(s,'player').activeCount,0);assert.equal(sideConditions(s,'enemy').activeCount,0);
 assert.notEqual(s.matchupSides.player.screens,s.matchupSides.enemy.screens);
});
test('legacy manual count actions are ignored and living counts stay independent',()=>{
 let s=count(initial(),'player',1);assert.equal(sideConditions(s,'enemy').activeCount,2);
 s=count(s,'enemy',1);s=count(s,'player',2);assert.deepEqual([sideConditions(s,'player').activeCount,sideConditions(s,'enemy').activeCount],[2,1]);
 for(const value of [0,1,2,3,'1',null,NaN])assert.equal(battleReducer(s,{type:'matchupActiveCount',side:'player',value}),s);
 const single=initial('Singles');assert.equal(battleReducer(single,{type:'matchupActiveCount',side:'player',value:1}),single);
});
test('screens have one canonical side owner across Pokémon and remain independent of personal conditions',()=>{
 let s=screen(initial(),'player','reflect');s=screen(s,'enemy','lightScreen');s=edit(s,'player','status','burn');
 assert.equal(s.matchupConditions.player[0].screens,undefined);
 s=battleReducer(s,{type:'matchupPlayer',identity:'b'});s=battleReducer(s,{type:'matchupOpponent',speciesId:id('Houndoom')});
 assert.equal(slotConditions(s,'player',1).screens.reflect,true);assert.equal(slotConditions(s,'enemy',1).screens.lightScreen,true);
 assert.equal(slotConditions(s,'player',1).status,'none');assert.equal(slotConditions(s,'player',0).status,'burn');
 assert.equal(slotConditions(s,'player',1).screens.lightScreen,undefined);assert.equal(slotConditions(s,'enemy',1).screens.reflect,undefined);
 s=screen(s,'player','reflect',false);assert.equal(slotConditions(s,'player',0).screens.reflect,false);
});
test('removing/replacing an occupant keeps side screens and counts while clearing only its personal state',()=>{
 let s=count(screen(screen(initial(),'player','reflect'),'enemy','lightScreen'),'player',1);s=edit(s,'player','status','burn');
 s=battleReducer(s,{type:'clearPlayerSlot',slot:0,identity:'a'});s=battleReducer(s,{type:'assignPlayer',slot:0,identity:'a',pool:[{identity:'a',dex:1}]});
 assert.equal(sideConditions(s,'player').screens.reflect,true);assert.equal(sideConditions(s,'player').activeCount,1);assert.equal(slotConditions(s,'player',0).status,'none');
 s=battleReducer(s,{type:'clearOpponentSpeciesSlot',slot:0,speciesId:id('Gardevoir')});s=battleReducer(s,{type:'assignOpponentSpecies',slot:0,speciesId:id('Gardevoir')});
 assert.equal(sideConditions(s,'enemy').screens.lightScreen,true);assert.equal(sideConditions(s,'enemy').activeCount,2);
});
test('Doubles Reset clears both side screens/counts but preserves inactive Pokémon personal conditions and observations',()=>{
 let s=screen(screen(count(count(initial(),'player',1),'enemy',1),'player','reflect'),'enemy','lightScreen');
 s=edit(s,'player','status','burn');s=battleReducer(s,{type:'matchupPlayer',identity:'b'});s=edit(s,'player','status','sleep');
 s=battleReducer(s,{type:'observeOpponentAbility',slot:0,speciesId:id('Gardevoir'),value:'Trace'});const observations=s.opponentObservations;
 s=battleReducer(s,{type:'resetMatchupConditions'});
 assert.deepEqual(sideConditions(s,'player'),{activeCount:2,screens:{}});
 assert.deepEqual(sideConditions(s,'enemy'),{activeCount:1,screens:{}});
 assert.equal(slotConditions(s,'player',0).status,'burn');assert.equal(slotConditions(s,'player',1).status,'none');assert.equal(s.opponentObservations,observations);
});
test('format changes reset side counts and screens instead of restoring them',()=>{
 let s=count(count(screen(initial(),'enemy','reflect'),'player',1),'enemy',1);
 s=battleReducer(s,{type:'rules',patch:{format:'Singles'}});assert.equal(matchupBattleContext(s,'player').defenderSideAlive,undefined);
 assert.equal(calc('Earthquake',s).base,13);s=battleReducer(s,{type:'resetMatchupConditions'});
 assert.deepEqual(sideConditions(s,'enemy'),{activeCount:2,screens:{}});
 s=battleReducer(s,{type:'rules',patch:{format:'Doubles'}});assert.equal(matchupBattleContext(s,'player').defenderSideAlive,0);assert.equal(matchupBattleContext(s,'enemy').defenderSideAlive,0);
});
test('context selects the actual defending side in both attack directions',()=>{
 const s=count(initial(),'player',1);
 assert.equal(matchupBattleContext(s,'player').defenderSideAlive,2);assert.equal(matchupBattleContext(s,'enemy').defenderSideAlive,1);
 assert.equal(matchupBattleContext(s,'player').format,'Doubles');
});
test('screens use exact integer division for one/two defenders in both directions',()=>{
 // Flamethrower SpA27/P95 and Earthquake Atk25/P100 both produce raw subtotal11.
 // 1 defender:floor11/2+2=7. 2 defenders:2*floor11/3+2=8, NOT floor22/3+2=9.
 for(const [name,which] of [['Flamethrower','lightScreen'],['Earthquake','reflect']])for(const side of ['player','enemy'])for(const active of [1,2]) {
  const target=side==='player'?'enemy':'player';let s=screen(count(initial(),target,active),target,which);
  assert.equal(calc(name,s,side).base,active===1?7:8);
  // Compare the same screen inputs in Singles without a format-reset action.
  s={...s,rules:{...s.rules,format:'Singles'}};assert.equal(calc(name,s,side).base,7);
 }
});
test('physical/special screen choice, critical bypass and armor suppression remain correct',()=>{
 const s=screen(screen(initial(),'enemy','reflect'),'enemy','lightScreen');
 for(const name of ['Earthquake','Flamethrower']) {
  assert.equal(calc(name,s,'player',mon,mon,true).base,13);
  for(const ability of ['Battle Armor','Shell Armor'])assert.deepEqual(calc(name,s,'player',mon,{...mon,ability},true),calc(name,s,'player',mon,{...mon,ability},false));
  const copied={...mon,ability:'Trace',copiedAbility:'Shell Armor'};assert.deepEqual(calc(name,s,'player',mon,copied,true),calc(name,s,'player',mon,copied,false));
 }
 assert.equal(calc('Flamethrower',screen(initial(),'enemy','reflect')).base,13);
 assert.equal(calc('Earthquake',screen(initial(),'enemy','lightScreen')).base,13);
});
test('ability uncertainty retains armor/non-armor critical alternatives with the defending side count',()=>{
 const s=screen(initial(),'enemy','reflect'),d={...mon,screens:sideConditions(s,'enemy').screens,ability:'Trace',copiedAbility:'Battle Armor',abilityOptions:{status:'uncertain',source:'species',values:['Trace','Synchronize']}};
 const result=calculateAbilityScenarios(battleMove('Earthquake'),mon,d,{critical:true,battleContext:matchupBattleContext(s,'player')});
 assert.equal(result.groups.length,2);assert.equal(result.groups[0].result.base,8);assert.equal(result.groups[1].result.base,13);
});
test('count/screen changes leave Frontier identification and opponent observations untouched',()=>{
 let s=initial();s=battleReducer(s,{type:'observeOpponentAbility',slot:0,speciesId:id('Gardevoir'),value:'Trace'});
 const before=possibleMatchupSets(s),obs=matchupObservations(s),identities=s.opponentSpecies;
 s=count(screen(s,'enemy','lightScreen'),'enemy',1);
 assert.deepEqual(possibleMatchupSets(s),before);assert.equal(matchupObservations(s),obs);assert.equal(s.opponentSpecies,identities);
});
test('counts automatically enable spread while leaving Helping Hand and non-spread moves unchanged',()=>{
 const a={...mon,stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
 for(const [n,range] of [[1,[36,43]],[2,[18,22]]])assert.deepEqual([calc('Surf',count(initial(),'enemy',n),'player',a,a).min,calc('Surf',count(initial(),'enemy',n),'player',a,a).max],range);
 for(const n of [1,2])assert.deepEqual([calc('Flamethrower',count(initial(),'enemy',n),'player',a,a).min,calc('Flamethrower',count(initial(),'enemy',n),'player',a,a).max],[36,43]);
});
