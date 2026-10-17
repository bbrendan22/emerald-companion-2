import React from 'react';
import '../styles/dashboard.css';
import '../styles/trainer.css';
import GymBadges from '../components/GymBadges.jsx';
import HallOfFame from '../components/HallOfFame.jsx';
import FrontierSymbols from '../components/FrontierSymbols.jsx';

const number = value => value.toLocaleString();
const id = value => String(value).padStart(5, '0');
const unavailable = 'Unavailable';

export default function TrainerPage({snapshot, error, onImport}) {
  if (!snapshot) return <section className="dashboard-card trainer-empty">
    <h2>Your journey starts here</h2>
    <p>Import your Emerald save to see your Trainer card and Pokédex progress.</p>
    <button className="action-button" onClick={onImport}>Import a save in Settings</button>
    {error && <p role="alert">{error}</p>}
  </section>;
  const {trainer, hallOfFame, owned, shinies, warnings} = snapshot;
  const {pokedex, playtime} = trainer;
  const artwork = trainer.gender === 'male' ? 'brendan' : trainer.gender === 'female' ? 'may' : null;
  const percent = pokedex.caughtCount / pokedex.total * 100;
  const time = playtime.minutes < 60 && playtime.seconds < 60
    ? `${playtime.hours}:${String(playtime.minutes).padStart(2, '0')}:${String(playtime.seconds).padStart(2, '0')}` : unavailable;
  return <div className="trainer-content">
    <section className="dashboard-card trainer-card" aria-labelledby="trainer-name">
      <div className="trainer-art">{artwork ? <img src={`/trainers/${artwork}.png`} alt={artwork === 'brendan' ? 'Brendan' : 'May'} /> : <span>Artwork unavailable</span>}</div>
      <div className="trainer-details">
        <p className="trainer-eyebrow">Trainer card</p>
        <h2 id="trainer-name">{trainer.name || unavailable}</h2>
        <dl className="trainer-fields">
          <div><dt><abbr title="Trainer ID">TID</abbr></dt><dd>{id(trainer.trainerId)}</dd></div>
          <div><dt><abbr title="Secret ID">SID</abbr></dt><dd>{id(trainer.secretId)}</dd></div>
          <div className="trainer-time"><dt>Playtime</dt><dd>{time}</dd></div>
          <div><dt>Money</dt><dd>{trainer.money <= 999999 ? `₽${number(trainer.money)}` : unavailable}</dd></div>
          <div><dt>Battle Points</dt><dd>{number(trainer.battlePoints)}</dd></div>
        </dl>
      </div>
    </section>
    <section className="dashboard-card dex-card" aria-labelledby="dex-heading">
      <div className="section-heading dex-heading"><h2 id="dex-heading">National Pokédex</h2><span>{percent.toFixed(1)}%</span></div>
      <p className="dex-completion"><strong>{number(pokedex.caughtCount)}</strong> / {pokedex.total} species caught</p>
      <dl className="dex-stats">{[['Seen', pokedex.seenCount], ['Caught', pokedex.caughtCount], ['Owned', owned], ['Shinies', shinies]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{number(value)}</dd></div>)}</dl>
      <progress max={pokedex.total} value={pokedex.caughtCount} aria-label="National Pokédex species caught" />
    </section>
    <GymBadges earned={trainer.badges} />
    <HallOfFame isChampion={trainer.isChampion} record={hallOfFame} />
    <FrontierSymbols frontier={snapshot.frontier} />
    {warnings.length > 0 && <aside className="trainer-warnings" aria-label="Save notes"><h2>Save notes</h2><ul>{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></aside>}
  </div>;
}
