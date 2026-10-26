import React,{useReducer,useState} from 'react';
import {createRoot} from 'react-dom/client';
import BattleMoveDetails from '../../src/ui/components/BattleMoveDetails.jsx';
import BattleMatchupConditions from '../../src/ui/components/BattleMatchupConditions.jsx';
import {battleReducer,createBattleState} from '../../src/battle/battleState.js';
import {slotConditions,matchupBattleContext} from '../../src/battle/matchupConditions.js';
import {battleMove} from '../../src/battle/reference.js';
import '../../src/ui/styles/base.css';
import '../../src/ui/styles/battle.css';
const own={identity:'player',name:'Player',level:50,types:['NORMAL'],ability:'Immunity',item:'None',currentHp:200,
 stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const other={...own,identity:'enemy',name:'Opponent',stats:{...own.stats,attack:150,spAttack:90}};
const initial={...createBattleState(),team:['player'],opponentSpecies:[1],matchup:{player:'player',opponent:1}};
const extras={
 'player-forecast':{dex:351,ability:'Forecast'},'enemy-forecast':{dex:351,ability:'Forecast'},
 'player-trace-cloud':{ability:'Trace',copiedAbility:'Cloud Nine'},'enemy-trace-damp':{ability:'Trace',copiedAbility:'Damp'},
};
const uncertain={abilityOptions:{status:'uncertain',source:'species',values:['Damp','Cloud Nine']}};
function Fixture(){
 const [state,dispatch]=useReducer(battleReducer,initial),[selected,setSelected]=useState(null),[mode,setMode]=useState('off');
 const player={...own,...slotConditions(state,'player',0),...(mode==='player-cloud'?{ability:'Cloud Nine'}:mode==='player-air'||mode==='both'?{ability:'Air Lock'}:mode==='uncertain-player'?uncertain:mode.startsWith('player-')?extras[mode]??{}:{})};
 const enemy={...other,...slotConditions(state,'enemy',0),...(mode==='enemy-cloud'||mode==='both'?{ability:'Cloud Nine'}:mode==='enemy-air'?{ability:'Air Lock'}:mode==='uncertain-enemy'?uncertain:mode==='unknown'?{ability:null}:mode.startsWith('enemy-')?extras[mode]??{}:{})};
 return <main className="battle-foundation">
  {['Singles','Doubles'].map(format=><button key={format} onClick={()=>dispatch({type:'rules',patch:{format}})}>Use {format}</button>)}
  {['off','player-cloud','enemy-cloud','player-air','enemy-air','both','uncertain-player','uncertain-enemy','unknown',...Object.keys(extras)].map(value=><button key={value} onClick={()=>setMode(value)}>{value}</button>)}
  {['Player','Opponent'].flatMap(side=>['Weather Ball','Surf','Flamethrower','SolarBeam','Strength','Triple Kick','Seismic Toss','Explosion'].map(name=><button key={side+name} onClick={()=>setSelected({side,name})}>{side} {name}</button>))}
  <BattleMatchupConditions state={state} dispatch={dispatch} player={own} opponent={other} hpRange={{min:200,max:200}}/>
  {selected&&<BattleMoveDetails move={battleMove(selected.name)} attacker={selected.side==='Player'?player:enemy} defender={selected.side==='Player'?enemy:player}
   battleRules={matchupBattleContext(state,selected.side==='Player'?'player':'enemy')} weather={state.field.weather} critical={state.field.critical} onClose={()=>setSelected(null)}/>}
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
