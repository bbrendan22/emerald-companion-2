import PokemonName from '../../ui/components/PokemonName.js';
import React, {useState} from 'react';
import {natureStatClass} from './natureDisplay.js';
import './natureDisplay.css';
import {fields,natures,searchSpecies,statInputs,validStatInput,statEVError,calculateStats} from './statCalculator.js';
import './statCalculator.css';
export default function StatCalculator() {
 const [query,setQuery]=useState(''),[pokemon,setPokemon]=useState(null),[searching,setSearching]=useState(false);
 const [nature,setNature]=useState(''),[level,setLevel]=useState('');
 const [ivs,setIVs]=useState(()=>statInputs('')),[evs,setEVs]=useState(()=>statInputs(''));
 const suggestions=searching ? searchSpecies(query) : [], error=statEVError(evs);
 const ivError=fields.some(([key])=>ivs[key]!=='' && !validStatInput(ivs[key],31));
 const rows=calculateStats(pokemon,level,nature,ivs,evs);
 function reset() {setQuery('');setPokemon(null);setSearching(false);setNature('');setLevel('');setIVs(statInputs(''));setEVs(statInputs(''));}
 function inputs(values,setValues,kind,max) {
  return <div className="sc-input-row">{fields.map(([key,short,label])=><label key={key} className={`stat-${key}`}><span>{short}</span><input type="text" inputMode="numeric" autoComplete="off" placeholder={kind==='IVs' ? '31' : '0'} aria-label={`${label} ${kind}`} aria-invalid={values[key]!=='' && !validStatInput(values[key],max)} aria-describedby={kind==='EVs' && error ? 'sc-ev-error' : kind==='IVs' && ivError ? 'sc-iv-error' : undefined} value={values[key]} onChange={event=>setValues({...values,[key]:event.target.value})} /></label>)}</div>;
 }
 return <section className="resources-home stat-calculator" aria-labelledby="sc-heading">
  <div className="sc-heading-row"><h1 id="sc-heading">Stat Calculator</h1><button className="sc-reset" type="button" onClick={reset}>Reset</button></div>
  <div className="sc-selectors"><input type="search" aria-label="Search Pokémon" placeholder="Search" autoComplete="off" value={query} onFocus={()=>setSearching(true)} onChange={event=>{setQuery(event.target.value);setPokemon(null);setSearching(true);}} /><select aria-label="Nature" value={nature} onChange={event=>setNature(event.target.value)}><option value="">Nature</option>{natures.map(name=><option key={name}>{name}</option>)}</select><select aria-label="Level" value={level} onChange={event=>setLevel(event.target.value)}><option value="">Level</option>{Array.from({length:100},(_,i)=><option key={i+1}>{i+1}</option>)}</select></div>
  {suggestions.length>0 && <ul className="sc-suggestions" aria-label="Pokémon suggestions">{suggestions.map(p=><li key={p.nationalDexId}><button type="button" onClick={()=>{setPokemon(p);setQuery(p.name);setSearching(false);}}><PokemonName>{p.name}</PokemonName></button></li>)}</ul>}
  {searching && query.trim() && !suggestions.length && <p className="resources-search-status" role="status">No results.</p>}
  <h2>IVs</h2>{inputs(ivs,setIVs,'IVs',31)}
  {ivError && <p className="sc-error" id="sc-iv-error" role="alert">Enter whole IVs from 0–31.</p>}
  <h2>EVs</h2>{inputs(evs,setEVs,'EVs',255)}
  {error && <p className="sc-error" id="sc-ev-error" role="alert">{error}</p>}
  <h2 className="sc-results-heading">Calculated Stats</h2>
  <div className="sc-results" aria-live="polite">{rows.map(row=><div key={row.key} className={`sc-stat-row stat-${row.key} ${natureStatClass(nature,row.key)}`}><span>{row.label}</span><strong>{row.value ?? '—'}</strong><div className="sc-stat-track" aria-hidden="true">{row.bar!==null && <span style={{width:`${row.bar}%`}} />}</div></div>)}</div>
 </section>;
}
