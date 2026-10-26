import React,{useReducer} from 'react';
import {createRoot} from 'react-dom/client';
import BattleMatchup from '../../src/ui/components/BattleMatchup.jsx';
import BattleMatchupConditions from '../../src/ui/components/BattleMatchupConditions.jsx';
import {battleReducer,createBattleState} from '../../src/battle/battleState.js';
import {battleMove,speciesByName} from '../../src/battle/reference.js';
import {opponentSpeciesById} from '../../src/battle/opponentSpecies.js';
import {opponentStatRanges} from '../../src/battle/opponentStats.js';
import {eligibleMatchupSets,possibleMatchupSets,identifiedMatchup} from '../../src/battle/towerSets.js';
import '../../src/ui/styles/base.css';
import '../../src/ui/styles/battle.css';
const id=name=>speciesByName.get(name.toLowerCase()).internalSpeciesId;
const base={level:50,types:['NORMAL'],ability:'Immunity',item:'None',stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100},moves:['Flamethrower','Strength','Surf','Psywave'].map(battleMove)};
const records=[{...base,identity:'a',name:'Snorlax',dex:143},{...base,identity:'b',name:'Swampert',dex:260,ability:'Torrent',types:['WATER','GROUND']}];
let initial={...createBattleState(),selectedTrainer:'Cooltrainer (M):KAYDEN',team:['a','b'],opponentSpecies:['Gardevoir','Houndoom','Weezing'].map(id),matchup:{player:'a',opponent:id('Houndoom')}};
// Known observed moves/items give the real popup definite Frontier stats. Ability
// choices must leave these observations and possible-set counts unchanged.
for(const [slot,speciesId] of initial.opponentSpecies.entries()) {
 const sets=eligibleMatchupSets({...initial,matchup:{...initial.matchup,opponent:speciesId}}),set=sets[0];
 initial.opponentObservations[slot]={moves:[...set.moves],item:set.item};
}
function Fixture(){
 const [state,dispatch]=useReducer(battleReducer,initial),player=records.find(m=>m.identity===state.matchup.player),opponent=opponentSpeciesById(state.matchup.opponent);
 const info=identifiedMatchup(state);
 return <main className="battle-foundation">
  {records.map(m=><button key={m.identity} onClick={()=>dispatch({type:'matchupPlayer',identity:m.identity})}>Select {m.name}</button>)}
  {['Gardevoir','Houndoom','Weezing'].map(name=><button key={name} onClick={()=>dispatch({type:'matchupOpponent',speciesId:id(name)})}>Opponent {name}</button>)}
  <button onClick={()=>dispatch({type:'rules',patch:{levelMode:state.rules.levelMode==='50'?'open':'50',openLevel:100}})}>Change level</button>
  <button onClick={()=>dispatch({type:'clearOpponentSpeciesSlot',slot:0,speciesId:id('Gardevoir')})}>Remove Gardevoir</button>
  <button onClick={()=>dispatch({type:'assignOpponentSpecies',slot:0,speciesId:id('Gardevoir')})}>Add Gardevoir</button>
  <output aria-label="Possible set count">{possibleMatchupSets(state).length}</output>
  <output aria-label="Observed item and moves">{JSON.stringify({item:info.observations.item,moves:info.observations.moves})}</output>
  <BattleMatchup state={state} records={records} dispatch={dispatch}/>
  {player&&opponent&&<BattleMatchupConditions state={state} dispatch={dispatch} player={player} opponent={opponent} hpRange={opponentStatRanges(state)?.hp}/>}
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
