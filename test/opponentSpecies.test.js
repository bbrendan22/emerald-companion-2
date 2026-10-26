import test from 'node:test';
import assert from 'node:assert/strict';
import {availableOpponentSpecies, towerSpecies} from '../src/battle/opponentSpecies.js';
import {createBattleState, battleReducer} from '../src/battle/battleState.js';
import {towerTrainerEntries} from '../src/battle/towerTrainers.js';
import {availableTowerSets,towerSetById} from '../src/battle/towerSets.js';
import {speciesByName} from '../src/battle/reference.js';
import {loadOpponentSpecies, storeOpponentSpecies} from '../src/storage/opponentSpecies.js';

test('species lookup deduplicates and alphabetizes all Tower species and every trainer pool', () => {
  const initial = createBattleState();
  assert.deepEqual(availableOpponentSpecies(initial).map(mon=>mon.name),[...new Set(availableTowerSets(initial).map(s=>s.species))].sort((a,b)=>a.localeCompare(b)));
  for (const entry of towerTrainerEntries) {
    const state = battleReducer(initial, {type:'opponentTrainer', key:entry.key});
    const species = availableOpponentSpecies(state);
    const names = [...new Set(entry.setIds.map(id => towerSetById(id).species))].sort((a,b) => a.localeCompare(b));
    assert.deepEqual(species.map(mon => mon.name), names, entry.key);
    assert.equal(new Set(species.map(mon => mon.id)).size, species.length);
    assert.ok(species.every(mon => Number.isInteger(mon.id) && towerSpecies.some(all => all.id === mon.id)));
  }
  assert.deepEqual(towerSpecies.map(mon => mon.name), [...new Set(towerSpecies.map(mon => mon.name))].sort((a,b) => a.localeCompare(b)));
  assert.deepEqual(availableOpponentSpecies({...initial,selectedTrainer:'Anabel',selectedBrainSymbol:'Silver'}, '  aLaK  ').map(mon => mon.name), ['Alakazam']);
  assert.deepEqual(availableOpponentSpecies(initial, 'no-such-species'), []);
});

test('species occupy exact slots, never assign sets, and clear on rule changes', () => {
  let state = battleReducer(createBattleState(),{type:'opponentTrainer',key:'Cooltrainer (M):VINCE'});
  const [first, second, third] = availableOpponentSpecies(state);
  const assign = (slot, speciesId) => {state = battleReducer(state, {type:'assignOpponentSpecies', slot, speciesId});};
  assign(2, first.id); assign(0, second.id);
  assert.deepEqual(state.opponentSpecies, [second.id, null, first.id]);
  assert.deepEqual(state.opponents, []); assert.equal(state.enemy, null);
  const original = state;
  for (const action of [
    {type:'assignOpponentSpecies',slot:0,speciesId:first.id},
    {type:'assignOpponentSpecies',slot:3,speciesId:first.id},
    {type:'assignOpponentSpecies',slot:-1,speciesId:first.id},
    {type:'assignOpponentSpecies',slot:1,speciesId:'Alakazam'},
    {type:'assignOpponentSpecies',slot:1,speciesId:99999},
    {type:'clearOpponentSpeciesSlot',slot:0,speciesId:first.id},
  ]) assert.equal(battleReducer(original, action), original);
  state = battleReducer(state, {type:'opponentTrainer',key:'Youngster:BRADY'});
  const unavailable = towerSpecies.find(mon => !availableOpponentSpecies(state).some(allowed => allowed.id === mon.id));
  assert.equal(battleReducer(state,{type:'assignOpponentSpecies',slot:1,speciesId:unavailable.id}),state);
  state = battleReducer(state, {type:'clearOpponentTrainer'});
  assert.deepEqual(state.opponentSpecies, []);
  state = battleReducer(original, {type:'rules',patch:{format:'Doubles'}});
  assert.deepEqual(state.opponentSpecies,[]);
  assign(3, third.id);
  assert.equal(state.opponentSpecies[3],third.id);
  state = battleReducer(state, {type:'rules',patch:{format:'Singles'}});
  assert.deepEqual(state.opponentSpecies,[]);
  state = battleReducer(state, {type:'rules',patch:{format:'Doubles'}});
  assert.deepEqual(state.opponentSpecies,[]);
  assert.deepEqual(state.opponents, []); assert.equal(state.enemy, null);
});

test('opponent species persistence retains stable IDs and holes, sanitizing stale or malformed data', () => {
  let saved = null;
  const storage = {getItem:() => saved, setItem:(_,value) => {saved = value;}};
  const ids = [towerSpecies[0].id,null,towerSpecies[1].id];
  assert.equal(storeOpponentSpecies(storage,ids), true);
  assert.deepEqual(loadOpponentSpecies(storage),ids);
  saved = JSON.stringify([ids[0],99999,'Alakazam',null,ids[2]]);
  assert.deepEqual(loadOpponentSpecies(storage),[ids[0],null,null,null]);
  for (const invalid of ['{', '{}', 'null']) {saved=invalid; assert.deepEqual(loadOpponentSpecies(storage),[]);}
  assert.deepEqual(loadOpponentSpecies({getItem(){throw Error();}}),[]);
  assert.equal(storeOpponentSpecies({setItem(){throw Error();}},ids),false);
});

test('Anabel Silver and Gold start with empty slots and preserve My Team', () => {
  for (const format of ['Singles']) {
    let state = battleReducer(createBattleState(), {type:'rules',patch:{format}});
    state = {...state, team:['owned'], opponentSpecies:[towerSpecies[0].id,null,null,towerSpecies[1].id]};
    for (const symbol of ['Silver','Gold']) {
      const entry = towerTrainerEntries.find(trainer => trainer.key === `Anabel ${symbol}`);
      state = battleReducer(state, {type:'opponentTrainer',key:entry.key});
      assert.deepEqual(state.opponentSpecies,[]);
      assert.deepEqual(state.opponents,[]); assert.equal(state.enemy,null);
      assert.deepEqual(state.team,['owned']); assert.equal(state.rules.format,format);
    }
    state = battleReducer(state, {type:'clearOpponentTrainer'});
    assert.deepEqual(state.opponentSpecies,[]);
    assert.equal(state.selectedTrainer,null);
  }
});

 test('independent search accepts species without a trainer and rejects unknown trainer fallback', () => {
  const initial=createBattleState();
  assert.equal(battleReducer(initial,{type:'assignOpponentSpecies',slot:0,speciesId:towerSpecies[0].id}).opponentSpecies[0],towerSpecies[0].id);
  assert.deepEqual(availableOpponentSpecies({...initial,selectedTrainer:'missing-trainer'}),[]);
  for(const entry of towerTrainerEntries) {
    const selected=battleReducer(initial,{type:'opponentTrainer',key:entry.key});
    assert.deepEqual(selected.opponentSpecies,[],entry.key);
    assert.equal(battleReducer(selected,{type:'opponentTrainer',key:entry.key}),selected);
  }
 });
