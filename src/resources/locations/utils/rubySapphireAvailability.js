import { rubySapphireEncounters } from '../data/rubySapphireEncounters.js'
import { pokemonMeta } from '../data/pokemonMeta.js'
import { evolutionFamily } from './evolutions.js'
import { descendants } from './descendants.js'
// Special encounters verified against pret/pokeruby map scripts, roamer.c, wild_encounter.c, and tv.c.
const common = [
 ...[252,255,258].map(dex=>({dex,place:'Route 101',kind:'Starter',level:5,note:'Choose one Pokémon from Professor Birch’s bag.'})),
 {dex:351,place:'Route 119 · Weather Institute',kind:'Gift',level:25,note:'Receive after defeating Team Magma/Aqua at the Weather Institute. Requires a free party slot.'},
 {dex:374,place:'Mossdeep City · Steven’s house',kind:'Gift',level:5,note:'Collect the Poké Ball after entering the Hall of Fame.'},
 {dex:360,place:'Lavaridge Town',kind:'Gift Egg',level:5,note:'Receive an Egg from the woman near the hot springs with a free party slot.'},
 ...[[345,'Root'],[347,'Claw']].map(([dex,fossil])=>({dex,place:'Rustboro City · Devon Corporation',kind:'Fossil revival',level:20,note:`Revive the ${fossil} Fossil from the Route 111 desert. Only one of the two fossils can be chosen per save.`})),
 {dex:384,place:'Sky Pillar · Top',kind:'Static encounter',level:70,note:'Available after entering the Hall of Fame.'},
 ...[[377,'Desert Ruins'],[378,'Island Cave'],[379,'Ancient Tomb']].map(([dex,place])=>({dex,place,kind:'Static encounter',level:40,note:'Open the chambers through the Sealed Chamber puzzle, then complete this chamber’s puzzle.'})),
 {dex:100,place:'New Mauville',kind:'Static encounter',level:25,note:'Disguised as item Poké Balls. Obtain the Basement Key from Wattson.'},
 {dex:352,place:'Route 120',kind:'Static encounter',level:30,note:'Use the Devon Scope on an invisible Kecleon.'},
 {dex:349,place:'Route 119',kind:'Fishing · Any rod',level:'20–25',note:'50% on the six selected river tiles. Tiles depend on the Dewford trendy phrase.'},
 ...[[296,'Rustboro City','Slakoth'],[300,'Fortree City','Pikachu'],[222,'Pacifidlog Town','Bellossom']].map(([dex,place,wanted])=>({dex,place,kind:'In-game trade',note:`Trade ${wanted} to the NPC. Level matches the Pokémon given.`})),
 ...[[283,102,3],[283,114,15],[283,117,15],[283,120,28],[300,116,15]].map(([dex,route,level])=>({dex,place:`Route ${route}`,kind:'TV outbreak',level,note:'50% encounter chance while the Pokémon News outbreak is active.'})),
]
function specials(id,game){
 const dex=pokemonMeta[id].dex
 const version=game==='Ruby'?
 [{dex:383,place:'Cave of Origin · B4F',kind:'Static encounter',level:45,note:'Encounter Groudon during the main story.'},{dex:381,place:'Across Hoenn',kind:'Roaming encounter',level:40,note:'Roams after entering the Hall of Fame.'},{dex:380,place:'Southern Island',kind:'Event encounter',level:50,note:'Requires historical Eon Ticket access; holds Soul Dew.'}]:
 [{dex:382,place:'Cave of Origin · B4F',kind:'Static encounter',level:45,note:'Encounter Kyogre during the main story.'},{dex:380,place:'Across Hoenn',kind:'Roaming encounter',level:40,note:'Roams after entering the Hall of Fame.'},{dex:381,place:'Southern Island',kind:'Event encounter',level:50,note:'Requires historical Eon Ticket access; holds Soul Dew.'}]
 return [...common,...version].filter(entry=>entry.dex===dex)
}
export function rubySapphireAvailability(id,game){
 const locations=rubySapphireEncounters[game].flatMap(location=>{
  const methods=location.methods.map(method=>({...method,encounters:method.encounters.filter(entry=>entry.species===Number(id))})).filter(method=>method.encounters.length)
  return methods.length?[{location,methods}]:[]
 }).sort((a,b)=>a.location.name.localeCompare(b.location.name,undefined,{numeric:true}))
 const special=specials(id,game)
 const relatives=locations.length||special.length?[]:evolutionFamily(id).filter(other=>other!==String(id)&&(specials(other,game).length||rubySapphireEncounters[game].some(location=>location.methods.some(method=>method.encounters.some(entry=>entry.species===Number(other)))))).map(other=>({id:other,method:descendants(other).includes(String(id))?'Evolve':'Breed from'}))
 return {locations,special,relatives}
}
