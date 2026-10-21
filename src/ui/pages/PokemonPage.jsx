import {customNickname} from '../pokemonDisplayName.js';
import PokemonName from '../components/PokemonName.js';
import {publicAsset} from '../../assets/publicAsset.js';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {identifyPokemon, filterPokemon, loadRoles, storeRole, locationName} from '../../storage/pokemonRoles.js';
import '../styles/pokemon.css';
import {collectionImage, filterDetails, typeOptions} from '../collectionFilters.js';
import CollectionDetailDialog from '../components/CollectionDetailDialog.jsx';
import CollectionPokemonOverview from '../components/CollectionPokemonOverview.jsx';

export default function PokemonPage({snapshot}) {
  const [query, setQuery] = useState('');
  const [details, setDetails] = useState({type:'All', generation:'All'});
  const [category, setCategory] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const search = useRef(null);
  const [roleState, setRoleState] = useState(() => {
    try { return {assigned: loadRoles(window.localStorage), error: ''}; }
    catch { return {assigned: {}, error: 'Saved roles could not be loaded. Browser storage may be unavailable.'}; }
  });
  const records = useMemo(() => identifyPokemon(snapshot?.collection.records ?? []), [snapshot]);
  const visible = useMemo(() => filterDetails(filterPokemon(records, roleState.assigned, query, category === 'Shiny' ? 'Shinies' : category ?? 'All'), details), [records, roleState.assigned, query, category, details]);
  const pokemon = records.find(record => record.identity === selected);
  function assignRole(role) {
    try {setRoleState({assigned:storeRole(window.localStorage, roleState.assigned, selected, role), error:''});}
    catch {setRoleState(previous => ({...previous, error:'Role could not be saved. Browser storage may be unavailable or full.'}));}
  }
  useEffect(() => {
    if (!filterOpen) return;
    const dismiss = event => {if (!search.current?.contains(event.target)) setFilterOpen(false);};
    const escape = event => {if (event.key === 'Escape') {setFilterOpen(false); search.current?.querySelector('.collection-filter-toggle')?.focus({preventScroll:true});}};
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape);};
  }, [filterOpen]);
  if (!snapshot) return <div className="placeholder"><p>Import your Emerald save in Settings to view your Pokémon.</p></div>;
  return <section className="collection-layout pokemon-collection" aria-label="Pokémon collection">
    <div className="collection-search-row" ref={search}>
      <input className="collection-simple-search" aria-label="Search Pokémon" type="search" placeholder="Search" value={query} onChange={event => setQuery(event.target.value)} />
      {query && <button type="button" className="collection-search-clear" aria-label="Clear Pokémon search" onClick={() => setQuery('')}>×</button>}
      <button type="button" className="collection-filter-toggle" aria-label="Filter Collection" aria-haspopup="dialog" aria-expanded={filterOpen} data-active={details.type !== 'All' || details.generation !== 'All'} onClick={() => {search.current.querySelector('input')?.blur(); setFilterOpen(value => !value);}}><svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 5h14M5 10h10M8 15h4" /></svg></button>
      {filterOpen && <div role="dialog" aria-label="Collection filters" className="collection-filter-popup">
        <label>Type<select aria-label="Type" value={details.type} onChange={event => {setDetails(value => ({...value,type:event.target.value})); setFilterOpen(false);}}><option value="All">All</option>{typeOptions.map(type => <option key={type} value={type}>{type[0].toUpperCase()+type.slice(1)}</option>)}</select></label>
        <label>Generation<select aria-label="Generation" value={details.generation} onChange={event => {setDetails(value => ({...value,generation:event.target.value})); setFilterOpen(false);}}><option value="All">All</option>{[1,2,3].map(gen => <option key={gen} value={String(gen)}>Generation {gen}</option>)}</select></label>
        <button type="button" onClick={() => {setDetails({type:'All',generation:'All'}); setFilterOpen(false);}}>Clear Filters</button>
      </div>}
    </div>
    <div className="collection-quick-roles collection-role-toggles" aria-label="Filter Pokémon categories">{['Frontier','Utility','Shiny'].map(name => <button type="button" key={name} aria-pressed={category === name} onClick={() => setCategory(current => current === name ? null : name)}>{name}</button>)}</div>
    {roleState.error && !pokemon && <p role="alert">{roleState.error}</p>}
    {!visible.length && <p className="collection-empty" role="status">{records.length || category ? 'No results.' : 'Your Collection is empty. Pokémon in your party, PC, and Day Care will appear here.'}</p>}
    {pokemon && <CollectionDetailDialog onClose={() => setSelected(null)}>
      <CollectionPokemonOverview key={pokemon.identity} pokemon={pokemon} role={roleState.assigned[pokemon.identity] ?? 'Collection'} onAssign={assignRole} error={roleState.error}/>
    </CollectionDetailDialog>}
    <div className="pokemon-grid" aria-label="Pokémon gallery">
      {visible.map(p => <button type="button" key={p.identity} className="pokemon-card" aria-label={`${p.speciesName}, ${p.nickname}, ${p.isEgg ? 'Egg' : `level ${p.recorded?.level ?? p.derivedLevel}`}${p.shiny ? ', shiny' : ''}, ${locationName(p.source)}, ${roleState.assigned[p.identity] ?? 'Collection'}`} onClick={() => {setFilterOpen(false); setSelected(p.identity);}}>
        <img className="pokemon-sprite" loading="lazy" alt="" src={publicAsset(collectionImage(p,'Gallery'))}/>
        <span className="pokemon-name" title={customNickname(p) ?? p.speciesName}><PokemonName>{customNickname(p) ?? p.speciesName}</PokemonName></span>{p.shiny && <span className="shiny-star" aria-label="Shiny">★</span>}
      </button>)}
    </div>
  </section>;
}
