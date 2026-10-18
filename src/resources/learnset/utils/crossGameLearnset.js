import { crossGameMoves } from '../data/crossGameMoves.js'
import { previousEvolutions } from './evolutions.js'
import { pokemonMeta } from '../data/pokemonMeta.js'
import { levelMoves } from '../data/eggMoveResources.js'
export function inheritedLevelMoves(id) {
 const ancestors=new Set([String(id)])
 for(const species of ancestors)for(const entry of previousEvolutions(species))ancestors.add(entry.from)
 const current=new Set((levelMoves[id]??[]).map(entry=>entry.move))
 return [...ancestors].filter(species=>species!==String(id)).flatMap(species=>(levelMoves[species]??[]).filter(entry=>!current.has(entry.move)).map(entry=>({...entry,species,name:pokemonMeta[species].name})))
}
export function crossGameLearnset(id) {
 const ancestors=new Set([String(id)])
 for(const species of ancestors)for(const entry of previousEvolutions(species))ancestors.add(entry.from)
 const emeraldLevelMoves=new Set([...ancestors].flatMap(species=>(levelMoves[species]??[]).map(entry=>entry.move)))
 const groups=new Map()
 for(const species of ancestors)for(const entry of crossGameMoves[species]??[]) {
  if(emeraldLevelMoves.has(entry.move))continue
  const source={...entry,species,name:pokemonMeta[species].name}
  if(!groups.has(entry.move))groups.set(entry.move,[])
  const sources=groups.get(entry.move)
  if(!sources.some(other=>other.species===species&&other.game===entry.game&&other.method===entry.method&&other.level===entry.level))sources.push(source)
 }
 return [...groups].map(([move,sources])=>({move,sources}))
}
