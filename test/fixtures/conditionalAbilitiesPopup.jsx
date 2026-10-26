import React,{useEffect,useReducer,useState} from 'react';
import {createRoot} from 'react-dom/client';
import BattleMoveDetails from '../../src/ui/components/BattleMoveDetails.jsx';
import BattleMatchupConditions from '../../src/ui/components/BattleMatchupConditions.jsx';
import {battleReducer,createBattleState} from '../../src/battle/battleState.js';
import {activeConditionSlot,slotConditions,matchupBattleContext} from '../../src/battle/matchupConditions.js';
import {projectAbilityConditions} from '../../src/battle/conditionalAbilities.js';
import {opponentAbilityOptions} from '../../src/battle/abilityScenarios.js';
import {opponentSpeciesById} from '../../src/battle/opponentSpecies.js';
import {matchupObservations} from '../../src/battle/towerSets.js';
import {battleMove,speciesByName} from '../../src/battle/reference.js';
import '../../src/ui/styles/base.css';
import '../../src/ui/styles/battle.css';
const id=name=>speciesByName.get(name.toLowerCase()).internalSpeciesId;
const base={level:50,item:'None',currentHp:200,stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100},moves:['Flamethrower','Earthquake','Weather Ball'].map(battleMove)};
const records=[{...base,identity:'trace',name:'Ralts',dex:280,ability:'Trace',types:['PSYCHIC']},{...base,identity:'fire',name:'Houndoom',dex:229,ability:'Flash Fire',types:['DARK','FIRE']},{...base,identity:'plain',name:'Snorlax',dex:143,ability:'Immunity',types:['NORMAL']}];
const format=new URLSearchParams(location.search).get('format')||'Singles';
const initial={...createBattleState(),rules:{...createBattleState().rules,format},team:records.map(m=>m.identity),opponentSpecies:['Ralts','Houndoom','Snorlax'].map(id),matchup:{player:'trace',opponent:id(format==='Doubles'?'Ralts':'Houndoom')}};
function Fixture(){
 useEffect(()=>{
  const keyboard=event=>{if(event.key==='Tab')document.querySelector('.battle-foundation').dataset.keyboardFocus='true';};
  const pointer=()=>delete document.querySelector('.battle-foundation').dataset.keyboardFocus;
  document.addEventListener('keydown',keyboard,true);document.addEventListener('pointerdown',pointer,true);
  return ()=>{document.removeEventListener('keydown',keyboard,true);document.removeEventListener('pointerdown',pointer,true);};
 },[]);
 const [state,dispatch]=useReducer(battleReducer,initial),[selected,setSelected]=useState(null);
 const player=records.find(m=>m.identity===state.matchup.player);
 const species=opponentSpeciesById(state.matchup.opponent);
 const enemy={...base,...species,types:['NORMAL'],abilityOptions:opponentAbilityOptions(species,[],matchupObservations(state).ability??'')};
 const ownSlot=activeConditionSlot(state,'player'),enemySlot=activeConditionSlot(state,'enemy');
 const a=projectAbilityConditions({...player,...slotConditions(state,'player',ownSlot)},slotConditions(state,'player',ownSlot));
 const d=projectAbilityConditions({...enemy,...slotConditions(state,'enemy',enemySlot)},slotConditions(state,'enemy',enemySlot));
 return <main className="battle-foundation">
  {records.map(m=><button key={m.identity} onClick={()=>{setSelected(null);dispatch({type:'matchupPlayer',identity:m.identity});}}>Select {m.name}</button>)}
  {['Ralts','Houndoom','Snorlax'].map(name=><button key={name} onClick={()=>dispatch({type:'matchupOpponent',speciesId:id(name)})}>Opponent {name}</button>)}
  <label>Observed ability<select aria-label="Observed ability" value={matchupObservations(state).ability??''} onChange={event=>dispatch({type:'observeOpponentAbility',slot:enemySlot,speciesId:enemy.id,value:event.target.value})}>
   <option value="">Unknown</option>{opponentAbilityOptions(species).values.map(name=><option key={name}>{name}</option>)}
  </select></label>
  {['player','enemy'].map(side=><button key={side} onClick={()=>dispatch({type:'matchupCondition',side,slot:activeConditionSlot(state,side),field:'currentHp',value:0})}>Faint {side}</button>)}
  <button onClick={()=>dispatch({type:'clearOpponentSpeciesSlot',slot:1,speciesId:id('Houndoom')})}>Remove Houndoom target</button>
  <button onClick={()=>dispatch({type:'assignOpponentSpecies',slot:1,speciesId:id('Houndoom')})}>Add Houndoom target</button>
  <button onClick={()=>setSelected(true)}>Player Flamethrower</button>
  <BattleMatchupConditions state={state} dispatch={dispatch} player={player} opponent={enemy} records={records} hpRange={{min:200,max:200}}/>
  <output aria-label="Conditions state" style={{display:'block',overflowWrap:'anywhere',minWidth:0}}>{JSON.stringify(state.matchupConditions)}</output>
  {selected&&<BattleMoveDetails move={battleMove('Flamethrower')} attacker={a} defender={d} weather={state.field.weather} critical={state.field.critical} battleRules={matchupBattleContext(state,'player')} onClose={()=>setSelected(false)}/>}
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
