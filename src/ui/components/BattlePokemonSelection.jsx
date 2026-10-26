import React from 'react';
import BattleOpponentTrainerControl from './BattleOpponentTrainerControl.jsx';
import {selectedTowerTrainer} from '../../battle/towerTrainers.js';
import {availableOpponentSpecies} from '../../battle/opponentSpecies.js';
import {possibleMatchupSets,analysisMatchupSets,frontierSetId,usesSelectedSet} from '../../battle/towerSets.js';
import {publicAsset} from '../../assets/publicAsset.js';

// Both formats share native controls; Doubles targets the two active slots.
export default function BattlePokemonSelection({state, frontierPool = [], dispatch, playerTrainer, roleError}) {
  const trainer = selectedTowerTrainer(state);
  const pool = [...frontierPool].sort((a,b) => a.name.localeCompare(b.name) || a.identity.localeCompare(b.identity));
  const label = mon => {
    const same = pool.filter(other => other.name === mon.name && other.level === mon.level);
    return `${mon.name} · Lv. ${mon.level}${same.length > 1 ? ` · #${same.findIndex(other => other.identity === mon.identity) + 1}` : ''}`;
  };
  const doubles = state.rules.format === 'Doubles';
  const slots = doubles ? [0,1] : [0];
  const opponents = trainer ? availableOpponentSpecies(state) : [];
  const opponentLabel = mon => mon.name;
  const playerSprite = playerTrainer?.gender === 'female' ? 'may' : playerTrainer?.gender === 'male' ? 'brendan' : null;
  return <div className={`battle-compact-teams battle-single-selection${doubles ? ' battle-doubles-selection' : ''}`}>
    <section className="battle-selection-player" aria-label="My Pokémon">
      <div className="battle-selection-trainer">
        <h3>{playerTrainer?.name?.trim() || 'My Pokémon'}</h3>
        {playerSprite && <img src={publicAsset(`/trainers/${playerSprite}-emerald.png`)} alt="Player trainer" />}
      </div>
      {slots.map(slot => {
        const identity = doubles ? state.team[slot] : state.matchup?.player;
        const player = pool.find(mon => mon.identity === identity);
        return <label key={slot} className="battle-pokemon-control">
        <span className="battle-pokemon-caption" aria-hidden="true">
          <span>{player ? player.name : 'Select Pokémon'}</span><span className="battle-round-chevron">▾</span>
        </span>
        <select className="battle-pokemon-select" aria-label={doubles ? `Select my Pokémon Slot ${slot + 1}` : 'Select my Pokémon'} value={identity ?? ''}
          onChange={event => dispatch({type:doubles ? 'selectDoublesPlayer' : 'selectSinglesPlayer',slot,identity:event.target.value || null,pool:frontierPool})}>
          <option value="">Select Pokémon</option>
          {pool.map(mon => <option key={mon.identity} value={mon.identity} disabled={doubles && state.team.some((id,index) => index !== slot && id === mon.identity)}>{label(mon)}</option>)}
        </select>
      </label>;
      })}
    </section>
    <section className="battle-selection-opponent" aria-label="Opponent">
      <div className="battle-selection-trainer">
        <BattleOpponentTrainerControl state={state} dispatch={dispatch} />
        {trainer?.sprite && <img src={publicAsset(`/trainers/frontier/${trainer.sprite}.png`)} alt="Opponent trainer" />}
      </div>
      {slots.map(slot => {
        const speciesId = doubles ? state.opponentSpecies[slot] : state.matchup?.opponent;
        const projected = doubles ? {...state,matchup:{...state.matchup,opponent:speciesId ?? null},
          selectedOpponentSetId:state.opponentSetSelections?.[slot] ?? null} : state;
        const opponent = opponents.find(mon => mon.id === speciesId);
        const sets = possibleMatchupSets(projected);
        const selectedSet = doubles ? sets.find(set => frontierSetId(set) === state.opponentSetSelections?.[slot]) ?? sets[0] : analysisMatchupSets(projected)[0];
        const setLabel = selectedSet ? `Set ${selectedSet.instance ?? selectedSet.brainSet}` : 'No sets';
        return <div key={slot} className="battle-opponent-selectors"><label className="battle-pokemon-control" data-disabled={!trainer ? 'true' : undefined}>
        <span className="battle-pokemon-caption" aria-hidden="true">
          <span>{opponent ? opponentLabel(opponent) : 'Select Pokémon'}</span><span className="battle-round-chevron">▾</span>
        </span>
        <select className="battle-pokemon-select" aria-label={doubles ? `Select opponent Pokémon Slot ${slot + 1}` : 'Select opponent Pokémon'} disabled={!trainer}
          value={speciesId ?? ''}
          onChange={event => dispatch({type:doubles ? 'selectDoublesOpponent' : 'selectSinglesOpponent',slot,speciesId:event.target.value ? Number(event.target.value) : null})}>
          <option value="">Select Pokémon</option>
          {opponents.map(mon => <option key={mon.id} value={mon.id} disabled={doubles && state.opponentSpecies.some((id,index) => index !== slot && id === mon.id)}>
            {opponentLabel(mon)}
          </option>)}
        </select>
      </label>
      {opponent && !trainer?.symbol && (doubles || usesSelectedSet(projected)) && (sets.length === 1
        ? <span className="battle-pokemon-control battle-set-control battle-set-static" aria-label={doubles ? `Opponent set Slot ${slot + 1}` : 'Opponent set'}>{setLabel}</span>
        : <label className="battle-pokemon-control battle-set-control">
        <span className="battle-pokemon-caption" aria-hidden="true"><span>{setLabel}</span><span className="battle-round-chevron">▾</span></span>
        <select className="battle-pokemon-select" aria-label={doubles ? `Select opponent set Slot ${slot + 1}` : 'Select opponent set'} disabled={!sets.length}
          value={selectedSet ? frontierSetId(selectedSet) : ''}
          onChange={event=>dispatch({type:'selectOpponentSet',slot,setId:event.target.value})}>
          {!sets.length && <option value="">No matching sets</option>}
          {sets.map(set=><option key={frontierSetId(set)} value={frontierSetId(set)}>Set {set.instance ?? set.brainSet}</option>)}
        </select>
      </label>)}
      </div>;
      })}
    </section>
      {!pool.length && <p className="battle-player-empty">No Frontier Pokémon. Assign roles in My Pokémon.</p>}
      {roleError && <p className="battle-role-error" role="status">{roleError}</p>}
  </div>;
}
