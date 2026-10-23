import React, {useId, useRef, useState} from 'react';
import BattleSearchPopup from './BattleSearchPopup.jsx';
import {searchTowerTrainers, selectedTowerTrainer, towerTrainerEntries} from '../../battle/towerTrainers.js';
import FrontierTrainerSprite from './FrontierTrainerSprite.jsx';

export const trainerResultText = text => text.replace(/\s*\([^)]*\)/g,'').replace(/[♂♀]/g,'').trim();

function TrainerLookup({entries, format, trigger, id, onSelect, onClose}) {
  const [query, setQuery] = useState('');
  const trainers = searchTowerTrainers(query, {entries, nameOnly:true, format});
  return <BattleSearchPopup trigger={trigger} id={id} label="Select opponent trainer"
    searchLabel="Search Tower trainers" placeholder="Search trainers" query={query} onQuery={setQuery}
    resultsLabel="Tower trainer results" onClose={onClose}>
      {trainers.map(entry => <button type="button" key={entry.key} className="battle-opponent-result"
        aria-label={`Select trainer ${trainerResultText(entry.name)}${entry.symbol ? ` ${entry.symbol}` : ''}`} aria-description={trainerResultText(entry.trainerClass)}
        title={`${trainerResultText(entry.name)} · ${trainerResultText(entry.trainerClass)}${entry.symbol ? ` · ${entry.symbol}` : ''}`}
        onClick={() => onSelect(entry.key)}>
        <FrontierTrainerSprite src={`/trainers/frontier/${entry.sprite}.png`} className="battle-opponent-result-sprite" />
        <span className="battle-opponent-result-identity"><strong>{trainerResultText(entry.name)}</strong><small> · {trainerResultText(entry.trainerClass)}</small></span>
        {entry.symbol && <small>{entry.symbol}</small>}
      </button>)}
      {!trainers.length && <p role="status" className="battle-opponent-no-results">No trainers found.</p>}
  </BattleSearchPopup>;
}

export default function BattleOpponentTrainerControl({state, dispatch, entries = towerTrainerEntries}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef(null), id = useId();
  const trainer = selectedTowerTrainer(state);
  const lastTap = useRef(null), gesture = useRef(null), consumedAt = useRef(-Infinity);
  const clear = () => {
    consumedAt.current = performance.now(); lastTap.current = null;
    setOpen(false); dispatch({type:'clearOpponentTrainer'});
  };
  const close = () => {setOpen(false); trigger.current?.focus({preventScroll:true});};
  return <h3><button ref={trigger} type="button" className="battle-opponent-trigger"
    aria-label={trainer ? `${trainer.name}; double-tap to clear opponent trainer and team` : 'Choose opponent trainer: Opponent'}
    aria-description={trainer?.trainerClass}
    title={trainer ? `${trainer.name} · ${trainer.trainerClass}; double-tap or double-click to clear opponent trainer and team` : 'Choose opponent trainer'}
    aria-haspopup={trainer ? undefined : 'dialog'} aria-expanded={trainer ? undefined : open}
    aria-controls={open ? id : undefined}
    onPointerDown={event => {
      if (trainer && event.pointerType === 'touch') gesture.current = {x:event.clientX,y:event.clientY,time:performance.now()};
    }}
    onPointerMove={event => {
      const start = gesture.current;
      if (start && Math.hypot(event.clientX-start.x,event.clientY-start.y) > 12) {gesture.current = null; lastTap.current = null;}
    }}
    onPointerCancel={() => {gesture.current = null; lastTap.current = null;}}
    onPointerUp={event => {
      if (!trainer || event.pointerType !== 'touch') return;
      const start = gesture.current, now = performance.now(), previous = lastTap.current;
      gesture.current = null;
      if (!start || now-start.time > 300 || Math.hypot(event.clientX-start.x,event.clientY-start.y) > 12) {lastTap.current = null; return;}
      if (previous && now-previous.time < 350 && Math.hypot(event.clientX-previous.x,event.clientY-previous.y) < 20) {
        event.preventDefault(); clear();
      } else lastTap.current = {x:event.clientX,y:event.clientY,time:now};
    }}
    onClick={event => {
      // Consume the clearing gesture's follow-up click on the newly empty control.
      if (performance.now()-consumedAt.current < 400) {event.preventDefault(); return;}
      if (!trainer) setOpen(value => !value);
    }}
    onDoubleClick={event => {
      event.preventDefault();
      if (trainer && performance.now()-consumedAt.current >= 400) clear();
    }}>
    <span className="battle-opponent-identity">
      <span className="battle-opponent-name-row">
        <span className="battle-opponent-name">{trainer?.name ?? 'Opponent'}</span>
        {!trainer && <span className="battle-opponent-chevron" aria-hidden="true">▾</span>}
      </span>
      <small className="battle-opponent-class" aria-hidden={!trainer}>{trainer?.trainerClass ?? ''}</small>
    </span>
    {trainer && <FrontierTrainerSprite src={`/trainers/frontier/${trainer.sprite}.png`} className="battle-compact-trainer" loading="eager" />}
  </button>
    {open && !trainer && <TrainerLookup entries={entries} format={state.rules.format} trigger={trigger} id={id} onClose={close}
      onSelect={key => {dispatch({type:'opponentTrainer',key}); close();}} />}
  </h3>;
}
