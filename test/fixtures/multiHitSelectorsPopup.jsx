import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import BattleMoveDetails from '../../src/ui/components/BattleMoveDetails.jsx';
import {battleMove} from '../../src/battle/reference.js';
import baseline from './damageFinalizationBaseline.json';
import '../../src/ui/styles/base.css';
import '../../src/ui/styles/battle.css';
const ids=[3,4,31,42,131,140,154,198,292,331,333,350,167,1];
function Fixture(){
 const [index,setIndex]=useState(null);
 return <main className="battle-foundation" onKeyDown={event=>{if(event.key==='n')setIndex(i=>(i+1)%ids.length);}}>
  {ids.map((id,i)=><button key={id} onClick={()=>setIndex(i)}>{battleMove(id).name}</button>)}
  {index!==null&&<BattleMoveDetails move={battleMove(ids[index])} attacker={baseline.mon} defender={baseline.mon} weather="none" critical={false} onClose={()=>setIndex(null)}/>}
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
