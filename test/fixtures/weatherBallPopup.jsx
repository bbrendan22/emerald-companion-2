import React,{useReducer,useState} from 'react';
import {createRoot} from 'react-dom/client';
import BattleMoveDetails from '../../src/ui/components/BattleMoveDetails.jsx';
import BattleMatchupConditions from '../../src/ui/components/BattleMatchupConditions.jsx';
import {battleReducer,createBattleState} from '../../src/battle/battleState.js';
import {battleMove} from '../../src/battle/reference.js';
import '../../src/ui/styles/base.css';
import '../../src/ui/styles/battle.css';
const player={identity:'player',name:'Snorlax',dex:143,level:50,types:['NORMAL'],ability:'Immunity',item:'None',currentHp:200,
 stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const enemy={...player,id:143,name:'Opponent Snorlax',stats:{...player.stats,attack:150,spAttack:90}};
const initial={...createBattleState(),team:['player'],opponentSpecies:[143],matchup:{player:'player',opponent:143}};
function Fixture(){
 const [state,dispatch]=useReducer(battleReducer,initial),[side,setSide]=useState(null);
 return <main className="battle-foundation">
  <button onClick={()=>setSide('player')}>Player Weather Ball</button><button onClick={()=>setSide('enemy')}>Opponent Weather Ball</button>
  <BattleMatchupConditions state={state} dispatch={dispatch} player={player} opponent={enemy} hpRange={{min:200,max:200}}/>
  {side&&<BattleMoveDetails move={battleMove('Weather Ball')} attacker={side==='player'?player:enemy} defender={side==='player'?enemy:player}
   weather={state.field.weather} critical={state.field.critical} onClose={()=>setSide(null)}/>}
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
