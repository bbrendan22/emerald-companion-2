import React from 'react';
import { encounterSummary } from '../utils/encounterSummary.js'
import { groupedEncounterDisplay, combinedEncounterLabel, splitEncounterLocation } from '../utils/groupEncounterLocations.js'

export default function SpeciesLocationEntries({ locations, onLocation, allLocations = [], combineMatchingRoutes = false, combineMatchingCities = false, splitMethodParents = [], independentMethods = false, combineSeviiIslands = false }) {
  const subareas = new Map()
  for (const location of allLocations) {
    const parent = splitEncounterLocation(location.name).parent
    if (!parent || !location.methods.some(method => method.encounters.length)) continue
    if (!subareas.has(parent)) subareas.set(parent, new Set())
    subareas.get(parent).add(location.id)
  }
  const groups = groupedEncounterDisplay(locations, { combineMatchingRoutes, combineMatchingCities, splitMethodParents, independentMethods, combineSeviiIslands })
  return groups.map((group, index) => <div key={`${group.parent}-${index}`} data-category={group.category} className={`resource-encounter-group${group.parent ? ' resource-location-family' : ''}${index === 0 || groups[index - 1].category !== group.category ? ' resource-encounter-category-start' : ''}`}>
    {(index === 0 || groups[index - 1].category !== group.category) && <div className="resource-encounter-category-label">{group.category}</div>}
    {group.parent && <h4>{group.parent}</h4>}
    {group.rows.map(({ entries, methods, requirements, islands }) => <div className="resource-availability-row resource-encounter-row" key={`${entries[0].location.id}-${methods.map(method => method.name).join('-')}`}>
      {islands ? <div className="resource-island-areas">{islands.map(island => <div className="resource-island-area" key={island.name}><strong>{island.name}</strong><span>{island.label}</span></div>)}</div> : !(group.parent && group.rows.length === 1 && subareas.get(group.parent)?.size > 1 && entries.length === subareas.get(group.parent).size && entries.every(entry => subareas.get(group.parent).has(entry.location.id))) && (onLocation && entries.length === 1 ? <button className="resource-ability-link resource-encounter-label" onClick={() => onLocation(entries[0].location)}>{combinedEncounterLabel(entries)} →</button> : <strong className="resource-encounter-label">{combinedEncounterLabel(entries)}</strong>)}
      <div className="resource-location-rates">{methods.map(method => <p key={method.name}><strong>{method.name}</strong> · {encounterSummary(method.encounters)}</p>)}</div>
      {requirements.length > 0 && <details><summary>Requirements</summary>{requirements.map(note => <p key={note}>{note}</p>)}</details>}
    </div>)}
  </div>)
}
