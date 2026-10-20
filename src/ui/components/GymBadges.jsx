import {publicAsset} from '../../assets/publicAsset.js';
import React from 'react';
import AchievementTarget from './AchievementTarget.jsx';
import '../styles/dashboard.css';
import '../styles/achievements.css';

const badges = ['stone', 'knuckle', 'dynamo', 'heat', 'balance', 'feather', 'mind', 'rain'];

export default function GymBadges({earned}) {
  return <section className="dashboard-card achievement-card gym-card" aria-labelledby="badges-heading">
    <div className="section-heading achievement-heading"><h2 id="badges-heading">Gym Badges</h2></div>
    <ol className="badge-row">{badges.map((badge, index) => {
      const name = `${badge[0].toUpperCase()}${badge.slice(1)} Badge`;
      return <li key={badge} className={earned[index] ? 'badge-earned' : 'badge-unearned'}>
        <AchievementTarget name={name} status={earned[index] ? 'Earned' : 'Not Earned'}><img src={publicAsset(`/badges/${badge}_badge.png`)} alt={`${name}: ${earned[index] ? 'earned' : 'not earned'}`} width="64" height="64" /></AchievementTarget>
      </li>;
    })}</ol>
  </section>;
}
