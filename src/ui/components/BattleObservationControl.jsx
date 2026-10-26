import React from 'react';
import {observationChoices, matchupOpponentSlot} from '../../battle/towerSets.js';
import BattleSetItem from './BattleSetItem.jsx';

export default function BattleObservationControl({state, dispatch, field, value, observed, identified = false, onMoveInfo}) {
  const item = field === 'item';
  const label = item ? 'Opponent held item' : `Opponent move ${field + 1}`;
  const slot = matchupOpponentSlot(state);
  const inferred = identified && !observed;
  const choices = inferred ? [] : observationChoices(state,field);
  const text = value || (inferred ? '—' : item ? 'Item' : `Move ${field + 1}`);
  return <span className={`battle-observation-select${inferred ? ' is-inferred' : ''}${onMoveInfo ? ' has-move-info' : ''}`}>
    <span className="battle-observation-display" aria-hidden={inferred || onMoveInfo ? undefined : true}>
      {item && value ? <BattleSetItem name={value} /> : onMoveInfo ? <button type="button" className="battle-observation-value battle-move-info-name" aria-label={`Move information: ${text}`} aria-haspopup="dialog"
        onClick={event=>{event.stopPropagation();onMoveInfo();}}>{text}</button> : <span className="battle-observation-value">{text}</span>}
      {!inferred && <span className="battle-observation-arrow">▾</span>}
    </span>
    {!inferred && <select aria-label={label} value={value || ''}
      onChange={event => dispatch({type:'observeOpponent', slot, speciesId:state.opponentSpecies[slot], field, value:event.target.value})}>
      <option value="">{item ? 'Item' : `Move ${field + 1}`}</option>
      {value && !choices.includes(value) && <option value={value} disabled>{value}</option>}
      {choices.map(name => <option key={name} value={name}>{name}</option>)}
    </select>}
  </span>;
}
