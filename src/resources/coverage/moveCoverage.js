// Ported from 1.0; rosters and grouping retained, with guaranteed Gen 3 defensive immunities.
import metadata from '../../data/reference.json' with {type:'json'};
import pokemonTypes from '../../data/pokemonTypes.json' with {type:'json'};
const pokemonMeta=Object.fromEntries(Object.entries(metadata.species).map(([id,p])=>[id,{dex:p.nationalDexId,name:p.name,generation:p.nationalDexId<=151?1:p.nationalDexId<=251?2:3,types:pokemonTypes[p.nationalDexId].map(type=>type.toUpperCase())}]));
import { evolutions } from '../locations/data/evolutionResources.js'
import { frontierPokemon } from '../../battle/data/frontierPokemon.js'
import { coverageMultiplier } from './defensiveAbilities.js'

export const coverageMultipliers=[0,0.25,0.5,1,2,4]
const frontierSpecies=new Set(frontierPokemon.map(set=>set.species.toLowerCase()))
export const coveragePokemon=Object.entries(pokemonMeta).filter(([,meta])=>meta.dex>=1 && meta.dex<=386 && meta.generation<=3).map(([id,meta])=>({id,...meta})).sort((a,b)=>a.dex-b.dex)
export function coverageRoster(mode) {
  return coveragePokemon.filter(pokemon=>mode==='fully' ? !(evolutions[pokemon.id]?.length) : mode==='frontier' ? frontierSpecies.has(pokemon.name.toLowerCase()) : true)
}
export function groupMoveCoverage(types,mode='all') {
  const groups=new Map(coverageMultipliers.map(multiplier=>[multiplier,[]]))
  if(!types.length) return groups
  for(const pokemon of coverageRoster(mode)) {
    const best=Math.max(...types.map(type=>coverageMultiplier(type,pokemon)))
    groups.get(best).push(pokemon)
  }
  return groups
}
