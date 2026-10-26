import React,{useReducer,useState} from 'react';
import {createRoot} from 'react-dom/client';
import BattleMatchup from '../../src/ui/components/BattleMatchup.jsx';
import BattleMoveDetails from '../../src/ui/components/BattleMoveDetails.jsx';
import BattleMatchupConditions from '../../src/ui/components/BattleMatchupConditions.jsx';
import {battleReducer,createBattleState} from '../../src/battle/battleState.js';
import {battleMove,speciesByName} from '../../src/battle/reference.js';
import {opponentSpeciesById} from '../../src/battle/opponentSpecies.js';
import {opponentStatRanges} from '../../src/battle/opponentStats.js';
import {towerSetById} from '../../src/battle/towerSets.js';
import '../../src/ui/styles/base.css';
import '../../src/ui/styles/battle.css';
const player={identity:'hp-player',name:'Snorlax',dex:143,level:50,types:['NORMAL'],ability:'Immunity',item:'None',currentHp:1,
 stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100},moves:['Flail','Reversal','Eruption','Water Spout'].map(battleMove)};
const records=[player,{...player,identity:'second',dex:94},{...player,identity:'third',dex:260}],speciesId=speciesByName.get('wailmer').internalSpeciesId;
let initial=battleReducer(createBattleState(),{type:'opponentTrainer',key:'Pokémaniac:JALEN'});
initial=battleReducer(initial,{type:'loadTeam',team:{name:'HP Fixture',ids:records.map(mon=>mon.identity)},records});
initial=battleReducer(initial,{type:'matchupPlayer',identity:player.identity});
initial=battleReducer(initial,{type:'assignOpponentSpecies',slot:0,speciesId});
initial=battleReducer(initial,{type:'matchupOpponent',speciesId});
const set=towerSetById('Wailmer 2');
for(const [field,value] of [...set.moves.entries(),['item',set.item]])initial=battleReducer(initial,{type:'observeOpponent',field,value});
function Fixture(){
 const [state,dispatch]=useReducer(battleReducer,initial),[unknown,setUnknown]=useState(false);
 const opponent=opponentSpeciesById(speciesId);
 return <main className="battle-foundation">
  <BattleMatchup state={state} records={records} dispatch={dispatch}/>
  <BattleMatchupConditions state={state} dispatch={dispatch} player={player} opponent={opponent} hpRange={opponentStatRanges(state)?.hp}/>
  <button onClick={()=>setUnknown(true)}>Unknown HP</button>
  {unknown&&<BattleMoveDetails move={battleMove('Eruption')} attacker={{...player,currentHp:null,stats:{...player.stats,hp:'180–200'}}} defender={player} onClose={()=>setUnknown(false)}/>}
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
