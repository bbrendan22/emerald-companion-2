import React,{useReducer} from 'react';
import {createRoot} from 'react-dom/client';
import BattlePage from '../../src/ui/pages/BattlePage.jsx';
import {battleReducer,createBattleState} from '../../src/battle/battleState.js';
import {speciesByName} from '../../src/battle/reference.js';
import {swampert} from './alexasAerodactyl.js';
import '../../src/ui/styles/base.css';
const player={...swampert,stats:{...swampert.stats,speed:80}};
function initial(){
 let state=battleReducer(createBattleState(),{type:'opponentTrainer',key:'PKMN Ranger (M):JOVAN'});
 state=battleReducer(state,{type:'selectSinglesPlayer',identity:player.identity,pool:[player]});
 return battleReducer(state,{type:'selectSinglesOpponent',speciesId:speciesByName.get('snorlax').internalSpeciesId});
}
function Fixture(){
 const [state,dispatch]=useReducer(battleReducer,undefined,initial);
 return <main><BattlePage battle={{state,dispatch,records:[player],frontierPool:[player]}} snapshot={{trainer:{name:'Player',gender:'male'}}}/></main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
