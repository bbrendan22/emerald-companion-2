import PokemonName from '../../../ui/components/PokemonName.js';
import React from 'react';
import SpeciesLocationEntries from './SpeciesLocationEntries.jsx'
import { bonusDiscEncounters } from '../data/bonusDiscEncounters.js'
import { orreAvailability } from '../utils/orreAvailability.js'
import { fireRedLeafGreenAvailability } from '../utils/fireRedLeafGreenAvailability.js'
import { rubySapphireAvailability } from '../utils/rubySapphireAvailability.js'
import { speciesEncounters } from '../utils/speciesEncounters.js'
import { speciesAvailability } from '../utils/speciesAvailability.js'
import { availabilitySources } from '../data/availabilitySources.js'
import { pokemonMeta } from '../data/pokemonMeta.js'
import { acquisitionRoutes } from '../utils/acquisitionRoutes.js'
import { locationResources } from '../data/locationResources.js'
import { rubySapphireEncounters } from '../data/rubySapphireEncounters.js'
import { fireRedLeafGreenEncounters } from '../data/fireRedLeafGreenEncounters.js'
const gameName=game=>game
const legendaryDex = new Set([144,145,146,150,151,243,244,245,249,250,251,377,378,379,380,381,382,383,384,385,386])
function encounterNote(entry,dex,game='Emerald') {
  if (!entry.note) return null
  if (entry.kind === 'Record-mixed outbreak' || entry.kind === 'TV outbreak') return null
  const inline = text => <p className="resource-availability-kind"><PokemonName>{text}</PokemonName></p>
  if ([152,155,158].includes(dex) && game==='Emerald') return inline('Complete Hoenn Pokédex.')
  if (dex===345||dex===347) return inline(`${dex===345?'Root':'Claw'} Fossil · ${game==='Emerald'?'Mirage Tower / Desert Underpass':'Route 111 desert'}`)
  if (entry.kind==='In-game trade') {
    const wanted=entry.note.match(/^Trade (.+?)(?: to the NPC|\. Level|$)/)?.[1]
    return wanted ? inline(`Trade ${wanted}`) : null
  }
  if (['Starter','Gift','Gift Egg','Fossil revival'].includes(entry.kind)||[100,101,185,349,352].includes(dex)) return null
  if (legendaryDex.has(dex)) {
    if (entry.kind === 'Roaming encounter') {
      return entry.note.startsWith('Choose ') ? <p className="resource-availability-kind"><PokemonName>{entry.note}</PokemonName></p> : null
    }
    const ticket = ['Eon Ticket','AuroraTicket','MysticTicket','Old Sea Map'].find(item=>entry.note.includes(item))
    if (ticket) return <p className="resource-availability-kind">{ticket} needed.</p>
    if (entry.note.startsWith('Choose ')) return <p className="resource-availability-kind"><PokemonName>{entry.note}</PokemonName></p>
    return null
  }
  return entry.inlineNote ? <p className="resource-availability-kind"><PokemonName>{entry.note}</PokemonName></p> : <details><summary>Requirements</summary><p><PokemonName>{entry.note}</PokemonName></p></details>
}

export default function SpeciesEncounters({ id, onPokemon, embedded = false }) {
  const locations = speciesEncounters(id)
  const availability = speciesAvailability(id)
  const locationEntries = (entries, game = 'Emerald') => {
    const allLocations = game === 'Emerald' ? locationResources : rubySapphireEncounters[game] ?? fireRedLeafGreenEncounters[game] ?? []
    return <SpeciesLocationEntries locations={entries} allLocations={allLocations} combineMatchingRoutes combineMatchingCities splitMethodParents={['*']} independentMethods combineSeviiIslands />
  }
  const pokemonLink = (other, label) => label === 'Evolve'
    ? <span>Evolve <PokemonName>{pokemonMeta[other].name}</PokemonName></span>
    : <button className="resource-ability-link" onClick={()=>onPokemon([other,pokemonMeta[other]])}>{label} <PokemonName>{pokemonMeta[other].name}</PokemonName> →</button>
  return <div className="species-locations">
    {availability.hasEmeraldRoute && <details key={`${id}-Emerald`} className="resource-game-encounters"><summary><span data-game="Emerald">Emerald</span></summary><div className="resource-game-encounter-content">
    {locationEntries(locations)}
    {availability.special.map((entry,index)=><div className="resource-availability-row" key={`special-${index}`}><strong>{entry.place}</strong><p className="resource-availability-kind">{entry.kind}{entry.level!=null?` · ${entry.kind==='Gift Egg'?'Hatches at':'Lv.'} ${entry.level}`:''}</p>{encounterNote(entry,pokemonMeta[id].dex)}</div>)}
    {!locations.length&&!availability.special.length&&availability.relatives.length>0&&<div className="resource-availability-row">{acquisitionRoutes(availability.relatives, [], id).map(relative=><div key={relative.id}>{pokemonLink(relative.id,relative.method)}</div>)}</div>}
    </div></details>}
    {['Ruby','Sapphire','FireRed','LeafGreen','Colosseum','XD'].map(game => {
      const source = availabilitySources[pokemonMeta[id].dex]?.find(entry => entry.game === game)
      const encounters = game === 'Ruby' || game === 'Sapphire' ? rubySapphireAvailability(id,game) : game === 'FireRed' || game === 'LeafGreen' ? fireRedLeafGreenAvailability(id,game) : orreAvailability(id,game)
      const bonusDiscs = game === 'Colosseum' ? bonusDiscEncounters[pokemonMeta[id].dex] || [] : []
      const hasDetails = bonusDiscs.length || (encounters && (encounters.locations.length || encounters.special.length || encounters.relatives.length))
      if (!hasDetails && !source?.native) return null
      const hasDirectAcquisition = Boolean(encounters?.locations.length || encounters?.special.length || bonusDiscs.length)
      const routes = acquisitionRoutes(encounters?.relatives, availability.imports.filter(entry => entry.game.includes(game) && entry.method), id)
        .filter(route => !hasDirectAcquisition || route.method !== 'Evolve')
      return <details className="resource-game-encounters" key={`${id}-${game}`}><summary><span data-game={game}>{gameName(game)}</span></summary><div className="resource-game-encounter-content">
        {!hasDetails && <div className="resource-availability-row">{source.event ? 'Historical event access' : source.method}</div>}
        {locationEntries(encounters?.locations ?? [], game)}
        {encounters?.special.map((entry,index) => <div className="resource-availability-row" key={`special-${index}`}><strong>{entry.place}</strong><p className="resource-availability-kind">{entry.kind}{entry.level != null ? ` · ${entry.kind === 'Gift Egg' ? 'Hatches at' : 'Lv.'} ${entry.level}` : ''}{entry.trainer ? ` · ${entry.trainer}` : ''}{entry.rate != null ? ` · ${entry.rate}%` : ''}</p>{encounterNote(entry,pokemonMeta[id].dex,game)}</div>)}
        {bonusDiscs.map(entry => <div className="resource-availability-row" key={entry.source}><strong>{entry.source}</strong><p className="resource-availability-kind">Lv. {entry.level} · {entry.method}</p></div>)}
        {encounters?.routeNotes?.map(note=><p className="resource-note" key={note}><PokemonName>{note}</PokemonName></p>)}
        {routes.map(entry => <div className="resource-availability-row" key={`${entry.id}-${entry.method}`}>{pokemonLink(entry.id,entry.method)}</div>)}
      </div></details>
    })}

  </div>
}
