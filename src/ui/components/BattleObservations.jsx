import React from 'react';
import {observationChoices,possibleMatchupSets,matchupObservations,matchupOpponentSlot} from '../../battle/towerSets.js';

export default function BattleObservations({state,dispatch}) {
  const observations=matchupObservations(state),remaining=possibleMatchupSets(state);
  const slot=matchupOpponentSlot(state);
  const emptyMove=observations.moves.findIndex(move=>!move);
  const update=(field,value)=>dispatch({type:'observeOpponent',slot,speciesId:state.matchup.opponent,field,value});
  const moves=observations.moves.filter(Boolean);
  const moveChoices=emptyMove<0?[]:observationChoices(state,emptyMove,{replace:false});
  const control=(label,caption,value,choices,onChange,disabled=false)=><span className="battle-observation-select battle-observation-compact-select">
    <span className="battle-observation-display" aria-hidden="true"><span className="battle-observation-value">{caption}</span><span className="battle-observation-arrow">▾</span></span>
    <select aria-label={label} value={value} disabled={disabled} onChange={event=>onChange(event.target.value)}>
      <option value="" disabled>{label==='Add observed move'?'Add move':'Add item'}</option>
      {value && !choices.includes(value) && <option value={value} disabled>{value}</option>}
      {choices.map(name=><option key={name} value={name}>{name}</option>)}
    </select>
  </span>;
  return <section className="battle-conditions battle-observations" aria-label="Observations">
    <div className="battle-conditions-heading"><h2 className="battle-observations-title">Observations</h2>
    <button type="button" className="battle-conditions-reset" aria-label="Reset observations" onClick={()=>dispatch({type:'resetObservations'})}>Reset</button></div>
    {!remaining.length && <p className="battle-observation-warning" role="status">No matching sets. Reset observations to continue.</p>}
    <div id="battle-observation-controls" className="battle-observations-content">
      <div className="battle-observation-column">
        <span>Moves</span>
        {control('Add observed move','Add move','',moveChoices,value=>{if(value&&emptyMove>=0)update(emptyMove,value);},emptyMove<0||!moveChoices.length)}
      </div>
      <div className="battle-observation-column">
        <span>Held Item</span>
        {control('Observed held item',observations.item||'Add item',observations.item,observationChoices(state,'item',{replace:false}),value=>{if(value)update('item',value);})}
      </div>
      {moves.length>0 && <ul className="battle-observed-moves" aria-label="Observed moves">
        {moves.map(name=><li key={name}>{name}</li>)}
      </ul>}
    </div>
  </section>;
}
