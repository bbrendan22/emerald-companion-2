import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import BattleTeamPicker from './BattleTeamPicker.jsx';
import BattleOpponentTrainerControl from './BattleOpponentTrainerControl.jsx';
import BattleOpponentPokemonPicker from './BattleOpponentPokemonPicker.jsx';
import {opponentSpeciesById} from '../../battle/opponentSpecies.js';
import {towerSetById} from '../../battle/towerSets.js';
import {speciesByName} from '../../battle/reference.js';
import {publicAsset} from '../../assets/publicAsset.js';
import FrontierTrainerSprite from './FrontierTrainerSprite.jsx';

function TeamSlots({label, members, count = 3, onEmpty, onRemove, onSelect, selected, openSlot}) {
  const row = useRef(null), latest = useRef(null);
  const lastTap = useRef(null), consumedAt = useRef(-Infinity), lastTouch = useRef(-Infinity);
  useLayoutEffect(() => {latest.current = {members, onEmpty, onRemove, onSelect};});
  useEffect(() => {
    const node = row.current;
    let gesture = null;
    const cancel = () => {gesture = null; lastTap.current = null;};
    const start = event => {
      lastTouch.current = performance.now();
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
  }, []);
  return <div ref={row} className="battle-compact-slots" style={{'--team-slots':count}} role="group" aria-label={`${label} Pokémon`}>
    {Array.from({length:count}, (_, index) => {
      const mon = members[index];
      return <button key={index} type="button" className="battle-compact-slot"
        data-slot={index}
        aria-pressed={mon && onSelect ? selected === mon.identity : undefined}
        onClick={event => {
          // The second touch's compatibility click must not open the newly empty slot.
          if (performance.now() - consumedAt.current < 400) {event.preventDefault(); return;}
          if (!mon && onEmpty) onEmpty(index, event.currentTarget);
          else if (mon) onSelect?.(mon.identity);
        }}
        onDoubleClick={event => {
          event.preventDefault();
          if (mon && onRemove && performance.now() - lastTouch.current >= 800
            && performance.now() - consumedAt.current >= 400) {
            consumedAt.current = performance.now(); onRemove(index, mon.identity);
          }
        }}
        title={mon && onRemove ? `Double-tap or double-click to remove from ${label}` : undefined}
        aria-haspopup={!mon && onEmpty ? 'dialog' : undefined} aria-expanded={!mon && onEmpty ? openSlot === index : undefined}
        aria-label={mon ? `${mon.name}, ${label}, slot ${index + 1}` : `Add Pokémon, ${label}, empty slot ${index + 1}`}>
        {mon ? <img src={publicAsset(`/pokemon/box/${mon.dex}.png`)} width="32" height="32" alt="" draggable="false" />
          : <span aria-hidden="true">+</span>}
      </button>;
    })}
  </div>;
}

// Team slots and their selection controls stay within the right column.
export default function BattleTeamSections({state, records, frontierPool = [], dispatch, playerTrainer, roleError}) {
  const [picker, setPicker] = useState(null);
  const pickerTrigger = useRef(null);
  const [opponentSlot, setOpponentSlot] = useState(null);
  const opponentTrigger = useRef(null);
  const closeOpponentPicker = () => {setOpponentSlot(null); opponentTrigger.current?.focus({preventScroll:true});};
  const trainerTap = useRef(null);
  const trainerGesture = useRef(null);
  const trainerConsumedAt = useRef(-Infinity);
  const clearMyTeam = () => {setPicker(null); dispatch({type:'clearPlayerTeam'});};
  const closePicker = () => {setPicker(null); pickerTrigger.current?.focus({preventScroll:true});};
  const playerMembers = state.team.map(id => {
    const mon = records.find(record => record.identity === id);
    return mon ? {identity:id, name:mon.nickname || mon.name, dex:mon.dex} : null;
  });
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
      <h3 className="battle-player-heading">
        <button type="button" className="battle-player-name"
          aria-label={`${playerTrainer?.name?.trim() || 'Trainer'}; double-tap to clear My Team`}
          title="Double-tap or double-click to clear My Team"
          onPointerDown={event => {
            if (event.pointerType === 'touch') trainerGesture.current = {x:event.clientX,y:event.clientY,time:performance.now()};
          }}
          onPointerMove={event => {
            const start = trainerGesture.current;
            if (start && Math.hypot(event.clientX-start.x,event.clientY-start.y) > 12) {
              trainerGesture.current = null; trainerTap.current = null;
            }
          }}
          onPointerCancel={() => {trainerGesture.current = null; trainerTap.current = null;}}
          onPointerUp={event => {
            if (event.pointerType !== 'touch') return;
            const start = trainerGesture.current, now = performance.now(), previous = trainerTap.current;
            trainerGesture.current = null;
            if (!start || now-start.time > 300 || Math.hypot(event.clientX-start.x,event.clientY-start.y) > 12) {
              trainerTap.current = null; return;
            }
            if (previous && now-previous.time < 350 && Math.hypot(event.clientX-previous.x,event.clientY-previous.y) < 20) {
              event.preventDefault(); trainerTap.current = null; trainerConsumedAt.current = now; clearMyTeam();
            } else trainerTap.current = {x:event.clientX,y:event.clientY,time:now};
          }}
          onDoubleClick={event => {
            event.preventDefault();
            if (performance.now()-trainerConsumedAt.current >= 400) {trainerConsumedAt.current = performance.now(); clearMyTeam();}
          }}>{playerTrainer?.name?.trim() || 'Trainer'}</button>
        {['male','female'].includes(playerTrainer?.gender) && <FrontierTrainerSprite
          src={`/trainers/${playerTrainer.gender === 'female' ? 'may' : 'brendan'}-emerald.png`}
          className="battle-compact-trainer" loading="eager" />}
      </h3>
      <TeamSlots label="My Team" members={playerMembers} count={state.rules.teamSize} openSlot={picker?.slot}
        selected={state.matchup?.player} onSelect={identity => dispatch({type:'matchupPlayer',identity})}
        onRemove={(slot, identity) => dispatch({type:'clearPlayerSlot', slot, identity})}
        onEmpty={(slot, trigger) => {
          pickerTrigger.current = trigger;
          const rect = trigger.getBoundingClientRect();
          const section = trigger.closest('section').getBoundingClientRect();
          setPicker({slot, top:rect.bottom + 6, right:Math.max(12, window.innerWidth - section.right)});
        }} />
    </section>
    <section aria-label="Opponent Team">
      <BattleOpponentTrainerControl state={state} dispatch={dispatch} />
      <TeamSlots label="Opponent Team" members={opponentMembers} count={state.rules.teamSize} openSlot={opponentSlot}
        selected={state.matchup?.opponent} onSelect={speciesId => dispatch({type:'matchupOpponent',speciesId})}
        onEmpty={(slot, trigger) => {opponentTrigger.current = trigger; setOpponentSlot(current => current === slot ? null : slot);}}
        onRemove={(slot, speciesId) => dispatch({type:'clearOpponentSpeciesSlot', slot, speciesId})} />
    </section>
    {picker && <BattleTeamPicker state={state} pool={frontierPool} records={records} dispatch={dispatch} anchor={picker}
      trigger={pickerTrigger} onClose={closePicker} roleError={roleError} />}
    {opponentSlot !== null && opponentSlot < state.rules.teamSize && <BattleOpponentPokemonPicker state={state}
      trigger={opponentTrigger} onClose={closeOpponentPicker}
      onSelect={speciesId => {dispatch({type:'assignOpponentSpecies', slot:opponentSlot, speciesId}); closeOpponentPicker();}} />}
  </div>;
}
