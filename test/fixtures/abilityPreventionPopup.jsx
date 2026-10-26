import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import BattleMoveDetails from '../../src/ui/components/BattleMoveDetails.jsx';
import {battleMove} from '../../src/battle/reference.js';
import '../../src/ui/styles/base.css';
import '../../src/ui/styles/battle.css';
const options=values=>({status:values.length===1?'known':'uncertain',source:'species',values});
const mon={level:50,types:['NORMAL'],ability:'Immunity',item:'None',status:'none',currentHp:50,
 ivs:{hp:31,attack:31,defense:31,speed:31,spAttack:31,spDefense:31},stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
function Fixture(){
 const [move,setMove]=useState(null),[mode,setMode]=useState('wonder'),[side,setSide]=useState('Player'),[weather,setWeather]=useState('none');
 const target={...mon,currentHp:101,...({
  wonder:{ability:'Wonder Guard',types:['WATER']},
  weak:{ability:'Wonder Guard',types:['NORMAL']},
  psychic:{ability:'Wonder Guard',types:['PSYCHIC']},
  grass:{ability:'Wonder Guard',types:['GRASS']},
  ghost:{ability:'Wonder Guard',types:['GHOST']},
  sound:{ability:'Soundproof'},
  damp:{ability:'Damp'},
  'uncertain-wonder':{types:['WATER'],abilityOptions:options(['Immunity','Wonder Guard'])},
  'uncertain-sound':{abilityOptions:options(['Immunity','Soundproof'])},
  'uncertain-damp':{abilityOptions:options(['Water Absorb','Damp'])},
  reasons:{abilityOptions:options(['Wonder Guard','Soundproof'])},
  unknown:{ability:null},
 }[mode])};
 return <main className="battle-foundation">
  {['wonder','weak','psychic','grass','ghost','sound','damp','uncertain-wonder','uncertain-sound','uncertain-damp','reasons','unknown'].map(value=><button key={value} onClick={()=>setMode(value)}>{value}</button>)}
  {['Player','Opponent'].map(value=><button key={value} onClick={()=>setSide(value)}>{value} attacks</button>)}
  {['none','sun','rain','sand','hail'].map(value=><button key={value} onClick={()=>setWeather(value)}>{value}</button>)}
  {['Strength','Surf','Hidden Power','Weather Ball','Seismic Toss','Night Shade','SonicBoom','Endeavor','Double Kick','DoubleSlap','Triple Kick','Snore','Uproar','Hyper Voice','Explosion','Self Destruct','Struggle'].map(name=><button key={name} onClick={()=>setMove(battleMove(name))}>{name}</button>)}
  {move&&<BattleMoveDetails move={move} attacker={side==='Player'?mon:target} defender={side==='Player'?target:mon}
   weather={weather} critical={false} onClose={()=>setMove(null)}/>}
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
