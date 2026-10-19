import PokemonName from '../../ui/components/PokemonName.js';
import React, {useState} from 'react';
import {natureStatClass} from './natureDisplay.js';
import './natureDisplay.css';
import {fields,natures,searchSpecies,evError,calculateIVRows} from './ivCalculator.js';
import './ivCalculator.css';
const initial = value => Object.fromEntries(fields.map(([key])=>[key,value]));
const display = value => Array.isArray(value) ? value[0]===value[1]?value[0]:`${value[0]}–${value[1]}` : value ?? '—';
export default function IVCalculator() {
  const [query,setQuery]=useState(''), [pokemon,setPokemon]=useState(null), [searching,setSearching]=useState(false);
  const [nature,setNature]=useState(''), [level,setLevel]=useState(''), [enabled,setEnabled]=useState(false);
  const [observed,setObserved]=useState(initial('')), [evs,setEvs]=useState(initial('0'));
  const error=evError(evs,enabled), rows=calculateIVRows(pokemon,level,nature,observed,evs,enabled);
  const suggestions = searching ? searchSpecies(query) : [];
  function reset() {
    setQuery('');setPokemon(null);setSearching(false);setNature('');setLevel('');
    setEnabled(false);setObserved(initial(''));setEvs(initial('0'));
  }
  function selectPokemon(p) {setPokemon(p);setQuery(p.name);setSearching(false);}
  function inputs(values,setValues,ev=false) {
    return <div className="iv-input-row">{fields.map(([key,short,label])=><label key={key} className={`stat-${key}`}><span>{short}</span><input type="text" inputMode="numeric" autoComplete="off" aria-label={`${label} ${ev?'EVs':'observed stat'}`} value={values[key]} onChange={event=>setValues({...values,[key]:event.target.value})} /></label>)}</div>;
  }
  return <section className="resources-home iv-calculator" aria-labelledby="iv-heading">
    <div className="iv-heading-row"><h1 id="iv-heading">IV Calculator</h1><button type="button" className="iv-reset" onClick={reset}>Reset</button></div>
    <div className="iv-selectors">
      <label className="iv-selector"><input type="search" aria-label="Search Pokémon" placeholder="Pokémon" value={query} onFocus={()=>setSearching(true)} onChange={event=>{setQuery(event.target.value);setSearching(true);setPokemon(null);}} /></label>
      <label className="iv-selector"><select aria-label="Nature" value={nature} onChange={event=>setNature(event.target.value)}><option value="">Nature</option>{natures.map(name=><option key={name}>{name}</option>)}</select></label>
      <label className="iv-selector"><select aria-label="Level" value={level} onChange={event=>setLevel(event.target.value)}><option value="">Level</option>{Array.from({length:100},(_,i)=><option key={i+1}>{i+1}</option>)}</select></label>
    </div>
    {suggestions.length > 0 && <ul className="iv-suggestions" aria-label="Pokémon suggestions">{suggestions.map(p=><li key={p.nationalDexId}><button type="button" onClick={()=>selectPokemon(p)}><PokemonName>{p.name}</PokemonName></button></li>)}</ul>}
    <label className="iv-checkbox"><input type="checkbox" checked={enabled} onChange={event=>setEnabled(event.target.checked)} />Enter EVs</label>
    {inputs(observed,setObserved)}
    {enabled && <><h2>EVs</h2>{inputs(evs,setEvs,true)}</>}
    {error && <p className="iv-error" role="alert">{error}</p>}
    <table className="iv-results"><thead><tr>{['Stat','Base','Stat Range','IV Range'].map(title=><th key={title} scope="col">{title}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.key}><th scope="row" className={natureStatClass(nature,row.key)}>{row.label}</th><td>{display(row.base)}</td><td>{display(row.range)}</td><td>{display(row.iv)}</td></tr>)}</tbody></table>
  </section>;
}
