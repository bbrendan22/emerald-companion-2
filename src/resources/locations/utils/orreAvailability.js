import { orreEncounters } from '../data/orreEncounters.js'
import { pokemonMeta } from '../data/pokemonMeta.js'
import { evolutionFamily } from './evolutions.js'
import { descendants } from './descendants.js'
export function orreAvailability(id,game){
 const special=orreEncounters[game].filter(entry=>entry.dex===pokemonMeta[id].dex)
 // Orre has no breeding facilities: pre-evolutions must be bred in a GBA game.
 const relatives=special.length?[]:evolutionFamily(id).filter(other=>other!==String(id)&&descendants(other).includes(String(id))&&orreEncounters[game].some(entry=>entry.dex===pokemonMeta[other].dex)).map(other=>({id:other,method:'Evolve'}))
 return {locations:[],special,relatives}
}
