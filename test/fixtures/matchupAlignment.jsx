import React,{useReducer} from 'react';
import {createRoot} from 'react-dom/client';
import BattleMatchup from '../../src/ui/components/BattleMatchup.jsx';
import {battleReducer,createBattleState} from '../../src/battle/battleState.js';
import {battleMove,speciesByName} from '../../src/battle/reference.js';
import {eligibleMatchupSets} from '../../src/battle/towerSets.js';
import '../../src/ui/styles/base.css';
import '../../src/ui/styles/battle.css';
const id=name=>speciesByName.get(name.toLowerCase()).internalSpeciesId;
const base={level:50,item:'Lum Berry',stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100,speed:100},moves:['Surf','Strength','Flamethrower','Psywave'].map(battleMove)};
const records=[{...base,identity:'small',name:'Diglett',dex:50,ability:'Sand Veil',types:['GROUND']},{...base,identity:'large',name:'Wailord',dex:321,ability:'Water Veil',types:['WATER']},{...base,identity:'long',name:'Butterfree',dex:12,ability:'Compound Eyes',types:['BUG','FLYING']}];
let initial={...createBattleState(),team:records.map(m=>m.identity),opponentSpecies:['Gardevoir','Rhydon','Weezing'].map(id),matchup:{player:'long',opponent:id('Rhydon')}};
const populated=state=>Object.fromEntries(state.opponentSpecies.map((speciesId,slot)=>{
 const set=eligibleMatchupSets({...state,matchup:{...state.matchup,opponent:speciesId}})[0];
 return [slot,{moves:[...set.moves],item:set.item}];
}));
initial.opponentObservations=populated(initial);
function reducer(state,action){
 if(action.type==='fixtureMoves')return {...state,opponentObservations:action.empty?{}:populated(state),emptyPlayerMoves:action.empty};
 return battleReducer(state,action);
}
function Fixture(){
 const [state,dispatch]=useReducer(reducer,initial);
 return <main className="battle-foundation" style={{padding:12}}>
  <nav>{records.map(m=><button key={m.identity} onClick={()=>dispatch({type:'matchupPlayer',identity:m.identity})}>{m.name}</button>)}
  {['Gardevoir','Rhydon','Weezing'].map(name=><button key={name} onClick={()=>dispatch({type:'matchupOpponent',speciesId:id(name)})}>{name}</button>)}
  <button onClick={()=>dispatch({type:'fixtureMoves',empty:true})}>Empty moves</button><button onClick={()=>dispatch({type:'fixtureMoves',empty:false})}>Populated moves</button></nav>
  <BattleMatchup state={state} records={state.emptyPlayerMoves?records.map(m=>({...m,moves:[]})):records} dispatch={dispatch}/>
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
