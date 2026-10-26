import React from 'react';
import {opponentAbilityOptions} from '../../battle/abilityScenarios.js';
import {matchupObservations,matchupOpponentSlot} from '../../battle/towerSets.js';
export default function BattleOpponentAbilityControl({mon,state,dispatch}) {
 const abilities=opponentAbilityOptions(mon).values;
 if(abilities.length<2)return abilities[0]??'—';
 const selected=matchupObservations(state).ability??'',slot=matchupOpponentSlot(state);
 return <span className="battle-observation-select battle-opponent-ability-select">
  <span className="battle-observation-display" aria-hidden="true"><span className="battle-opponent-ability-values">
   {abilities.includes(selected)?selected:abilities.join(' / ')}
  </span><span className="battle-observation-arrow">▾</span></span>
  <select aria-label="Opponent ability" value={abilities.includes(selected)?selected:''} onChange={event=>dispatch({type:'observeOpponentAbility',slot,speciesId:mon.id,value:event.target.value})}>
   <option value="">Both / Unknown</option>{abilities.map(name=><option key={name} value={name}>{name}</option>)}
  </select>
 </span>;
}
