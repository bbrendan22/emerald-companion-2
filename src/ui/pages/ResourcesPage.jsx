import PokemonName from '../components/PokemonName.js';
import {publicAsset} from '../../assets/publicAsset.js';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {catalogEntries, searchResources} from '../../resources/search.js';
import '../styles/resources.css';
import pokemonTypes from '../../data/pokemonTypes.json' with {type: 'json'};
import SpeciesProfile from './SpeciesProfile.jsx';
import MoveSummary from '../../resources/moves/MoveSummary.jsx';
import MoveDialog from '../../resources/moves/MoveDialog.jsx';
import {filterMoves, moveTypeOptions} from '../../resources/moves/filterMoves.js';
import AbilityEntry from '../../resources/abilities/AbilityEntry.jsx';
import AbilityDialog from '../../resources/abilities/AbilityDialog.jsx';
import {filterAbilities} from '../../resources/abilities/filterAbilities.js';
import ItemsBrowser from '../../resources/items/components/ItemsBrowser.jsx';

import IVCalculator from '../../resources/calculators/IVCalculator.jsx';
import HiddenPowerCalculator from '../../resources/calculators/HiddenPowerCalculator.jsx';
import StatCalculator from '../../resources/calculators/StatCalculator.jsx';
import MoveCoverage from '../../resources/coverage/MoveCoverage.jsx';
import NatureChart from '../../resources/charts/NatureChart.jsx';
import TypeChart from '../../resources/charts/TypeChart.jsx';
import EmeraldPickupTable from '../../resources/charts/EmeraldPickupTable.jsx';
import MoveTutors from '../../resources/charts/MoveTutors.jsx';
import PokemonSets from '../../resources/frontier/PokemonSets.jsx';
import FrontierTrainers from '../../resources/frontier/Trainers.jsx';

const titles = {pokemon: 'Pokémon Database', moves: 'Moves', abilities: 'Abilities'};
const additionalSections = [
  {id: 'items', title: 'Items & Berries', entries: ['Useful Items', 'Berries']},
  {id: 'frontier', title: 'Battle Frontier', entries: ['Pokémon Sets', 'Trainers']},
  {id: 'tools', title: 'Tools', entries: ['IV Calculator', 'Hidden Power Calculator', 'Stat Calculator', 'Move Coverage']},
  {id: 'charts', title: 'Charts', entries: ['Nature Chart', 'Type Chart', 'Emerald Pickup Table', 'Move Tutors']},
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
  return <>{category === 'pokemon' && <span className="resources-dex">#{String(entry.id).padStart(3, '0')}</span>}<PokemonName>{entry.name}</PokemonName></>;
}
function PokedexEntry({entry}) {
  const [spriteFailed, setSpriteFailed] = useState(false);
  return <>
    <span className="resources-pokedex-number">#{String(entry.id).padStart(3, '0')}</span>
    <span className="resources-pokedex-sprite">
      {spriteFailed ? <span role="img" aria-label={`${entry.name} sprite unavailable`}>?</span>
        : <img src={publicAsset(`/pokemon/emerald/normal/${entry.id}.png`)} alt={`${entry.name} sprite`} width="40" height="40" loading="lazy" onError={() => setSpriteFailed(true)} />}
    </span>
    <span className="resources-pokedex-name"><PokemonName>{entry.name}</PokemonName></span>
    <span className="resources-pokedex-types">{pokemonTypes[entry.id].map(type => <img key={type} src={publicAsset(`/types/icons/${type}.png`)} alt={`${type[0].toUpperCase()}${type.slice(1)} type`} width="18" height="18" />)}</span>
  </>;
}
export default function ResourcesPage({onSubpageChange}) {
  const [frontierTrainers, setFrontierTrainers] = useState(false);
  const closeFrontierTrainers = useCallback(() => setFrontierTrainers(false), []);
  const [frontierSets, setFrontierSets] = useState(false);
  const closeFrontierSets = useCallback(() => setFrontierSets(false), []);
  const [chart, setChart] = useState(null);
  const closeChart = useCallback(() => setChart(null), []);
  const [calculator, setCalculator] = useState(false);
  const closeCalculator = useCallback(() => setCalculator(false), []);
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState(null);
  const [itemCategory, setItemCategory] = useState(null);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [moveType, setMoveType] = useState('');
  const [moveCategory, setMoveCategory] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [activeMove, setActiveMove] = useState(null);
  const moveReturnFocus = useRef(null);
  const [activeAbility, setActiveAbility] = useState(null);
  const abilityReturnFocus = useRef(null);
  const closeAbility = useCallback(() => setActiveAbility(null), []);
  const [profileDex, setProfileDex] = useState(null);
  const profileOrigin = useRef(null);
  const input = useRef(null), catalogInput = useRef(null), returnTarget = useRef(null), catalogHeading = useRef(null);
  const closeMove = useCallback(() => setActiveMove(null), []);
  const closeCatalog = useCallback(() => setCatalog(null), []);
  const closeProfile = useCallback(() => setProfileDex(null), []);
  const closeItems = useCallback(() => setItemCategory(null), []);
  useEffect(() => {
    onSubpageChange?.(frontierTrainers ? {title: 'Emerald Companion', onBack: closeFrontierTrainers, backLabel: 'Back to Resources'} : frontierSets ? {title: 'Emerald Companion', onBack: closeFrontierSets, backLabel: 'Back to Resources'} : chart ? {title: 'Emerald Companion', onBack: closeChart, backLabel: 'Back to Resources'} : calculator ? {title: 'Emerald Companion', onBack: closeCalculator, backLabel: 'Back to Resources'} : itemCategory ? {title: 'Emerald Companion', onBack: closeItems} : profileDex ? {title: 'Emerald Companion', onBack: closeProfile, backLabel: 'Back to National Pokédex'} : catalog ? {title: 'Emerald Companion', onBack: closeCatalog} : null);
    return () => onSubpageChange?.(null);
  }, [frontierTrainers, closeFrontierTrainers, frontierSets, closeFrontierSets, chart, closeChart, calculator, closeCalculator, catalog, profileDex, itemCategory, closeCatalog, closeProfile, closeItems, onSubpageChange]);
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
    setActiveMove(null);
    setMoveType('');
    setMoveCategory('');
    setActiveAbility(null);
    window.scrollTo({top: 0});
  }
  function openProfile(event, dex) {
    event.preventDefault();
    profileOrigin.current = dex;
    setProfileDex(dex);
  }
  if (frontierTrainers) return <FrontierTrainers />;
  if (frontierSets) return <PokemonSets />;
  if (chart === 'tutors') return <MoveTutors />;
  if (chart === 'pickup') return <EmeraldPickupTable />;
  if (chart === 'type') return <TypeChart />;
  if (chart === 'nature') return <NatureChart />;
  if (calculator === 'coverage') return <MoveCoverage />;
  if (calculator === 'stat') return <StatCalculator />;
  if (calculator) return calculator === 'hidden-power' ? <HiddenPowerCalculator /> : <IVCalculator />;
  if (itemCategory) return <ItemsBrowser key={itemCategory} berriesOnly={itemCategory === 'Berries'} />;
  if (profileDex) return <SpeciesProfile dex={profileDex} onSpecies={setProfileDex} />;
  const groups = searchResources(query);
  const total = groups.reduce((sum, group) => sum + group.total, 0);
  const shown = groups.reduce((sum, group) => sum + group.results.length, 0);
  if (catalog) {
    const entries = catalog === 'moves' ? filterMoves(catalogQuery, moveType, moveCategory) : catalog === 'abilities' ? filterAbilities(catalogQuery) : catalogEntries(catalog, catalogQuery);
    return <section className="resources-home resources-catalog" id={`resources-${catalog}`} aria-labelledby="resources-catalog-heading">
      <h1 ref={catalogHeading} tabIndex="-1" id="resources-catalog-heading">{titles[catalog]}</h1>
      {catalog === 'moves' ? <div className="resources-move-filters">
        <SearchField id="resources-catalog-query" label="Search Moves" placeholder="Search" value={catalogQuery} onChange={setCatalogQuery} inputRef={catalogInput} />
        <select aria-label="Move type" value={moveType} onChange={event => setMoveType(event.target.value)}>
          {moveTypeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select aria-label="Move category" value={moveCategory} onChange={event => setMoveCategory(event.target.value)}>
          <option value="">Category</option>
          {['Physical', 'Special', 'Status'].map(category => <option key={category}>{category}</option>)}
        </select>
      </div> : <SearchField id="resources-catalog-query" label={`Search ${titles[catalog]}`} placeholder={catalog === 'pokemon' ? 'Search by name or National Dex number…' : 'Search'} value={catalogQuery} onChange={value => {setCatalogQuery(value); setActiveMove(null); setActiveAbility(null);}} inputRef={catalogInput} />}
      <p className="resources-search-status" role="status">{entries.length ? '' : 'No results.'}</p>
      {activeMove !== null && <MoveDialog moveId={activeMove} onClose={closeMove} returnFocus={moveReturnFocus.current} />}
      {activeAbility !== null && <AbilityDialog abilityId={activeAbility} onClose={closeAbility} returnFocus={abilityReturnFocus.current} />}
      <ol className="resources-catalog-list">{entries.map(entry => <li key={entry.id} className={catalog === 'pokemon' ? 'resources-pokedex-row' : catalog === 'moves' || catalog === 'abilities' ? 'resources-move-row' : undefined} id={`resources-entry-${catalog}-${entry.id}`} tabIndex="-1" aria-current={catalog !== 'abilities' && selectedId === entry.id ? 'true' : undefined}>{catalog === 'pokemon' ? <a className="resources-species-entry" href={`#species-${entry.id}`} onClick={event => openProfile(event, entry.id)}><PokedexEntry entry={entry} /></a> : catalog === 'moves' ? <MoveSummary entry={entry} onOpen={event => {moveReturnFocus.current = event.detail === 0 ? event.currentTarget : null; setActiveMove(entry.id);}} /> : <AbilityEntry entry={entry} onOpen={event => {abilityReturnFocus.current = event.detail === 0 ? event.currentTarget : null; setActiveAbility(entry.id);}} />}</li>)}</ol>
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
        {section.entries.map(name => <li key={name}>{section.id === 'frontier' && name === 'Trainers' ? <a href="#resources-frontier-trainers" onClick={event => {event.preventDefault(); setFrontierTrainers(true);}}>{name}</a> : section.id === 'frontier' && name === 'Pokémon Sets' ? <a href="#resources-frontier-sets" onClick={event => {event.preventDefault(); setFrontierSets(true);}}>{name}</a> : section.id === 'charts' && name === 'Move Tutors' ? <a href="#resources-move-tutors" onClick={event => {event.preventDefault(); setChart('tutors');}}>{name}</a> : section.id === 'charts' && name === 'Emerald Pickup Table' ? <a href="#resources-emerald-pickup" onClick={event => {event.preventDefault(); setChart('pickup');}}>{name}</a> : section.id === 'charts' && name === 'Type Chart' ? <a href="#resources-type-chart" onClick={event => {event.preventDefault(); setChart('type');}}>{name}</a> : section.id === 'charts' && name === 'Nature Chart' ? <a href="#resources-nature-chart" onClick={event => {event.preventDefault(); setChart('nature');}}>{name}</a> : section.id === 'tools' && name === 'IV Calculator' ? <a href="#resources-iv-calculator" onClick={event => {event.preventDefault(); setCalculator(true);}}>{name}</a> : section.id === 'tools' && name === 'Hidden Power Calculator' ? <a href="#resources-hidden-power-calculator" onClick={event => {event.preventDefault(); setCalculator('hidden-power');}}>{name}</a> : section.id === 'tools' && name === 'Stat Calculator' ? <a href="#resources-stat-calculator" onClick={event => {event.preventDefault(); setCalculator('stat');}}>{name}</a> : section.id === 'tools' && name === 'Move Coverage' ? <a href="#resources-move-coverage" onClick={event => {event.preventDefault(); setCalculator('coverage');}}>{name}</a> : section.id === 'items' ? <a href={`#resources-items-${name}`} onClick={event => {event.preventDefault(); setItemCategory(name);}}>{name}</a> : <span>{name}</span>}</li>)}
      </ul>}
    </section>)}
  </div>;
}
