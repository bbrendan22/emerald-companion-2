import {publicAsset} from '../../assets/publicAsset.js';
import React, {useState} from 'react';
import {searchTowerTrainers, selectedTowerTrainer} from '../../battle/towerTrainers.js';
import FrontierTrainerSprite from './FrontierTrainerSprite.jsx';

export default function BattleTrainers({state, dispatch}) {
  const [query, setQuery] = useState('');
  const results = searchTowerTrainers(query);
  const selected = selectedTowerTrainer(state)?.key;
  return <section className="battle-trainer-search" aria-label="Tower trainers">
    <label className="battle-trainer-search-field"><span className="battle-visually-hidden">Search trainers</span>
      <input type="search" placeholder="Search" value={query} onFocus={() => setQuery('')} onChange={event => setQuery(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck="false" />
    </label>
    <div className="battle-trainer-results" aria-label="Trainer results">
      {results.map(entry => <button key={entry.key} type="button" className="battle-trainer-result" aria-pressed={selected === entry.key}
        onClick={() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); dispatch({type:'trainer',key:entry.key}); }}>
        <FrontierTrainerSprite src={publicAsset(`/trainers/frontier/${entry.sprite}.png`)} className="battle-result-sprite" />
        <span className="battle-result-identity"><strong>{entry.name}{entry.symbol && <span> · {entry.symbol}</span>}</strong><small>{entry.trainerClass}</small></span>
        <span className="battle-result-count"><b>{entry.setIds.length}</b><small>sets</small></span>
      </button>)}
      {!results.length && <p className="battle-trainer-no-results" role="status">No results.</p>}
    </div>
  </section>;
}
