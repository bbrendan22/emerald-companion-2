import test from 'node:test';
import assert from 'node:assert/strict';
import {emeraldStat} from '../src/battle/stats.js';
import {opponentStatRanges,opponentStatDisplay} from '../src/battle/opponentStats.js';
import {battleReducer,createBattleState} from '../src/battle/battleState.js';
import {towerTrainerEntries} from '../src/battle/towerTrainers.js';
import {frontierTrainers} from '../src/battle/data/frontierTrainers.js';
import {possibleMatchupSets,towerSetById} from '../src/battle/towerSets.js';
import {speciesByName} from '../src/battle/reference.js';
import {frontierSetStats} from '../src/battle/frontierAdapter.js';
const reduce=(state,type,extra={})=>battleReducer(state,{type,...extra});
const select=(trainer,name,level=50)=>{
 let state=reduce(createBattleState(),'rules',{patch:level===50?{levelMode:'50'}:{levelMode:'open',openLevel:level}});
 state=reduce(state,'opponentTrainer',{key:trainer});
 const speciesId=speciesByName.get(name.toLowerCase()).internalSpeciesId;
 state=reduce(state,'assignOpponentSpecies',{slot:0,speciesId});
 return reduce(state,'matchupOpponent',{speciesId});
};
test('Gen III hand-calculated HP, nature, EV flooring, level and Shedinja examples',()=>{
 assert.equal(emeraldStat(100,'hp',31,252,50,'Adamant'),207);
 assert.equal(emeraldStat(100,'attack',31,252,50,'Adamant'),167);
 assert.equal(emeraldStat(100,'spAttack',31,252,50,'Adamant'),136);
 assert.equal(emeraldStat(100,'speed',31,255,50,'Hardy'),152);
 assert.equal(emeraldStat(100,'speed',31,3,50,'Hardy'),120);
 assert.equal(emeraldStat(100,'speed',31,4,50,'Hardy'),121);
 assert.equal(emeraldStat(100,'attack',31,252,85,'Adamant'),279);
 assert.equal(emeraldStat(100,'hp',31,252,100,'Hardy'),404);
 assert.equal(emeraldStat(1,'hp',31,255,100,'Hardy',true),1);
});
test('every stored standard tier matches cartridge trainer ID boundaries',()=>{
 frontierTrainers.forEach((trainer,index)=>assert.equal(trainer.ivs,index<100?3:index<120?6:index<140?9:index<160?12:index<180?15:index<200?18:index<220?21:31));
 for(const iv of [3,6,9,12,15,18,21,31]) {
  const trainer=frontierTrainers.find(t=>t.ivs===iv),set=towerSetById(trainer.pokemonSetIds[0]);
  const ranges=opponentStatRanges(select(`${trainer.trainerClass}:${trainer.name}`,set.species));
  const expected=frontierSetStats(set,50,iv);
  for(const key of Object.keys(expected))assert.ok(ranges[key].min<=expected[key]&&ranges[key].max>=expected[key]);
 }
});
test('all trainer rosters have complete inputs and hybrid ranges use their actual sets at 50 and 85',()=>{
 for(const trainer of towerTrainerEntries) {
  const sets=trainer.setIds.map(towerSetById);
  for(const name of new Set(sets.map(s=>s.species))) {
   for(const level of [50,85]) {
    const state=select(trainer.key,name,level);
    const ranges=opponentStatRanges(state);assert.ok(ranges,`${trainer.key} ${name}`);
    const candidates=sets.filter(s=>s.species===name).map(s=>frontierSetStats(s,level,s.brainSet?s.fixedIVs:frontierTrainers.find(t=>`${t.trainerClass}:${t.name}`===trainer.key).ivs));
    for(const key of Object.keys(ranges))assert.deepEqual(ranges[key],{min:Math.min(...candidates.map(s=>s[key])),max:Math.max(...candidates.map(s=>s[key]))});
   }
  }
 }
});
test('Anabel fixed IVs match known cartridge values; no trainer never assumes 31',()=>{
 const silver=opponentStatDisplay(opponentStatRanges(select('Anabel Silver','Alakazam')));
 assert.deepEqual(silver,{hp:140,attack:60,defense:81,spAttack:180,spDefense:102,speed:156});
 const gold=opponentStatDisplay(opponentStatRanges(select('Anabel Gold','Snorlax')));
 assert.deepEqual(gold,{hp:267,attack:178,defense:85,spAttack:77,spDefense:130,speed:50});
 assert.equal(opponentStatDisplay(opponentStatRanges(select('Youngster:BRADY','Sunkern'))).hp,123);
 assert.equal(opponentStatRanges(createBattleState()),null);
});
test('observations narrow ranges; equal stats stay exact, one set is exact, slot switching restores ranges',()=>{
 let state=select('Cooltrainer (M):VINCE','Metagross');
 const initial=opponentStatRanges(state),display=opponentStatDisplay(initial);
 assert.ok(Object.values(display).some(v=>typeof v==='string'&&v.includes('–')));
 assert.ok(Object.values(display).some(v=>typeof v==='number'));
 const speciesId=speciesByName.get('gardevoir').internalSpeciesId;
 state=reduce(state,'assignOpponentSpecies',{slot:1,speciesId});
 state=reduce(state,'observeOpponent',{field:2,value:'Psychic'});
 const narrowed=opponentStatRanges(state);
 assert.equal(reduce(state,'observeOpponent',{field:2,value:'Aerial Ace'}),state,'incompatible replacement retains Psychic evidence');
 const cleared=reduce(state,'observeOpponent',{field:2,value:''});
 const changed=reduce(cleared,'observeOpponent',{field:2,value:'Aerial Ace'});
 assert.deepEqual(changed.opponentObservations[0].moves,['','','Aerial Ace','']);
 assert.equal(possibleMatchupSets(changed).length,1);
 assert.ok(Object.values(opponentStatDisplay(opponentStatRanges(changed))).every(Number.isInteger));
 for(const key of Object.keys(initial))assert.ok(narrowed[key].min>=initial[key].min&&narrowed[key].max<=initial[key].max);
 state=reduce(state,'observeOpponent',{field:'item',value:'Quick Claw'});
 assert.equal(possibleMatchupSets(state).length,1);
 const exact=opponentStatDisplay(opponentStatRanges(state));assert.ok(Object.values(exact).every(Number.isInteger));
 const memory=structuredClone(state.opponentObservations);
 state=reduce(state,'matchupOpponent',{speciesId});
 assert.notDeepEqual(opponentStatDisplay(opponentStatRanges(state)),exact);
 state=reduce(state,'matchupOpponent',{speciesId:speciesByName.get('metagross').internalSpeciesId});
 assert.deepEqual(opponentStatDisplay(opponentStatRanges(state)),exact);assert.deepEqual(state.opponentObservations,memory);
 state=reduce(state,'observeOpponent',{field:'item',value:''});assert.deepEqual(opponentStatRanges(state),narrowed);
 state=reduce(state,'observeOpponent',{field:2,value:''});assert.deepEqual(opponentStatRanges(state),initial);
 const conflict={...state,opponentObservations:{0:{moves:['Surf','','',''],item:''}}};
 assert.deepEqual(possibleMatchupSets(conflict),[]);assert.ok(Object.values(opponentStatDisplay(opponentStatRanges(conflict))).every(v=>v==='—'));
 const set=possibleMatchupSets(state)[0];
 for(const bad of [{...set,nature:null},{...set,evs:{}},{...set,species:'missing'}])assert.equal(opponentStatRanges(state,[bad]),null);
});
