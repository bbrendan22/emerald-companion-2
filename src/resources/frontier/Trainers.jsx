import PokemonName from '../../ui/components/PokemonName.js';
import React, {useRef, useState} from 'react';
import {publicAsset} from '../../assets/publicAsset.js';
import {speciesByName} from '../../battle/reference.js';
import {trainerKey} from '../../battle/towerRules.js';
import {frontierTrainerSprite} from '../../battle/towerTrainers.js';
import FrontierTrainerSprite from '../../ui/components/FrontierTrainerSprite.jsx';
import {searchResourceTrainers, resourceTrainerSets, resourceBrainTeams, resourceBrainIVRange, resourceBrainEntries} from './trainers.js';
import ResourceDialog from '../components/ResourceDialog.jsx';
import {frontierTrainers} from '../../battle/data/frontierTrainers.js';
import './trainers.css';

function PokemonGrid({sets, numbered}) {
  return <ul className="frontier-trainer-grid">{sets.map(set => <li key={numbered ? set.id : `${set.brainSet}:${set.species}`} data-set-id={set.id} data-entry={set.entry} data-brain={set.brainSet}>
    <img src={publicAsset(`/pokemon/emerald/normal/${speciesByName.get(set.species.toLowerCase()).nationalDexId}.png`)} alt="" width="32" height="32" loading="lazy" />
    <span><PokemonName>{numbered ? set.id : set.species}</PokemonName></span>
  </li>)}</ul>;
}


export function TrainerSummary({trainer, brain}) {
  const count = brain ? resourceBrainTeams(trainer)[0].sets.length : trainer.pokemonSetIds.length;
  return <>
            <FrontierTrainerSprite src={`/trainers/frontier/${brain ? trainer.sprite : frontierTrainerSprite(trainer.trainerClass)}.png`} />
            <span className="frontier-trainer-identity">
              <strong>{brain ? trainer.key : trainer.name}</strong>
              <span className="frontier-trainer-subtitle"><span className="frontier-trainer-class">{brain ? trainer.facility : trainer.trainerClass}</span><span className="frontier-trainer-iv-label" title={brain ? 'Fixed IVs for this Symbol team.' : 'Trainer IV tier; facility rules may override it.'}>· IVs: <span className="frontier-trainer-ivs">{brain ? resourceBrainIVRange(trainer) : trainer.ivs}</span></span></span>
            </span>
            <span className="frontier-trainer-pool-size" title={brain ? 'Pokémon in this Symbol team' : 'Eligible Pokémon sets'}><span className="frontier-trainer-count">{count}</span> sets</span>
  </>;
}

export function FrontierTrainerDialog({trainerId, onClose, returnFocus = null}) {
  const special = resourceBrainEntries.find(entry => entry.key === trainerId);
  const trainer = special || frontierTrainers.find(entry => trainerKey(entry) === trainerId);
  if (!trainer) return null;
  return <ResourceDialog name={special ? trainer.key : trainer.name} onClose={onClose} returnFocus={returnFocus}>
    <div className="frontier-trainer-toggle"><TrainerSummary trainer={trainer} brain={Boolean(special)} /></div>
    <div className="frontier-trainer-details">
      <PokemonGrid sets={special ? resourceBrainTeams(trainer)[0].sets : resourceTrainerSets(trainer)} numbered={!special} />
    </div>
  </ResourceDialog>;
}

export default function Trainers() {
  const [tab, setTab] = useState('trainers');
  const [queries, setQueries] = useState({trainers:'', brains:''});
  const [selected, setSelected] = useState(null);
  const returnFocus = useRef(null);
  const tabs = useRef([]), search = useRef(null);
  const query = queries[tab];
  const entries = searchResourceTrainers(query, tab);
  const setQuery = value => {setQueries(current => ({...current, [tab]:value})); setSelected(null);};
  const selectTab = value => {setTab(value); setSelected(null);};
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
          <input ref={search} id="frontier-trainers-query" type="search" placeholder="Search" value={query} onChange={event => setQuery(event.target.value)} autoComplete="off" spellCheck="false" />
          {query && <button type="button" className="resources-clear" aria-label="Clear search" onClick={() => {setQuery(''); search.current?.focus();}}>×</button>}
        </div>
      </div>
      <p className="resources-search-status" role="status">{entries.length ? '' : 'No results.'}</p>
      <ol className="frontier-trainer-list">{entries.map(trainer => {
        const brain = tab === 'brains';
        const key = brain ? trainer.key : trainerKey(trainer);
        return <li key={key} data-trainer-key={key}>
          <button type="button" className="frontier-trainer-toggle" aria-haspopup="dialog" onClick={event => {returnFocus.current = event.detail === 0 ? event.currentTarget : null; setSelected(key);}}>
            <TrainerSummary trainer={trainer} brain={brain} />
          </button>

        </li>;
      })}</ol>
    </div>
    {selected && <FrontierTrainerDialog trainerId={selected} onClose={() => setSelected(null)} returnFocus={returnFocus.current} />}
  </section>;
}
