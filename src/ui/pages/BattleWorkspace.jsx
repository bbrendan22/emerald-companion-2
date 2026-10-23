import React, {useRef} from 'react';
import {battleTabs} from '../../battle/battleState.js';
import {towerSetById} from '../../battle/towerSets.js';
import {selectedTowerTrainer} from '../../battle/towerTrainers.js';
import {speciesByName} from '../../battle/reference.js';
import BattleTeamHeader from '../components/BattleTeamHeader.jsx';
import BattleMatchupShell from '../components/BattleMatchupShell.jsx';
import BattleTrainers from '../components/BattleTrainers.jsx';
import BattleSets from '../components/BattleSets.jsx';
import BattleTeams from '../components/BattleTeams.jsx';
import BattleRules from '../components/BattleRules.jsx';
import '../styles/battle.css';

export default function BattleWorkspace({snapshot, battle}) {
  const {state, dispatch, records, roleError} = battle;
  const tabRefs = useRef([]);
  const player = snapshot?.trainer;
  const opponent = selectedTowerTrainer(state);
  const playerMembers = state.team.map(id => {
    const mon = records.find(record => record.identity === id);
    return mon ? {key:id, name:mon.nickname || mon.name, dex:mon.dex} : null;
  });
  const opponentMembers = state.opponents.map(id => {
    const set = towerSetById(id), species = set && speciesByName.get(set.species.toLowerCase());
    return species ? {key:id, name:set.species, dex:species.nationalDexId} : null;
  });
  function switchTab(tab) { dispatch({type:'tab', tab}); }
  function onTabKey(event, index) {
    const next = event.key === 'ArrowRight' ? (index + 1) % 5 : event.key === 'ArrowLeft' ? (index + 4) % 5
      : event.key === 'Home' ? 0 : event.key === 'End' ? 4 : null;
    if (next === null) return;
    event.preventDefault(); switchTab(battleTabs[next]); tabRefs.current[next]?.focus({preventScroll:true});
  }
  return <div className="battle-content">
    <h1 className="battle-page-title">Battle Tower <span>· Singles</span></h1>
    <div className="battle-status-header">
      <div className="battle-team-headers">
        <BattleTeamHeader side="player" trainer={{name:player?.name || 'No save imported',
          portrait:['male','female'].includes(player?.gender) ? `/trainers/${player.gender === 'female' ? 'may-emerald' : 'brendan-emerald'}.png` : null}}
          members={playerMembers} active={state.active} onSelect={identity => dispatch({type:'activePlayer', identity})} onRemove={identity => dispatch({type:'removePlayer', identity})}
          onEmpty={() => switchTab('Teams')} />
        <BattleTeamHeader side="enemy" trainer={{name:opponent?.name || 'Opponent', label:opponent ? `${opponent.trainerClass}${opponent.symbol ? ` · ${opponent.symbol}` : ''}` : '',
          portrait:opponent ? `/trainers/frontier/${opponent.sprite}.png` : null}}
          members={opponentMembers} active={state.enemy} onSelect={setId => dispatch({type:'activeOpponent', setId})} onRemove={setId => dispatch({type:'removeOpponent', setId})}
          onEmpty={() => switchTab('Sets')} onRemoveTrainer={opponent ? () => dispatch({type:'clearTrainer'}) : undefined} />
      </div>
      <div className="battle-tabs" role="tablist" aria-label="Battle sections">
        {battleTabs.map((tab, index) => <button key={tab} type="button" role="tab" ref={node => {tabRefs.current[index] = node;}}
          id={`battle-tab-${tab}`} aria-controls={`battle-panel-${tab}`} aria-selected={state.tab === tab} tabIndex={state.tab === tab ? 0 : -1}
          onClick={() => switchTab(tab)} onKeyDown={event => onTabKey(event, index)}>{tab}</button>)}
      </div>
    </div>
    {roleError && <p className="battle-role-error" role="status">{roleError}</p>}
    <div className="battle-panel-area">
      {battleTabs.map(tab => <div key={tab} id={`battle-panel-${tab}`} role="tabpanel" aria-labelledby={`battle-tab-${tab}`}
        hidden={state.tab !== tab} tabIndex={tab === 'Matchup' ? undefined : 0} className="battle-tab-panel">
        {tab === 'Matchup' ? <BattleMatchupShell state={state} records={records} dispatch={dispatch} /> : tab === 'Trainers' ? <BattleTrainers state={state} dispatch={dispatch} />
          : tab === 'Sets' ? <BattleSets state={state} dispatch={dispatch} records={records} />
          : tab === 'Teams' ? <BattleTeams battle={battle} />
          : <BattleRules state={state} dispatch={dispatch} />}
      </div>)}
    </div>
  </div>;
}
