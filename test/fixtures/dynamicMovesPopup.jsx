import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import BattleMoveDetails from '../../src/ui/components/BattleMoveDetails.jsx';
import {battleMove} from '../../src/battle/reference.js';
import '../../src/ui/styles/base.css';
import '../../src/ui/styles/battle.css';
const ivs=Object.fromEntries(['hp','attack','defense','speed','spAttack','spDefense'].map(k=>[k,0]));
const mon={dex:1,level:50,friendship:100,ivs,types:['NORMAL'],ability:'Overgrow',item:'None',stats:{hp:200,attack:150,defense:100,spAttack:90,spDefense:120}};
function Fixture(){const [move,setMove]=useState(null);return <>{['Return','Frustration','Hidden Power','Low Kick'].map(name=><button key={name} onClick={()=>setMove(battleMove(name))}>{name}</button>)}{move&&<BattleMoveDetails move={move} attacker={mon} defender={mon} onClose={()=>setMove(null)}/>}</>;}
createRoot(document.getElementById('root')).render(<Fixture/>);
