import React,{useReducer,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import BattlePage from '../../src/ui/pages/BattlePage.jsx';
import BattleSearchPopup from '../../src/ui/components/BattleSearchPopup.jsx';
import {battleReducer,createBattleState} from '../../src/battle/battleState.js';
import {createTowerRules} from '../../src/battle/towerRules.js';
import {battleMove,speciesByName} from '../../src/battle/reference.js';
import '../../src/ui/styles/base.css';
const id=name=>speciesByName.get(name.toLowerCase()).internalSpeciesId;
const base={level:50,item:'None',currentHp:200,stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100,speed:100},moves:['Flamethrower','Rollout','Surf','Growl'].map(battleMove)};
const records=[{...base,identity:'a',name:'Ralts',dex:280,types:['PSYCHIC'],ability:'Trace'},{...base,identity:'b',name:'Houndoom',dex:229,types:['FIRE','DARK'],ability:'Flash Fire'}];
const format=new URLSearchParams(location.search).get('format')??'Singles';
const initial={...createBattleState(),rules:createTowerRules({format}),selectedTrainer:'Cooltrainer (M):VINCE',team:records.map(m=>m.identity),opponentSpecies:['Gardevoir','Metagross'].map(id),matchup:{player:'a',opponent:id('Gardevoir')}};
function Fixture(){
 const [state,dispatch]=useReducer(battleReducer,initial),[opened,setOpened]=useState(false),[second,setSecond]=useState(false),[actions,setActions]=useState(0),trigger=useRef(null),secondTrigger=useRef(null);
 return <main style={{padding:12}}>
  <BattlePage battle={{state,dispatch,records,frontierPool:records}}/>
  <section><button ref={trigger} aria-haspopup="dialog" onClick={()=>setOpened(true)}>Open custom popup</button>
   <button ref={secondTrigger} aria-haspopup="dialog" onClick={()=>setSecond(true)}>Open second custom popup</button>
   {opened&&<BattleSearchPopup trigger={trigger} id="interaction-popup" label="Custom interaction popup" resultsLabel="Custom options" onClose={()=>{setOpened(false);trigger.current?.focus({preventScroll:true});}}><button onClick={()=>{setActions(n=>n+1);setOpened(false);}}>Choose custom option</button></BattleSearchPopup>}
   {second&&<BattleSearchPopup trigger={secondTrigger} id="second-interaction-popup" label="Second custom interaction popup" resultsLabel="Second custom options" onClose={()=>{setSecond(false);secondTrigger.current?.focus({preventScroll:true});}}><button onClick={()=>setSecond(false)}>Choose second option</button></BattleSearchPopup>}
  </section>
  <output aria-label="Battle interaction state" style={{display:'none'}}>{JSON.stringify(state)}</output>
  <output aria-label="Custom action count">{actions}</output>
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
