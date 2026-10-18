import {publicAsset} from '../../assets/publicAsset.js';
import React, { useRef, useState } from 'react'
import './moveCoverage.css'
import {GEN3_TYPE_DISPLAY_ORDER} from '../../pokemon/typeDisplayOrder.js'
const emeraldTypes=GEN3_TYPE_DISPLAY_ORDER.map(type=>type.toUpperCase())
import { coverageMultipliers, coverageRoster, groupMoveCoverage } from './moveCoverage.js'

const typeName=type=>type[0]+type.slice(1).toLowerCase()
export default function MoveCoverage() {
  const [selected,setSelected]=useState([])
  const [mode,setMode]=useState('all')
  const press=useRef(null)
  const groups=groupMoveCoverage(selected,mode)
  function toggle(type) {
    setSelected(current=>current.includes(type) ? current.filter(value=>value!==type) : [...current,type])
  }
  function startPress(event) {
    press.current={id:event.pointerId,type:event.currentTarget.dataset.type,x:event.clientX,y:event.clientY}
  }
  function finishPress(event) {
    const start=press.current
    press.current=null
    if(!start || start.id!==event.pointerId || start.type!==event.currentTarget.dataset.type) return
    if(Math.hypot(event.clientX-start.x,event.clientY-start.y)>10) return
    event.preventDefault()
    toggle(start.type)
  }
  return <section className="resources-home move-coverage" aria-labelledby="coverage-heading">
    <h1 id="coverage-heading">Move Coverage</h1>
    <div className="resource-coverage-controls">
      <div className="resource-coverage-types" aria-label="Attacking types">{[emeraldTypes.slice(0,9),emeraldTypes.slice(9)].map((row,index)=><div className="resource-coverage-type-row" key={index}>{row.map(type=><button type="button" key={type} data-type={type} aria-label={typeName(type)} aria-pressed={selected.includes(type)} onPointerDown={startPress} onPointerUp={finishPress} onPointerCancel={()=>{press.current=null}} onClick={event=>{if(event.detail===0) toggle(event.currentTarget.dataset.type)}} title={typeName(type)}><img src={publicAsset(`/types/icons/${type.toLowerCase()}.png`)} alt="" /><span>{typeName(type)}</span></button>)}</div>)}</div>
      <div className="resource-coverage-roster" role="group" aria-label="Pokémon included">{[['all','All Pokémon'],['fully','Fully evolved'],['frontier','Frontier']].map(([value,label])=><button key={value} aria-pressed={mode===value} onClick={()=>setMode(value)}>{label}</button>)}</div>
      <div className="resource-coverage-totals" aria-label="Coverage totals">{coverageMultipliers.map(multiplier=><div key={multiplier}><span>{multiplier}×</span><strong>{groups.get(multiplier).length}</strong></div>)}</div>
      <p className="resource-coverage-note">Best type effectiveness · {coverageRoster(mode).length} Pokémon{selected.length>0 && <button onClick={()=>setSelected([])}>Clear types</button>}</p>
    </div>
    <div className="resource-coverage-results" tabIndex={0} aria-label="Coverage results">
      {!selected.length ? <p className="resource-empty">Select attacking types to see coverage.</p> : coverageMultipliers.map(multiplier=><section key={multiplier}><h3>{multiplier}× {multiplier===0 ? '— Immune' : multiplier<1 ? '— Resisted' : multiplier===1 ? '— Neutral' : '— Super effective'}<span>{groups.get(multiplier).length}</span></h3><div className="resource-coverage-pokemon">{groups.get(multiplier).map(pokemon=><div key={pokemon.id} title={pokemon.name}><img loading="lazy" src={publicAsset(`/pokemon/emerald/normal/${pokemon.dex}.png`)} alt={pokemon.name} /><span>{pokemon.name.replace(/([♀♂])/g,'$1\uFE0E')}</span></div>)}</div></section>)}
    </div>

  </section>
}
