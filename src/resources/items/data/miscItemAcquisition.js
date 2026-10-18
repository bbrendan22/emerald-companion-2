import { miscItemMapSources } from './miscItemMapSources.js'
import { miscItemWildSources } from './miscItemWildSources.js'
import { wildItemMethod } from './wildItemAcquisition.js'

// Emerald map scripts and species held items: https://github.com/pret/pokeemerald
// FireRed/LeafGreen fossils and Up-Grade: https://github.com/pret/pokefirered
// Historical event distribution details are documented on the linked item pages.
const source = (location, method, availability = 'Once per save', requirement, game = 'Emerald') => ({ game, location, method, availability, ...(requirement ? { requirement } : {}) })
const wild = (location, pokemon, game = 'Emerald') => source(location, wildItemMethod(location, pokemon), 'Repeatable', '5% held-item chance.', game)
const exchange = shard => source('Route 124 · Diving Treasure Hunter’s house', `Exchange 1 ${shard} Shard`, 'Repeatable')

const entries = {
  93:[wild('Meteor Falls', 'Solrock'), source('Mossdeep City · Space Center · 1F', 'Gift from the sailor')],
  94:[source('Meteor Falls · 1F', 'Find the field item'), wild('Meteor Falls', 'Lunatone', 'Sapphire')],
  95:[exchange('Red'), source('Fiery Path', 'Find the field item')],
  96:[exchange('Yellow'), source('New Mauville', 'Find the field item')],
  97:[exchange('Blue'), source('Abandoned Ship · hidden floor', 'Find in the locked rooms')],
  98:[exchange('Green'), source('Route 119', 'Find the field item')],
  201:[wild('Routes 132–134 · Super Rod', 'Horsea'), wild('Meteor Falls · back room', 'Bagon')],
  218:[source('Five Island · Rocket Warehouse', 'Find the field item', 'Once per save', undefined, 'FireRed / LeafGreen')],
  286:[source('Mirage Tower · 4F', 'Choose the Root Fossil'), source('Desert Underpass', 'Collect the Root Fossil if you chose the Claw Fossil', 'Once per save', 'After entering the Hall of Fame.')],
  287:[source('Mirage Tower · 4F', 'Choose the Claw Fossil'), source('Desert Underpass', 'Collect the Claw Fossil if you chose the Root Fossil', 'Once per save', 'After entering the Hall of Fame.')],
  354:[source('Pewter City · museum back room', 'Gift from the scientist', 'Once per save', 'Revive Aerodactyl at the Cinnabar Pokémon Lab, then trade it to Emerald; the fossil cannot be traded.', 'FireRed / LeafGreen')],
  357:[source('Mt. Moon · B2F', 'Choose the Helix Fossil', 'Once per save', 'Revive Omanyte at the Cinnabar Pokémon Lab, then trade it to Emerald; the fossil cannot be traded.', 'FireRed / LeafGreen')],
  358:[source('Mt. Moon · B2F', 'Choose the Dome Fossil', 'Once per save', 'Revive Kabuto at the Cinnabar Pokémon Lab, then trade it to Emerald; the fossil cannot be traded.', 'FireRed / LeafGreen')],
  275:[source('Record mixing / Pokémon Center · 2F', 'Mix records with an eligible Ruby / Sapphire event-ticket save, then collect the ticket', 'Once per save', 'Requires an original event-ticket recipient who can still share it.')],
  370:[source('Pokémon Center · 2F', 'Collect from the Mystery Gift deliveryman', 'Once per save', 'MysticTicket event distribution.')],
  371:[source('Pokémon Center · 2F', 'Collect from the Mystery Gift deliveryman', 'Once per save', 'AuroraTicket event distribution.')],
  376:[source('Pokémon Center · 2F', 'Collect from the Mystery Gift deliveryman', 'Once per save', 'Old Sea Map event distribution · Japanese Emerald only.')],
  46:[source('Shoal Cave · low tide', 'Collect the 4 Shoal Salts', 'Daily', 'Requires a working clock battery for tide changes and daily replenishment.')],
  47:[source('Shoal Cave · high tide', 'Collect the 4 Shoal Shells', 'Daily', 'Requires a working clock battery for tide changes and daily replenishment.')],
  48:[wild('Route 128 / Ever Grande City · Super Rod', 'Corsola'), source('Route 124 / Underwater Route 127', 'Find the field or hidden items')],
  49:[wild('Underwater Routes 124, 126', 'Clamperl'), source('Route 124 / Underwater Route 126', 'Find the field or hidden items')],
  50:[wild('Underwater Routes 124, 126', 'Chinchou'), source('Route 124 / Underwater Route 126', 'Find the field or hidden items')],
  51:[wild('Underwater Routes 124, 126', 'Relicanth'), source('Route 126 / Underwater Route 124', 'Find the field or hidden items')],
}

// Replace the earlier selected wild/field sources with the full native inventory.
for (const [id, rows] of Object.entries(entries)) {
  entries[id] = rows.filter(row => !row.method.startsWith('Wild ') && !row.method.startsWith('Find'))
}
for (const row of miscItemWildSources) {
  const location = row.locations.join(' / ')
  entries[row.item].push({ ...source(location, wildItemMethod(location, row.pokemon), 'Repeatable', `${row.chance}% held-item chance.`, row.game), pokemon: row.pokemon, heldItemChance: row.chance, maps: row.maps })
}
for (const row of miscItemMapSources) {
  const method = row.kind === 'shop' ? 'Buy for ₽2,100' : 'Find as a field or hidden item'
  entries[row.item].push({ ...source(row.locations.join(' / '), method, row.kind === 'shop' ? 'Repeatable' : 'Once per pickup', undefined, row.game), ...(row.pickups ? { pickups: row.pickups } : {}) })
}
entries[93].push(source('Mossdeep City · Space Center · 1F', 'Gift from the sailor', 'Once per save', undefined, 'Ruby / Sapphire'))
entries[94].push(source('Two Island · Joyful Game Corner', 'Gift from Lostelle’s father after delivering the Meteorite', 'Once per save', undefined, 'FireRed / LeafGreen'))
for (const [id, shard] of [[95,'Red'],[96,'Yellow'],[97,'Blue'],[98,'Green']]) {
  entries[id].push(source('Route 124 · Diving Treasure Hunter’s house', `Exchange 1 ${shard} Shard`, 'Repeatable', undefined, 'Ruby / Sapphire'))
}
for (const [id, mode] of [[201,'Double'],[218,'Single']]) {
  entries[id].push(source('Seven Island · Trainer Tower', `First-clear reward for ${mode} Mode`, 'Once per save', undefined, 'FireRed / LeafGreen'))
}
for (const [id, fossil] of [[286,'Root'],[287,'Claw']]) {
  entries[id].push(source('Route 111 · desert', `Choose the ${fossil} Fossil`, 'Once per save', 'Only one of the two fossils can be collected.', 'Ruby / Sapphire'))
}
for (const id of [46,47]) {
  entries[id].push(...entries[id].filter(row => row.game === 'Emerald').map(row => ({ ...row, game: 'Ruby / Sapphire' })))
}
// XD's Eevee gift is one choice shared by all five evolution options.
for (const id of [95,96,97]) {
  entries[id].push(source('Gateon Port · Parts Shop', 'Choose as Eevee’s evolution gift', 'Once per save', 'Choose one evolution item.', 'XD'))
}
for (const [id, location] of [[95,'S.S. Libra'],[97,'Phenac City · Stadium'],[98,'Cipher Lab']]) {
  entries[id].push(source(location, 'Find in an item chest', 'Once per pickup', undefined, 'XD'))
}
entries[275].push(
  source('Petalburg City · Gym', 'Collect from Norman after receiving the Eon Ticket e-Card through Mystery Event', 'Once per save', 'Compatible e-Reader and original event card required.', 'Ruby / Sapphire'),
  source('Petalburg City · Gym', 'Collect from Norman after a historical Mystery Event distribution', 'Once per save', 'Original event distribution required.', 'Ruby / Sapphire'),
  source('Record mixing / Pokémon Center · 2F', 'Mix records with an eligible original event-ticket recipient', 'Once per save', 'Record-mixed recipients cannot share the ticket onward.', 'Ruby / Sapphire'),
  source('Petalburg City · Gym', 'Collect from Norman after a historical Mystery Event distribution', 'Once per save', 'Japanese Emerald only.', 'Emerald'),
)
for (const id of [370,371]) {
  entries[id].push({ ...entries[id][0], game: 'FireRed / LeafGreen' })
}
entries[371][0].requirement = 'AuroraTicket event distribution · international Emerald only.'

export const miscItemAcquisition = Object.fromEntries(Object.entries(entries).map(([id, rows]) => [id, {
  sources:['https://github.com/pret/pokeemerald', 'https://github.com/pret/pokeruby', 'https://github.com/pret/pokefirered', 'https://www.serebii.net/xd/items.shtml', 'https://www.serebii.net/xd/eeveelution.shtml', 'https://bulbapedia.bulbagarden.net/wiki/Trainer_Tower', ...([93,94,95,96,97,98,218,354,357,358].includes(Number(id)) ? ['https://github.com/pret/pokefirered'] : []), ...([93,94,95,96,97,98].includes(Number(id)) ? ['https://github.com/pret/pokeruby'] : []), ...({275:['https://bulbapedia.bulbagarden.net/wiki/Eon_Ticket'],370:['https://bulbapedia.bulbagarden.net/wiki/MysticTicket'],371:['https://bulbapedia.bulbagarden.net/wiki/AuroraTicket'],376:['https://bulbapedia.bulbagarden.net/wiki/Old_Sea_Map']}[id] ?? [])],
  entries:rows,
}]))
