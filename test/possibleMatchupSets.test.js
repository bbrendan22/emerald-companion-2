import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattleState,battleReducer} from '../src/battle/battleState.js';
import {possibleMatchupSets,frontierSetId,towerSetById,towerSetLabel} from '../src/battle/towerSets.js';
import {frontierPokemon} from '../src/battle/data/frontierPokemon.js';
import {towerTrainerEntries} from '../src/battle/towerTrainers.js';
import {speciesByName} from '../src/battle/reference.js';

test('no selected opponent or a stale matchup has no possible sets',()=>{
  const state=createBattleState();assert.deepEqual(possibleMatchupSets(state),[]);
  assert.deepEqual(possibleMatchupSets({...state,matchup:{player:null,opponent:376}}),[]);
});
test('unrestricted sets use stable species IDs and actual ascending database instance numbers',()=>{
  const species=speciesByName.get('metagross').internalSpeciesId;
  const state={...createBattleState(),opponentSpecies:[species],matchup:{player:null,opponent:species}};
  assert.deepEqual(possibleMatchupSets(state).map(towerSetLabel),Array.from({length:8},(_,index)=>`Metagross ${index+1}`));
  for(const name of new Set(frontierPokemon.map(set=>set.species))){
    const id=speciesByName.get(name.toLowerCase()).internalSpeciesId;
    const next={...state,opponentSpecies:[id],matchup:{player:null,opponent:id}};
    const expected=frontierPokemon.filter(set=>set.species===name).sort((a,b)=>a.instance-b.instance);
    assert.deepEqual(possibleMatchupSets(next).map(frontierSetId),expected.map(frontierSetId));
  }
});
test('every trainer and medal uses only its exact roster sets for each selected species',()=>{
  for(const trainer of towerTrainerEntries){
    const base={...createBattleState(),selectedTrainer:trainer.trainer,selectedBrainSymbol:trainer.symbol};
    const sets=trainer.setIds.map(towerSetById);
    for(const name of new Set(sets.map(set=>set.species))){
      const species=speciesByName.get(name.toLowerCase()).internalSpeciesId;
      const state={...base,opponentSpecies:[species],matchup:{player:null,opponent:species}};
      const before=structuredClone(state);
      const expected=sets.filter(set=>set.species===name).sort((a,b)=>(a.instance??Infinity)-(b.instance??Infinity));
      assert.deepEqual(possibleMatchupSets(state).map(frontierSetId),expected.map(frontierSetId),trainer.key);
      assert.deepEqual(state,before,'deriving possible sets is read-only');
    }
  }
});
test('switching trainers changes eligibility and removing a selected species clears the list',()=>{
  const species=speciesByName.get('metagross').internalSpeciesId;
  const base={...createBattleState(),opponentSpecies:[species],matchup:{player:null,opponent:species}};
  const trainer=towerTrainerEntries.find(entry=>!entry.symbol && entry.setIds.some(id=>towerSetById(id).species==='Metagross') && entry.setIds.filter(id=>towerSetById(id).species==='Metagross').length<4);
  let filtered=battleReducer(base,{type:'opponentTrainer',key:trainer.key});
  assert.deepEqual(filtered.opponentSpecies,[]);
  filtered=battleReducer(filtered,{type:'assignOpponentSpecies',slot:0,speciesId:species});
  filtered=battleReducer(filtered,{type:'matchupOpponent',speciesId:species});
  assert.ok(possibleMatchupSets(filtered).length<4);assert.ok(possibleMatchupSets(filtered).length>0);
  assert.deepEqual(possibleMatchupSets(battleReducer(filtered,{type:'clearOpponentSpeciesSlot',slot:0,speciesId:species})),[]);
  const brain=battleReducer(createBattleState(),{type:'opponentTrainer',key:'Anabel Silver'});
  brain.opponentSpecies=[speciesByName.get('alakazam').internalSpeciesId];
  brain.matchup={player:null,opponent:brain.opponentSpecies[0]};
  assert.deepEqual(possibleMatchupSets(brain).map(towerSetLabel),['Alakazam']);
});
