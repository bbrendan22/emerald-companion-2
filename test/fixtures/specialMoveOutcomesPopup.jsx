import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import BattleMoveDetails from '../../src/ui/components/BattleMoveDetails.jsx';
import BattleObservationControl from '../../src/ui/components/BattleObservationControl.jsx';
import {battleMove,speciesByName} from '../../src/battle/reference.js';
import {createBattleState} from '../../src/battle/battleState.js';
import baseline from './damageFinalizationBaseline.json';
import '../../src/ui/styles/base.css';
import '../../src/ui/styles/battle.css';
const ids=[12,32,90,329,...baseline.moves.filter(m=>m.category==='status').map(m=>m.id),68,243,117,251,248,353,255,165];
const mon=baseline.mon;
const abilities=values=>({status:values.length===1?'known':'uncertain',source:'species',values});
const smeargle=speciesByName.get('smeargle').internalSpeciesId;
const state={...createBattleState(),opponentSpecies:[smeargle],matchup:{player:null,opponent:smeargle}};
function Fixture(){
 const [index,setIndex]=useState(null),[mode,setMode]=useState('r');
 const attacker={...mon,...(mode==='l'?{level:49}:{})};
 const defender={...mon,...({
  s:{ability:'Sturdy',abilityOptions:abilities(['Sturdy'])},
  u:{dex:95,types:['ROCK','GROUND'],ability:'Rock Head',abilityOptions:abilities(['Rock Head','Sturdy'])},
  g:{types:['GHOST']},f:{types:['FLYING']},v:{ability:'Levitate',abilityOptions:abilities(['Levitate'])},i:{types:['ICE']},
  x:{ability:null},
 }[mode])};
 return <main className="battle-foundation" onKeyDown={event=>{
  if(event.key==='n'){setIndex(i=>(i+1)%ids.length);setMode('r');}
  else if(['r','s','u','l','g','f','v','i','x'].includes(event.key))setMode(event.key);
 }}>
  <button onClick={()=>setIndex(0)}>Open outcomes</button>
  <BattleObservationControl state={state} dispatch={()=>{}} field={0} value="" observed={false}/>
  {index!==null&&<BattleMoveDetails move={battleMove(ids[index])} attacker={attacker} defender={defender} weather="none" critical={false} onClose={()=>setIndex(null)}/>}
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
