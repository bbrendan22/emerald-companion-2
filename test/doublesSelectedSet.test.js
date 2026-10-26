import test from 'node:test';
import assert from 'node:assert/strict';
import {battleReducer as reduce,createBattleState} from '../src/battle/battleState.js';
import {analysisMatchupSets,possibleMatchupSets,eligibleMatchupSets,identifiedMatchup,frontierSetId,matchupObservations,observationChoices} from '../src/battle/towerSets.js';
import {frontierMatchupCandidates} from '../src/battle/frontierCandidates.js';
import {evaluateFrontierCandidates} from '../src/battle/frontierCandidateDamage.js';
import {battleMove} from '../src/battle/reference.js';
import {availableOpponentSpecies} from '../src/battle/opponentSpecies.js';
import {alexasState,swampert} from './fixtures/alexasAerodactyl.js';
const view=(s,slot)=>reduce(s,{type:'viewDoublesSlot',side:'opponent',slot});
const choose=(s,slot,set)=>reduce(s,{type:'selectOpponentSet',slot,setId:frontierSetId(set)});
function twoOpponents() {
 let s=alexasState('Doubles');
 const aggron=availableOpponentSpecies(s).find(mon=>mon.name==='Aggron');
 s=reduce(s,{type:'selectDoublesOpponent',slot:1,speciesId:aggron.id});
 return view(s,0);
}
const setsAt=(s,slot)=>possibleMatchupSets({...s,matchup:{...s.matchup,opponent:s.opponentSpecies[slot]}});

test('Aerodactyl Set 4 supplies the sole canonical candidate and both damage directions',()=>{
 let s=alexasState('Doubles');const set=possibleMatchupSets(s).find(set=>set.instance===4);
 s=choose(s,0,set);
 const built=frontierMatchupCandidates(s);
 assert.equal(built.candidates.length,1);assert.equal(built.candidates[0].sourceSet,set);
 const mon=built.candidates[0].opponent;
 assert.equal(mon.setId,'Aerodactyl 4');assert.equal(mon.item,'Kings Rock');
 assert.deepEqual(mon.stats,{hp:155,attack:157,defense:85,spAttack:112,spDefense:95,speed:150});
 assert.deepEqual(mon.moves.map(move=>move.name),set.moves);
 assert.deepEqual(identifiedMatchup(s).moves,set.moves);assert.equal(identifiedMatchup(s).item,set.item);
 for(const direction of ['player','enemy']) {
  const move=battleMove(direction==='player'?'Ice Beam':set.moves[0]);
  const result=evaluateFrontierCandidates(s,swampert,move,{direction});
  assert.equal(result.evaluations.length,1);assert.equal(result.evaluations[0].setId,'Aerodactyl 4');
  assert.equal(result.evaluations[0].availability,'available');
  assert.ok(result.evaluations[0].abilityDamage.scenarios.every(scenario=>scenario.result?.rolls?.length===16));
 }
 assert.ok(possibleMatchupSets(s).length>1,'analysis must not narrow evidence');
 assert.deepEqual(s.opponentObservations,{});
});

test('opponent slots retain independent sets through repeated views and unviewed set changes',()=>{
 let s=twoOpponents();const a=setsAt(s,0).at(-1),b=setsAt(s,1)[1];
 s=choose(choose(s,0,a),1,b);
 for(const slot of [0,1,0,1]) {
  s=view(s,slot);assert.deepEqual(analysisMatchupSets(s),[slot===0?a:b]);
  assert.equal(frontierMatchupCandidates(s).candidates[0].sourceSet,slot===0?a:b);
 }
 const before=s,other=setsAt(s,0)[0];s=choose(s,0,other);
 assert.equal(s.matchup,before.matchup);assert.equal(s.viewed,before.viewed);
 assert.equal(s.opponentSetSelections[1],frontierSetId(b));assert.deepEqual(analysisMatchupSets(s),[b]);
 s=view(s,0);assert.deepEqual(analysisMatchupSets(s),[other]);
});

test('Set changes preserve independent evidence and observations still filter all eligible sets',()=>{
 let s=twoOpponents();const sets=setsAt(s,0);
 const shared=sets.flatMap(set=>set.moves).find(move=>sets.filter(set=>set.moves.includes(move)).length>1);
 s=reduce(s,{type:'observeOpponent',slot:0,speciesId:s.opponentSpecies[0],field:0,value:shared});
 s=view(s,1);const b=possibleMatchupSets(s)[0];
 s=reduce(s,{type:'observeOpponent',slot:1,speciesId:s.opponentSpecies[1],field:'item',value:b.item});
 const evidence=s.opponentObservations,choices=observationChoices(s,0,{replace:false});
 s=view(s,0);const compatible=possibleMatchupSets(s);assert.ok(compatible.length>1);
 for(const set of compatible) {
  s=choose(s,0,set);assert.equal(s.opponentObservations,evidence);
  assert.deepEqual(analysisMatchupSets(s),[set]);
  assert.deepEqual(possibleMatchupSets(s),compatible);
 }
 s=view(s,1);assert.deepEqual(observationChoices(s,0,{replace:false}),choices);
 assert.equal(matchupObservations(s).item,b.item);assert.equal(s.opponentObservations,evidence);
});

test('eliminated or incompatible sets cannot override observations, including external recovery',()=>{
 let s=alexasState('Doubles');const sets=possibleMatchupSets(s),target=sets.find(set=>set.instance===2);
 s=choose(s,0,sets.at(-1));
 s=reduce(s,{type:'observeOpponent',slot:0,speciesId:s.opponentSpecies[0],field:'item',value:target.item});
 assert.deepEqual(analysisMatchupSets(s),[target]);const evidence=s.opponentObservations;
 assert.equal(choose(s,0,sets.at(-1)),s);assert.equal(s.opponentObservations,evidence);
 s={...s,opponentObservations:{0:{moves:['','','',''],item:'Impossible item'}}};
 assert.deepEqual(analysisMatchupSets(s),[]);assert.equal(frontierMatchupCandidates(s).candidates.length,0);
});

test('a selected set retains species ability uncertainty; explicit ability evidence refines it separately',()=>{
 let s=choose(alexasState('Doubles'),0,{id:'Aerodactyl 4'});
 let mon=frontierMatchupCandidates(s).candidates[0].opponent;
 assert.equal(mon.abilityOptions.status,'uncertain');assert.deepEqual(mon.abilityOptions.values,['Rock Head','Pressure']);
 let result=evaluateFrontierCandidates(s,swampert,battleMove('Ice Beam'));
 assert.deepEqual(result.evaluations[0].abilityDamage.scenarios.map(s=>s.defenderAbility),['Rock Head','Pressure']);
 s=reduce(s,{type:'observeOpponentAbility',slot:0,speciesId:s.opponentSpecies[0],value:'Pressure'});
 mon=frontierMatchupCandidates(s).candidates[0].opponent;
 assert.deepEqual(mon.abilityOptions.values,['Pressure']);assert.equal(s.opponentSetSelections[0],'Aerodactyl 4');
});

test('Singles selected-set behavior and Frontier Brain canonical construction remain intact',()=>{
 let s=alexasState();const set=possibleMatchupSets(s).at(-1);
 s=reduce(s,{type:'selectOpponentSet',setId:frontierSetId(set)});
 assert.deepEqual(analysisMatchupSets(s),[set]);assert.equal(frontierMatchupCandidates(s).candidates[0].sourceSet,set);
 s=reduce(createBattleState(),{type:'opponentTrainer',key:'Anabel Silver'});
 const mon=availableOpponentSpecies(s)[0];s=reduce(s,{type:'selectSinglesOpponent',speciesId:mon.id});
 assert.equal(eligibleMatchupSets(s).length,1);
 const candidate=frontierMatchupCandidates(s).candidates[0];
 assert.equal(candidate.availability,'available');assert.equal(candidate.sourceSet.brainSet,'Anabel Silver');
 assert.equal(candidate.opponent.ivProvenance.source,'brain');
});
