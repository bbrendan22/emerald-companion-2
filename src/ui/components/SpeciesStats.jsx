import React from 'react';
import {baseStatRows, defensiveMatchupGroups} from '../../resources/speciesStats.js';

export default function SpeciesStats({species}) {
  const stats = baseStatRows(species.baseStats);
  const groups = defensiveMatchupGroups(species.types);
  return <>
    <section className="species-section" aria-labelledby="species-base-stats-heading">
      <h2 id="species-base-stats-heading">Base Stats</h2>
      <div className="species-base-stats">{stats.map(stat => <div key={stat.key} className={`species-base-stat stat-${stat.key}`} data-stat={stat.key}>
        <span>{stat.label}</span><strong>{stat.value}</strong>
        <div className="species-stat-track" aria-hidden="true"><span style={{width: `${stat.percent}%`}} /></div>
      </div>)}</div>
      <p className="species-base-stat-total"><span>Base Stat Total</span><strong>{stats.reduce((total, stat) => total + stat.value, 0)}</strong></p>
    </section>
    <section className="species-section" aria-labelledby="species-type-matchups-heading">
      <h2 id="species-type-matchups-heading">Type Matchups</h2>
      <div className="species-type-matchups">{groups.map(group => <div className="species-type-matchup" key={group.multiplier} data-multiplier={group.multiplier}>
        <span className="species-matchup-multiplier">{group.label}</span>
        <div className="species-matchup-types">{group.types.map(type => <img key={type} src={`/types/icons/${type}.png`} width="20" height="20" alt={`${type[0].toUpperCase()}${type.slice(1)} type`} />)}</div>
      </div>)}</div>
    </section>
  </>;
}
