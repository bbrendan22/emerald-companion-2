import React,{useReducer,useState} from 'react';
import {createRoot} from 'react-dom/client';
import BattleMoveDetails from '../../src/ui/components/BattleMoveDetails.jsx';
import BattleMatchup from '../../src/ui/components/BattleMatchup.jsx';
import {battleMove} from '../../src/battle/reference.js';
import {moveResources} from '../../src/battle/data/moveResources.js';
import {battleReducer,createBattleState} from '../../src/battle/battleState.js';
import {alexasState,swampert} from './alexasAerodactyl.js';
import '../../src/ui/styles/base.css';
import '../../src/ui/styles/battle.css';
const player={...swampert,currentHp:90,friendship:200,ivs:{hp:31,attack:31,defense:31,spAttack:31,spDefense:31,speed:31},moves:['Growl','Pain Split','Counter','Tackle'].map(name=>({...battleMove(name),currentPp:5}))};
const enemy={...player,identity:'target',name:'Target',dex:143,ability:'Immunity',types:['NORMAL'],currentHp:150};
function Fixture(){
 const [state,dispatch]=useReducer(battleReducer,{...alexasState(),team:[player.identity]}),[id,setId]=useState(45),[mode,setMode]=useState('none'),[spoof,setSpoof]=useState(false),[direction,setDirection]=useState(null);
 const canonical=battleMove(id),move=spoof?{...canonical,power:canonical.power===0?200:0,accuracy:1,effectChance:99,description:'Incorrect override'}:canonical;
 return <main className="battle-foundation">
  <label>Move<select aria-label="Test move" value={id} onChange={event=>setId(Number(event.target.value))}>{Object.keys(moveResources).map(id=><option key={id} value={id}>{battleMove(Number(id)).name}</option>)}</select></label>
  <label>Context<select aria-label="Test context" value={mode} onChange={event=>setMode(event.target.value)}><option value="none">Direct</option><option value="valid">Frontier</option><option value="missing">Missing Frontier</option></select></label>
  <label><input type="checkbox" checked={spoof} onChange={event=>setSpoof(event.target.checked)}/>Override supplied metadata</label>
  <button onClick={()=>setDirection('player')}>Open player move</button><button onClick={()=>setDirection('enemy')}>Open opponent move</button>
  <BattleMatchup state={state} dispatch={dispatch} records={[player]}/>
  <output aria-label="Battle snapshot" style={{display:'none'}}>{JSON.stringify(state)}</output>
  {direction&&<BattleMoveDetails move={move} attacker={direction==='player'?player:enemy} defender={direction==='player'?enemy:player} weather="none" critical={false} battleRules={state.rules}
   frontierState={mode==='none'?undefined:mode==='valid'?state:createBattleState()} frontierPlayer={player} frontierRecords={[player]} frontierDirection={direction} onClose={()=>setDirection(null)}/>}
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
