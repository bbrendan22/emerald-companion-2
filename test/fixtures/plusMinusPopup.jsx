import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import BattleMoveDetails from '../../src/ui/components/BattleMoveDetails.jsx';
import {battleMove} from '../../src/battle/reference.js';
import '../../src/ui/styles/base.css';
import '../../src/ui/styles/battle.css';
const mon={level:50,types:['NORMAL'],ability:'Plus',item:'None',currentHp:200,stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
function Fixture(){
 const [mode,setMode]=useState('pair'),[selected,setSelected]=useState(null);
 const a={...mon,ability:mode==='reverse'?'Minus':'Plus'};
 const d={...mon,ability:mode==='reverse'?'Plus':mode==='missing'||mode==='doubles-missing'?'Immunity':'Minus',...(mode==='trace'?{ability:'Trace',copiedAbility:'Minus'}:mode==='uncertain'?{ability:'Trace',copiedAbility:'Minus',abilityOptions:{status:'uncertain',source:'species',values:['Trace','Synchronize']}}:{})};
 return <main className="battle-foundation">
  {['pair','reverse','missing','trace','uncertain','doubles-pair','doubles-missing'].map(m=><button key={m} onClick={()=>setMode(m)}>{m}</button>)}
  {['Player','Opponent'].flatMap(side=>['Surf','Strength','Bullet Seed'].map(name=><button key={side+name} onClick={()=>setSelected({side,name})}>{side} {name}</button>))}
  {selected&&<BattleMoveDetails move={battleMove(selected.name)} attacker={selected.side==='Player'?a:d} defender={selected.side==='Player'?d:a}
   battleRules={{format:mode.startsWith('doubles')?'Doubles':'Singles',defenderSideAlive:2}} onClose={()=>setSelected(null)}/>}
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
