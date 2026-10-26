import React,{useReducer} from 'react';
import {createRoot} from 'react-dom/client';
import BattleMatchup from '../../src/ui/components/BattleMatchup.jsx';
import BattleMatchupConditions from '../../src/ui/components/BattleMatchupConditions.jsx';
import {battleReducer} from '../../src/battle/battleState.js';
import {battleMove} from '../../src/battle/reference.js';
import {calculateAbilityScenarios} from '../../src/battle/abilityScenarios.js';
import {matchupBattleContext} from '../../src/battle/matchupConditions.js';
import {swampert,alexasState,alexasInputs} from './alexasAerodactyl.js';
import '../../src/ui/styles/base.css';
import '../../src/ui/styles/battle.css';
function Fixture(){
 const [state,dispatch]=useReducer(battleReducer,undefined,alexasState),inputs=alexasInputs(state);
 const result=calculateAbilityScenarios(battleMove('Ice Beam'),inputs.player,inputs.opponent,{weather:state.field.weather,battleContext:matchupBattleContext(state,'player')});
 return <main className="battle-foundation" style={{padding:12}}>
  <p>Actual ALEXAS/Aerodactyl data; illustrative level-47 Swampert stats.</p>
  <nav>{['Singles','Doubles'].map(format=><button key={format} onClick={()=>dispatch({type:'rules',patch:{format}})}>Use {format}</button>)}</nav>
  <output aria-label="Diagnostic reason">{result.groups.map(g=>g.reason??'available').join(' / ')}</output>
  <output aria-label="Possible set IDs" style={{overflowWrap:'anywhere'}}>{inputs.identification.sets.map(s=>s.id).join(', ')}</output>
  <BattleMatchup state={state} records={[swampert]} dispatch={dispatch}/>
  <BattleMatchupConditions state={state} dispatch={dispatch} player={swampert} opponent={inputs.opponent} hpRange={inputs.ranges?.hp}/>
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
