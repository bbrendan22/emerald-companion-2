import React,{useReducer} from 'react';
import {createRoot} from 'react-dom/client';
import BattleMatchup from '../../src/ui/components/BattleMatchup.jsx';
import BattleMatchupConditions from '../../src/ui/components/BattleMatchupConditions.jsx';
import {battleReducer,createBattleState} from '../../src/battle/battleState.js';
import {battleMove,speciesByName} from '../../src/battle/reference.js';
import {opponentSpeciesById} from '../../src/battle/opponentSpecies.js';
import {opponentStatRanges} from '../../src/battle/opponentStats.js';
import {towerSetById} from '../../src/battle/towerSets.js';
import '../../src/ui/styles/base.css';
import '../../src/ui/styles/battle.css';
const base={level:50,stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100},item:'None',currentHp:200};
const records=[
 {...base,identity:'normal',name:'Snorlax',dex:143,types:['NORMAL'],ability:'Immunity',moves:['Strength','Surf','Double Kick','Triple Kick'].map(battleMove)},
 {...base,identity:'multi',name:'Gengar',dex:94,types:['GHOST','POISON'],ability:'Levitate',moves:['DoubleSlap','Icicle Spear','Seismic Toss','Brick Break'].map(battleMove)},
 {...base,identity:'third',name:'Swampert',dex:260,types:['WATER','GROUND'],ability:'Torrent',moves:['Surf'].map(battleMove)},
];
const speciesId=speciesByName.get('wailmer').internalSpeciesId;
let initial=battleReducer(createBattleState(),{type:'opponentTrainer',key:'Pokémaniac:JALEN'});
initial=battleReducer(initial,{type:'loadTeam',team:{name:'Screens Fixture',ids:records.map(mon=>mon.identity)},records});
initial=battleReducer(initial,{type:'matchupPlayer',identity:'normal'});
initial=battleReducer(initial,{type:'assignOpponentSpecies',slot:0,speciesId});
initial=battleReducer(initial,{type:'matchupOpponent',speciesId});
const set=towerSetById('Wailmer 2');
for(const [field,value] of [...set.moves.entries(),['item',set.item]])initial=battleReducer(initial,{type:'observeOpponent',field,value});
function Fixture(){
 const [state,dispatch]=useReducer(battleReducer,initial);
 const player=records.find(mon=>mon.identity===state.matchup.player),opponent=opponentSpeciesById(speciesId);
 return <main className="battle-foundation">
  {records.slice(0,2).map(mon=><button key={mon.identity} onClick={()=>dispatch({type:'matchupPlayer',identity:mon.identity})}>Select {mon.name}</button>)}
  {['Singles','Doubles'].map(format=><button key={format} onClick={()=>dispatch({type:'rules',patch:{format}})}>Use {format}</button>)}
  <BattleMatchup state={state} records={records} dispatch={dispatch}/>
  <BattleMatchupConditions state={state} dispatch={dispatch} player={player} opponent={opponent} hpRange={opponentStatRanges(state)?.hp}/>
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
