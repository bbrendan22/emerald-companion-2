import React from 'react';
import {selectedTowerTrainer} from '../../battle/towerTrainers.js';
import {availableTowerSets} from '../../battle/towerSets.js';
import {towerOpponentIVs} from '../../battle/towerRules.js';

export default function BattleRules({state, dispatch}) {
  const trainer = selectedTowerTrainer(state);
  const brainSet = trainer?.symbol ? availableTowerSets(state)[0] : null;
  const iv = towerOpponentIVs(state.selectedTrainer, brainSet);
  const update = patch => dispatch({type:'rules', patch});
  return <section className="battle-rules" aria-label="Battle rules">
    <div className="battle-rules-controls">
      <label>Facility<select aria-label="Battle facility" value="Tower" onChange={() => {}}>
        <option value="Tower">Tower</option><option value="Dome" disabled>Dome — coming later</option><option value="Factory" disabled>Factory — coming later</option>
      </select></label>
      <label>Format<select aria-label="Battle format" value="Singles" onChange={() => {}}>
        <option value="Singles">Singles</option><option value="Doubles" disabled>Doubles — coming later</option>
      </select></label>
      <fieldset><legend>Level</legend><div className="battle-level-options">
        <button type="button" aria-pressed={state.rules.levelMode === '50'} onClick={() => update({levelMode:'50'})}>Level 50</button>
        <button type="button" aria-pressed={state.rules.levelMode === 'open'} onClick={() => update({levelMode:'open'})}>Open Level</button>
      </div></fieldset>
      {state.rules.levelMode === 'open' && <label className="battle-rules-open-level">Opponent level<select aria-label="Open Level" value={state.rules.openLevel} onChange={event => update({openLevel:Number(event.target.value)})}>
        {Array.from({length:41}, (_,index) => index + 60).map(level => <option value={level} key={level}>{level}</option>)}
      </select></label>}
      <div className="battle-rules-ivs"><span>Opponent IVs</span><strong>{iv.value} IVs{iv.assumed ? ' (assumed)' : ''}</strong>
        <small>{trainer ? `${trainer.name}${trainer.symbol ? ` · ${trainer.symbol}` : ''} · ${iv.source === 'brain' ? 'Brain-specific IVs' : trainer.trainerClass}` : 'No trainer selected'}</small>
      </div>
    </div>
    <p className="battle-rules-info">Live Pokémon Emerald Battle Frontier assistant. Current support: Battle Tower Singles, Level 50 or manual Open Level 60–100. Opponent stats use trainer IVs when available; your Pokémon retain their actual imported levels and stats. Damage estimates depend on known battle conditions.</p>
  </section>;
}
