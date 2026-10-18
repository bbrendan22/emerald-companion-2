import React, {useCallback, useEffect, useRef, useState} from 'react';
import {catalogEntries, resourceIndex, searchResources} from '../../resources/search.js';
import '../styles/resources.css';
import pokemonTypes from '../../data/pokemonTypes.json' with {type: 'json'};
import SpeciesProfile from './SpeciesProfile.jsx';

const titles = {pokemon: 'Pokémon Database', moves: 'Moves', abilities: 'Abilities'};
const additionalSections = [
  {id: 'items', title: 'Items & Berries', entries: ['Battle', 'Utility', 'Berries', 'Poké Balls', 'TM/HM', 'Misc.']},
  {id: 'frontier', title: 'Battle Frontier', entries: ['Pokémon Sets', 'Trainers']},
  {id: 'tools', title: 'Tools', entries: ['IV Calculator', 'Hidden Power Calculator', 'Stat Calculator', 'Move Coverage']},
  {id: 'charts', title: 'Charts', entries: []},
];
function SearchField({id, label, placeholder, value, onChange, inputRef}) {
  return <div className="resources-search">
    <label className="resources-search-label" htmlFor={id}>{label}</label>
    <div className="resources-search-field">
      <input ref={inputRef} id={id} type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} autoComplete="off" spellCheck="false" />
      {value && <button type="button" className="resources-clear" aria-label="Clear search" onClick={() => {onChange(''); inputRef.current?.focus();}}><span aria-hidden="true">×</span></button>}
    </div>
  </div>;
}
function EntryName({entry, category}) {
  return <>{category === 'pokemon' && <span className="resources-dex">#{String(entry.id).padStart(3, '0')}</span>}{entry.name}</>;
}
function PokedexEntry({entry}) {
  const [spriteFailed, setSpriteFailed] = useState(false);
  return <>
    <span className="resources-pokedex-number">#{String(entry.id).padStart(3, '0')}</span>
    <span className="resources-pokedex-sprite">
      {spriteFailed ? <span role="img" aria-label={`${entry.name} sprite unavailable`}>?</span>
        : <img src={`/pokemon/emerald/normal/${entry.id}.png`} alt={`${entry.name} sprite`} width="40" height="40" loading="lazy" onError={() => setSpriteFailed(true)} />}
    </span>
    <span className="resources-pokedex-name">{entry.name}</span>
    <span className="resources-pokedex-types">{pokemonTypes[entry.id].map(type => <img key={type} src={`/types/icons/${type}.png`} alt={`${type[0].toUpperCase()}${type.slice(1)} type`} width="18" height="18" />)}</span>
  </>;
}
export default function ResourcesPage({onSubpageChange}) {
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState(null);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [profileDex, setProfileDex] = useState(null);
  const profileOrigin = useRef(null);
  const input = useRef(null), catalogInput = useRef(null), returnTarget = useRef(null), catalogHeading = useRef(null);
  const closeCatalog = useCallback(() => setCatalog(null), []);
  const closeProfile = useCallback(() => setProfileDex(null), []);
  useEffect(() => {
    onSubpageChange?.(profileDex ? {title: 'Emerald Companion', onBack: closeProfile, backLabel: 'Back to National Pokédex'} : catalog ? {title: 'Emerald Companion', onBack: closeCatalog} : null);
    return () => onSubpageChange?.(null);
  }, [catalog, profileDex, closeCatalog, closeProfile, onSubpageChange]);
  useEffect(() => {
    if (!profileDex && profileOrigin.current) document.getElementById(`resources-entry-pokemon-${profileOrigin.current}`)?.focus({preventScroll: true});
  }, [profileDex]);
  useEffect(() => {
    if (catalog) {
      const target = selectedId ? document.getElementById(`resources-entry-${catalog}-${selectedId}`) : catalogHeading.current;
      target?.focus();
    } else if (returnTarget.current) {
      document.getElementById(returnTarget.current)?.focus();
    }
  }, [catalog, selectedId]);
  function openCatalog(event, category, entry) {
    event.preventDefault();
    returnTarget.current = event.currentTarget.id;
    setCatalogQuery(entry?.name ?? '');
    setSelectedId(entry?.id ?? null);
    setCatalog(category);
    window.scrollTo({top: 0});
  }
  function openProfile(event, dex) {
    event.preventDefault();
    profileOrigin.current = dex;
    setProfileDex(dex);
  }
  if (profileDex) return <SpeciesProfile dex={profileDex} onSpecies={setProfileDex} />;
  const groups = searchResources(query);
  const total = groups.reduce((sum, group) => sum + group.total, 0);
  const shown = groups.reduce((sum, group) => sum + group.results.length, 0);
  if (catalog) {
    const entries = catalogEntries(catalog, catalogQuery);
    return <section className="resources-home resources-catalog" id={`resources-${catalog}`} aria-labelledby="resources-catalog-heading">
      <h1 ref={catalogHeading} tabIndex="-1" id="resources-catalog-heading">{titles[catalog]}</h1>
      <SearchField id="resources-catalog-query" label={`Search ${titles[catalog]}`} placeholder={catalog === 'pokemon' ? 'Search by name or National Dex number…' : 'Search by name…'} value={catalogQuery} onChange={setCatalogQuery} inputRef={catalogInput} />
      <p className="resources-search-status" role="status">{catalog === 'pokemon' ? (entries.length ? '' : 'No results.') : (entries.length ? `${entries.length} of ${resourceIndex.find(group => group.id === catalog).entries.length} entries` : 'No results. Try another name or National Dex number.')}</p>
      <ol className="resources-catalog-list">{entries.map(entry => <li key={entry.id} className={catalog === 'pokemon' ? 'resources-pokedex-row' : undefined} id={`resources-entry-${catalog}-${entry.id}`} tabIndex="-1" aria-current={selectedId === entry.id ? 'true' : undefined}>{catalog === 'pokemon' ? <a className="resources-species-entry" href={`#species-${entry.id}`} onClick={event => openProfile(event, entry.id)}><PokedexEntry entry={entry} /></a> : <EntryName entry={entry} category={catalog} />}</li>)}</ol>
    </section>;
  }
  return <div className="resources-home">
    <SearchField id="resources-query" label="Search Pokémon, moves and abilities" placeholder="Search Pokémon, moves, abilities…" value={query} onChange={setQuery} inputRef={input} />
    <p className="resources-search-status" role="status">{groups.length > 0 ? total ? `${total} ${total === 1 ? 'match' : 'matches'}${shown < total ? ` · Showing ${shown}. Refine your search for more.` : ''}` : 'No results. Try another name or National Dex number.' : ''}</p>
    {total > 0 && <section className="resources-results" aria-label="Search results">
      {groups.filter(group => group.total > 0).map(group => <section key={group.id} aria-labelledby={`resources-results-${group.id}`}>
        <h2 id={`resources-results-${group.id}`}>{group.title} <span>{group.total}</span></h2>
        <ul>{group.results.map(result => <li key={result.id}>
          <a id={`resources-result-${group.id}-${result.id}`} href={`#resources-entry-${group.id}-${result.id}`} onClick={event => openCatalog(event, group.id, result)}><span className="resources-result-name"><EntryName entry={result} category={group.id} /></span></a><small>{group.label}</small>
        </li>)}</ul>
      </section>)}
    </section>}
    <section className="resources-section" aria-labelledby="resources-pokemon-heading">
      <h2 id="resources-pokemon-heading">Pokémon</h2>
      <ul className="resources-destinations">
        {Object.entries(titles).map(([id, title]) => <li key={id}><a id={`resources-link-${id}`} href={`#resources-${id}`} onClick={event => openCatalog(event, id)}>{title}</a></li>)}
      </ul>
    </section>
    {additionalSections.map(section => <section key={section.id} className="resources-section" aria-labelledby={`resources-${section.id}-heading`}>
      <h2 id={`resources-${section.id}-heading`}>{section.title}</h2>
      {section.entries.length > 0 && <ul className="resources-destinations">
        {section.entries.map(name => <li key={name}><span>{name}</span></li>)}
      </ul>}
    </section>)}
  </div>;
}
