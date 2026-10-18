import {publicAsset} from '../../assets/publicAsset.js';
import React, {useRef} from 'react';
import FrontierTrainerSprite from './FrontierTrainerSprite.jsx';

export default function BattleTeamHeader({side, trainer, members, active, onSelect, onRemove, onEmpty, onRemoveTrainer}) {
  const label = side === 'player' ? 'My Team' : 'Opponent Team';
  const lastTap = useRef(null), consumedAt = useRef(-Infinity);
  // Touch browsers do not consistently emit dblclick. Consume the second touch
  // once, including its compatibility click, even if removal shifts the slots.
  function touchUp(event, key, remove) {
    if (event.pointerType !== 'touch' || !remove) return;
    const now = performance.now(), previous = lastTap.current;
    if (now - consumedAt.current < 400) {event.preventDefault();return;}
    if (previous?.key === key && now - previous.time < 350
      && Math.hypot(event.clientX-previous.x,event.clientY-previous.y) < 20) {
      lastTap.current = null;consumedAt.current = now;event.preventDefault();remove();
    } else lastTap.current = {key,time:now,x:event.clientX,y:event.clientY};
  }
  function click(event, select, remove) {
    if (performance.now() - consumedAt.current < 400) {event.preventDefault();return;}
    if (event.detail === 2 && remove) {
      consumedAt.current = performance.now();lastTap.current = null;remove();
    } else select?.();
  }
  function removeKey(event, remove) {
    if (remove && ['Delete','Backspace'].includes(event.key)) {event.preventDefault();remove();}
  }
  const trainerText = <><strong>{trainer.name}</strong>{trainer.label && <span> · {trainer.label}</span>}</>;
  const trainerTitle = `${trainer.name}${trainer.label ? ` · ${trainer.label}` : ''}`;
  return <section className={`battle-team-header battle-side-${side}`} aria-label={label}>
    <div className="battle-trainer-identity">
      {onRemoveTrainer ? <button type="button" className="battle-trainer-text battle-trainer-reset"
        title={`${trainerTitle}; double-tap to remove trainer`} aria-label={`${trainerTitle}; double-tap to remove trainer`}
        onPointerUp={event => touchUp(event, 'trainer', onRemoveTrainer)}
        onClick={event => click(event, undefined, onRemoveTrainer)} onDoubleClick={event => event.preventDefault()}
        onKeyDown={event => removeKey(event, onRemoveTrainer)}>{trainerText}</button>
        : <div className="battle-trainer-text" title={trainerTitle}>{trainerText}</div>}
    </div>
    <div className="battle-team-sprites">
      <FrontierTrainerSprite className="battle-trainer-portrait" src={publicAsset(trainer.portrait)} loading="eager" />
      <div className="battle-team-slots" aria-label={`${label} Pokémon`}>
        {Array.from({length:3}, (_, index) => {
          const mon = members[index];
          const remove = mon && onRemove ? () => onRemove(mon.key) : undefined;
          return mon ? <button key={mon.key} type="button" className="battle-team-slot" aria-pressed={active === mon.key}
            aria-label={`Select ${mon.name}, ${label}, slot ${index + 1}${onRemove ? '; double-tap to remove' : ''}`}
            title={onRemove ? 'Tap to select; double-tap to remove' : undefined}
            onPointerUp={event => touchUp(event, mon.key, remove)}
            onClick={event => click(event, () => onSelect(mon.key), remove)} onDoubleClick={event => event.preventDefault()}
            onKeyDown={event => removeKey(event, remove)}>
            <img src={publicAsset(`/pokemon/box/${mon.dex}.png`)} width="40" height="40" alt="" />
          </button> : <button key={`empty-${index}`} type="button" className="battle-team-slot battle-slot-empty"
            aria-label={`Add Pokémon, ${label}, empty slot ${index + 1}`} onClick={event => click(event, onEmpty)}><span aria-hidden="true">+</span></button>;
        })}
      </div>
    </div>
  </section>;
}
