import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import BattleMoveDetails from '../../src/ui/components/BattleMoveDetails.jsx';
import {battleMove} from '../../src/battle/reference.js';
import baseline from './damageFinalizationBaseline.json';
import '../../src/ui/styles/base.css';
import '../../src/ui/styles/battle.css';
const names=['Rollout','Ice Ball','Fury Cutter','Magnitude','Present','Pursuit','Revenge','Bite'];
function Fixture(){
 const [index,setIndex]=useState(null);
 return <main className="battle-foundation" onKeyDown={event=>{if(event.key==='n')setIndex(i=>(i+1)%names.length);}}>
  {names.map((name,i)=><button key={name} onClick={()=>setIndex(i)}>{name}</button>)}
  {index!==null&&<BattleMoveDetails move={battleMove(names[index])} attacker={baseline.mon} defender={baseline.mon} weather="none" critical={false} onClose={()=>setIndex(null)}/>}
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
