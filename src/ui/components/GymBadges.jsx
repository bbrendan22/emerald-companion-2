import React from 'react';
import '../styles/dashboard.css';
import '../styles/achievements.css';

const badges = ['stone', 'knuckle', 'dynamo', 'heat', 'balance', 'feather', 'mind', 'rain'];

export default function GymBadges({earned}) {
  return <section className="dashboard-card achievement-card gym-card" aria-labelledby="badges-heading">
    <div className="section-heading achievement-heading"><h2 id="badges-heading">Gym Badges</h2><span>{earned.filter(Boolean).length}/8</span></div>
    <ol className="badge-row">{badges.map((badge, index) => {
      const name = `${badge[0].toUpperCase()}${badge.slice(1)} Badge`;
      return <li key={badge} className={earned[index] ? 'badge-earned' : 'badge-unearned'} title={`${name} — ${earned[index] ? 'Earned' : 'Not earned'}`}>
        <img src={`/badges/${badge}_badge.png`} alt={`${name}: ${earned[index] ? 'earned' : 'not earned'}`} width="64" height="64" />
      </li>;
    })}</ol>
  </section>;
}
