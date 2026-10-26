import React,{useReducer} from 'react';
import {createRoot} from 'react-dom/client';
import BattlePage from '../../src/ui/pages/BattlePage.jsx';
import {battleReducer} from '../../src/battle/battleState.js';
import {createTowerRules} from '../../src/battle/towerRules.js';
import {alexasState,swampert} from './alexasAerodactyl.js';
import '../../src/ui/styles/base.css';
const params=new URLSearchParams(location.search),format=params.get('format')??'Doubles';
const records=[{...swampert,level:47},{...swampert,identity:'swellow',name:'Swellow',dex:277,level:65,ability:'Guts',types:['NORMAL','FLYING']}];
const initial=alexasState(format);initial.team=records.map(mon=>mon.identity);
if(params.has('open'))initial.rules=createTowerRules({...initial.rules,levelMode:'open',openLevel:62});
function Fixture(){
 const [state,dispatch]=useReducer(battleReducer,initial);
 return <main style={{padding:12}}>
  <BattlePage battle={{state,dispatch,records,frontierPool:records}}/>
  <output aria-label="Header battle state" style={{display:'none'}}>{JSON.stringify(state)}</output>
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
