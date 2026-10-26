import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {battleReducer as reduce,createBattleState} from '../src/battle/battleState.js';
import {availableOpponentSpecies} from '../src/battle/opponentSpecies.js';
import {possibleMatchupSets,frontierSetId} from '../src/battle/towerSets.js';
const pool=[{identity:'a',name:'Ditto',level:50},{identity:'b',name:'Ditto',level:50}];

test('Doubles renders two independent native slot controls and filtered canonical Set controls',async()=>{
 const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
 try {
  const {default:Selection}=await server.ssrLoadModule('/src/ui/components/BattlePokemonSelection.jsx');
  let state=reduce(createBattleState(),{type:'rules',patch:{format:'Doubles'}});
  const render=()=>renderToStaticMarkup(React.createElement(Selection,{state,frontierPool:pool}));
  assert.equal((render().match(/Select my Pokémon Slot/g)||[]).length,2);
  state=reduce(state,{type:'opponentTrainer',key:'Expert (M):ALEXAS'});
  assert.ok(state.opponentSpecies.every(id=>!id));
  const species=availableOpponentSpecies(state);
  for(const slot of [0,1]) {
   state=reduce(state,{type:'selectDoublesPlayer',slot,identity:pool[slot].identity,pool});
   state=reduce(state,{type:'selectDoublesOpponent',slot,speciesId:species[slot].id});
  }
  assert.match(render(),/value="a" disabled=""/);
  const projected=slot=>({...state,matchup:{...state.matchup,opponent:state.opponentSpecies[slot]}});
  const second=possibleMatchupSets(projected(1)).at(-1);
  state=reduce(state,{type:'selectOpponentSet',slot:1,setId:frontierSetId(second)});
  let html=render();
  assert.match(html,new RegExp(`value="${frontierSetId(second)}" selected=""`));
  assert.match(html,/Select opponent set Slot 1/);assert.match(html,/Select opponent set Slot 2/);
  const first=possibleMatchupSets(projected(0))[0];
  state=reduce(state,{type:'observeOpponent',slot:0,speciesId:species[0].id,field:'item',value:first.item});
  for(const [field,value] of first.moves.entries()) {
   state=reduce(state,{type:'observeOpponent',slot:0,speciesId:species[0].id,field,value});
  }
  const firstSets=possibleMatchupSets(projected(0));
  assert.equal(firstSets.length,1);
  html=render();
  const row1=html.split('class="battle-opponent-selectors"')[1];
  for(const set of firstSets)assert.ok(row1.includes(firstSets.length===1 ? `Set ${set.instance}` : `value="${frontierSetId(set)}"`));
  assert.equal(state.opponentSetSelections[1],frontierSetId(second));
  if(firstSets.length===1) {
   assert.match(row1,/battle-set-static/);assert.doesNotMatch(row1,/Select opponent set Slot 1/);
  }
  state=reduce(state,{type:'selectDoublesOpponent',slot:0,speciesId:null});
  assert.equal(state.opponentSpecies[1],species[1].id);
  assert.equal(state.opponentSetSelections[1],frontierSetId(second));
  state=reduce(state,{type:'rules',patch:{format:'Singles'}});
  const singles=render();assert.doesNotMatch(singles,/Slot 1|Slot 2|battle-doubles-selection/);
  assert.equal((singles.match(/class="battle-pokemon-select"/g)||[]).length,2);
 } finally {await server.close();}
});
