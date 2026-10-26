import React,{useReducer,useState} from 'react';
import {createRoot} from 'react-dom/client';
import BattleMoveDetails from '../../src/ui/components/BattleMoveDetails.jsx';
import BattleMatchupConditions from '../../src/ui/components/BattleMatchupConditions.jsx';
import {battleReducer,createBattleState} from '../../src/battle/battleState.js';
import {slotConditions} from '../../src/battle/matchupConditions.js';
import {battleMove} from '../../src/battle/reference.js';
import '../../src/ui/styles/base.css';
import '../../src/ui/styles/battle.css';
const own={identity:'player',name:'Snorlax',dex:143,level:50,types:['NORMAL'],ability:'Immunity',item:'None',stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const other={identity:'enemy',name:'Opponent',level:50,types:['NORMAL'],ability:'Immunity',item:'None',stats:{...own.stats,attack:150,spAttack:150}};
const initial={...createBattleState(),team:['player'],opponentSpecies:[1],matchup:{player:'player',opponent:1}};
const moves=[3,4,31,42,131,140,154,198,292,331,333,350].map(battleMove);
function Fixture(){
 const [state,dispatch]=useReducer(battleReducer,initial),[selected,setSelected]=useState(null),[mode,setMode]=useState('known');
 const player={...own,...slotConditions(state,'player',0)};
 const enemy={...other,...slotConditions(state,'enemy',0),...(mode==='ghost'?{types:['GHOST']}
  :mode==='fat'?{abilityOptions:{status:'uncertain',source:'species',values:['Immunity','Thick Fat']}}
  :mode==='contact'?{abilityOptions:{status:'uncertain',source:'species',values:['Immunity','Flame Body']}}:{})};
 return <main className="battle-foundation">
  {['Player','Opponent'].flatMap(side=>moves.map(move=><button key={side+move.id} onClick={()=>setSelected({move,side})}>{side} {move.name}</button>))}
  {['known','ghost','fat','contact'].map(mode=><button key={mode} onClick={()=>setMode(mode)}>{mode}</button>)}
  <BattleMatchupConditions state={state} dispatch={dispatch} player={own} opponent={other} hpRange={{min:200,max:200}}/>
  {selected&&<BattleMoveDetails move={selected.move} attacker={selected.side==='Player'?player:enemy} defender={selected.side==='Player'?enemy:player}
   weather={state.field.weather} critical={state.field.critical} onClose={()=>setSelected(null)}/>}
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
