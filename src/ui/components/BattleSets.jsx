import React, {useLayoutEffect, useMemo} from 'react';
import {visibleTowerSets, duplicateMoveColors, frontierSetId, opponentSetDisabled} from '../../battle/towerSets.js';
import {candidateIsFaster} from '../../battle/setSpeedComparison.js';
import {toTowerOpponent} from '../../battle/frontierAdapter.js';
import BattleSetItem from './BattleSetItem.jsx';

const stats = [['hp','HP'],['attack','Atk'],['defense','Def'],['spAttack','SpA'],['spDefense','SpD'],['speed','Spe']];
export default function BattleSets({state, dispatch, records}) {
  const active = state.tab === 'Sets';
  useLayoutEffect(() => {
    if (!active) return;
    dispatch({type:'restoreSets'});
  }, [active, dispatch]);
  const sets = useMemo(() => active ? visibleTowerSets(state) : [], [active, state.selectedTrainer, state.selectedBrainSymbol, state.setSearch]);
  const colors = useMemo(() => duplicateMoveColors(sets), [sets]);
  const views = useMemo(() => new Map(sets.map(set => [frontierSetId(set), toTowerOpponent(set, state.rules, state.selectedTrainer)])), [sets, state.rules, state.selectedTrainer]);
  const player = records.find(mon => mon.identity === state.active);
  const singleSpecies = new Set(sets.map(set => set.species)).size === 1;
  const iv = views.values().next().value?.ivAssumption;
  return <section className="battle-set-search" aria-label="Tower Pokémon sets">
    <label className="battle-set-search-field"><span className="battle-visually-hidden">Search Pokémon sets</span>
      <input type="search" placeholder="Search Pokémon…" value={state.setSearch.query} autoComplete="off" autoCapitalize="none" spellCheck="false"
        onFocus={() => dispatch({type:'setQuery', query:''})} onChange={event => dispatch({type:'setQuery', query:event.target.value})} />
    </label>
    <div className="battle-set-context">Level {state.rules.opponentLevel} · {iv ? `IVs ${iv.value}${iv.assumed ? ' assumed' : ''}` : state.selectedTrainer ? 'Trainer IVs' : 'IVs 31 assumed'}</div>
    <div className="battle-set-results" aria-label="Pokémon set results">
      {sets.map(set => {
        const id = frontierSetId(set), mon = views.get(id), selected = state.opponents.includes(id);
        const disabled = opponentSetDisabled(state, id);
        const faster = candidateIsFaster(mon, player, state, singleSpecies);
        return <div className="battle-set-entry" key={id} data-set-id={id} data-disabled={disabled}>
          <button className="battle-set-select" type="button" aria-label={`Select ${id}`} aria-pressed={selected} disabled={disabled}
            onClick={() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); dispatch({type:'addOpponent', setId:id}); }}>
            <img loading="lazy" decoding="async" src={`/pokemon/emerald/normal/${mon.dex}.png`} width="32" height="32" alt="" />
            <div className="battle-set-body"><div className="battle-set-identity"><strong>{set.species}{set.instance ? ` ${set.instance}` : ''}</strong><BattleSetItem name={set.item} /></div>
              <dl className="battle-set-stats">{stats.map(([key,label]) => <div key={key}><dt>{label}</dt><dd className={key === 'speed' && faster ? 'battle-set-faster' : undefined}>{mon.stats[key]}</dd></div>)}</dl>
              <div className="battle-set-moves">{set.moves.filter(Boolean).map((move,index) => <span key={index}>
                {index > 0 && <span className="battle-move-dot" aria-hidden="true">·</span>}
                <span className="battle-set-move-name" style={colors.has(move) ? {color:colors.get(move)} : undefined}>{move}</span>
              </span>)}</div>
            </div>
          </button>
          <button className="battle-set-hide" type="button" aria-label={`Hide ${id}`} disabled={disabled} onClick={() => dispatch({type:'hideSet', setId:id})}>×</button>
        </div>;
      })}
      {!sets.length && <p className="battle-set-no-results" role="status">No sets match. Refocus the search to restore hidden sets, or try another species.</p>}
    </div>
  </section>;
}
