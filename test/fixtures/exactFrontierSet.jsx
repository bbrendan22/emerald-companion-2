import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import BattleMatchup from '../../src/ui/components/BattleMatchup.jsx';
import BattlePossibleSets from '../../src/ui/components/BattlePossibleSets.jsx';
import {createBattleState} from '../../src/battle/battleState.js';
import {towerTrainerEntries} from '../../src/battle/towerTrainers.js';
import {speciesByName} from '../../src/battle/reference.js';
import '../../src/ui/styles/base.css';
import '../../src/ui/styles/battle.css';
const id=name=>speciesByName.get(name.toLowerCase()).internalSpeciesId;
const initial={...createBattleState(),opponentSpecies:[id('Metagross'),id('Gardevoir')],matchup:{player:null,opponent:id('Metagross')}};
function Fixture(){
 const [state,setState]=useState(initial);
 return <main className="battle-content">
  <button onClick={()=>setState(initial)}>Multiple</button>
  <button onClick={()=>setState({...initial,opponentObservations:[{moves:['Psych Up','','',''],item:''}]})}>Exact 2</button>
  <button onClick={()=>setState({...initial,opponentObservations:[{moves:['Psych Up','','',''],item:'Leftovers'}]})}>Zero</button>
  <button onClick={()=>setState({...initial,matchup:{player:null,opponent:id('Gardevoir')}})}>Other species</button>
  <button onClick={()=>setState({...initial,selectedTrainer:towerTrainerEntries.find(t=>t.symbol==='Silver').trainer,selectedBrainSymbol:'Silver',opponentSpecies:[id('Alakazam')],matchup:{player:null,opponent:id('Alakazam')}})}>Brain</button>
  <button onClick={()=>setState({...initial,selectedTrainer:towerTrainerEntries.find(t=>t.name==='COOPER'||t.trainer.endsWith(':COOPER')).trainer})}>Trainer</button>
  <BattleMatchup state={state} records={[]} dispatch={()=>{}}/>
  <BattlePossibleSets state={state}/>
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
