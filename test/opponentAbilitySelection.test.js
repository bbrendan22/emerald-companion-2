import test from 'node:test';
import assert from 'node:assert/strict';
import {battleReducer,createBattleState} from '../src/battle/battleState.js';
import {speciesByName,battleMove,speciesTypes} from '../src/battle/reference.js';
import {opponentAbilityOptions,calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {matchupObservations,possibleMatchupSets,identifiedMatchup,observationChoices} from '../src/battle/towerSets.js';
import {conditionalAbilityState,projectAbilityConditions} from '../src/battle/conditionalAbilities.js';
import {slotConditions} from '../src/battle/matchupConditions.js';
const id=name=>speciesByName.get(name.toLowerCase()).internalSpeciesId;
const initial=()=>({...createBattleState(),selectedTrainer:'Cooltrainer (M):VINCE',team:['a','b'],opponentSpecies:[id('Gardevoir'),id('Houndoom'),id('Castform')],matchup:{player:'a',opponent:id('Gardevoir')}});
const select=(s,value,patch={})=>battleReducer(s,{type:'observeOpponentAbility',slot:s.opponentSpecies.indexOf(s.matchup.opponent),speciesId:s.matchup.opponent,value,...patch});
const known=(s,mon)=>opponentAbilityOptions(mon,identifiedMatchup(s).sets,matchupObservations(s).ability??'');
const base={level:50,ability:'Immunity',item:'None',types:['NORMAL'],currentHp:200,stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
test('two-ability species defaults to Both and supports first, second and Both reversibly',()=>{
 let s=initial();const species={id:s.matchup.opponent};const all=known(s,species).values;
 assert.equal(all.length,2);assert.equal(known(s,species).status,'uncertain');
 for(const value of [...all,'']) {
  s=select(s,value);assert.equal(matchupObservations(s).ability,value);
  assert.deepEqual(known(s,species).values,value?[value]:all);
 }
});
test('single-ability species remains known without storing an unnecessary choice',()=>{
 let s=initial();s=battleReducer(s,{type:'matchupOpponent',speciesId:id('Castform')});
 assert.deepEqual(known(s,{id:id('Castform')}).values,['Forecast']);
 assert.equal(select(s,'Forecast'),s);assert.equal(select(s,''),s);
});
test('invalid, later-generation and stale slot/species selections are rejected',()=>{
 const s=initial();
 for(const value of ['Multiscale','Flash Fire','Trace / Synchronize',null,42])assert.equal(select(s,value),s);
 assert.equal(select(s,'Trace',{slot:1}),s);assert.equal(select(s,'Trace',{speciesId:id('Houndoom')}),s);
});
test('ability observations never filter sets or change move/item choices and selections',()=>{
 let s=initial();const before=possibleMatchupSets(s),items=observationChoices(s,'item'),moves=observationChoices(s,0);
 for(const ability of ['Trace','Synchronize','']) {
  s=select(s,ability);assert.deepEqual(possibleMatchupSets(s),before);assert.deepEqual(observationChoices(s,'item'),items);assert.deepEqual(observationChoices(s,0),moves);
 }
 const item=items[0];s=battleReducer(s,{type:'observeOpponent',field:'item',value:item});
 const observed=identifiedMatchup(s),sets=possibleMatchupSets(s);
 s=select(s,'Trace');assert.equal(identifiedMatchup(s).item,observed.item);assert.deepEqual(identifiedMatchup(s).moves,observed.moves);assert.deepEqual(possibleMatchupSets(s),sets);
 const choice=observationChoices(s,0)[0];s=battleReducer(s,{type:'observeOpponent',field:0,value:choice});assert.equal(matchupObservations(s).ability,'Trace','move edits preserve ability observation');
});
test('view switches and Battle Conditions reset preserve each slot ability',()=>{
 let s=select(initial(),'Trace');s=battleReducer(s,{type:'matchupOpponent',speciesId:id('Houndoom')});s=select(s,'Flash Fire');
 const memory=s.opponentObservations;
 s=battleReducer(s,{type:'matchupPlayer',identity:'b'});s=battleReducer(s,{type:'resetMatchupConditions'});
 s=battleReducer(s,{type:'conditionsOpen',open:true});s=battleReducer(s,{type:'conditionsOpen',open:false});
 assert.equal(s.opponentObservations,memory);
 assert.equal(matchupObservations(s).ability,'Flash Fire');s=battleReducer(s,{type:'matchupOpponent',speciesId:id('Gardevoir')});assert.equal(matchupObservations(s).ability,'Trace');
});
test('level-rule changes clear ability evidence before opponents are reselected',()=>{
 let s=select(initial(),'Trace');s=battleReducer(s,{type:'matchupOpponent',speciesId:id('Houndoom')});s=select(s,'Flash Fire');
 assert.equal(battleReducer(s,{type:'rules',patch:{facility:'Tower'}}),s,'unchanged rules preserve setup');
 const team=s.team;
 s=battleReducer(s,{type:'rules',patch:{levelMode:'open',openLevel:100,facility:'Tower'}});
 assert.equal(s.rules.opponentLevel,100);assert.equal(s.team,team);assert.equal(s.matchup.player,'a');
 assert.equal(s.selectedTrainer,null);assert.equal(s.matchup.opponent,null);assert.deepEqual(s.opponentSpecies,[]);
 assert.deepEqual(s.opponentObservations,{});assert.equal(s.selectedOpponentSetId,null);assert.deepEqual(s.opponentSetSelections,{});
 assert.equal(battleReducer(s,{type:'observeOpponentAbility',slot:1,speciesId:id('Houndoom'),value:'Flash Fire'}),s,'stale ability events cannot restore old evidence');
 s=battleReducer(s,{type:'opponentTrainer',key:'Cooltrainer (M):VINCE'});
 for(const [slot,name] of [[0,'Gardevoir'],[1,'Houndoom']]) {
  s=battleReducer(s,{type:'assignOpponentSpecies',slot,speciesId:id(name)});
  s=battleReducer(s,{type:'matchupOpponent',speciesId:id(name)});
  assert.equal(matchupObservations(s).ability,undefined);
  assert.equal(known(s,{id:id(name)}).status,'uncertain');assert.equal(known(s,{id:id(name)}).values.length,2);
 }
});
test('removal and re-addition clear only the removed occupant, and trainer replacement clears its roster',()=>{
 let s=select(initial(),'Trace');s=battleReducer(s,{type:'matchupOpponent',speciesId:id('Houndoom')});s=select(s,'Flash Fire');
 s=battleReducer(s,{type:'clearOpponentSpeciesSlot',slot:0,speciesId:id('Gardevoir')});
 assert.equal(s.opponentObservations[0],undefined);assert.equal(s.opponentObservations[1].ability,'Flash Fire');
 s=battleReducer(s,{type:'assignOpponentSpecies',slot:0,speciesId:id('Gardevoir')});assert.equal(s.opponentSpecies[0],id('Gardevoir'));
 s=battleReducer(s,{type:'matchupOpponent',speciesId:id('Gardevoir')});assert.equal(matchupObservations(s).ability,undefined);assert.equal(known(s,{id:id('Gardevoir')}).status,'uncertain');
 s=battleReducer(s,{type:'clearOpponentTrainer'});assert.deepEqual(s.opponentObservations,{});
});
test('actual species choices narrow known defensive immunities/modifiers without removing other uncertainty',()=>{
 for(const [name,move] of [['Snorlax','Flamethrower'],['Houndoom','Flamethrower'],['Kabuto','Surf']]) {
  const data=speciesByName.get(name.toLowerCase()),mon={...base,dex:data.nationalDexId,types:speciesTypes(data.nationalDexId)};
  const values=opponentAbilityOptions(mon).values;
  for(const choice of [...values,'']) {
   const d={...mon,abilityOptions:opponentAbilityOptions(mon,[],choice)};
   const result=calculateAbilityScenarios(battleMove(move),base,d,{critical:true});
   assert.equal(result.scenarios.length,choice?1:2);
  }
 }
 const own={...base,ability:'Trace',copiedAbility:'Plus',abilityOptions:{status:'uncertain',source:'species',values:['Trace','Synchronize']}};
 const other={...base,dex:282,ability:'Trace',copiedAbility:'Minus',abilityOptions:opponentAbilityOptions({dex:282},[],'Trace')};
 assert.equal(calculateAbilityScenarios(battleMove('Surf'),own,other).groups.length,2,'player uncertainty survives opponent narrowing');
});
test('selected Trace uses existing copied ability state in both damage directions; switching away invalidates it',()=>{
 let s=select(initial(),'Trace');const slot=0,context='Trace';
 for(const [field,value] of [['abilityContext',null],['copiedAbility','Flash Fire'],['flashFireActivated',true]])s=battleReducer(s,{type:'matchupCondition',side:'enemy',slot,field,value,context});
 const mon={...base,dex:282,ability:'Synchronize / Trace',abilityOptions:known(s,{dex:282})};
 const selected=projectAbilityConditions(mon,slotConditions(s,'enemy',0));
 assert.equal(selected.copiedAbility,'Flash Fire');assert.equal(selected.flashFireActivated,true);
 assert.equal(calculateAbilityScenarios(battleMove('Flamethrower'),base,selected).groups[0].max,0);
 assert.ok(calculateAbilityScenarios(battleMove('Flamethrower'),selected,base).groups[0].max>43);
 s=select(s,'Synchronize');assert.equal(conditionalAbilityState({...mon,abilityOptions:known(s,{dex:282})},slotConditions(s,'enemy',0)).copiedAbility,null);
});
test('explicit Both preserves species alternatives while legacy guaranteed-set inference remains available to callers',()=>{
 const mon={dex:282},sets=[{species:'Gardevoir',possibleAbility:'Trace'}];
 assert.deepEqual(opponentAbilityOptions(mon,sets).values,['Trace']);
 assert.equal(opponentAbilityOptions(mon,sets,'').values.length,2);
 assert.deepEqual(opponentAbilityOptions(mon,sets,'Synchronize').values,['Synchronize']);
});
test('unviewed Doubles slots retain ability observations; removal and format changes clear them',()=>{
 let s={...initial(),rules:{...initial().rules,format:'Doubles'},opponentSpecies:[id('Gardevoir'),id('Houndoom')]};
 s=select(s,'Trace');
 s=battleReducer(s,{type:'viewDoublesSlot',side:'opponent',slot:1});s=select(s,'Flash Fire');
 s=battleReducer(s,{type:'viewDoublesSlot',side:'opponent',slot:0});assert.equal(matchupObservations(s).ability,'Trace');
 s=battleReducer(s,{type:'viewDoublesSlot',side:'opponent',slot:1});assert.equal(matchupObservations(s).ability,'Flash Fire');
 s=battleReducer(s,{type:'selectDoublesOpponent',slot:1,speciesId:null});assert.equal(s.opponentObservations[1],undefined);assert.equal(s.opponentObservations[0].ability,'Trace');
 s=battleReducer(s,{type:'rules',patch:{format:'Singles'}});assert.deepEqual(s.opponentObservations,{});
});
