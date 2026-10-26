import React,{useReducer,useState} from 'react';
import {createRoot} from 'react-dom/client';
import BattleMoveDetails from '../../src/ui/components/BattleMoveDetails.jsx';
import BattleMatchupConditions from '../../src/ui/components/BattleMatchupConditions.jsx';
import {battleReducer,createBattleState} from '../../src/battle/battleState.js';
import {slotConditions} from '../../src/battle/matchupConditions.js';
import {battleMove} from '../../src/battle/reference.js';
import '../../src/ui/styles/base.css';
import '../../src/ui/styles/battle.css';
const own={identity:'player',name:'Snorlax',dex:143,level:50,types:['NORMAL'],ability:'Immunity',item:'None',stats:{hp:200}};
const other={identity:'enemy',name:'Opponent',level:73,types:['WATER'],ability:'Immunity',item:'None',stats:{hp:140}};
const initial={...createBattleState(),team:['player'],opponentSpecies:[1],matchup:{player:'player',opponent:1},
 matchupConditions:{player:{0:{currentHp:50,status:'none',stages:{},screens:{}}},enemy:{0:{currentHp:101,status:'none',stages:{},screens:{}}}}};
const names=['Seismic Toss','Night Shade','Dragon Rage','SonicBoom','Super Fang','Endeavor'];
function Fixture(){
 const [state,dispatch]=useReducer(battleReducer,initial),[selected,setSelected]=useState(null),[mode,setMode]=useState('known');
 const player={...own,...slotConditions(state,'player',0)};
 const enemy={...other,...slotConditions(state,'enemy',0),
  ...(mode==='ghost'?{types:['GHOST']}:mode==='unknown'?{ability:null}:mode==='uncertain'?{abilityOptions:{status:'uncertain',source:'species',values:['Immunity','Thick Fat']}}:{}),
  ...(mode==='unknownHP'?{currentHp:undefined}:{})};
 return <main className="battle-foundation">
  {['Player','Opponent'].flatMap(side=>names.map(name=><button key={side+name} onClick={()=>setSelected({name,side})}>{side} {name}</button>))}
  {['known','ghost','unknown','uncertain','unknownHP'].map(mode=><button key={mode} onClick={()=>setMode(mode)}>{mode}</button>)}
  <BattleMatchupConditions state={state} dispatch={dispatch} player={own} opponent={other} hpRange={{min:140,max:140}}/>
  {selected&&<BattleMoveDetails move={battleMove(selected.name)} attacker={selected.side==='Player'?player:enemy} defender={selected.side==='Player'?enemy:player}
   weather={state.field.weather} critical={state.field.critical} onClose={()=>setSelected(null)}/>}
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
