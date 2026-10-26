import useBattlePopupDismiss from './useBattlePopupDismiss.js';
import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {loadBattleTeams, storeBattleTeams, validateTeam, createTeamId, teamHasSpecies} from '../../storage/battleTeams.js';
import {publicAsset} from '../../assets/publicAsset.js';

export default function BattleTeamPicker({state, pool, records = pool, dispatch, anchor, trigger, onClose, roleError}) {
  const popup = useRef(null);
  useLayoutEffect(() => {
    const width = popup.current.getBoundingClientRect().width;
    popup.current.style.right = `${Math.max(12, Math.min(anchor.right, window.innerWidth - width - 12))}px`;
  }, [anchor]);
  const touchSelection = useRef(null);
  const [loaded] = useState(() => {
    try {return {teams:loadBattleTeams(window.localStorage), error:''};}
    catch {return {teams:[], error:'Saved teams could not be loaded. Existing storage has been kept.'};}
  });
  const [teams, setTeams] = useState(loaded.teams);
  const [error, setError] = useState(loaded.error);
  const [mode, setMode] = useState('normal');
  const [selected, setSelected] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const maxTeamSize = 4;
  // Keep original indices so filtering never renumbers or mutates saved teams.
  const visibleTeams = teams.map((team,index) => ({team,index}))
    .filter(({team}) => mode !== 'normal' || team.ids.length === state.rules.teamSize);
  const available = new Set(pool.map(mon => mon.identity));
  const chosen = selected.filter(id => available.has(id));
  useBattlePopupDismiss({popup,trigger,onClose,interactive:'button, select, input, a'});
  useEffect(() => {
    const escape = event => {if (event.key === 'Escape') {event.preventDefault(); onClose();}};
    const outsideFocus = event => {
      if (!popup.current?.contains(event.target) && !trigger.current?.contains(event.target)) onClose();
    };
    const scroll = event => {if (!popup.current?.contains(event.target)) onClose();};
    document.addEventListener('keydown', escape);
    document.addEventListener('focusin', outsideFocus);
    window.addEventListener('resize', onClose);
    window.addEventListener('scroll', scroll, true);
    return () => {
      document.removeEventListener('keydown', escape);
      document.removeEventListener('focusin', outsideFocus);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('scroll', scroll, true);
    };
  }, [onClose, trigger]);
  function changeMode(next) {
    setMode(next); setSelected([]); setConfirm(null);
  }
  function persist(next) {
    try {
      const numbered = next.map((team,index) => ({...team,name:`Team ${index + 1}`}));
      storeBattleTeams(window.localStorage, numbered);
      setTeams(numbered); setError(''); return true;
    } catch {setError('Teams could not be saved. Browser storage may be unavailable or full.'); return false;}
  }
  function choosePokemon(mon) {
    if (mode === 'create') {
      setSelected(current => {
        const valid = current.filter(id => available.has(id));
        if (valid.includes(mon.identity)) return valid.filter(id => id !== mon.identity);
        return valid.length < maxTeamSize && !teamHasSpecies(valid, pool, mon) ? [...valid, mon.identity] : valid;
      });
    } else {
      if (mode !== 'normal' || teamHasSpecies(state.team, pool, mon)) return;
      dispatch({type:'assignPlayer', identity:mon.identity, slot:anchor.slot, pool});
      onClose();
    }
  }
  useLayoutEffect(() => {
    touchSelection.current = mode === 'create' ? identity => {
      const mon = pool.find(mon => mon.identity === identity);
      if (mon) choosePokemon(mon);
    } : null;
  });
  useEffect(() => {
    const node = popup.current;
    let gesture = null;
    const cancel = () => {gesture = null;};
    const start = event => {
      const row = event.target.closest('.battle-picker-pokemon');
      if (!touchSelection.current || event.touches.length !== 1 || !row || row.disabled) {cancel(); return;}
      const touch = event.touches[0];
      gesture = {row, id:touch.identifier, x:touch.clientX, y:touch.clientY};
    };
    const move = event => {
      const touch = Array.from(event.changedTouches).find(touch => touch.identifier === gesture?.id);
      if (gesture && touch && Math.hypot(touch.clientX-gesture.x, touch.clientY-gesture.y) > 10) cancel();
    };
    const end = event => {
      const current = gesture;
      cancel();
      const touch = current && Array.from(event.changedTouches).find(touch => touch.identifier === current.id);
      if (!touchSelection.current || !current || !touch || current.row.disabled || !event.cancelable
        || Math.hypot(touch.clientX-current.x, touch.clientY-current.y) > 10
        || !current.row.contains(document.elementFromPoint(touch.clientX, touch.clientY))) return;
      // Cancel Safari's synthetic click, which can retarget a nearby rapid tap
      // to the previous row. Native non-passive handling makes cancellation work.
      event.preventDefault();
      if (event.defaultPrevented) touchSelection.current(current.row.dataset.pokemonId);
    };
    node.addEventListener('touchstart', start, {passive:true});
    node.addEventListener('touchmove', move, {passive:true});
    node.addEventListener('touchcancel', cancel, {passive:true});
    node.addEventListener('touchend', end, {passive:false});
    return () => {
      node.removeEventListener('touchstart', start);
      node.removeEventListener('touchmove', move);
      node.removeEventListener('touchcancel', cancel);
      node.removeEventListener('touchend', end);
    };
  }, []);
  return createPortal(<div ref={popup} role="dialog" aria-label="My Team selection"
    className="home-filter-popup battle-team-selection" style={{top:anchor.top, right:anchor.right,
      maxHeight:Math.max(80, window.innerHeight - anchor.top - 12)}}>
    <section aria-label="Saved teams">
      <div className="battle-picker-heading"><h3>TEAMS</h3><div>
        <button type="button" aria-label="Remove team" aria-pressed={mode === 'remove'} disabled={Boolean(loaded.error) || !teams.length}
          onClick={() => changeMode(mode === 'remove' ? 'normal' : 'remove')}>−</button>
        <button type="button" aria-label="Create team" aria-pressed={mode === 'create'} disabled={Boolean(loaded.error)}
          onClick={() => changeMode(mode === 'create' ? 'normal' : 'create')}>+</button>
      </div></div>
      {visibleTeams.map(({team,index}) => {
        const issue = validateTeam(team,pool,state.rules.teamSize);
        const members = team.ids.map(id => records.find(record => record.identity === id));
        const level = members.reduce((highest,mon) => Number.isFinite(mon?.level) ? Math.max(highest,mon.level) : highest, 0);
        return <button type="button" key={team.id} className="battle-picker-team" disabled={mode === 'create' || (mode !== 'remove' && Boolean(issue))}
          title={mode === 'normal' && issue ? issue : undefined} aria-label={`${mode === 'remove' ? 'Remove' : 'Load'} Team ${index + 1}`}
          onClick={() => {
            if (mode === 'remove') setConfirm(team.id);
            else {dispatch({type:'loadTeam',team,records:pool}); onClose();}
          }}><span className="battle-picker-team-name">Team {index + 1}</span>
          <small className="battle-picker-team-level" title={members.some(mon => !mon) ? 'Highest available Pokémon level' : undefined}>Lv. {level || '—'}</small>
          <span className="battle-picker-team-sprites">
            {members.map((mon,slot) => {
              return mon ? <img key={slot} src={publicAsset(`/pokemon/box/${mon.dex}.png`)} alt={mon.name} width="32" height="32" />
                : <span key={slot} className="battle-picker-team-missing" role="img" aria-label="Pokémon unavailable">—</span>;
            })}
          </span></button>;
      })}
      {!visibleTeams.length && <p className="battle-picker-empty">No saved teams.</p>}
      {mode === 'remove' && <div className="battle-picker-actions">
        {confirm ? <><span>Delete Team {teams.findIndex(team => team.id === confirm) + 1}?</span>
          <button type="button" onClick={() => {if (persist(teams.filter(team => team.id !== confirm))) {setConfirm(null); setMode('normal');}}}>Delete</button>
          <button type="button" onClick={() => setConfirm(null)}>Cancel</button></>
          : <button type="button" onClick={() => changeMode('normal')}>Done</button>}
      </div>}
      {mode === 'create' && <div className="battle-picker-actions">
        <span role="status">{chosen.length}/{maxTeamSize} selected</span>
        <button type="button" disabled={Boolean(validateTeam({name:'Team',ids:chosen},pool))} onClick={() => {
          const team = {id:createTeamId(),name:`Team ${teams.length + 1}`,ids:chosen};
          if (!validateTeam(team,pool) && persist([...teams,team])) changeMode('normal');
        }}>Save</button>
        <button type="button" onClick={() => changeMode('normal')}>Cancel</button>
      </div>}
    </section>
    <section aria-label="Frontier Pokémon">
      <h3>POKÉMON</h3>
      {pool.map(mon => {
        const picked = chosen.includes(mon.identity);
        const speciesUnavailable = mode === 'create' ? !picked && teamHasSpecies(chosen, pool, mon)
          : mode === 'normal' && teamHasSpecies(state.team, pool, mon);
        const disabled = mode === 'remove' || (mode === 'create'
          ? !picked && chosen.length >= maxTeamSize || speciesUnavailable : speciesUnavailable);
        return <button type="button" key={mon.identity}
          className={`battle-picker-pokemon${speciesUnavailable ? ' battle-picker-species-unavailable' : ''}`} data-pokemon-id={mon.identity}
          aria-label={`${mon.name}, Level ${mon.level}`} aria-pressed={mode === 'create' ? picked : undefined}
          disabled={disabled} onClick={() => choosePokemon(mon)}>
          <img src={publicAsset(`/pokemon/emerald/${mon.shiny ? 'shiny' : 'normal'}/${mon.dex}.png`)} alt="" width="32" height="32" loading="lazy" />
          <span>{mon.name}</span><small>Lv. {mon.level}</small>
        </button>;
      })}
      {!pool.length && <p className="battle-picker-empty">No Frontier Pokémon.</p>}
    </section>
    {(error || roleError) && <p className="battle-picker-error" role="alert">{error || roleError}</p>}
  </div>, document.body);
}
