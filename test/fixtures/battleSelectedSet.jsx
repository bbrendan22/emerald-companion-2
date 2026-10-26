import React,{useReducer} from 'react';
import {createRoot} from 'react-dom/client';
import BattlePage from '../../src/ui/pages/BattlePage.jsx';
import {battleReducer} from '../../src/battle/battleState.js';
import {alexasState,swampert} from './alexasAerodactyl.js';
import '../../src/ui/styles/base.css';
const records=[swampert,...[40,41].map(level=>({...swampert,identity:`ditto-${level}`,name:'Ditto',dex:132,types:['NORMAL'],ability:'Limber',level}))];
function Fixture(){
 const [state,dispatch]=useReducer(battleReducer,alexasState());
 return <main><BattlePage battle={{state,dispatch,records,frontierPool:records}} snapshot={{trainer:{name:'Player',gender:'male'}}}/></main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
