import React from 'react';
import {battleFacilities, battleFormats} from '../../battle/towerRules.js';
import {battleRounds} from '../../storage/battleRules.js';

function RuleSelect({label, value, display, options, onChange}) {
  return <label className="battle-observation-select battle-observation-compact-select">
    <span className="battle-observation-display" aria-hidden="true"><span className="battle-observation-value">{display ?? value}</span><span className="battle-observation-arrow">▾</span></span>
    <select aria-label={label} value={value} onChange={event => onChange(event.target.value)}>
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>;
}

export default function BattleRulesControl({state, dispatch}) {
  const update = patch => dispatch({type:'rules', patch});
  const round = state.round ?? '';
  return <div className="battle-rules-toolbar">
    <div className="battle-rules-inline" role="group" aria-label="Battle settings">
      <RuleSelect label="Facility" value={state.rules.facility} options={battleFacilities.map(value => ({value,label:value}))} onChange={facility => update({facility})} />
      <span className="battle-rules-separator" aria-hidden="true">·</span>
      <RuleSelect label="Format" value={state.rules.format} options={battleFormats.map(value => ({value,label:value}))} onChange={format => update({format})} />
      <span className="battle-rules-separator" aria-hidden="true">·</span>
      <RuleSelect label="Level" value={state.rules.opponentLevel} display={`Level ${state.rules.opponentLevel}`}
        options={[50, ...Array.from({length:41}, (_, index) => index + 60)].map(value => ({value,label:`Level ${value}`}))}
        onChange={value => {
          const level = Number(value);
          update(level === 50 ? {levelMode:'50'} : {levelMode:'open', openLevel:level});
        }} />
    </div>
    <label className="battle-round-control">
      <span aria-hidden="true">Round{round ? ` ${round}` : ''} <span className="battle-round-chevron">▾</span></span>
      <select aria-label="Round" value={round} onChange={event => dispatch({type:'round', value:event.target.value})}>
        {battleRounds.map(value => <option key={value} value={value}>{value ? `Round ${value}` : 'All Rounds'}</option>)}
      </select>
    </label>
  </div>;
}
