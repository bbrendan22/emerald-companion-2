import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {battleReducer as reduce,createBattleState} from '../src/battle/battleState.js';
import {availableOpponentSpecies} from '../src/battle/opponentSpecies.js';
const records=[
 {identity:'a',name:'Swampert',dex:260,level:50,types:['WATER','GROUND'],ability:'Torrent',stats:{hp:180,attack:100,defense:100,spAttack:100,spDefense:100,speed:100},moves:[]},
 {identity:'b',name:'Swellow',dex:277,level:50,types:['NORMAL','FLYING'],ability:'Guts',stats:{hp:150,attack:100,defense:100,spAttack:100,spDefense:100,speed:100},moves:[]},
];
test('large sprite controls appear only for populated Doubles pairs and all four viewed combinations preserve state',async()=>{
 const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
 try {
  const {default:Matchup}=await server.ssrLoadModule('/src/ui/components/BattleMatchup.jsx');
  let state=reduce(createBattleState(),{type:'selectSinglesPlayer',identity:'a',pool:records});
  const render=()=>renderToStaticMarkup(React.createElement(Matchup,{state,records,dispatch:()=>{}}));
  assert.doesNotMatch(render(),/battle-sprite-switch|battle-sprite-dots/);
  state=reduce(state,{type:'rules',patch:{format:'Doubles'}});
  state=reduce(state,{type:'selectDoublesPlayer',slot:1,identity:'b',pool:records});
  assert.doesNotMatch(render(),/battle-sprite-switch/);
  state=reduce(state,{type:'selectDoublesPlayer',slot:0,identity:'a',pool:records});
  state=reduce(state,{type:'opponentTrainer',key:'Expert (M):ALEXAS'});
  const species=availableOpponentSpecies(state);
  for(const slot of [0,1])state=reduce(state,{type:'selectDoublesOpponent',slot,speciesId:species[slot].id});
  const before=state;
  for(const player of [0,1])for(const opponent of [0,1]) {
   state=reduce(state,{type:'viewDoublesSlot',side:'player',slot:player});
   state=reduce(state,{type:'viewDoublesSlot',side:'opponent',slot:opponent});
   const html=render();
   assert.match(html,new RegExp(`currently ${records[player].name}, Slot ${player+1}`));
   assert.match(html,new RegExp(`currently ${species[opponent].name}, Slot ${opponent+1}`));
   assert.equal((html.match(/class="battle-active-artwork battle-sprite-switch"/g)||[]).length,2);
   for(const key of ['team','opponentSpecies','opponentObservations','opponentSetSelections','matchupConditions','matchupSides','field'])assert.equal(state[key],before[key],key);
  }
 } finally {await server.close();}
});
