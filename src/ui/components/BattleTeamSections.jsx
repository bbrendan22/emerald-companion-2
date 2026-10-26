import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import BattleOpponentTrainerControl from './BattleOpponentTrainerControl.jsx';
import BattleOpponentPokemonPicker from './BattleOpponentPokemonPicker.jsx';
import {selectedTowerTrainer} from '../../battle/towerTrainers.js';
import {opponentSpeciesById} from '../../battle/opponentSpecies.js';
import {towerSetById} from '../../battle/towerSets.js';
import {speciesByName} from '../../battle/reference.js';
import {publicAsset} from '../../assets/publicAsset.js';

function TeamSlots({label, members, count = 3, onEmpty, onRemove, onSelect, selected, openSlot, onActivate, locked = false}) {
  const row = useRef(null), latest = useRef(null);
  const lastTap = useRef(null), consumedAt = useRef(-Infinity), lastTouch = useRef(-Infinity);
  useLayoutEffect(() => {latest.current = {members, onEmpty, onRemove, onSelect, locked};});
  useEffect(() => {
    if (onActivate) return;
    const node = row.current;
    let gesture = null;
    const cancel = () => {gesture = null; lastTap.current = null;};
    const start = event => {
      lastTouch.current = performance.now();
      if (latest.current.locked) return;
      const button = event.target.closest('.battle-compact-slot');
      if (event.touches.length !== 1 || !button || !node.contains(button)) {cancel(); return;}
      const touch = event.touches[0], index = Number(button.dataset.slot);
      gesture = {button, index, identity:latest.current.members[index]?.identity,
        id:touch.identifier, time:performance.now(), x:touch.clientX, y:touch.clientY};
    };
    const move = event => {
      const touch = Array.from(event.changedTouches).find(touch => touch.identifier === gesture?.id);
      if (gesture && touch && Math.hypot(touch.clientX-gesture.x,touch.clientY-gesture.y) > 12) cancel();
    };
    const end = event => {
      const current = gesture;
      gesture = null;
      const touch = current && Array.from(event.changedTouches).find(touch => touch.identifier === current.id);
      const now = performance.now();
      if (!current || !touch || !event.cancelable || now-current.time > 300
        || Math.hypot(touch.clientX-current.x,touch.clientY-current.y) > 12
        || !current.button.contains(document.elementFromPoint(touch.clientX,touch.clientY))) {cancel(); return;}
      // Safari can retarget adjacent taps' synthetic clicks/double-clicks to the
      // first sprite. Handle the actual touched slot and suppress those events.
      event.preventDefault();
      if (!event.defaultPrevented) return;
      consumedAt.current = now;
      const {members, onEmpty, onRemove, onSelect} = latest.current;
      const mon = members[current.index], previous = lastTap.current;
      if (!mon) {lastTap.current = null; onEmpty?.(current.index,current.button); return;}
      if (mon.identity !== current.identity) {cancel(); return;}
      if (onRemove && previous?.index === current.index && previous.identity === mon.identity
        && now-previous.time < 350 && Math.hypot(touch.clientX-previous.x,touch.clientY-previous.y) < 20) {
        lastTap.current = null; onRemove(current.index,mon.identity);
      } else {
        lastTap.current = {index:current.index, identity:mon.identity, time:now, x:touch.clientX,y:touch.clientY};
        onSelect?.(mon.identity);
      }
    };
    node.addEventListener('touchstart',start,{passive:true});
    node.addEventListener('touchmove',move,{passive:true});
    node.addEventListener('touchcancel',cancel,{passive:true});
    node.addEventListener('touchend',end,{passive:false});
    return () => {
      node.removeEventListener('touchstart',start); node.removeEventListener('touchmove',move);
      node.removeEventListener('touchcancel',cancel); node.removeEventListener('touchend',end);
    };
  }, [Boolean(onActivate)]);
  return <div ref={row} className="battle-compact-slots" style={{'--team-slots':count}} role="group" aria-label={`${label} Pokémon`}>
    {Array.from({length:count}, (_, index) => {
      const mon = members[index];
      return <button key={index} type="button" className="battle-compact-slot"
        data-slot={index} disabled={locked}
        aria-description={locked ? 'Select a trainer first' : undefined}
        aria-pressed={mon && onSelect ? selected === mon.identity : undefined}
        onClick={event => {
          if (onActivate) {onActivate(index, event.currentTarget); return;}
          // The second touch's compatibility click must not open the newly empty slot.
          if (performance.now() - consumedAt.current < 400) {event.preventDefault(); return;}
          if (!mon && onEmpty) onEmpty(index, event.currentTarget);
          else if (mon) onSelect?.(mon.identity);
        }}
        onDoubleClick={onActivate ? undefined : event => {
          event.preventDefault();
          if (mon && onRemove && performance.now() - lastTouch.current >= 800
            && performance.now() - consumedAt.current >= 400) {
            consumedAt.current = performance.now(); onRemove(index, mon.identity);
          }
        }}
        title={onActivate ? (mon && selected === mon.identity ? 'Replace or remove Pokémon' : undefined) : locked ? 'Select a trainer first' : mon && onRemove ? `Double-tap or double-click to remove from ${label}` : undefined}
        aria-haspopup={onActivate ? (!mon || selected === mon.identity ? 'dialog' : undefined) : !locked && !mon && onEmpty ? 'dialog' : undefined} aria-expanded={onActivate ? openSlot === index : !locked && !mon && onEmpty ? openSlot === index : undefined}
        aria-label={mon ? `${mon.name}, ${label}, slot ${index + 1}` : `Add Pokémon, ${label}, empty slot ${index + 1}`}>
        {mon ? <img src={publicAsset(`/pokemon/box/${mon.dex}.png`)} width="32" height="32" alt="" draggable="false" />
          : <span aria-hidden="true">+</span>}
      </button>;
    })}
  </div>;
}

// Team slots and their selection controls share the Matchup panel.
export default function BattleTeamSections({state, frontierPool = [], dispatch, playerTrainer, roleError}) {
  const trainer = selectedTowerTrainer(state);
  const [opponentSlot, setOpponentSlot] = useState(null);
  const opponentTrigger = useRef(null);
  useEffect(() => {setOpponentSlot(null);}, [trainer?.key,state.opponentReset]);
  const closeOpponentPicker = () => {setOpponentSlot(null); opponentTrigger.current?.focus({preventScroll:true});};
  const playerCount = state.rules.teamSize;
  const pool = [...frontierPool].sort((a,b) => a.name.localeCompare(b.name) || a.identity.localeCompare(b.identity));
  const optionLabel = mon => {
    const duplicates = pool.filter(other => other.name === mon.name && other.level === mon.level);
    return `${mon.name} · Lv. ${mon.level}${duplicates.length > 1 ? ` · #${duplicates.findIndex(other => other.identity === mon.identity) + 1}` : ''}`;
  };
  const opponentMembers = state.opponentSpecies?.length ? state.opponentSpecies.map(id => {
    const species = opponentSpeciesById(id);
    return species ? {identity:id, name:species.name, dex:species.dex} : null;
  }) : state.opponents.map(id => {
    const set = towerSetById(id);
    const species = set && speciesByName.get(set.species.toLowerCase());
    return species ? {name:set.species, dex:species.nationalDexId} : null;
  });
  return <div className="battle-compact-teams">
    <section aria-label="My Team">
      <h3 className="battle-player-heading"><span>{playerTrainer?.name?.trim() || 'My Team'}</span></h3>
      <div className="battle-player-slots" role="group" aria-label="My Team slots">
        {Array.from({length:playerCount}, (_,slot) => {
          const mon = pool.find(record => record.identity === state.team[slot]);
          return <div key={slot} className="battle-player-slot">
            {mon ? <button className="battle-player-sprite" type="button"
              aria-pressed={state.matchup?.player === mon.identity}
              aria-label={`Select My Team slot ${slot + 1}, ${optionLabel(mon)}`}
              onClick={() => dispatch({type:'matchupPlayer',identity:mon.identity})}>
              <img src={publicAsset(`/pokemon/box/${mon.dex}.png`)} width="32" height="32" alt="" draggable="false" />
            </button> : <span className="battle-player-placeholder" aria-hidden="true">—</span>}
            <select className="battle-player-select" aria-label={`My Team slot ${slot + 1}`}
              value={mon?.identity ?? ''}
              onChange={event => dispatch({type:'selectPlayerPosition',slot,identity:event.target.value || null,pool:frontierPool})}>
              <option value="">Empty slot</option>
              {pool.map(record => <option key={record.identity} value={record.identity}
                disabled={state.team.some((id,index) => index !== slot && id === record.identity)}>
                {optionLabel(record)}
              </option>)}
            </select>
          </div>;
        })}
      </div>
      {!pool.length && <p className="battle-player-empty">No Frontier Pokémon. Assign roles in My Pokémon.</p>}
      {roleError && <p className="battle-role-error" role="status">{roleError}</p>}
    </section>
    <section aria-label="Opponent Team">
      <BattleOpponentTrainerControl key={state.opponentReset} state={state} dispatch={dispatch} />
      <TeamSlots label="Opponent Team" members={opponentMembers} count={state.rules.teamSize} openSlot={opponentSlot}
        selected={state.matchup?.opponent} onSelect={speciesId => dispatch({type:'matchupOpponent',speciesId})}
        onActivate={(slot, trigger) => {
          const speciesId = state.opponentSpecies?.[slot];
          if (speciesId && speciesId !== state.matchup?.opponent) {
            dispatch({type:'matchupOpponent',speciesId});
            return;
          }
          opponentTrigger.current = trigger; setOpponentSlot(slot);
        }} />
    </section>
    {opponentSlot !== null && opponentSlot < state.rules.teamSize && <BattleOpponentPokemonPicker key={state.opponentReset} state={state}
      trigger={opponentTrigger} onClose={closeOpponentPicker}
      onRemove={state.opponentSpecies?.[opponentSlot] ? () => {
        dispatch({type:'clearOpponentSpeciesSlot',slot:opponentSlot,speciesId:state.opponentSpecies[opponentSlot]}); closeOpponentPicker();
      } : undefined}
      onSelect={speciesId => {dispatch({type:state.opponentSpecies?.[opponentSlot] ? 'replaceOpponentSpecies' : 'assignOpponentSpecies',
        slot:opponentSlot, previousSpeciesId:state.opponentSpecies?.[opponentSlot], speciesId}); closeOpponentPicker();}} />}
  </div>;
}
