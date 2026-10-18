import {publicAsset} from '../../assets/publicAsset.js';
import React, {useState} from 'react';
import {fields,hiddenPowerTypes,recommendedIVs,emptyIVs,validIV,liveHiddenPower} from './hiddenPowerCalculator.js';
import './hiddenPowerCalculator.css';
const title = type => type[0].toUpperCase()+type.slice(1);
export default function HiddenPowerCalculator() {
 const [ivs,setIVs] = useState(emptyIVs), [selectedType,setSelectedType] = useState('');
 const result = liveHiddenPower(ivs), invalid = fields.some(([key]) => !validIV(ivs[key]));
 function reset() {setIVs(emptyIVs());setSelectedType('');}
 return <section className="resources-home hp-calculator" aria-labelledby="hp-heading">
  <div className="hp-heading-row"><h1 id="hp-heading">Hidden Power Calculator</h1><button type="button" className="hp-reset" onClick={reset}>Reset</button></div>
  <div className="hp-stat-row">{fields.map(([key,label]) => <label className={`stat-${key}`} key={key}><span>{label}</span><input type="text" inputMode="numeric" autoComplete="off" aria-label={`${label} IV`} aria-invalid={!validIV(ivs[key])} aria-describedby={invalid ? 'hp-input-error' : undefined} value={ivs[key]} onChange={event => setIVs({...ivs,[key]:event.target.value})} /></label>)}</div>
  {invalid && <p id="hp-input-error" className="hp-error" role="alert">Enter whole IVs from 0–31.</p>}
  <div className="hp-result" role="status" aria-live="polite">{result && <><img src={publicAsset(`/types/icons/${result.type.toLowerCase()}.png`)} width="20" height="20" alt={`${result.type} type`} /><strong>{result.type}</strong><span>{result.power} power</span></>}</div>
  <label className="hp-type-selector" htmlFor="hp-reference-type">Find IVs by Type<select id="hp-reference-type" value={selectedType} onChange={event => setSelectedType(event.target.value)}><option value="">Select type</option>{hiddenPowerTypes.map(type => <option key={type} value={type}>{title(type)}</option>)}</select></label>
  {selectedType && <div className="hp-reference" aria-live="polite"><div className="hp-reference-heading"><img src={publicAsset(`/types/icons/${selectedType}.png`)} width="20" height="20" alt={`${title(selectedType)} type`} /><strong>{title(selectedType)}</strong><span>70 power</span></div><dl className="hp-stat-row">{fields.map(([key,label]) => <div key={key} className={`stat-${key}`}><dt>{label}</dt><dd>{recommendedIVs[selectedType][key]}</dd></div>)}</dl></div>}
 </section>;
}
