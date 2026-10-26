import React,{useReducer,useState} from 'react';
import {createRoot} from 'react-dom/client';
import BattleMoveDetails from '../../src/ui/components/BattleMoveDetails.jsx';
import BattleMatchupConditions from '../../src/ui/components/BattleMatchupConditions.jsx';
import {battleReducer,createBattleState} from '../../src/battle/battleState.js';
import {slotConditions} from '../../src/battle/matchupConditions.js';
import {battleMove} from '../../src/battle/reference.js';
import '../../src/ui/styles/base.css';
import '../../src/ui/styles/battle.css';
const own={identity:'player',name:'Player',level:50,types:['NORMAL'],ability:'Immunity',item:'None',currentHp:200,
 stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const other={...own,identity:'enemy',name:'Opponent',stats:{...own.stats,attack:150,spAttack:90}};
const initial={...createBattleState(),team:['player'],opponentSpecies:[1],matchup:{player:'player',opponent:1}};
const options=values=>({status:'uncertain',source:'species',values});
function Fixture(){
 const [state,dispatch]=useReducer(battleReducer,initial),[side,setSide]=useState(null),[mode,setMode]=useState('normal');
 const player={...own,...slotConditions(state,'player',0),...(mode==='guts'?{ability:'Guts'}:mode==='stab'?{types:['GROUND']}:{})};
 const enemy={...other,...slotConditions(state,'enemy',0),...({
  huge:{abilityOptions:options(['Immunity','Huge Power'])},
  levitate:{abilityOptions:options(['Immunity','Levitate'])},
  wonder:{abilityOptions:options(['Immunity','Wonder Guard'])},
  flying:{types:['FLYING']},
  unknown:{ability:null},
 }[mode])};
 return <main className="battle-foundation">
  {['normal','guts','stab','huge','levitate','wonder','flying','unknown'].map(value=><button key={value} onClick={()=>setMode(value)}>{value}</button>)}
  {['Player','Opponent'].map(value=><button key={value} onClick={()=>setSide(value)}>{value} Magnitude</button>)}
  <BattleMatchupConditions state={state} dispatch={dispatch} player={own} opponent={other} hpRange={{min:200,max:200}}/>
  {side&&<BattleMoveDetails move={battleMove('Magnitude')} attacker={side==='Player'?player:enemy} defender={side==='Player'?enemy:player}
   weather={state.field.weather} critical={state.field.critical} onClose={()=>setSide(null)}/>}
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
