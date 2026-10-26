import React, {useReducer,useRef,useLayoutEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import BattleMoveDetails from '../../src/ui/components/BattleMoveDetails.jsx';
import {toTowerOpponent} from '../../src/battle/frontierAdapter.js';
import {towerSetById} from '../../src/battle/towerSets.js';
import BasicDamagePreview from '../../src/ui/components/BasicDamagePreview.jsx';
import useBattlePopupDismiss from '../../src/ui/components/useBattlePopupDismiss.js';
import {calculateAbilityScenarios,playerAbilityOptions,opponentAbilityOptions} from '../../src/battle/abilityScenarios.js';
import {calculateCoreDamage} from '../../src/battle/coreDamage.js';
import BattleMatchupConditions from '../../src/ui/components/BattleMatchupConditions.jsx';
import {opponentSpeciesById} from '../../src/battle/opponentSpecies.js';
import {opponentStatRanges} from '../../src/battle/opponentStats.js';
import BattleMatchup from '../../src/ui/components/BattleMatchup.jsx';
import {battleReducer,createBattleState} from '../../src/battle/battleState.js';
import {battleMove,speciesByName} from '../../src/battle/reference.js';
import '../../src/ui/styles/base.css';
import '../../src/ui/styles/battle.css';
const records=[
 {identity:'normal',ability:'Immunity',name:'Snorlax',dex:143,level:50,types:['NORMAL'],currentHp:1,stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100},moves:['Strength','Ember','Growl','Shadow Ball'].map(battleMove)},
 {identity:'ghost',ability:'Levitate',name:'Gengar',dex:94,level:50,types:['GHOST','POISON'],currentHp:1,stats:{hp:100,attack:100,defense:100,spAttack:100,spDefense:100},moves:['Strength','Ember','Growl','Shadow Ball'].map(battleMove)},
];
records.push({...records[0],identity:'water',ability:'Torrent',name:'Swampert',dex:260,types:['WATER','GROUND'],moves:['Surf','Earthquake','Growl','Shadow Ball'].map(battleMove)});
const id=name=>speciesByName.get(name.toLowerCase()).internalSpeciesId;
let initial=battleReducer(createBattleState(),{type:'opponentTrainer',key:'Anabel Silver'});
initial=battleReducer(initial,{type:'loadTeam',team:{name:'Fixture',ids:records.map(mon=>mon.identity)},records});
for(const [slot,name] of ['Alakazam','Snorlax'].entries())initial=battleReducer(initial,{type:'assignOpponentSpecies',slot,speciesId:id(name)});
function Fixture(){
 const [state,dispatch]=useReducer(battleReducer,initial);
 const player=records.find(mon=>mon.identity===state.matchup.player);
 const opponent=opponentSpeciesById(state.matchup.opponent);
 return <main className="battle-foundation">
  {records.map(mon=><button key={mon.identity} onClick={()=>dispatch({type:'matchupPlayer',identity:mon.identity})}>Select {mon.name}</button>)}
  {['Alakazam','Snorlax'].map(name=><button key={name} onClick={()=>dispatch({type:'matchupOpponent',speciesId:id(name)})}>Opponent {name}</button>)}
  <BattleMatchup state={state} records={records} dispatch={dispatch} />
  {player && opponent && <BattleMatchupConditions state={state} dispatch={dispatch} player={player} opponent={opponent} hpRange={opponentStatRanges(state)?.hp} />}
 </main>;
}
// Controlled differences exercise presentation only; no real ability effects.
function ScenarioFixture(){
 const [open,setOpen]=useState(true),[actions,setActions]=useState(0);
 const dialog=useRef(null);
 useBattlePopupDismiss({popup:dialog,onClose:()=>setOpen(false),tapOnly:true});
 useLayoutEffect(()=>{dialog.current?.showModal();},[]);
 const attacker={...records[0],abilityOptions:{status:'uncertain',source:'species',values:['Immunity','Thick Fat']}};
 const defender={...records[0],abilityOptions:{status:'uncertain',source:'species',values:['Immunity','Thick Fat']}};
 const abilityDamage=calculateAbilityScenarios(battleMove('Strength'),attacker,defender,{calculate:(move,a,d,w,c)=>{
  const result=calculateCoreDamage(move,a,d,w,c);
  const offset=(a.ability==='Thick Fat'?2:0)+(d.ability==='Thick Fat'?1:0);
  return {...result,rolls:result.rolls.map(value=>value+offset),min:result.min+offset,max:result.max+offset};
 }});
 return <><button onClick={()=>setActions(actions+1)}>Underlying scenario action</button><output>{actions}</output>
  {open && <dialog ref={dialog} className="battle-move-viewport" aria-label="Ability scenario fixture"><div className="battle-move-dialog">
   <h2>Strength</h2><BasicDamagePreview abilityDamage={abilityDamage} />
  </div></dialog>}</>;
}
function OffensiveFixture(){
 const [selection,setSelection]=useState(null);
 const target={...records[0],abilityOptions:playerAbilityOptions(records[0])};
 const opponent=toTowerOpponent(towerSetById('Azumarill 1'));
 opponent.abilityOptions=opponentAbilityOptions(opponent);
 const known={...opponent,ability:'Huge Power',abilityOptions:playerAbilityOptions({...opponent,ability:'Huge Power'})};
 const attacker=selection?.known ? known : opponent;
 return <><button onClick={()=>setSelection({move:'Strength'})}>Opponent physical</button>
  <button onClick={()=>setSelection({move:'Surf'})}>Opponent special</button>
  <button onClick={()=>setSelection({move:'Strength',known:true})}>Known player physical</button>
  {selection && <BattleMoveDetails move={battleMove(selection.move)} attacker={attacker} defender={target} onClose={()=>setSelection(null)} />}</>;
}
function DefensiveFixture(){
 const [mode,setMode]=useState(null);
 const normal={...records[0],abilityOptions:playerAbilityOptions(records[0])};
 const choices={
  fat:{move:'Flamethrower',defender:{...normal,abilityOptions:opponentAbilityOptions(normal)}},
  water:{move:'Surf',defender:{...normal,dex:186,types:['WATER'],abilityOptions:opponentAbilityOptions({dex:186})}},
  volt:{move:'Thunderbolt',defender:{...normal,dex:171,types:['WATER','ELECTRIC'],abilityOptions:opponentAbilityOptions({dex:171})}},
  flash:{move:'Flamethrower',defender:{...normal,dex:78,types:['FIRE'],abilityOptions:opponentAbilityOptions({dex:78})}},
  frozenFlash:{move:'Flamethrower',defender:{...normal,dex:78,types:['FIRE'],status:'freeze',abilityOptions:opponentAbilityOptions({dex:78})}},
  levitate:{move:'Earthquake',defender:{...records[1],abilityOptions:playerAbilityOptions(records[1])}},
  scale:{move:'Strength',defender:{...normal,dex:350,ability:'Marvel Scale',status:'poison',abilityOptions:playerAbilityOptions({dex:350,ability:'Marvel Scale'})}},
 };
 const chosen=choices[mode];
 return <>{Object.keys(choices).map(key=><button key={key} onClick={()=>setMode(key)}>{key}</button>)}
  {chosen && <BattleMoveDetails move={battleMove(chosen.move)} attacker={normal} defender={chosen.defender} onClose={()=>setMode(null)} />}</>;
}
function HeldItemsFixture(){
 const [mode,setMode]=useState(null);
 const normal={...records[0],abilityOptions:playerAbilityOptions(records[0])};
 const choices={band:['Strength','Choice Band'],sand:['Earthquake','Soft Sand'],water:['Surf','Mystic Water'],incense:['Surf','Sea Incense'],unknown:['Strength',null]};
 const chosen=choices[mode];
 return <>{Object.keys(choices).map(key=><button key={key} onClick={()=>setMode(key)}>{key}</button>)}
  {chosen && <BattleMoveDetails move={battleMove(chosen[0])} attacker={{...normal,item:chosen[1]}} defender={normal} onClose={()=>setMode(null)} />}</>;
}
function SpecializedItemsFixture(){
 const [mode,setMode]=useState(null);
 const normal={...records[0],abilityOptions:playerAbilityOptions(records[0])};
 const holder=(dex,ability,item,types)=>({...normal,dex,ability,item,types,abilityOptions:playerAbilityOptions({dex,ability})});
 const ditto=holder(132,'Limber','Metal Powder',['NORMAL']);
 const choices={
  light:{move:'Thunderbolt',attacker:holder(25,'Static','Light Ball',['ELECTRIC'])},
  club:{move:'Earthquake',attacker:holder(105,'Rock Head','Thick Club',['GROUND'])},
  tooth:{move:'Surf',attacker:holder(366,'Shell Armor','DeepSeaTooth',['WATER'])},
  scale:{move:'Surf',defender:holder(366,'Shell Armor','DeepSeaScale',['WATER'])},
  dew:{move:'Surf',attacker:holder(380,'Levitate','Soul Dew',['DRAGON','PSYCHIC'])},
  powderUnknown:{move:'Strength',defender:ditto},
  powderKnown:{move:'Strength',defender:{...ditto,transformed:false}},
  powderTransformed:{move:'Strength',defender:{...ditto,transformed:true}},
 };
 const chosen=choices[mode];
 return <>{Object.keys(choices).map(key=><button key={key} onClick={()=>setMode(key)}>{key}</button>)}
  {chosen && <BattleMoveDetails battleRules={{facility:'Tower'}} move={battleMove(chosen.move)} attacker={chosen.attacker??normal} defender={chosen.defender??normal} onClose={()=>setMode(null)} />}</>;
}
createRoot(document.getElementById('root')).render(location.search.includes('specialized-items') ? <SpecializedItemsFixture /> : location.search.includes('held-items') ? <HeldItemsFixture /> : location.search.includes('defensive-abilities') ? <DefensiveFixture /> : location.search.includes('offensive-abilities') ? <OffensiveFixture /> : location.search.includes('ability-groups') ? <ScenarioFixture /> : <Fixture />);
