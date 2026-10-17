import React from 'react';
import '../styles/dashboard.css';
import '../styles/achievements.css';

export default function HallOfFame({isChampion, record}) {
  return <section className="dashboard-card achievement-card hof-card" aria-labelledby="hof-heading">
    <div className="section-heading achievement-heading"><h2 id="hof-heading">Hall of Fame</h2>
    <div className={`champion-status ${isChampion ? 'champion-earned' : ''}`}>
      <img src="/ribbons/champion-ribbon.png" width="48" height="48" alt={isChampion ? 'Pokémon League Champion' : 'Championship not completed'} className={isChampion ? '' : 'ribbon-unearned'} />
    </div>
    </div>
    {record.status === 'available' ? <>
      <h3>Earliest stored team</h3>
      <ol className="hof-team">{record.team.map(pokemon => <li key={pokemon.slot}>
        {pokemon.nationalDexId ? <img src={`/pokemon/emerald/${pokemon.shiny ? 'shiny' : 'normal'}/${pokemon.nationalDexId}.png`} alt={`${pokemon.shiny ? 'Shiny ' : ''}${pokemon.speciesName}`} width="128" height="128" loading="lazy" /> : <span className="hof-egg">Egg</span>}
        <details className="hof-details"><summary aria-label={`${pokemon.speciesName}, level ${pokemon.level}${pokemon.shiny && !pokemon.isEgg ? ', Shiny' : ''}`}><strong>{pokemon.speciesName}</strong></summary><p>{pokemon.speciesName} · Lv. {pokemon.level}{pokemon.shiny && !pokemon.isEgg ? ' · Shiny' : ''}</p></details><span>Lv. {pokemon.level}{pokemon.shiny && !pokemon.isEgg && <span className="shiny-star" role="img" aria-label="Shiny"> ★</span>}</span>
      </li>)}</ol>
      
    </> : <p className="achievement-note">{record.message}</p>}
    {record.warnings.map(warning => <p className="achievement-note" key={warning}>{warning}</p>)}
    <details className="dashboard-help"><summary>About this record</summary><p>The ribbon reflects your save’s game-clear status, not individual Pokémon ribbons. This is the oldest available Hall of Fame team; Emerald retains up to 50 teams, so older records may have been overwritten.</p></details>
  </section>;
}
