import React,{useReducer,useLayoutEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import BattleMatchup from '../../src/ui/components/BattleMatchup.jsx';
import BattleMatchupConditions from '../../src/ui/components/BattleMatchupConditions.jsx';
import {battleReducer} from '../../src/battle/battleState.js';
import {alexasState,alexasInputs,swampert} from './alexasAerodactyl.js';
import '../../src/ui/styles/base.css';
import '../../src/ui/styles/battle.css';
function Fixture(){
 const [state,dispatch]=useReducer((state,action)=>action.type==='fixtureReplace'?action.state:battleReducer(state,action),undefined,alexasState);
 const [player,setPlayer]=useState(swampert);
 useLayoutEffect(()=>{window.frontierFixture={state,dispatch,setPlayer,player};return ()=>{delete window.frontierFixture;};},[state,player]);
 const inputs=alexasInputs(state);
 return <main className="battle-foundation" style={{padding:12}}>
  <p>Canonical Frontier data; illustrative player stats.</p>
  <BattleMatchup state={state} records={[player]} dispatch={dispatch}/>
  <BattleMatchupConditions state={state} dispatch={dispatch} player={player} opponent={inputs.opponent} hpRange={inputs.ranges?.hp}/>
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
