import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import BattleMoveDetails from '../../src/ui/components/BattleMoveDetails.jsx';
import {battleMove} from '../../src/battle/reference.js';
import '../../src/ui/styles/base.css';
import '../../src/ui/styles/battle.css';
const mon={level:50,dex:143,types:['WATER'],ability:'Immunity',item:'None',status:'none',stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const cases={
 facade:{move:'Facade',attacker:{...mon,status:'poison'}},
 burn:{move:'Facade',attacker:{...mon,status:'burn'}},
 guts:{move:'Facade',attacker:{...mon,dex:214,ability:'Guts',status:'burn'}},
 critical:{move:'Facade',attacker:{...mon,status:'burn'},critical:true},
 smelling:{move:'SmellingSalt',defender:{...mon,status:'paralysis'}},
 smellingHealthy:{move:'SmellingSalt'},
 ...Object.fromEntries(['none','sun','rain','sand','hail'].map(weather=>[weather,{move:'SolarBeam',weather}])),
};
function Fixture(){const [selected,setSelected]=useState(null);return <>{Object.keys(cases).map(key=><button key={key} onClick={()=>setSelected(cases[key])}>{key}</button>)}{selected&&<BattleMoveDetails move={battleMove(selected.move)} attacker={selected.attacker??mon} defender={selected.defender??mon} weather={selected.weather} critical={selected.critical} onClose={()=>setSelected(null)}/>}</>;}
createRoot(document.getElementById('root')).render(<Fixture/>);
