import test from 'node:test';
import assert from 'node:assert/strict';
import {battleReducer, createBattleState} from '../src/battle/battleState.js';
import {speciesByName} from '../src/battle/reference.js';
import {eligibleMatchupSets, possibleMatchupSets, observationChoices, identifiedMatchup, matchupObservations, towerSetById} from '../src/battle/towerSets.js';
import {towerTrainerEntries} from '../src/battle/towerTrainers.js';

const species = name => speciesByName.get(name.toLowerCase()).internalSpeciesId;
const initial = () => ({...createBattleState(),selectedTrainer:'Cooltrainer (M):VINCE', opponentSpecies:[species('Metagross'),species('Gardevoir')],
  matchup:{player:null,opponent:species('Metagross')}});
const observe = (state,field,value) => battleReducer(state,{type:'observeOpponent',field,value});

test('observations use AND filtering while displayed canonical moves remain separate evidence', () => {
  let state = initial();
  const original = eligibleMatchupSets(state), before = structuredClone(original);
  assert.equal(original.length,8);
  assert.deepEqual(identifiedMatchup(state).moves,towerSetById(identifiedMatchup(state).sets[0].id).moves);
  assert.deepEqual(matchupObservations(state).moves,['','','','']);
  const target = original.find(set => original.filter(other => other.item === set.item).length > 1 && original.filter(other => other.item === set.item).length < original.length);
  state = observe(state,'item',target.item);
  assert.ok(possibleMatchupSets(state).every(set => set.item === target.item));
  for (let slot=0; slot<target.moves.length; slot++) {
    const value = target.moves[slot];
    assert.ok(observationChoices(state,slot,{replace:false}).includes(value));
    state = observe(state,slot,value);
    assert.ok(possibleMatchupSets(state).every(set => target.moves.slice(0,slot+1).every(move => set.moves.includes(move))));
    assert.equal(observe(state,(slot+1)%4,value),state,'duplicates cannot occupy another slot');
    if (possibleMatchupSets(state).length === 1) break;
  }
  assert.equal(possibleMatchupSets(state).length,1);
  const identified = identifiedMatchup(state);
  assert.deepEqual(new Set(identified.moves),new Set(target.moves));
  assert.equal(identified.item,target.item);
  assert.equal(identified.stats,undefined);
  assert.equal(identified.ability,undefined);
  assert.ok(identified.observations.moves.some(move => !move),'displaying canonical moves does not record observations');
  for(let slot=0;slot<4;slot++) state=observe(state,slot,'');
  state=observe(state,'item','');
  assert.equal(possibleMatchupSets(state).length,8);
  assert.deepEqual(identifiedMatchup(state).moves,towerSetById(identifiedMatchup(state).sets[0].id).moves);
  assert.deepEqual(matchupObservations(state).moves,['','','','']);
  assert.equal(matchupObservations(state).item,'');
  assert.equal(identifiedMatchup(state).item,identifiedMatchup(state).sets[0].item);
  assert.deepEqual(eligibleMatchupSets(state),before,'database entries are never mutated');
});

test('changing trainer clears opponent observations and matchup', () => {
  let state=observe(initial(),0,'Earthquake');
  state=battleReducer(state,{type:'opponentTrainer',key:'Youngster:BRADY'});
  assert.deepEqual(state.opponentSpecies,[]);
  assert.deepEqual(state.opponentObservations,{});
  assert.equal(state.matchup.opponent,null);
});

test('replacement options ignore only the edited field and respect other observations', () => {
  let state=initial();
  state=observe(state,0,'Earthquake');
  for(const move of observationChoices(state,1)) {
    assert.notEqual(move,'Earthquake');
    assert.ok(eligibleMatchupSets(state).some(set=>set.moves.includes(move)&&set.moves.includes('Earthquake')));
  }
  const trainer=towerTrainerEntries.find(entry=>entry.name==='COOPER');
  state=battleReducer(state,{type:'opponentTrainer',key:trainer.key});
  state=battleReducer(state,{type:'assignOpponentSpecies',slot:0,speciesId:species('Metagross')});
  state=battleReducer(state,{type:'matchupOpponent',speciesId:species('Metagross')});
  assert.equal(eligibleMatchupSets(state).length,1);
  for(const item of observationChoices(state,'item')) assert.equal(item,eligibleMatchupSets(state)[0].item);
});


test('displayed Set data is not evidence; incompatible replacements require clearing conflicting observations', () => {
  let state=observe(initial(),0,'Aerial Ace');
  assert.equal(possibleMatchupSets(state).length,1);
  assert.deepEqual(identifiedMatchup(state).moves,towerSetById('Metagross 1').moves);
  assert.equal(identifiedMatchup(state).item,'Leftovers');
  assert.deepEqual(matchupObservations(state),{moves:['Aerial Ace','','',''],item:''});
  const memory=state.opponentObservations;
  state=battleReducer(state,{type:'selectOpponentSet',setId:'Metagross 1'});
  assert.equal(state.opponentObservations,memory,'viewing a Set never records its moves or item');
  state=observe(state,1,'Meteor Mash');state=observe(state,'item','Leftovers');
  assert.deepEqual(matchupObservations(state),{moves:['Aerial Ace','Meteor Mash','',''],item:'Leftovers'},'explicit compatible observations are accepted even with one Set');
  state=observe(state,1,'');state=observe(state,'item','');
  assert.equal(observe(state,0,'Psychic'),state,'incompatible direct move replacement is rejected');
  assert.ok(!observationChoices(state,0,{replace:false}).includes('Psychic'));
  state=observe(state,0,'');state=observe(state,0,'Psychic');
  assert.deepEqual(possibleMatchupSets(state).map(set=>set.id),['Metagross 4','Metagross 6']);
  assert.deepEqual(matchupObservations(state).moves,['Psychic','','','']);
  assert.deepEqual(identifiedMatchup(state).moves,towerSetById('Metagross 4').moves);
  state=observe(state,'item','Quick Claw');
  assert.equal(possibleMatchupSets(state)[0].id,'Metagross 4');
  state=observe(state,'item','');
  assert.equal(possibleMatchupSets(state).length,2);
  assert.deepEqual(matchupObservations(state).moves,['Psychic','','','']);
  state=observe(state,0,'');
  assert.equal(possibleMatchupSets(state).length,8);
  state=observe(state,'item','Leftovers');
  assert.equal(possibleMatchupSets(state)[0].id,'Metagross 1');
  state=observe(state,0,'Aerial Ace');
  assert.equal(matchupObservations(state).moves[0],'Aerial Ace');
  assert.equal(observe(state,'item','Lum Berry'),state,'cannot overwrite an incompatible item');
  state=observe(state,'item','');
  assert.equal(observe(state,'item','Lum Berry'),state,'other conflicting evidence must also be cleared');
  state=observe(state,0,'');state=observe(state,'item','Lum Berry');
  assert.equal(possibleMatchupSets(state)[0].id,'Metagross 2');
  assert.deepEqual(identifiedMatchup(state).moves,towerSetById('Metagross 2').moves);
  assert.ok(identifiedMatchup(state).moves.includes('Psych Up'));
  assert.deepEqual(matchupObservations(state),{moves:['','','',''],item:'Lum Berry'});
  state=observe(state,'item','');
  assert.equal(possibleMatchupSets(state).length,8);
});


test('opponent slots retain manual evidence positions independently of canonical displayed move order', () => {
  let state={...initial(),team:['player-a','player-b']};
  state=observe(state,2,'Psychic');
  state=observe(state,'item','Quick Claw');
  const a=state.opponentObservations[0];
  assert.deepEqual(a,{moves:['','','Psychic',''],item:'Quick Claw'});
  assert.equal(possibleMatchupSets(state)[0].id,'Metagross 4');
  state=battleReducer(state,{type:'matchupOpponent',speciesId:species('Gardevoir')});
  assert.deepEqual(matchupObservations(state),{moves:['','','',''],item:''});
  state=observe(state,1,'Thunderbolt');
  const b=state.opponentObservations[1];
  assert.deepEqual(b,{moves:['','Thunderbolt','',''],item:''});
  assert.equal(battleReducer(state,{type:'observeOpponent',slot:0,speciesId:species('Metagross'),field:0,value:'Psychic'}),state,
    'a delayed event from A cannot write into active B');
  assert.deepEqual(Object.keys(state.opponentObservations),['0','1'],'memory keys are slot indexes, not species IDs');
  state=battleReducer(state,{type:'matchupOpponent',speciesId:species('Metagross')});
  assert.equal(matchupObservations(state),a);
  assert.equal(identifiedMatchup(state).sets[0].id,'Metagross 4');
  assert.equal(matchupObservations(state).moves[2],'Psychic');
  assert.deepEqual(identifiedMatchup(state).moves,towerSetById('Metagross 4').moves);
  assert.equal(identifiedMatchup(state).moves[2],'Earthquake');
  assert.ok(identifiedMatchup(state).moves.every(Boolean));
  assert.equal(state.opponentObservations[0],a,'reading the displayed Set does not alter manual evidence');
  state=battleReducer(state,{type:'matchupOpponent',speciesId:species('Gardevoir')});
  assert.equal(matchupObservations(state),b);
  const memory=state.opponentObservations;
  state=battleReducer(state,{type:'matchupPlayer',identity:'player-b'});
  assert.equal(state.opponentObservations,memory);
  state=battleReducer(state,{type:'conditionsOpen',open:true});
  state=battleReducer(state,{type:'conditionsOpen',open:false});
  assert.equal(state.opponentObservations,memory);
  state=battleReducer(state,{type:'clearOpponentSpeciesSlot',slot:0,speciesId:species('Metagross')});
  assert.equal(state.opponentObservations[0],undefined);
  assert.equal(state.opponentObservations[1],b);
  state=battleReducer(state,{type:'assignOpponentSpecies',slot:0,speciesId:species('Metagross')});
  state=battleReducer(state,{type:'matchupOpponent',speciesId:species('Metagross')});
  assert.deepEqual(matchupObservations(state),{moves:['','','',''],item:''});
  assert.equal(possibleMatchupSets(state).length,8,'replacement starts unidentified, even with the same species');
  assert.equal(battleReducer(state,{type:'observeOpponent',slot:0,speciesId:species('Gardevoir'),field:0,value:'Psychic'}),state,
    'an event from a different slot occupant cannot supply observations');
  state=battleReducer(state,{type:'clearOpponentSpeciesSlot',slot:0,speciesId:species('Metagross')});
  state=battleReducer(state,{type:'assignOpponentSpecies',slot:2,speciesId:species('Metagross')});
  state=battleReducer(state,{type:'matchupOpponent',speciesId:species('Metagross')});
  assert.deepEqual(matchupObservations(state),{moves:['','','',''],item:''},'same species in another slot never inherits old observations');
  assert.equal(state.opponentObservations[1],b);
});

test('trainer replacement clears every slot even when rosters overlap', () => {
  let state=observe(initial(),0,'Earthquake');
  state=battleReducer(state,{type:'opponentTrainer',key:'Anabel Gold'});
  assert.deepEqual(state.opponentSpecies,[]);
  assert.deepEqual(state.opponentObservations,{});
  assert.equal(state.matchup.opponent,null);
});


test('level-rule changes reset opponent evidence and require a fresh opponent setup', () => {
  let state={...initial(),team:['player-a','player-b'],matchup:{player:'player-a',opponent:species('Metagross')}};
  state=observe(state,2,'Psychic');
  state=battleReducer(state,{type:'matchupOpponent',speciesId:species('Gardevoir')});
  state=observe(state,1,'Thunderbolt');
  assert.deepEqual(Object.keys(state.opponentObservations),['0','1']);
  const team=state.team,reset=state.opponentReset;
  state=battleReducer(state,{type:'rules',patch:{levelMode:'open',openLevel:85}});
  assert.equal(state.rules.opponentLevel,85);assert.equal(state.opponentReset,reset+1);
  assert.equal(state.team,team);assert.equal(state.matchup.player,'player-a');
  assert.equal(state.selectedTrainer,null);assert.equal(state.matchup.opponent,null);
  assert.deepEqual(state.opponentSpecies,[]);assert.deepEqual(state.opponentObservations,{});
  assert.equal(state.selectedOpponentSetId,null);assert.deepEqual(state.opponentSetSelections,{});
  assert.equal(battleReducer(state,{type:'observeOpponent',slot:1,speciesId:species('Gardevoir'),field:1,value:'Thunderbolt'}),state,'old occupant events cannot repopulate cleared evidence');
  state=battleReducer(state,{type:'opponentTrainer',key:'Cooltrainer (M):VINCE'});
  for(const [slot,name] of [[0,'Metagross'],[1,'Gardevoir']]) {
    state=battleReducer(state,{type:'assignOpponentSpecies',slot,speciesId:species(name)});
    state=battleReducer(state,{type:'matchupOpponent',speciesId:species(name)});
    assert.deepEqual(matchupObservations(state),{moves:['','','',''],item:''});
  }
});
