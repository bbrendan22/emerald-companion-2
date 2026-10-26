import React,{useReducer,useState} from 'react';
import {createRoot} from 'react-dom/client';
import BattleMoveDetails from '../../src/ui/components/BattleMoveDetails.jsx';
import BattleMatchupConditions from '../../src/ui/components/BattleMatchupConditions.jsx';
import BattleMatchup from '../../src/ui/components/BattleMatchup.jsx';
import {battleReducer,createBattleState} from '../../src/battle/battleState.js';
import {slotConditions} from '../../src/battle/matchupConditions.js';
import {projectAbilityConditions} from '../../src/battle/conditionalAbilities.js';
import {battleMove,speciesByName} from '../../src/battle/reference.js';
import '../../src/ui/styles/base.css';
import '../../src/ui/styles/battle.css';
const base={level:50,types:['NORMAL'],item:'None',currentHp:200,stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100},moves:['Flamethrower','Earthquake','Weather Ball','Psywave'].map(battleMove)};
const records=[{...base,identity:'trace',name:'Ralts',dex:280,ability:'Trace',types:['PSYCHIC']},{...base,identity:'fire',name:'Houndoom',dex:229,ability:'Flash Fire',types:['DARK','FIRE']},{...base,identity:'plain',name:'Snorlax',dex:143,ability:'Immunity'}];
const initial={...createBattleState(),team:records.map(m=>m.identity),opponentSpecies:[speciesByName.get('gardevoir').internalSpeciesId,speciesByName.get('ralts').internalSpeciesId],matchup:{player:'trace',opponent:speciesByName.get('gardevoir').internalSpeciesId}};
function Fixture(){
 const [state,dispatch]=useReducer(battleReducer,initial),[selected,setSelected]=useState(null),[ability,setAbility]=useState('Trace');
 const player={...(records.find(m=>m.identity===state.matchup.player)??records[1])};
 if(player.identity==='trace')player.ability=ability;
 const enemySlot=state.matchup.opponent===state.opponentSpecies[0]?0:1;
 const enemy={...base,dex:enemySlot===0?282:280,name:enemySlot===0?'Gardevoir':'Ralts',types:['PSYCHIC'],abilityOptions:{status:'uncertain',source:'species',values:['Trace','Synchronize']}};
 const a=projectAbilityConditions({...player,...slotConditions(state,'player',records.findIndex(m=>m.identity===player.identity))},slotConditions(state,'player',records.findIndex(m=>m.identity===player.identity)));
 const d=projectAbilityConditions({...enemy,...slotConditions(state,'enemy',enemySlot)},slotConditions(state,'enemy',enemySlot));
 return <main className="battle-foundation">
  {records.map(m=><button key={m.identity} onClick={()=>{setSelected(null);dispatch({type:'matchupPlayer',identity:m.identity});}}>Select {m.name}</button>)}
  {['gardevoir','ralts'].map(name=><button key={name} onClick={()=>dispatch({type:'matchupOpponent',speciesId:speciesByName.get(name).internalSpeciesId})}>Opponent {name}</button>)}
  <button onClick={()=>setAbility(ability==='Trace'?'Synchronize':'Trace')}>Change ability</button>
  <button onClick={()=>dispatch({type:'clearPlayerSlot',slot:0,identity:'trace'})}>Remove Ralts</button>
  {['Player','Opponent'].flatMap(side=>['Flamethrower','Earthquake','Weather Ball','Psywave','Guillotine'].map(name=><button key={side+name} onClick={()=>setSelected({side,name})}>{side} {name}</button>))}
  <BattleMatchup state={state} records={records.map(m=>m.identity===player.identity?player:m)} dispatch={dispatch}/>
  <BattleMatchupConditions state={state} dispatch={dispatch} player={player} opponent={enemy} hpRange={{min:200,max:200}}/>
  {selected&&<BattleMoveDetails move={battleMove(selected.name)} attacker={selected.side==='Player'?a:d} defender={selected.side==='Player'?d:a} weather={state.field.weather} critical={state.field.critical} onClose={()=>setSelected(null)}/>}
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
