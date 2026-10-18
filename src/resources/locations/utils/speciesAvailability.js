import { pokemonMeta } from '../data/pokemonMeta.js'
import { specialEncounters } from '../data/specialEncounters.js'
import { specialRequirements, tradeSources } from '../data/availabilityNotes.js'
import { evolutionFamily } from './evolutions.js'
import { descendants } from './descendants.js'
import { speciesEncounters } from './speciesEncounters.js'
import { availabilitySources } from '../data/availabilitySources.js'
const idFor=dex=>Object.keys(pokemonMeta).find(id=>pokemonMeta[id].dex===dex)
const extras=[
 ...[252,255,258].map(dex=>({dex,kind:'Starter',place:'Route 101',level:5,note:'Choose one from Birch’s bag while rescuing him at the start of the game. The other choices require breeding/trading with another save.'})),
 ...[380,381].map(dex=>({dex,kind:'Roaming encounter',place:'Across Hoenn',level:40,note:`After the Hall of Fame, answer ${dex===380?'Red':'Blue'} when your mother asks about the TV report. ${dex===380?'Latias':'Latios'} then roams Hoenn. The other requires trading or historical Eon Ticket access.`})),
 ...[380,381].map(dex=>({dex,kind:'Event encounter',place:'Southern Island',level:50,note:'Historical Eon Ticket access. Encounter the opposite Eon Pokémon to the one selected for roaming; it holds Soul Dew. Emerald can receive the ticket through supported record mixing.'})),
 {dex:349,kind:'Special fishing',place:'Route 119',level:'20–25',note:'Fish with any rod on the six randomly selected river tiles. On a matching tile, Feebas has a 50% encounter chance. Tiles depend on the Dewford trend seed and can change when trends/records change.'},
 ...[[273,'Route 102',3],[274,'Route 114',15],[273,'Route 117',13],[273,'Route 120',25],[300,'Route 116',8]].map(([dex,place,level])=>({dex,kind:'TV outbreak',place,level,note:'A Pokémon News outbreak must be active here. Outbreak encounters have a 50% chance and can carry special moves.'})),
 {dex:283,kind:'Record-mixed outbreak',place:'Routes 102, 114, 117, or 120',note:'Mix records with Ruby/Sapphire carrying a Surskit outbreak. Emerald does not generate Surskit outbreaks on its own. Follow the mixed TV report for the active route and level.'},
 ...[[273,'Rustboro City',280],[311,'Fortree City',313],[116,'Pacifidlog Town',371],[52,'Battle Frontier',300]].map(([dex,place,requestedDex])=>({dex,kind:'In-game trade',place,note:`Trade ${pokemonMeta[idFor(requestedDex)].name} to the NPC for ${pokemonMeta[idFor(dex)].name}. Its level matches the Pokémon you give.`})),
]
export function directSpecialAvailability(id){
 return [...specialEncounters.filter(entry=>entry.species===Number(id)&&entry.map!=='SouthernIsland_Interior').map(entry=>({...entry,place:entry.map.replaceAll('_',' · ').replace(/([a-z])([A-Z])/g,'$1 $2'),note:specialRequirements[entry.map]??'Encounter available through this location’s story script.'})),...extras.filter(entry=>entry.dex===pokemonMeta[id].dex)]
}
export function speciesAvailability(id){
 const special=directSpecialAvailability(id)
 const family=evolutionFamily(id)
 const relatives=family.filter(other=>other!==String(id)&&(speciesEncounters(other).length||directSpecialAvailability(other).length)).map(other=>({id:other,method:descendants(other).includes(String(id))?'Evolve':'Breed',special:directSpecialAvailability(other)}))
 const imports=family.filter(other=>tradeSources[pokemonMeta[other].dex]).map(other=>({id:other,game:tradeSources[pokemonMeta[other].dex][0],note:tradeSources[pokemonMeta[other].dex][1],method:other===String(id)?null:descendants(other).includes(String(id))?'Evolve':'Breed'}))
 const sourceGames=availabilitySources[pokemonMeta[id].dex].filter(entry=>entry.game!=='Emerald'&&entry.native)
 return {special,relatives,imports,sourceGames,hasEmeraldRoute:Boolean(speciesEncounters(id).length||special.length||relatives.length)}
}
