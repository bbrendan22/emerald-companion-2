import test from 'node:test';
import assert from 'node:assert/strict';
import {battleReducer, createBattleState} from '../src/battle/battleState.js';
import {availableOpponentSpecies, towerSpecies} from '../src/battle/opponentSpecies.js';

const trainerState = battleReducer(createBattleState(),{type:'opponentTrainer',key:'Anabel Silver'});
const enemySpecies = availableOpponentSpecies(trainerState)[0].id;
const pool = ['a','b','c','d'].map((identity,index)=>({identity,dex:index+1}));
const reduce = (state,type,extra={}) => battleReducer(state,{type,...extra});
function populated() {
  let state = reduce(trainerState,'loadTeam',{team:{name:'Team',ids:['a','b','c']},records:pool});
  return reduce(state,'assignOpponentSpecies',{slot:0,speciesId:enemySpecies});
}
test('team population never selects a matchup; selection changes only the requested position', () => {
  const start = populated();
  assert.deepEqual(start.matchup,{player:null,opponent:null});
  const selected = reduce(start,'matchupPlayer',{identity:'a'});
  assert.deepEqual(selected.matchup,{player:'a',opponent:null});
  assert.equal(selected.team,start.team);assert.equal(selected.opponentSpecies,start.opponentSpecies);
  assert.equal(selected.active,start.active);assert.equal(selected.enemy,start.enemy);
  assert.equal(reduce(selected,'matchupPlayer',{identity:'missing'}),selected);
  assert.equal(reduce(selected,'matchupOpponent',{speciesId:99999}),selected);
  const both = reduce(selected,'matchupOpponent',{speciesId:enemySpecies});
  assert.deepEqual(both.matchup,{player:'a',opponent:enemySpecies});
  assert.equal(reduce(both,'matchupPlayer',{identity:'b'}).matchup.player,'b');
  assert.equal(reduce(both,'rules',{patch:{openLevel:85,levelMode:'open'}}).matchup.opponent,null);
});
test('removing, clearing, or replacing a team clears its matchup without choosing a replacement', () => {
  const start = reduce(reduce(populated(),'matchupPlayer',{identity:'a'}),'matchupOpponent',{speciesId:enemySpecies});
  assert.equal(reduce(start,'clearPlayerSlot',{slot:1,identity:'b'}).matchup.player,'a');
  for (const [type,extra] of [
    ['clearPlayerSlot',{slot:0,identity:'a'}], ['clearPlayerTeam',{}],
    ['loadTeam',{team:{name:'Team',ids:['a','b','c']},records:pool}],
    ['collection',{records:pool.slice(1),pool:pool.slice(1),preserveSlots:true}],
  ]) {
    const next=reduce(start,type,extra);assert.equal(next.matchup.player,null);assert.equal(next.matchup.opponent,start.matchup.opponent);
  }
  for (const [type,extra] of [
    ['clearOpponentSpeciesSlot',{slot:0,speciesId:enemySpecies}],['clearOpponentTrainer',{}],
    ['opponentTrainer',{key:'Anabel Gold'}],['opponentTrainer',{key:'Youngster:BRADY'}],
  ]) {
    const next=reduce(start,type,extra);assert.equal(next.matchup.opponent,null);assert.equal(next.matchup.player,'a');
  }
});
test('Singles hides and clears selections from the fourth slot without selecting another Pokémon', () => {
  let state=reduce(createBattleState(),'rules',{patch:{format:'Doubles'}});
  state=reduce(state,'loadTeam',{team:{name:'Team',ids:['a','b','c','d']},records:pool});
  state=reduce(state,'assignOpponentSpecies',{slot:3,speciesId:enemySpecies});
  state=reduce(reduce(state,'matchupPlayer',{identity:'d'}),'matchupOpponent',{speciesId:enemySpecies});
  assert.deepEqual(reduce(state,'rules',{patch:{format:'Singles'}}).matchup,{player:null,opponent:null});
});
