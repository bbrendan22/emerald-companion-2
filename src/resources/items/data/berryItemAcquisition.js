import { wildItemMethod } from './wildItemAcquisition.js'
import { berryItemWildSources } from './berryItemWildSources.js'
import { berryItemMapSources } from './berryItemMapSources.js'
import { berryTrainerSources } from './berryTrainerSources.js'

// Emerald sources verified against pret/pokeemerald's new_game.inc,
// daily berry-gift scripts, species held items and Scott's reward script.
// Initial trees are finite sources; player planting is intentionally omitted.
const source = (location, method, availability = 'Once per save', requirement, game = 'Emerald') => ({ game, location, method, availability, ...(requirement ? { requirement } : {}) })
const wild = (location, pokemon, chance) => source(location, wildItemMethod(location, pokemon), 'Repeatable', `${chance}% held-item chance.`)
const entries = Object.fromEntries([...Array.from({length:10}, (_, i) => 133+i), ...Array.from({length:6}, (_, i) => 153+i)].map(id => [id, []]))

for (const id of Array.from({length:10}, (_, i) => 133+i)) {
  entries[id].push(
    source('Route 123 · Berry Master’s house', 'Random gift from the Berry Master’s wife', 'Daily'),
    source('Lilycove City', 'Random gift from the Berry Gentleman', 'Daily'),
  )
  if (id <= 140) entries[id].push(source('Route 104 · Pretty Petal Flower Shop', 'Random gift from the girl', 'Daily'))
}
for (const id of Array.from({length:6}, (_, i) => 153+i)) {
  entries[id].push(
    source('Route 123 · Berry Master’s house', 'Possible berry in the Berry Master’s daily gifts', 'Daily'),
    source('Sootopolis City', 'Possible berry in Kiri’s daily gifts', 'Daily'),
  )
}
const treeRoutes = {
  133:[103,104], 134:[116,121], 135:[102,104,112,120,123],
  136:[112,121,123], 137:[120,121], 138:[103,104,119,123],
  139:[102,104,111], 140:[114,121], 142:[118,119,123],
  153:[119,123], 154:[115], 155:[123], 156:[119], 157:[123],
}
for (const [id, routes] of Object.entries(treeRoutes)) {
  entries[id].push(source(`${routes.length === 1 ? 'Route' : 'Routes'} ${routes.join(', ')}`, 'Harvest the existing berry trees'))
}
entries[134].push(source('Route 104 · south', 'Gift from the woman'), wild('Route 113 / Route 116 / Rusturf Tunnel / Victory Road / Desert Underpass', 'Spinda / Whismur / Loudred', 5))
entries[135].push(wild('Routes 101–104, 110, 116, 117, 120, 121, 123 / Petalburg Woods', 'Poochyena / Mightyena', 5))
entries[136].push(wild('Route 112 / Fiery Path / Jagged Pass / Mt. Pyre exterior', 'Numel / Vulpix', 100))
entries[138].push(wild('Route 116', 'Skitty', 5))
entries[139].push(wild('Safari Zone', 'Pikachu', 50), wild('Safari Zone northeast', 'Shuckle', 100), wild('Routes 101–103, 118, 119', 'Zigzagoon', 5), wild('Routes 118, 119', 'Linoone', 50))
entries[140].push(wild('Safari Zone / Routes 118–121, 123', 'Girafarig / Kecleon', 5))
entries[142].push(wild('Routes 118, 119', 'Linoone', 5))

entries[168] = [source('Mirage Island · Route 130', 'Harvest the existing berry tree')]
for (const id of [169,170,171,172]) {
  entries[id] = [source('Mt. Battle · coupon exchange', 'Buy for 15,000 Poké Coupons', 'Repeatable', undefined, 'Colosseum / XD')]
}
entries[170].push(source('Realgam Tower · Battle SIM', 'First-clear rewards for Battle CDs 44 and 45', 'Once per save', undefined, 'XD'))
entries[173] = [source('Battle Frontier · Scott’s house', 'Gift from Scott for earning all 7 Silver Symbols')]
entries[174] = [source('Battle Frontier · Scott’s house', 'Gift from Scott for earning all 7 Gold Symbols')]

// Full native acquisition inventory, before individual display review.
// Planting is intentionally excluded; these trees are the initial map harvests.
for (const id of Object.keys(entries)) {
  entries[id] = entries[id].filter(row => !row.method.startsWith('Wild ') && row.method !== 'Harvest the existing berry trees' && row.method !== 'Harvest the existing berry tree')
  const sharedGifts = entries[id].filter(row => row.game === 'Emerald' && (
    row.location.includes('Berry Master') || row.location === 'Lilycove City' || row.location === 'Sootopolis City' || row.location.includes('Pretty Petal') || row.location === 'Route 104 · south'
  ))
  entries[id].push(...sharedGifts.map(row => ({ ...row, game: 'Ruby / Sapphire' })))
}
for (const row of berryItemWildSources) {
  const location = row.locations.join(' / ')
  entries[row.item].push(source(location, wildItemMethod(location, row.pokemon), 'Repeatable', `${row.chance}% held-item chance.`, row.game))
  Object.assign(entries[row.item].at(-1), { pokemon: row.pokemon, heldItemChance: row.chance, maps: row.maps })
}
for (const row of berryItemMapSources) {
  const location = row.item === 168 && row.kind === 'tree' ? 'Mirage Island · Route 130' : row.locations.join(' / ')
  entries[row.item].push({ ...source(location, row.kind === 'tree' ? 'Harvest the existing berry trees' : row.kind === 'renewable' ? 'Find the recurring hidden items' : 'Find as a field or hidden item', row.kind === 'renewable' ? 'Repeatable' : 'Once per pickup', undefined, row.game), pickups: row.pickups })
}
for (const id of [133,134,135,136,137,139,140]) {
  entries[id].push(source('Pickup', 'Pickup Pokémon at any level', 'Repeatable', `${id === 139 ? 15 : 10}% of successful Pickup rolls.`, 'FireRed / LeafGreen'))
}
entries[134].push(source('Routes 12, 16', 'Wild Snorlax · catch or use Thief / Covet', 'Once per encounter', '100% held-item chance.', 'FireRed / LeafGreen'))
entries[134].push(source('Rustboro City · in-game trade', 'Held by the Seedot traded for Ralts'))
for (const row of berryTrainerSources) {
  const names = row.names.map(name => name === 'Terry' ? 'the Champion' : name)
  entries[row.item].push({ ...source(row.location, `Use Thief / Covet on Pokémon belonging to ${names.join(', ')}`, row.repeatable ? 'Repeatable' : 'Once per trainer', row.repeatable ? 'Trainer rematches.' : undefined, row.game), trainers: row.trainers })
}
for (const id of [138,141,142]) {
  for (const [game, location] of [['Emerald','Mossdeep City · Game Corner'], ['FireRed / LeafGreen','Two Island · Joyful Game Corner']]) {
    entries[id].push(source(location, 'Random Pokémon Jump prize · score at least 5,000 points', 'Repeatable', 'Requires 2–5 linked players.', game))
  }
}
for (const id of [153,154,155,156,157,158]) {
  for (const [game, location] of [['Emerald','Mossdeep City · Game Corner'], ['FireRed / LeafGreen','Two Island · Joyful Game Corner']]) {
    entries[id].push(source(location, 'Possible Dodrio Berry Picking prize', 'Repeatable', 'Requires 4 linked players; highest score at least 3,000 points.', game))
  }
}
for (const id of Array.from({ length: 10 }, (_, i) => 133+i)) {
  entries[id].push(source('Agate Village · Berry Man', 'Random gift from the old man near Taillow', 'Repeatable', undefined, 'Colosseum / XD'))
}
for (const id of [141,142]) {
  entries[id].push(
    source('Realgam Tower · Battle CD 24', 'First-clear reward', 'Once per save', undefined, 'XD'),
    source('Phenac City · Pre Gym', 'Reward for defeating Justy', 'Once per save', undefined, 'XD'),
  )
}
const event = (id, game, method) => entries[id].push(source('Historical Pokémon distribution', method, 'Event distribution', 'Original distribution Pokémon required.', game))
event(168, 'Ruby / Sapphire', 'Held by Berry Program Update Zigzagoon')
for (const id of [169,170]) {
  event(id, 'Ruby / Sapphire', 'Held by WISHMKR / Channel / Wishing Star Jirachi or Pokémon Stamp / Pokémon Box promotion Absol')
  event(id, 'Emerald / Ruby / Sapphire / FireRed / LeafGreen', 'Held by 2006 Tanabata Jirachi')
}
for (const id of [171,172]) {
  event(id, 'Ruby / Sapphire / FireRed / LeafGreen', 'Held by 2004 Tanabata Jirachi')
  event(id, 'Emerald / Ruby / Sapphire / FireRed / LeafGreen', 'Held by 2005 Tanabata Jirachi')
}
event(172, 'Ruby / Sapphire', 'Held by Pokémon Box promotion Seviper')

export const berryItemAcquisition = Object.fromEntries(Object.entries(entries).map(([id, rows]) => [id, {
  sources:['https://github.com/pret/pokeemerald', 'https://github.com/pret/pokeruby', 'https://github.com/pret/pokefirered', 'https://www.serebii.net/pokearth/orre/agatevillage.shtml', ...([168,169,170,171,172].includes(Number(id)) ? ['https://bulbapedia.bulbagarden.net/wiki/Mt._Battle', `https://bulbapedia.bulbagarden.net/wiki/${{168:'Liechi',169:'Ganlon',170:'Salac',171:'Petaya',172:'Apicot'}[id]}_Berry`] : [])],
  entries:rows,
}]))
