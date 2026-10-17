import React, {useMemo, useState} from 'react';
import {identifyPokemon, filterPokemon, loadRoles, storeRole, roles, locationName} from '../../storage/pokemonRoles.js';
import '../styles/pokemon.css';
import {filterDetails, representedGames, originGames, typeOptions, collectionImage} from '../collectionFilters.js';
import pokemonTypes from '../../data/pokemonTypes.json';

export default function PokemonPage({snapshot}) {
  const [view, setView] = useState('Gallery');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [details, setDetails] = useState({generation: 'All', type: 'All', game: 'All'});
  const [selected, setSelected] = useState(null);
  const [roleState, setRoleState] = useState(() => {
    try { return {assigned: loadRoles(window.localStorage), error: ''}; }
    catch { return {assigned: {}, error: 'Saved roles could not be loaded. Browser storage may be unavailable.'}; }
  });
  const records = useMemo(() => identifyPokemon(snapshot?.collection.records ?? []), [snapshot]);
  const games = representedGames(records);
  const effectiveDetails = {...details, game: games.some(g => g.id === details.game) ? details.game : 'All'};
  const visible = filterDetails(filterPokemon(records, roleState.assigned, query, filter), effectiveDetails);
  const pokemon = records.find(p => p.identity === selected);
  function assign(role) {
    try { setRoleState({assigned: storeRole(window.localStorage, roleState.assigned, pokemon.identity, role), error: ''}); }
    catch { setRoleState(previous => ({...previous, error: 'Role could not be saved. Browser storage may be unavailable or full.'})); }
  }
  if (!snapshot) return <div className="placeholder"><p>Import your Emerald save in Settings to view your Pokémon.</p></div>;
  return <section className="pokemon-collection" aria-label="Pokémon collection">
    <div className="collection-segments collection-filters" aria-label="Filter Pokémon">{['All', 'Frontier', 'Utility', 'Shinies'].map(name => <button key={name} type="button" aria-pressed={filter === name} onClick={() => setFilter(name)}>{name}</button>)}</div>
    <div className="collection-toolbar">
      <div className="collection-search"><input aria-label="Search Pokémon" type="search" placeholder="Species or nickname" value={query} onChange={e => setQuery(e.target.value)} /></div>
      <div className="collection-segments collection-view" aria-label="Collection view">{['Gallery', 'Box'].map(mode => <button key={mode} type="button" aria-label={mode} title={mode} aria-pressed={view === mode} onClick={() => setView(mode)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{mode === 'Gallery' ? <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></> : <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11M15 9v11M3 14h18"/></>}</svg></button>)}</div>
    </div>

    <div className="collection-dropdowns">
      <select aria-label="Generation" value={details.generation} onChange={e => setDetails(previous => ({...previous, generation: e.target.value}))}>
        <option value="All">Generation: All</option>{[1, 2, 3].map(gen => <option key={gen} value={String(gen)}>Gen {gen}</option>)}
      </select>
      <select aria-label="Type" value={details.type} onChange={e => setDetails(previous => ({...previous, type: e.target.value}))}>
        <option value="All">Type: All</option>{typeOptions.map(type => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>)}
      </select>
      <select aria-label="Game" value={effectiveDetails.game} onChange={e => setDetails(previous => ({...previous, game: e.target.value}))}>
        <option value="All">Game: All</option>{games.map(game => <option key={game.id} value={game.id}>{game.name}</option>)}
      </select>
    </div>
    {records.some(p => !originGames[p.origin?.gameId]) && <p className="collection-note">Origin game is unavailable or unrecognized for some Pokémon. They appear with Game: All.</p>}
    {roleState.error && <p role="alert">{roleState.error}</p>}
    {pokemon && <section className="pokemon-selection" aria-label="Selected Pokémon">
      <div className="selection-heading"><div><h2>{pokemon.isEgg ? 'Egg · ' : ''}{pokemon.speciesName} {pokemon.shiny && <span className="shiny-star" aria-label="Shiny">★</span>}</h2><p>{pokemon.nickname} · {locationName(pokemon.source)}</p></div><button type="button" onClick={() => setSelected(null)} aria-label="Clear selection">×</button></div>
      {pokemon.source.kind === 'daycare' && <p>Level at deposit; Day Care experience is applied on withdrawal.</p>}
      <div className="collection-segments" aria-label="Assign role">{roles.map(role => <button type="button" key={role} aria-pressed={(roleState.assigned[pokemon.identity] ?? 'Collection') === role} onClick={() => assign(role)}>{role}</button>)}</div>
    </section>}
    <div className={`pokemon-grid ${view === 'Box' ? 'box-grid' : ''}`}>
      {visible.map(p => <button type="button" key={p.identity} className="pokemon-card" aria-pressed={selected === p.identity} aria-label={`${p.speciesName}, ${p.nickname}, ${p.isEgg ? 'Egg' : `level ${p.recorded?.level ?? p.derivedLevel}`}${p.shiny ? ', shiny' : ''}, ${locationName(p.source)}, ${roleState.assigned[p.identity] ?? 'Collection'}`} onClick={() => setSelected(p.identity)}>
        {view === 'Gallery' && <span className="pokemon-card-top"><span>#{String(p.nationalDexId).padStart(3, '0')}</span><span>{p.isEgg ? 'Egg' : `Lv. ${p.recorded?.level ?? p.derivedLevel}`} {p.shiny && <span className="shiny-star" aria-label="Shiny">★</span>}</span></span>}
        <img className="pokemon-sprite" loading="lazy" alt="" src={collectionImage(p, view)} />
        {view === 'Gallery' && <><span className="pokemon-name">{p.speciesName}</span><span className="pokemon-types">{pokemonTypes[p.nationalDexId].slice(0, 2).map(type => <img key={type} src={`/types/icons/${type}.png`} alt={`${type} type`} width="14" height="14" />)}</span></>}

      </button>)}
    </div>
    {!visible.length && <p className="collection-empty">No Pokémon match this search or filter.</p>}
  </section>;
}
