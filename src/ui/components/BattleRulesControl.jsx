import useBattlePopupDismiss from './useBattlePopupDismiss.js';
import React, {useEffect, useId, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {battleFormats} from '../../battle/towerRules.js';
import '../styles/collection-pokemon-overview.css';

export default function BattleRulesControl({state, dispatch}) {
  const [position, setPosition] = useState(null);
  const trigger = useRef(null);
  const popup = useRef(null);
  const id = useId();
  const open = Boolean(position);
  useBattlePopupDismiss({popup,trigger,onClose:() => setPosition(null),interactive:'select',enabled:open});
  useEffect(() => {
    if (!open) return;
    const close = () => setPosition(null);
    const escape = event => {
      if (event.key === 'Escape') {
        event.preventDefault(); close(); trigger.current?.focus({preventScroll:true});
      }
    };
    const blur = event => {
      if (!popup.current?.contains(event.target) && !trigger.current?.contains(event.target)) close();
    };
    const scroll = event => {if (!popup.current?.contains(event.target)) close();};
    document.addEventListener('keydown', escape);
    document.addEventListener('focusin', blur);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', scroll, true);
    return () => {
      document.removeEventListener('keydown', escape);
      document.removeEventListener('focusin', blur);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', scroll, true);
    };
  }, [open]);
  const update = patch => dispatch({type:'rules', patch});
  return <h2 className="battle-section-heading battle-rules-heading">
    <button ref={trigger} type="button" className="collection-overview-role-trigger" aria-haspopup="dialog"
      aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => {
        const rect = trigger.current.getBoundingClientRect();
        setPosition(open ? null : {top:rect.bottom + 6, right:Math.max(16, window.innerWidth - rect.right), maxHeight:Math.max(120, window.innerHeight - rect.bottom - 22)});
      }}>Battle Rules<span aria-hidden="true">▾</span></button>
    {open && createPortal(<div ref={popup} id={id} role="dialog" aria-label="Battle Rules" className="home-filter-popup battle-rules-popup" style={position}>
      <div className="battle-rules-facility"><span>Facility</span><span>Tower</span></div>
      <label>Battle Type<select aria-label="Battle Type" value={state.rules.format} onChange={event => update({format:event.target.value})}>
        {battleFormats.map(value => <option key={value}>{value}</option>)}
      </select></label>
      <label>Level<select aria-label="Level" value={state.rules.opponentLevel} onChange={event => {
        const level = Number(event.target.value);
        update(level === 50 ? {levelMode:'50'} : {levelMode:'open', openLevel:level});
      }}>
        {[50, ...Array.from({length:41}, (_, index) => index + 60)].map(level =>
          <option key={level} value={level}>Level {level}</option>)}
      </select></label>
    </div>, document.body)}
  </h2>;
}
