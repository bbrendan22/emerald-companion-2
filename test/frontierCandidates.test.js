import test from 'node:test';
import assert from 'node:assert/strict';
import {frontierMatchupCandidates} from '../src/battle/frontierCandidates.js';
import {possibleMatchupSets,analysisMatchupSets,towerSetById} from '../src/battle/towerSets.js';
import {battleReducer,createBattleState} from '../src/battle/battleState.js';
import {speciesByName,battleMove} from '../src/battle/reference.js';
import {towerTrainerEntries} from '../src/battle/towerTrainers.js';
import {frontierPokemon} from '../src/battle/data/frontierPokemon.js';
import {opponentStatRanges,opponentStatDisplay} from '../src/battle/opponentStats.js';
import {alexasState,observe} from './fixtures/alexasAerodactyl.js';

function select(trainer,name,level=50) {
  let state=battleReducer(createBattleState(),{type:'rules',patch:level===50?{levelMode:'50'}:{levelMode:'open',openLevel:level}});
  state=battleReducer(state,{type:'opponentTrainer',key:trainer});
  const speciesId=speciesByName.get(name.toLowerCase()).internalSpeciesId;
  state=battleReducer(state,{type:'assignOpponentSpecies',slot:0,speciesId});
  return battleReducer(state,{type:'matchupOpponent',speciesId});
}
const choose=(state,setId)=>battleReducer(state,{type:'selectOpponentSet',setId});
const models=state=>frontierMatchupCandidates(state).candidates.map(candidate=>candidate.opponent);

test('ALEXAS candidates preserve exact source eligibility, IDs, typing, items, nature, EVs and scalar stats',()=>{
  for(const format of ['Singles','Doubles']) {
   const base=alexasState(format),sets=possibleMatchupSets(base);
   assert.deepEqual(sets.map(set=>set.id),['Aerodactyl 1','Aerodactyl 2','Aerodactyl 3','Aerodactyl 4']);
   const high={hp:176,attack:160,defense:85,spAttack:72,spDefense:95,speed:171};
   const low={hp:155,attack:157,defense:85,spAttack:112,spDefense:95,speed:150};
   const moves=[['AncientPower','DragonBreath','Aerial Ace','Roar'],['Hyper Beam','Earthquake','Aerial Ace','AncientPower'],
    ['Double Edge','Rock Slide','Fire Blast','Dragon Claw'],['Double Edge','Earthquake','Fire Blast','Bite']];
   for(const [index,set] of sets.entries()) {
    const state=choose(base,set.id),result=frontierMatchupCandidates(state);
    assert.equal(result.availability,'available');assert.equal(result.reason,null);assert.equal(result.candidates.length,1);
    const candidate=result.candidates[0];
    assert.equal(candidate.setId,set.id);assert.equal(candidate.sourceSet,set);assert.equal(candidate.availability,'available');
    assert.equal(candidate.reason,null);
    const mon=candidate.opponent;
    assert.equal(mon.setId,candidate.setId);assert.equal(mon.id,142);assert.equal(mon.dex,142);
    assert.equal(mon.name,'Aerodactyl');assert.deepEqual(mon.types,['ROCK','FLYING']);assert.equal(mon.level,50);
    assert.equal(mon.item,index===1?'Choice Band':'Kings Rock');
    assert.deepEqual(mon.itemProvenance,{source:'frontier-set',setId:candidate.setId});
    assert.equal(mon.nature,index<2?'Adamant':'Hardy');
    assert.deepEqual(mon.evs,index<2?{hp:170,attack:170,defense:0,spAttack:0,spDefense:0,speed:170}
      :{hp:0,attack:255,defense:0,spAttack:255,spDefense:0,speed:0});
    // HP: floor((160+31+42)*.5)+60=176; without HP EVs it is 155.
    // Adamant Attack floors EV170/4 to42, then floors146*110/100 to160.
    assert.deepEqual(mon.stats,index<2?high:low);assert.equal(mon.maximumHp,mon.stats.hp);
    assert.equal(mon.currentHp,mon.maximumHp);assert.equal(mon.friendship,255);
    assert.deepEqual(mon.moves.map(move=>move.name),moves[index]);assert.deepEqual(set.moves,moves[index]);
    assert.deepEqual(mon.abilityOptions.values,['Rock Head','Pressure']);
   }
  }
});

test('ALEXAS IV31 is verified trainer knowledge on every stat, not an assumption',()=>{
  for(const format of ['Singles','Doubles'])for(const set of possibleMatchupSets(alexasState(format))) {
    const mons=models(choose(alexasState(format),set.id));assert.equal(mons.length,1);
    assert.deepEqual(mons[0].ivProvenance,{value:31,source:'trainer',assumed:false});
    assert.deepEqual(mons[0].ivs,{hp:31,attack:31,defense:31,spAttack:31,spDefense:31,speed:31});
  }
});

test('item and move observations filter eligible sets while construction uses only the selected set',()=>{
  for(const format of ['Singles','Doubles']) {
   let state=observe(alexasState(format),'item','Kings Rock');
   assert.deepEqual(possibleMatchupSets(state).map(set=>set.id),['Aerodactyl 1','Aerodactyl 3','Aerodactyl 4']);
   assert.deepEqual(frontierMatchupCandidates(state).candidates.map(c=>c.setId),['Aerodactyl 1']);
   state=choose(state,'Aerodactyl 4');
   state=observe(state,0,'Double Edge');
   assert.deepEqual(possibleMatchupSets(state).map(set=>set.id),['Aerodactyl 3','Aerodactyl 4']);
   assert.deepEqual(frontierMatchupCandidates(state).candidates.map(c=>c.setId),['Aerodactyl 4']);
   state=observe(alexasState(format),'item','Choice Band');
   assert.deepEqual(frontierMatchupCandidates(state).candidates.map(c=>c.setId),['Aerodactyl 2']);
   assert.equal(models(state)[0].item,'Choice Band');
  }
});

test('zero eligible sets stays explicitly unavailable without a broader fallback',()=>{
  for(const state of [createBattleState(),{...alexasState(),opponentObservations:{0:{moves:['Surf','','',''],item:''}}}])
    assert.deepEqual(frontierMatchupCandidates(state),{availability:'unavailable',reason:'no-matching-frontier-sets',candidates:[]});
});

test('ability observations refine alternatives without filtering or singleton inference',()=>{
  const base=alexasState();
  const observed=battleReducer(base,{type:'observeOpponentAbility',slot:0,speciesId:142,value:'Pressure'});
  assert.deepEqual(possibleMatchupSets(observed),possibleMatchupSets(base));
  for(const mon of models(observed))assert.deepEqual(mon.abilityOptions,{status:'known',source:'observation',values:['Pressure']});
  for(const mon of models(observe(base,'item','Choice Band')))
    assert.deepEqual(mon.abilityOptions,{status:'uncertain',source:'observation',values:['Rock Head','Pressure']});
  const absent={...base,opponentObservations:{0:{moves:['','','',''],item:'Choice Band'}}};
  assert.deepEqual(models(absent)[0].abilityOptions.values,['Rock Head','Pressure']);
  const invalid={...base,opponentObservations:{0:{moves:['','','',''],item:'',ability:'Levitate'}}};
  for(const mon of models(invalid))assert.deepEqual(mon.abilityOptions.values,['Rock Head','Pressure']);
});

test('canonical singleton ability text cannot narrow an explicit unresolved observation',()=>{
  const state=observe(alexasState(),'item','Choice Band'),set=towerSetById('Aerodactyl 2');
  const previous=set.possibleAbility;
  try {
    set.possibleAbility='Pressure';
    assert.deepEqual(models(state)[0].abilityOptions.values,['Rock Head','Pressure']);
  } finally {set.possibleAbility=previous;}
});

test('Anabel medal selects only its authorized Brain sets and fixed IV provenance',()=>{
  for(const [medal,value,hp] of [['Silver',24,251],['Gold',31,267]]) {
    const result=frontierMatchupCandidates(select(`Anabel ${medal}`,'Snorlax'));
    assert.equal(result.availability,'available');assert.equal(result.candidates.length,1);
    const candidate=result.candidates[0],mon=candidate.opponent;
    assert.equal(candidate.setId,`Anabel ${medal}:Snorlax`);
    assert.equal(candidate.sourceSet,towerSetById(candidate.setId));
    assert.deepEqual(mon.ivProvenance,{value,source:'brain',assumed:false});
    assert.ok(Object.values(mon.ivs).every(iv=>iv===value));assert.equal(mon.maximumHp,hp);
  }
});

test('trainer and active-species restrictions remain authoritative',()=>{
  const state=alexasState();
  for(const patch of [{selectedTrainer:'unknown'},{selectedTrainer:'Youngster:BRADY'},
    {opponentSpecies:[]},{matchup:{...state.matchup,opponent:speciesByName.get('sunkern').internalSpeciesId}}])
    assert.equal(frontierMatchupCandidates({...state,...patch}).candidates.length,0);
  const changed=select('Youngster:BRADY','Sunkern');
  assert.ok(models(changed).every(mon=>mon.ivProvenance.value===3));
});

test('trainerless selected candidates are retained unavailable, never calculated with assumed IV31',()=>{
  for(const format of ['Singles','Doubles'])for(const set of possibleMatchupSets(alexasState(format))) {
    const state={...choose(alexasState(format),set.id),selectedTrainer:null},result=frontierMatchupCandidates(state);
    assert.equal(possibleMatchupSets(state).length,4);
    assert.equal(result.availability,'unavailable');assert.equal(result.reason,'incomplete-candidate-data');
    assert.equal(result.candidates.length,1);
    const candidate=result.candidates[0];assert.equal(candidate.setId,set.id);assert.equal(candidate.sourceSet,set);
    assert.equal(candidate.reason,'missing-trainer-ivs');assert.equal(candidate.opponent,null);
  }
});

test('a canonical set in a corrupted trainer roster cannot acquire unauthorized IV provenance',()=>{
  const entry=towerTrainerEntries.find(entry=>entry.key==='Anabel Silver');
  const previous=entry.setIds;
  try {
    entry.setIds=[...previous,'Aerodactyl 4'];
    const state=select('Anabel Silver','Aerodactyl');
    assert.deepEqual(possibleMatchupSets(state).map(set=>set.id),['Aerodactyl 4']);
    const result=frontierMatchupCandidates(state);
    assert.equal(result.candidates.length,1);
    assert.equal(result.candidates[0].sourceSet,towerSetById('Aerodactyl 4'));
    assert.equal(result.candidates[0].reason,'unauthorized-frontier-set');
    assert.equal(result.candidates[0].opponent,null);
  } finally {entry.setIds=previous;}
});

test('invalid selected source data retains its entry and reason without affecting other selections',()=>{
  const set=towerSetById('Aerodactyl 4');
  const cases=[
    ['item',null,'missing-or-invalid-candidate-item'],['item','','missing-or-invalid-candidate-item'],
    ['item','invented item','missing-or-invalid-candidate-item'],['nature',null,'invalid-candidate-nature'],
    ['nature','invented nature','invalid-candidate-nature'],['evs',{},'invalid-candidate-evs'],
    ['evs',{...set.evs,atk:256},'invalid-candidate-evs'],['evs',{...set.evs,hp:1},'invalid-candidate-evs'],
    ['evs',{...set.evs,atk:1.5},'invalid-candidate-evs'],['moves',null,'missing-or-invalid-candidate-moves'],
    ['moves',[],'missing-or-invalid-candidate-moves'],
    ['moves',Array(4),'missing-or-invalid-candidate-moves'],
    ['moves',['Bite','Bite','Bite','Bite','Bite'],'missing-or-invalid-candidate-moves'],
    ['moves',['invented move','Bite','Earthquake','Fire Blast'],'missing-or-invalid-candidate-moves'],
    ['species','missing species','invalid-candidate-species'],
    ['brainSet','Anabel Silver','invalid-candidate-iv-source'],
  ];
  for(const format of ['Singles','Doubles'])for(const [key,value,reason] of cases) {
    const state=choose(alexasState(format),set.id);
    const otherStates=[1,2,3].map(index=>choose(alexasState(format),`Aerodactyl ${index}`));
    const previous=set[key];
    try {
      set[key]=value;
      const result=frontierMatchupCandidates(state);
      assert.equal(result.reason,'incomplete-candidate-data');assert.equal(result.candidates.length,1);
      for(const other of otherStates)assert.equal(frontierMatchupCandidates(other).availability,'available');
      const candidate=result.candidates[0];assert.equal(candidate.setId,'Aerodactyl 4');assert.equal(candidate.sourceSet,set);
      assert.equal(candidate.reason,reason,`${key}: ${JSON.stringify(value)}`);assert.equal(candidate.opponent,null);
    } finally {set[key]=previous;}
  }
});

test('only explicit canonical None is no item; missing data never uses the adapter default',()=>{
  const set=towerSetById('Aerodactyl 4'),previous=set.item;
  try {
    set.item='None';
    for(const format of ['Singles','Doubles'])assert.equal(models(choose(alexasState(format),'Aerodactyl 4'))[0].item,'None');
  }
  finally {set.item=previous;}
});

test('invalid level and unsupported facility produce explicit per-candidate failures',()=>{
  for(const format of ['Singles','Doubles'])for(const set of possibleMatchupSets(alexasState(format))) {
   const state=choose(alexasState(format),set.id);
   for(const [patch,reason] of [[{opponentLevel:0},'invalid-opponent-level'],[{opponentLevel:101},'invalid-opponent-level'],
    [{opponentLevel:'50'},'invalid-opponent-level'],[{facility:'Dome'},'unsupported-frontier-facility']]) {
    const changed={...state,rules:{...state.rules,...patch}},result=frontierMatchupCandidates(changed);
    // Selected-Set behavior belongs to Tower; unsupported facilities retain all sources for rejection.
    assert.deepEqual(result.candidates.map(candidate=>candidate.sourceSet),patch.facility?possibleMatchupSets(changed):[set]);
    assert.equal(result.candidates.length,patch.facility?4:1);assert.equal(result.availability,'unavailable');
    assert.ok(result.candidates.every(candidate=>candidate.reason===reason&&candidate.opponent===null));
   }
  }
});

test('invalid Brain IVs are unavailable instead of defaulting or clamping',()=>{
  const state=select('Anabel Silver','Snorlax'),set=possibleMatchupSets(state)[0],previous=set.fixedIVs;
  try {
    for(const value of [undefined,-1,32,1.5]) {
      set.fixedIVs=value;
      assert.equal(frontierMatchupCandidates(state).candidates[0].reason,'missing-verified-ivs');
    }
  } finally {set.fixedIVs=previous;}
});

test('altered canonical IDs are rejected rather than borrowing another set identity',()=>{
  for(const format of ['Singles','Doubles']) {
   const state=choose(alexasState(format),'Aerodactyl 4'),set=towerSetById('Aerodactyl 4'),previous=set.id;
   try {
    set.id='Aerodactyl 1';
    // Corrupt the selected identity too, so the malformed source reaches construction.
    const corrupted={...state,selectedOpponentSetId:set.id,opponentSetSelections:{0:set.id}};
    const result=frontierMatchupCandidates(corrupted);
    assert.equal(result.candidates.length,1);assert.equal(result.candidates[0].sourceSet,set);
    assert.equal(result.candidates[0].reason,'noncanonical-frontier-set');assert.equal(result.candidates[0].opponent,null);
    assert.notEqual(towerSetById(set.id),set,'cannot borrow the real Set 1 identity');
   } finally {set.id=previous;}
  }
});

test('all authorized trainer rosters construct with actual IVs at Level 50 and Open Level 85',()=>{
  for(const trainer of towerTrainerEntries) {
    const names=new Set(trainer.setIds.map(id=>towerSetById(id).species));
    for(const name of names)for(const level of [50,85]) {
      const state=select(trainer.key,name,level);
      for(const set of possibleMatchupSets(state)) {
       const selected=choose(state,set.id??`${set.brainSet}:${set.species}`),result=frontierMatchupCandidates(selected);
       assert.equal(result.availability,'available',`${trainer.key} ${name} ${level}`);
       assert.equal(result.candidates.length,1);assert.equal(result.candidates[0].sourceSet,set);
       assert.deepEqual(result.candidates.map(c=>c.sourceSet),analysisMatchupSets(selected));
       assert.equal(result.candidates[0].opponent.level,level);
       assert.equal(result.candidates[0].opponent.ivProvenance.assumed,false);
      }
    }
  }
});

test('canonical sets with fewer than four moves retain their actual move list',()=>{
  const mon=models(select('Youngster:BRADY','Caterpie'))[0];
  assert.deepEqual(mon.moves.map(move=>move.name),['Tackle','String Shot']);
});

test('friendship remains correlated with each canonical move list',()=>{
  const set=frontierPokemon.find(set=>set.moves.includes('Frustration'));
  const trainer=towerTrainerEntries.find(trainer=>trainer.setIds.includes(set.id));
  const result=frontierMatchupCandidates(select(trainer.key,set.species));
  for(const candidate of result.candidates)
    assert.equal(candidate.opponent.friendship,candidate.sourceSet.moves.includes('Frustration')?0:255);
});

test('construction leaves state, observations, canonical records and display ranges unchanged',()=>{
  const state=alexasState(),sets=possibleMatchupSets(state);
  const beforeState=structuredClone(state),beforeSets=structuredClone(sets);
  const beforeDisplay=opponentStatDisplay(opponentStatRanges(state));
  const first=frontierMatchupCandidates(state),second=frontierMatchupCandidates(state);
  assert.deepEqual(state,beforeState);assert.deepEqual(sets,beforeSets);assert.deepEqual(first,second);
  assert.deepEqual(opponentStatDisplay(opponentStatRanges(state)),beforeDisplay);
  assert.equal(beforeDisplay.hp,'155–176');
  const mon=first.candidates[0].opponent;
  mon.evs.hp=0;mon.ivs.hp=0;mon.ivProvenance.value=0;mon.types[0]='NORMAL';
  mon.stats.hp=1;mon.moves[0].name='changed';mon.abilityOptions.values.pop();
  assert.deepEqual(sets,beforeSets);assert.deepEqual(state,beforeState);
  assert.deepEqual(frontierMatchupCandidates(state),second);
  assert.equal(battleMove('AncientPower').name,'AncientPower');
});

test('Singles and Doubles construction has identical correlated inputs without projecting conditions',()=>{
  const singles=alexasState(),doubles=alexasState('Doubles');
  assert.deepEqual(frontierMatchupCandidates(singles),frontierMatchupCandidates(doubles));
  const changed=battleReducer(singles,{type:'matchupCondition',side:'enemy',slot:0,field:'currentHp',value:100,max:176});
  assert.deepEqual(frontierMatchupCandidates(changed),frontierMatchupCandidates(singles));
});
