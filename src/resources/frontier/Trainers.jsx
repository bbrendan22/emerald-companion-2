import PokemonName from '../../ui/components/PokemonName.js';
import React, {useRef, useState} from 'react';
import {publicAsset} from '../../assets/publicAsset.js';
import {speciesByName} from '../../battle/reference.js';
import {trainerKey} from '../../battle/towerRules.js';
import {frontierTrainerSprite} from '../../battle/towerTrainers.js';
import FrontierTrainerSprite from '../../ui/components/FrontierTrainerSprite.jsx';
import {searchResourceTrainers, resourceTrainerSets, resourceBrainTeams, resourceBrainIVRange} from './trainers.js';
import './trainers.css';

function PokemonGrid({sets, numbered}) {
  return <ul className="frontier-trainer-grid">{sets.map(set => <li key={numbered ? set.id : `${set.brainSet}:${set.species}`} data-set-id={set.id} data-entry={set.entry} data-brain={set.brainSet}>
    <img src={publicAsset(`/pokemon/emerald/normal/${speciesByName.get(set.species.toLowerCase()).nationalDexId}.png`)} alt="" width="32" height="32" loading="lazy" />
    <span><PokemonName>{numbered ? set.id : set.species}</PokemonName></span>
  </li>)}</ul>;
}

export default function Trainers() {
  const [tab, setTab] = useState('trainers');
  const [queries, setQueries] = useState({trainers:'', brains:''});
  const [expanded, setExpanded] = useState(null);
  const tabs = useRef([]), search = useRef(null);
  const query = queries[tab];
  const entries = searchResourceTrainers(query, tab);
  const setQuery = value => {setQueries(current => ({...current, [tab]:value})); setExpanded(null);};
  const selectTab = value => {setTab(value); setExpanded(null);};
  function onTabKey(event, index) {
    const next = ['ArrowLeft', 'ArrowRight'].includes(event.key) ? 1 - index
      : event.key === 'Home' ? 0 : event.key === 'End' ? 1 : null;
    if (next === null) return;
    event.preventDefault();
    selectTab(next === 0 ? 'trainers' : 'brains');
    tabs.current[next]?.focus({preventScroll:true});
  }
  return <section className="resources-home frontier-trainers" aria-labelledby="frontier-trainers-heading">
    <h1 id="frontier-trainers-heading">Trainers</h1>
    <div className="frontier-trainers-tabs" role="tablist" aria-label="Frontier trainer lists">
      {[['trainers', 'Trainers'], ['brains', 'Frontier Brains']].map(([id, label], index) => <button key={id} ref={element => {tabs.current[index] = element;}} type="button" role="tab" id={`frontier-trainers-tab-${id}`} aria-selected={tab === id} aria-controls="frontier-trainers-panel" tabIndex={tab === id ? 0 : -1} onClick={() => selectTab(id)} onKeyDown={event => onTabKey(event, index)}>{label}</button>)}
    </div>
    <div role="tabpanel" id="frontier-trainers-panel" aria-labelledby={`frontier-trainers-tab-${tab}`}>
      <div className="resources-search">
        <label className="resources-search-label" htmlFor="frontier-trainers-query">Search Frontier Trainers</label>
        <div className="resources-search-field">
          <input ref={search} id="frontier-trainers-query" type="search" placeholder={tab === 'trainers' ? 'Search by trainer name or class…' : 'Search by Brain name or facility…'} value={query} onChange={event => setQuery(event.target.value)} autoComplete="off" spellCheck="false" />
          {query && <button type="button" className="resources-clear" aria-label="Clear search" onClick={() => {setQuery(''); search.current?.focus();}}>×</button>}
        </div>
      </div>
      <p className="resources-search-status" role="status">{entries.length ? '' : 'No results.'}</p>
      <ol className="frontier-trainer-list">{entries.map(trainer => {
        const brain = tab === 'brains';
        const key = brain ? trainer.name : trainerKey(trainer);
        const open = expanded === key;
        const panelId = `frontier-trainer-${encodeURIComponent(key)}`;
        const teams = brain ? resourceBrainTeams(trainer) : null;
        const count = brain ? teams.reduce((sum, team) => sum + team.sets.length, 0) : trainer.pokemonSetIds.length;
        return <li key={key} data-trainer-key={key}>
          <button type="button" className="frontier-trainer-toggle" aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={() => setExpanded(open ? null : key)}>
            <FrontierTrainerSprite src={`/trainers/frontier/${brain ? trainer.sprite : frontierTrainerSprite(trainer.trainerClass)}.png`} />
            <span className="frontier-trainer-identity">
              <strong>{trainer.name}</strong>
              <span className="frontier-trainer-subtitle"><span className="frontier-trainer-class">{brain ? trainer.facility : trainer.trainerClass}</span><span className="frontier-trainer-iv-label" title={brain ? 'Minimum–maximum fixed IVs across Silver and Gold Pokémon.' : 'Trainer IV tier; facility rules may override it.'}>· IVs: <span className="frontier-trainer-ivs">{brain ? resourceBrainIVRange(trainer) : trainer.ivs}</span></span></span>
            </span>
            <span className="frontier-trainer-pool-size" title={brain ? 'Three Silver and three Gold encounter sets' : 'Eligible Pokémon sets'}><span className="frontier-trainer-count">{count}</span> sets</span>
          </button>
          {open && <div className="frontier-trainer-details" id={panelId}>
            {brain ? <>
              {teams.map(team => <section key={team.symbol} aria-label={`${team.symbol} Symbol`}>
                <h2>{team.symbol} Symbol</h2>
                <PokemonGrid sets={team.sets} numbered={false} />
              </section>)}
            </> : <>
              <PokemonGrid sets={resourceTrainerSets(trainer)} numbered />
            </>}
          </div>}
        </li>;
      })}</ol>
    </div>
  </section>;
}
