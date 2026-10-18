import { crossGameMoves } from '../data/crossGameMoves.js'
import { levelMoves } from '../data/eggMoveResources.js'
import { previousEvolutions } from './evolutions.js'
import { pokemonMeta } from '../data/pokemonMeta.js'

export function gameLevelLearnsets(id) {
  const family = new Set([String(id)])
  for (const species of family) for (const evolution of previousEvolutions(species)) family.add(evolution.from)
  const games = ['Emerald', 'Ruby / Sapphire', 'Colosseum', 'XD', ...(pokemonMeta[id].dex === 386 ? ['FireRed · Attack Forme', 'LeafGreen · Defense Forme'] : ['FireRed / LeafGreen'])]
  const lists = games.map(game => {
    const get = species => game === 'Emerald' ? levelMoves[species] ?? [] : (crossGameMoves[species] ?? []).filter(entry => entry.method === 'Level-up' && entry.game === game)
    const current = get(id)
    const known = new Set(current.map(entry => entry.move))
    const entries = current.map(({move,level}) => ({move,level}))
    const inherited = [...family].filter(species => species !== String(id)).flatMap(species => get(species).filter(entry => !known.has(entry.move)).map(({move,level}) => ({move,level,species,name:pokemonMeta[species].name})))
    return {game,entries:entries.sort((a,b)=>a.level-b.level||a.move-b.move),inherited:inherited.sort((a,b)=>a.level-b.level||a.move-b.move)}
  })
  const groups = []
  for (const {game,entries,inherited} of lists) {
    const signature = JSON.stringify([entries,inherited])
    const group = groups.find(entry => entry.signature === signature)
    if (group) group.games.push(game)
    else groups.push({games:[game],entries,inherited,signature})
  }
  return groups
}

export function gameTutorSources(id) {
  return (crossGameMoves[id] ?? []).filter(entry => entry.method.toLowerCase().includes('tutor'))
}

export function mergedLevelLearnset(id) {
  const groups = gameLevelLearnsets(id)
  const allGames = groups.flatMap(group => group.games)
  const moves = new Map()
  for (const group of groups) for (const entry of [...group.entries,...group.inherited]) {
    if (!moves.has(entry.move)) moves.set(entry.move,{move:entry.move,sources:[]})
    const sources = moves.get(entry.move).sources
    let source = sources.find(source => source.level === entry.level && source.species === entry.species)
    if (!source) { source={level:entry.level,species:entry.species,name:entry.name,games:[]}; sources.push(source) }
    for (const game of group.games) if (!source.games.includes(game)) source.games.push(game)
  }
  return [...moves.values()].map(entry => {
    const levels = [...new Set(entry.sources.map(source => source.level))].sort((a,b)=>a-b)
    const common = entry.sources.length === 1 && !entry.sources[0].species && entry.sources[0].games.length === allGames.length
    return {...entry,levels,common}
  }).sort((a,b)=>a.levels[0]-b.levels[0]||a.move-b.move)
}

export function levelSourceGames(games, deoxys = false) {
  if (deoxys) {
    const labels = []
    const normal = []
    if (games.includes('Ruby / Sapphire')) normal.push('R/S')
    if (games.includes('Colosseum')) normal.push('Colo')
    if (games.includes('XD')) normal.push('XD')
    if (normal.length) labels.push(normal.join('/'))
    if (games.includes('Emerald')) labels.push('E')
    if (games.includes('FireRed · Attack Forme')) labels.push('FR')
    if (games.includes('LeafGreen · Defense Forme')) labels.push('LG')
    return labels.join(' / ')
  }
  const shared = ['Ruby / Sapphire','Emerald','Colosseum','XD']
  const allShared = shared.every(game => games.includes(game))
  if (allShared && games.includes('FireRed / LeafGreen')) return ''
  if (allShared) return 'R/S/E/Colo/XD'
  return games.map(game => game === 'FireRed / LeafGreen' ? 'FR/LG' : game).join(' / ')
}
