import React, {useReducer} from 'react';
import {createRoot} from 'react-dom/client';
import BattleMatchupConditions from '../../src/ui/components/BattleMatchupConditions.jsx';
import {battleReducer,createBattleState} from '../../src/battle/battleState.js';
import {slotConditions} from '../../src/battle/matchupConditions.js';
import '../../src/ui/styles/base.css';
import '../../src/ui/styles/battle.css';

const initial=battleReducer(createBattleState(),{type:'rules',patch:{format:new URLSearchParams(location.search).get('format') || 'Singles'}});
const pokemon=[
 {identity:'a',id:1,name:'Bulbasaur',ability:'Overgrow',stats:{hp:120}},
 {identity:'b',id:4,name:'Charmander',ability:'Blaze',stats:{hp:140}},
];
function Fixture() {
 const [state,dispatch]=useReducer(battleReducer,{...initial,team:['a','b'],opponentSpecies:[1,4],matchup:{player:'a',opponent:1}});
 const player=pokemon.find(mon=>mon.identity===state.matchup.player),opponent=pokemon.find(mon=>mon.id===state.matchup.opponent);
 return <div className="battle-foundation">
  {state.rules.format==='Doubles' && <button onClick={()=>{
   dispatch({type:'matchupPlayer',identity:state.matchup.player==='a'?'b':'a'});
   dispatch({type:'matchupOpponent',speciesId:state.matchup.opponent===1?4:1});
  }}>Switch pair</button>}
  <BattleMatchupConditions state={state} dispatch={dispatch} player={player} opponent={opponent} hpRange={{min:130,max:150}} />
  <output aria-label="HP state">{JSON.stringify({player:slotConditions(state,'player',state.team.indexOf(state.matchup.player)).currentHp,
   enemy:slotConditions(state,'enemy',state.opponentSpecies.indexOf(state.matchup.opponent)).currentHp})}</output>
 </div>;
}
createRoot(document.getElementById('root')).render(<Fixture />);
