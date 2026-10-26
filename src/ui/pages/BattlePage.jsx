import React from 'react';
import BattleConditions from '../components/BattleMatchupConditions.jsx';
import {opponentSpeciesById} from '../../battle/opponentSpecies.js';
import {opponentStatRanges} from '../../battle/opponentStats.js';
import {activeConditionSlot} from '../../battle/matchupConditions.js';
import BattlePokemonSelection from '../components/BattlePokemonSelection.jsx';
import BattleRulesControl from '../components/BattleRulesControl.jsx';
import BattleMatchup from '../components/BattleMatchup.jsx';
import BattleObservations from '../components/BattleObservations.jsx';
import {usesSelectedSet,analysisMatchupSets,eligibleMatchupSets} from '../../battle/towerSets.js';
import '../styles/trainer.css';
import '../styles/battle.css';

// Keep the previous interface in BattleWorkspace while rebuilding this surface.
export default function BattlePage({battle, snapshot}) {
  const {state,dispatch,records} = battle;
  const workspace=React.useRef(null);
  React.useLayoutEffect(()=>{
    if(window.navigator.standalone!==true)return;
    const page=workspace.current.closest('main'),previous=page.style.minHeight;
    // Keep the Home Screen canvas full-height before a popup opens. Growing a
    // short document during modal setup otherwise causes a native viewport flash.
    const sizePage=()=>{
      const screenHeight=window.screen.width===window.innerWidth ? window.screen.height : 0;
      const height=Math.max(window.innerHeight,window.visualViewport?.height ?? 0,window.outerHeight,screenHeight);
      const headerHeight=document.querySelector('.header')?.getBoundingClientRect().height ?? 0;
      page.style.minHeight=`${Math.max(0,height-headerHeight)}px`;
    };
    sizePage();
    window.addEventListener('resize',sizePage);
    window.visualViewport?.addEventListener('resize',sizePage);
    return ()=>{
      window.removeEventListener('resize',sizePage);
      window.visualViewport?.removeEventListener('resize',sizePage);
      page.style.minHeight=previous;
    };
  },[]);
  const player = activeConditionSlot(state,'player') !== null ? records.find(mon => mon.identity === state.matchup.player) : null;
  const opponent = activeConditionSlot(state,'enemy') !== null ? opponentSpeciesById(state.matchup.opponent) : null;
  const hpRange = React.useMemo(() => opponent ? opponentStatRanges(state,analysisMatchupSets(state))?.hp : null, [state.selectedOpponentSetId,state.rules,state.selectedTrainer,state.selectedBrainSymbol,state.matchup?.opponent,state.opponentSpecies,state.opponentObservations]);
  return <div ref={workspace} className="battle-foundation">
    <BattleRulesControl state={battle.state} dispatch={battle.dispatch} />
    <section className="battle-workspace-panel" aria-label="Battle matchup">
      <BattlePokemonSelection state={battle.state} records={battle.records} frontierPool={battle.frontierPool}
        dispatch={battle.dispatch} playerTrainer={snapshot?.trainer} roleError={battle.roleError} />
      <BattleMatchup state={battle.state} records={battle.records} dispatch={battle.dispatch} />
    </section>
    {opponent && usesSelectedSet(state) && eligibleMatchupSets(state).length !== 1 && <BattleObservations state={state} dispatch={dispatch} />}
    {player && opponent && <BattleConditions state={state} dispatch={dispatch} player={player} opponent={opponent} hpRange={hpRange} />}
  </div>;
}
