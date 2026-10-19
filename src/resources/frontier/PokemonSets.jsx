import PokemonName from '../../ui/components/PokemonName.js';
import React, {useLayoutEffect, useRef, useState} from 'react';
import {publicAsset} from '../../assets/publicAsset.js';
import {speciesByName, battleMove} from '../../battle/reference.js';
import {battleItemId} from '../../battle/itemLookup.js';
import FrontierTrainerSprite from '../../ui/components/FrontierTrainerSprite.jsx';
import {searchFrontierSets, frontierEVSpread, eligibleFrontierTrainers, searchFrontierBrains, frontierBrainInfo, frontierResourceSetKey} from './sets.js';
import './sets.css';

function SetFacts({set}) {
  const line = useRef(null);
  useLayoutEffect(() => {
    const element = line.current;
    const fit = () => {
      element.style.fontSize = '11px';
      const width = element.getBoundingClientRect().width;
      for (let attempt = 0; attempt < 3 && element.scrollWidth > width; attempt++) {
        element.style.fontSize = `${parseFloat(element.style.fontSize) * (width - 1) / element.scrollWidth}px`;
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [set]);
  return <dl className="frontier-set-facts" ref={line}>
    <div><dt><abbr title="Nature">Nat.</abbr>:</dt><dd>{set.nature}</dd></div>
    <div><dt><abbr title={set.possibleAbility.includes(' / ') ? 'Possible abilities' : 'Ability'}>Ab.</abbr>:</dt><dd title={set.possibleAbility}>{set.possibleAbility.replaceAll(' / ', '/')}</dd></div>
    <div><dt>EVs:</dt><dd>{frontierEVSpread(set)}</dd></div>
  </dl>;
}
function SetMoves({set}) {
  return <span className="frontier-set-moves" aria-label="Moves">{Array.from({length:4}, (_, slot) => {
    const name = set.moves[slot];
    const type = name && battleMove(name)?.type;
    return <span className="frontier-set-move" key={slot}>{type && type !== 'MYSTERY' ? <img src={publicAsset(`/types/icons/${type.toLowerCase()}.png`)} alt={`${type[0]}${type.slice(1).toLowerCase()} type`} width="14" height="14" /> : <span className="frontier-move-icon-space" aria-hidden="true" />}<span>{name || '—'}</span></span>;
  })}</span>;
}

export default function PokemonSets() {
  const [tab, setTab] = useState('standard');
  const [expanded, setExpanded] = useState(null);
  const [queries, setQueries] = useState({standard:'', brains:''});
  const query = queries[tab];
  const setQuery = value => setQueries(current => ({...current, [tab]:value}));
  const tabs = useRef([]);
  const selectTab = value => {setTab(value); setExpanded(null);};
  const onTabKey = (event, index) => {
    const next = event.key === 'ArrowRight' || event.key === 'ArrowLeft' ? 1 - index
      : event.key === 'Home' ? 0 : event.key === 'End' ? 1 : null;
    if (next === null) return;
    event.preventDefault();
    selectTab(next === 0 ? 'standard' : 'brains');
    tabs.current[next]?.focus({preventScroll:true});
  };
  const sets = tab === 'standard' ? searchFrontierSets(query) : searchFrontierBrains(query);
  return <section className="resources-home frontier-sets" aria-labelledby="frontier-sets-heading">
    <h1 id="frontier-sets-heading">Pokémon Sets</h1>
    <div className="frontier-sets-tabs" role="tablist" aria-label="Frontier Pokémon sets">
      {[['standard', 'Standard Sets'], ['brains', 'Frontier Brains']].map(([id, label], index) => <button key={id} ref={element => {tabs.current[index] = element;}} type="button" role="tab" id={`frontier-sets-tab-${id}`} aria-selected={tab === id} aria-controls="frontier-sets-panel" tabIndex={tab === id ? 0 : -1} onClick={() => selectTab(id)} onKeyDown={event => onTabKey(event, index)}>{label}</button>)}
    </div>
    <div role="tabpanel" id="frontier-sets-panel" aria-labelledby={`frontier-sets-tab-${tab}`}>
    <div className="resources-search">
      <label className="resources-search-label" htmlFor="frontier-sets-query">Search Pokémon Sets</label>
      <div className="resources-search-field">
        <input id="frontier-sets-query" type="search" placeholder={tab === 'standard' ? 'Search by Pokémon or set number…' : 'Search Pokémon, Brain or Symbol…'} autoComplete="off" spellCheck="false" value={query} onChange={event => {setQuery(event.target.value); setExpanded(null);}} />
        {query && <button type="button" className="resources-clear" aria-label="Clear search" onClick={() => {setQuery(''); setExpanded(null); document.getElementById('frontier-sets-query')?.focus();}}>×</button>}
      </div>
    </div>
    <p className="resources-search-status" role="status">{sets.length ? '' : 'No results.'}</p>
    <ol className="frontier-set-list">{sets.map(set => {
      const key = frontierResourceSetKey(set);
      const brain = frontierBrainInfo(set);
      const open = expanded === key;
      const dex = speciesByName.get(set.species.toLowerCase()).nationalDexId;
      return <li key={key} data-entry={set.entry} data-brain={set.brainSet} data-set-key={key}>
        <button type="button" className="frontier-set-toggle" aria-expanded={open} aria-controls={open ? `frontier-set-${encodeURIComponent(key)}` : undefined} onClick={() => setExpanded(open ? null : key)}>
          <span className="frontier-set-pokemon">
            <img className="frontier-pokemon-sprite" src={publicAsset(`/pokemon/emerald/normal/${dex}.png`)} alt="" width="32" height="32" loading="lazy" />
            <span className="frontier-set-identity">
              <span className="frontier-set-name"><strong><PokemonName>{brain ? `${set.species} ${brain.symbol}` : set.id}</PokemonName></strong></span>
              <span className="frontier-set-item"><span>{set.item || 'None'}</span><img src={publicAsset(`/items/${battleItemId(set.item)}.png`)} alt="" width="18" height="18" loading="lazy" /></span>
            </span>
          </span>
          <SetMoves set={set} />
        </button>
        {open && <div className="frontier-set-details" id={`frontier-set-${encodeURIComponent(key)}`}>
          <SetFacts set={set} />
          {brain ? <div className="frontier-set-brain">
            <FrontierTrainerSprite src={`/trainers/frontier/${brain.sprite}.png`} />
            <span>{brain.name} · {brain.facility} · {brain.symbol} Symbol</span>
          </div> : <section className="frontier-set-trainers" aria-label="Trainers eligible to use this set">
            {eligibleFrontierTrainers(set).length ? <ul>{eligibleFrontierTrainers(set).map(trainer => <li key={trainer.key} title={`${trainer.trainerClass} ${trainer.name}`}>
              <FrontierTrainerSprite src={`/trainers/frontier/${trainer.sprite}.png`} />
              <span>{trainer.name}</span>
            </li>)}</ul> : <p>No verified trainer associations.</p>}
          </section>}
        </div>}
      </li>;
    })}</ol>
    </div>
  </section>;
}
