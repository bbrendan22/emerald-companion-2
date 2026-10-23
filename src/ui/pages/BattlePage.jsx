import React from 'react';
import BattleTeamSections from '../components/BattleTeamSections.jsx';
import BattleRulesControl from '../components/BattleRulesControl.jsx';
import BattleMatchup from '../components/BattleMatchup.jsx';
import BattlePossibleSets from '../components/BattlePossibleSets.jsx';
import '../styles/trainer.css';
import '../styles/battle.css';

// Keep the previous interface in BattleWorkspace while rebuilding this surface.
export default function BattlePage({battle, snapshot}) {
  return <div className="home-layout battle-foundation">
    <section className="home-trainer">
      <h2 className="battle-matchup-title">Matchup</h2>
      <BattleMatchup state={battle.state} records={battle.records} />
    </section>
    <section className="home-resources">
      <BattleRulesControl state={battle.state} dispatch={battle.dispatch} />
      <section className="battle-teams-section" aria-label="Teams">
        <h2 className="battle-section-heading">Teams</h2>
        <BattleTeamSections state={battle.state} records={battle.records} frontierPool={battle.frontierPool}
          dispatch={battle.dispatch} playerTrainer={snapshot?.trainer} roleError={battle.roleError} />
      </section>
      <BattlePossibleSets state={battle.state} />
    </section>
  </div>;
}
