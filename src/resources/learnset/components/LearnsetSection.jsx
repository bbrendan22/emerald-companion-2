import React from 'react';
import GameNames from './GameNames.jsx'
import { mergedLevelLearnset, gameTutorSources, levelSourceGames } from '../utils/gameLearnsets.js'
import { crossGameLearnset } from '../utils/crossGameLearnset.js'
import { eggMoves } from '../data/eggMoveResources.js'
import { machineResources } from '../data/itemResources.js'
import { tutorResources } from '../data/tutorResources.js'
import { moveNames } from '../data/emeraldData.js'
import { moveResources } from '../data/moveResources.js'
import { pokemonMeta } from '../data/pokemonMeta.js'
import { descendants } from '../utils/eggMoveFathers.js'

export default function LearnsetSection({ id, embedded = false }) {
  const crossGame = crossGameLearnset(id)
  const levels = mergedLevelLearnset(id)
  const otherTutors = gameTutorSources(id)
  const specialMoves = crossGame.map(entry => ({ ...entry, sources: entry.sources.filter(source => ['Purification', 'Gift Egg', 'Mt. Battle reward'].includes(source.method)) })).filter(entry => entry.sources.length)
  const machines = machineResources.filter(machine => machine.species.includes(Number(id)))
  const tutors = tutorResources.filter(tutor => tutor.species.includes(Number(id)))
  const tutorGroups = new Map()
  const addTutor = (game, move, location, cost) => {
    const moves = tutorGroups
    if (!moves.has(move)) moves.set(move, { move, locations: [], costs: new Set() })
    const group = moves.get(move)
    if (!group.locations.some(source => source.game === game && source.location === location)) group.locations.push({ game, location })
    group.costs.add(cost)
  }
  for (const tutor of tutors) {
    const location = tutor.location.match(/^.*?(?:City|Town|Battle Frontier)/)?.[0] ?? tutor.location
    const cost = location === 'Battle Frontier' ? `${tutor.cost} BP` : 'Tutor'
    addTutor('Emerald', tutor.moveId, location, cost)
  }
  for (const source of otherTutors) {
    const game = source.game === 'FireRed / LeafGreen' ? 'FR/LG' : source.game.replace('FireRed', 'FR').replace('LeafGreen', 'LG').replace(/ · (Attack|Defense) Forme$/, '')
    addTutor(game, source.move, source.location ?? game, 'Tutor')
  }
  const eggFamilies = Object.keys(eggMoves).filter(parent => descendants(parent).includes(String(id)))
  const moveRow = (move, label) => {
    const data = moveResources[move]
    return <div className="resource-learnset-move">
      <div className="resource-learnset-heading">
        <span className="resource-learnset-icon">{data.type !== 'MYSTERY' && <img src={`/types/icons/${data.type.toLowerCase()}.png`} alt={`${data.type} type`} />}</span>
        <strong>{moveNames[move]}</strong>
        <span title="Power">{data.power === 0 ? '-' : data.power === 1 ? 'Var' : data.power}</span>
        <span title="Accuracy">{data.accuracy === 0 ? '-' : `${data.accuracy}%`}</span>
        <span title="PP">{data.pp}</span>
        <span title="Secondary effect chance">{data.effectChance > 0 ? `${data.effectChance}%` : '-'}</span>
        <span className="resource-learnset-method">{label}</span>
      </div>
      <p className="resource-learnset-description">{data.description}</p>
    </div>
  }
  const columns = <div className="resource-learnset-columns" aria-hidden="true"><span /><span>Move</span><span>Pow</span><span>Acc</span><span>PP</span><span>Eff</span><span>Learn</span></div>
  return <div className="species-learnset">
    <details className="resource-learnset-group"><summary>Level-up moves · {levels.length}</summary>{columns}
      {levels.map(({move,sources,levels:learnLevels,common}) => <div key={move}>{moveRow(move, learnLevels.length === 1 ? `Lv. ${learnLevels[0]}` : 'Varies')}
        {!common && <p className="resource-tutor-location">{sources.map((source,index) => <span key={index}>{index > 0 && ' / '}{levelSourceGames(source.games, pokemonMeta[id].dex === 386) && <><GameNames>{levelSourceGames(source.games, pokemonMeta[id].dex === 386)}</GameNames>{(learnLevels.length > 1 || source.name) && ' · '}</>}{learnLevels.length > 1 && `Lv. ${source.level}`}{learnLevels.length > 1 && source.name && ' · '}{source.name && `${source.name}, then evolve`}</span>)}</p>}
      </div>)}
      {!levels.length && <p className="resource-note">No level-up moves.</p>}
    </details>
    <details className="resource-learnset-group"><summary>TMs / HMs · {machines.length}</summary>{columns}
      {machines.map(machine => <div key={machine.code}>{moveRow(machine.moveId, machine.code)}</div>)}
      {!machines.length && <p className="resource-note">No compatible TMs or HMs.</p>}
    </details>
    <details className="resource-learnset-group"><summary>Move tutors · {tutorGroups.size}</summary>{columns}
      {[...tutorGroups.values()].map(({move,locations,costs}) => <div key={move}>{moveRow(move, [...costs].find(cost => cost.endsWith(' BP')) ?? 'Tutor')}<p className="resource-tutor-location">{locations.map(({game,location},index) => <span key={`${game}-${location}`}>{index > 0 && ' · '}<GameNames>{game}</GameNames>{location !== game && ` · ${location}`}</span>)}</p></div>)}
      {!tutorGroups.size && <p className="resource-note">No compatible move tutors.</p>}
    </details>
    <details className="resource-learnset-group"><summary>Egg moves · {new Set(eggFamilies.flatMap(parent => eggMoves[parent])).size + ([172,25,26].includes(pokemonMeta[id].dex) ? 1 : 0)}</summary>{columns}
      {eggFamilies.map(parent => <div key={parent}>
        {eggMoves[parent].map(move => <div className="resource-learnset-egg" key={move}>{moveRow(move, 'Egg')}</div>)}
      </div>)}
      {!eggFamilies.length && <p className="resource-note">No standard Gen III egg moves for this evolutionary family.</p>}
      {[172,25,26].includes(pokemonMeta[id].dex) && <div className="resource-special-breeding"><h4><GameNames>Emerald</GameNames> · Special breeding</h4>{moveRow(344, 'Egg')}<p className="resource-tutor-location">Hatch Pichu · Either parent holds a Light Ball</p></div>}
    </details>
    <details className="resource-learnset-group"><summary>Special moves · {specialMoves.length}</summary>{columns}
      {specialMoves.map(({move,sources}) => <div key={move}>{moveRow(move, sources.some(source=>source.method==='Purification') ? 'Purified' : 'Gift')}<ul className="resource-move-sources">{sources.map((source,index)=><li key={index}><strong><GameNames>{source.game}</GameNames></strong> · {source.method}{source.level != null ? ` · Lv. ${source.level}` : ''}{source.species !== String(id) ? ` · Learn as ${source.name}, then evolve` : ''}{source.requirement ? ` · ${source.requirement}` : ''}</li>)}</ul></div>)}
      {!specialMoves.length && <p className="resource-note">No additional methods recorded.</p>}
    </details>
  </div>
}
