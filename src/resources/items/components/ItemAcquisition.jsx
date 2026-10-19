import PokemonName from '../../../ui/components/PokemonName.js';
import React from 'react';
import { itemAcquisition } from '../data/itemAcquisition'
import GameNames from './GameNames.jsx'
import {displayItemSources} from '../utils/displayItemSources.js'

export default function ItemAcquisition({ itemId }) {
  const data = itemAcquisition[itemId]
  if (!data) return null
  const entries = displayItemSources(itemId)
  const row = (entry, index) => <div className="resource-item-source" key={index}>
    <div className="resource-item-source-heading"><span><GameNames>{entry.game}</GameNames></span><span>{entry.availability === 'Once per pickup' ? 'Once per save' : entry.availability}</span></div>
    <p><strong>{entry.location}</strong></p>
    <p><PokemonName>{entry.method}</PokemonName></p>
    {entry.requirement && <p className="resource-item-source-note"><PokemonName>{entry.requirement}</PokemonName></p>}
  </div>
  return <section className="resource-item-acquisition">
    {data.note && <p className="resource-item-acquisition-note"><PokemonName>{data.note}</PokemonName></p>}
    {entries.map(row)}
  </section>
}
