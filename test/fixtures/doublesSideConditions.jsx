import React,{useEffect,useReducer,useState} from 'react';
import {createRoot} from 'react-dom/client';
import BattleMatchup from '../../src/ui/components/BattleMatchup.jsx';
import BattleMatchupConditions from '../../src/ui/components/BattleMatchupConditions.jsx';
import BattleMoveDetails from '../../src/ui/components/BattleMoveDetails.jsx';
import {battleReducer,createBattleState} from '../../src/battle/battleState.js';
import {activeConditionSlot,slotConditions,matchupBattleContext} from '../../src/battle/matchupConditions.js';
import {projectAbilityConditions} from '../../src/battle/conditionalAbilities.js';
import {opponentAbilityOptions} from '../../src/battle/abilityScenarios.js';
import {battleMove,speciesByName} from '../../src/battle/reference.js';
import {eligibleMatchupSets,matchupObservations,possibleMatchupSets} from '../../src/battle/towerSets.js';
import '../../src/ui/styles/base.css';
import '../../src/ui/styles/battle.css';
const id=name=>speciesByName.get(name.toLowerCase()).internalSpeciesId;
const base={level:50,types:['NORMAL'],ability:'Immunity',item:'None',currentHp:200,stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100},moves:['Strength','Surf','DoubleSlap','Psywave'].map(battleMove)};
const records=[{...base,identity:'a',name:'Snorlax',dex:143},{...base,identity:'b',name:'Gengar',dex:94,ability:'Levitate',types:['GHOST','POISON']}];
let initial={...createBattleState(),selectedTrainer:'Cooltrainer (M):KAYDEN',team:['a','b'],opponentSpecies:['Gardevoir','Houndoom'].map(id),matchup:{player:'a',opponent:id('Gardevoir')}};
for(const [slot,speciesId] of initial.opponentSpecies.entries()) {
 const set=eligibleMatchupSets({...initial,matchup:{...initial.matchup,opponent:speciesId}})[0];initial.opponentObservations[slot]={moves:[...set.moves],item:set.item,ability:slot===0?'Synchronize':'Early Bird'};
}
function Fixture(){
 const [state,dispatch]=useReducer(battleReducer,initial),[selected,setSelected]=useState(null);
 // Test-only keyboard dispatch verifies prop updates while the native modal is open.
 useEffect(()=>{
  const update=event=>{
   if(event.code==='KeyH') {
    const side=event.altKey?'enemy':'player',slot=activeConditionSlot(state,side);
    dispatch({type:'matchupCondition',side,slot,field:'helpingHand',value:!slotConditions(state,side,slot).helpingHand});
   }
   if(['Digit1','Digit2'].includes(event.code)) {
    event.preventDefault();dispatch({type:'matchupActiveCount',side:event.altKey?'player':'enemy',value:event.code==='Digit1'?1:2});
   }
  };
  window.addEventListener('keydown',update);return ()=>window.removeEventListener('keydown',update);
 },[state]);
 const ownSlot=activeConditionSlot(state,'player'),enemySlot=activeConditionSlot(state,'enemy');
 const player=records.find(m=>m.identity===state.matchup.player)??records[0];
 const other=enemySlot===1?{...base,id:id('Houndoom'),dex:229,name:'Houndoom',types:['DARK','FIRE'],ability:'Early Bird'}:{...base,id:id('Gardevoir'),dex:282,name:'Gardevoir',types:['PSYCHIC'],ability:'Synchronize'};
 const enemy={...other,abilityOptions:opponentAbilityOptions(other,[],matchupObservations(state).ability??'')};
 const a=projectAbilityConditions({...player,...slotConditions(state,'player',ownSlot)},slotConditions(state,'player',ownSlot));
 const d=projectAbilityConditions({...enemy,...slotConditions(state,'enemy',enemySlot)},slotConditions(state,'enemy',enemySlot));
 return <main className="battle-foundation" style={{padding:12}}>
  <nav>{['Singles','Doubles'].map(format=><button key={format} onClick={()=>dispatch({type:'rules',patch:{format}})}>Use {format}</button>)}
  {records.map(m=><button key={m.identity} onClick={()=>dispatch({type:'matchupPlayer',identity:m.identity})}>Select {m.name}</button>)}
  {['Gardevoir','Houndoom'].map(name=><button key={name} onClick={()=>dispatch({type:'matchupOpponent',speciesId:id(name)})}>Opponent {name}</button>)}
  <button onClick={()=>dispatch({type:'clearPlayerSlot',slot:0,identity:'a'})}>Remove Snorlax</button><button onClick={()=>dispatch({type:'assignPlayer',slot:0,identity:'a',pool:records})}>Add Snorlax</button>
  <button onClick={()=>dispatch({type:'clearOpponentSpeciesSlot',slot:0,speciesId:id('Gardevoir')})}>Remove Gardevoir</button><button onClick={()=>dispatch({type:'assignOpponentSpecies',slot:0,speciesId:id('Gardevoir')})}>Add Gardevoir</button></nav>
  <output aria-label="Possible set count">{possibleMatchupSets(state).length}</output><output aria-label="Opponent observations" style={{minWidth:0,overflowWrap:'anywhere'}}>{JSON.stringify(matchupObservations(state))}</output>
  {['Player','Opponent'].flatMap(side=>['Strength','Surf','Razor Wind','Comet Punch','Triple Kick','Rock Slide','Earthquake','Magnitude','Heat Wave','Eruption','Water Spout','DoubleSlap','Psywave'].map(name=><button key={side+name} onClick={()=>setSelected({side,name})}>{side} {name}</button>))}
  <BattleMatchup state={state} records={records} dispatch={dispatch}/>
  {ownSlot!==null&&enemySlot!==null&&<BattleMatchupConditions state={state} dispatch={dispatch} player={player} opponent={enemy} hpRange={{min:200,max:200}}/>}
  {selected&&<BattleMoveDetails move={battleMove(selected.name)} attacker={selected.side==='Player'?a:d} defender={selected.side==='Player'?d:a} weather={state.field.weather} critical={state.field.critical}
   battleRules={matchupBattleContext(state,selected.side==='Player'?'player':'enemy')} onClose={()=>setSelected(null)}/>}
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
