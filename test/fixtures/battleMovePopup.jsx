import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import BattleMoveDetails from '../../src/ui/components/BattleMoveDetails.jsx';
import {battleMove} from '../../src/battle/reference.js';
import '../../src/ui/styles/base.css';
import '../../src/ui/styles/battle.css';

function Fixture() {
  const [open,setOpen]=useState(false),[actions,setActions]=useState(0);
  const record=()=>setActions(value=>value+1);
  return <>
    <button onClick={()=>setOpen(true)}>Open move</button>
    <div style={{display:'flex',gap:8,marginTop:20}}>
      {['Pokémon slot','Move slot','Battle control'].map(name=><button key={name} onPointerDown={record} onClick={record}>{name}</button>)}
      <select aria-label="Underlying dropdown" onPointerDown={record} onClick={record} onChange={record}>
        <option>None</option><option>Burn</option>
      </select>
    </div>
    <output aria-label="Underlying actions">{actions}</output>
    {open && <BattleMoveDetails move={battleMove('Tackle')} onClose={()=>setOpen(false)} />}
  </>;
}
createRoot(document.getElementById('root')).render(<Fixture />);
