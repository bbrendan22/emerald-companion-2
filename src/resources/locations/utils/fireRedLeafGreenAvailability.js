import { fireRedLeafGreenEncounters } from '../data/fireRedLeafGreenEncounters.js'
import { pokemonMeta } from '../data/pokemonMeta.js'
import { evolutionFamily } from './evolutions.js'
import { descendants } from './descendants.js'
// Verified against pret/pokefirered map scripts, ingame_trades.h and roamer.c.
const common=[
 ...[1,4,7].map(dex=>({dex,place:'Pallet Town · Professor Oak’s lab',kind:'Starter',level:5,note:'Choose one starter.'})),
 {dex:129,place:'Route 4 · Pokémon Center',kind:'Purchase',level:5,note:'Buy from the salesman for ₽500.'},
 {dex:133,place:'Celadon City · Mansion roof room',kind:'Gift',level:25,note:'Enter from the rear of the mansion and collect the Poké Ball.'},
 {dex:131,place:'Saffron City · Silph Co. 7F',kind:'Gift',level:25,note:'Receive from the employee after defeating your rival.'},
 ...[106,107].map(dex=>({dex,place:'Saffron City · Fighting Dojo',kind:'Gift',level:25,note:'Defeat the Karate Master and choose Hitmonlee or Hitmonchan.'})),
 {dex:175,place:'Five Island · Water Labyrinth',kind:'Gift Egg',level:5,note:'Show the gentleman a Pokémon with high friendship and leave a free party slot.'},
 ...[[138,'Helix Fossil'],[140,'Dome Fossil'],[142,'Old Amber']].map(([dex,item])=>({dex,place:'Cinnabar Island · Pokémon Lab',kind:'Fossil revival',level:5,note:`Revive the ${item}. Helix/Dome Fossils are a choice at Mt. Moon; Old Amber comes from Pewter Museum’s rear entrance.`})),
 ...['Route 12','Route 16'].map(place=>({dex:143,place,kind:'Static encounter',level:30,note:'Wake Snorlax with the Poké Flute from Mr. Fuji.'})),
 {dex:101,place:'Power Plant',kind:'Static encounter',level:34,note:'Disguised as item Poké Balls.'},
 {dex:97,place:'Three Island · Berry Forest',kind:'Static encounter',level:30,note:'Encounter while rescuing Lostelle.'},
 ...[[144,'Seafoam Islands · B4F'],[145,'Power Plant'],[146,'Mt. Ember · Summit']].map(([dex,place])=>({dex,place,kind:'Static encounter',level:50,note:dex===144?'Complete the boulder puzzle to stop the current.':dex===146?'Reach the summit during the Sevii Islands visit.':'Reach the Power Plant using Surf.'})),
 {dex:150,place:'Cerulean Cave · B1F',kind:'Static encounter',level:70,note:'Enter the Hall of Fame and restore Celio’s Network Machine with the Ruby and Sapphire.'},
 ...[[243,'Squirtle'],[244,'Bulbasaur'],[245,'Charmander']].map(([dex,starter])=>({dex,place:'Across Kanto',kind:'Roaming encounter',level:50,note:`Requires choosing ${starter}, entering the Hall of Fame and restoring Celio’s Network Machine.`})),
 {dex:386,place:'Birth Island',kind:'Event encounter',level:30,note:'Requires historical AuroraTicket access and completing the triangle puzzle.'},
 ...[[249,'Navel Rock · Bottom'],[250,'Navel Rock · Top']].map(([dex,place])=>({dex,place,kind:'Event encounter',level:70,note:'Requires historical MysticTicket access.'})),
 ...[[122,'Route 2','Abra'],[124,'Cerulean City','Poliwhirl'],[83,'Vermilion City','Spearow'],[101,'Cinnabar Island · Pokémon Lab','Raichu'],[114,'Cinnabar Island · Pokémon Lab','Venonat'],[86,'Cinnabar Island · Pokémon Lab','Ponyta']].map(([dex,place,wanted])=>({dex,place,kind:'In-game trade',note:`Trade ${wanted}. Level matches the Pokémon given.`})),
]
function specials(id,game){
 const fire=game==='FireRed'
 const prizes=fire?[[63,9,180],[35,8,500],[147,18,2800],[123,25,5500],[137,26,9999]]:[[63,7,120],[35,12,750],[127,18,2500],[147,24,4600],[137,18,6500]]
 const version=[...prizes.map(([dex,level,coins])=>({dex,level,place:'Celadon City · Game Corner',kind:'Prize',note:`Exchange ${coins.toLocaleString()} coins.`})),
 {dex:fire?29:32,place:'Underground Path · North entrance',kind:'In-game trade',note:`Trade ${fire?'Nidoran♂':'Nidoran♀'}. Level matches the Pokémon given.`},
 {dex:fire?30:33,place:'Route 11 · Gate 2F',kind:'In-game trade',note:`Trade ${fire?'Nidorino':'Nidorina'}. Level matches the Pokémon given.`},
 {dex:108,place:'Route 18 · Gate 2F',kind:'In-game trade',note:`Trade ${fire?'Golduck':'Slowbro'}. Level matches the Pokémon given.`}]
 return [...common,...version].filter(entry=>entry.dex===pokemonMeta[id].dex).map(entry=>{
  const {note: originalNote,...encounter}=entry
  if (entry.kind==='In-game trade') return {...encounter,note:originalNote,inlineNote:true}
  if (entry.kind==='Prize') return {...encounter,note:originalNote,inlineNote:true}
  const starter={243:'Squirtle',244:'Bulbasaur',245:'Charmander'}[entry.dex]
  if (starter) return {...encounter,note:`Choose ${starter} as starter`,inlineNote:true}
  if (entry.dex===386) return {...encounter,note:'AuroraTicket needed',inlineNote:true}
  if (entry.dex===249||entry.dex===250) return {...encounter,note:'MysticTicket needed',inlineNote:true}
  return encounter
 })
}
export function fireRedLeafGreenAvailability(id,game){
 const locations=fireRedLeafGreenEncounters[game].flatMap(location=>{
  const methods=location.methods.map(method=>({...method,encounters:method.encounters.filter(e=>e.species===Number(id))})).filter(method=>method.encounters.length)
  return methods.length?[{location,methods}]:[]
 }).sort((a,b)=>a.location.name.localeCompare(b.location.name,undefined,{numeric:true}))
 const special=specials(id,game)
 const relatives=locations.length||special.length?[]:evolutionFamily(id).filter(other=>other!==String(id)&&(specials(other,game).length||fireRedLeafGreenEncounters[game].some(location=>location.methods.some(method=>method.encounters.some(e=>e.species===Number(other)))))).filter(()=>!(pokemonMeta[id].dex===196||pokemonMeta[id].dex===197)).map(other=>({id:other,method:descendants(other).includes(String(id))?'Evolve':'Breed from'}))
 return {locations,special,relatives}
}
