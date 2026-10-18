import { pokeBallMapSources } from './pokeBallMapSources.js'
import { pickupBands } from './pickupResources.js'

// Native field items, shops and gifts: pret/pokeemerald, pret/pokeruby, pret/pokefirered.
// Orre inventory and version-specific rewards: linked item pages and Serebii item lists.
const names = ['Master_Ball','Ultra_Ball','Great_Ball','Pok%C3%A9_Ball_(item)','Safari_Ball','Net_Ball','Dive_Ball','Nest_Ball','Repeat_Ball','Timer_Ball','Luxury_Ball','Premier_Ball']
const entries = Object.fromEntries(names.map((_, index) => [index + 1, []]))
const add = (id, game, location, method, availability = 'Once per save', requirement) => entries[id].push({ game, location, method, availability, ...(requirement ? { requirement } : {}) })
const prices = { 2:1200, 3:600, 4:200, 6:1000, 7:1000, 8:1000, 9:1000, 10:1000 }
for (const row of pokeBallMapSources) {
  const isShop = row.kind === 'shop'
  // The Two Island vendor replaces Great Balls with specialty balls after the Network Machine upgrade.
  const locations = row.locations.filter(location => !(isShop && row.item === 3 && location === 'Two Island'))
  if (!locations.length) continue
  const method = isShop ? `Buy for ₽${prices[row.item].toLocaleString('en-US')}` : row.kind === 'renewable' ? 'Find the recurring hidden items' : 'Find as a field or hidden item'
  add(row.item, row.game, locations.join(' / '), method, isShop || row.kind === 'renewable' ? 'Repeatable' : 'Once per pickup')
  if (row.pickups) entries[row.item].at(-1).pickups = row.pickups
  if (isShop && [9,10].includes(row.item) && row.game === 'FireRed / LeafGreen') entries[row.item].at(-1).requirement = 'After completing the Network Machine with the Ruby and Sapphire.'
  if (isShop && [9,10].includes(row.item) && row.game !== 'FireRed / LeafGreen') entries[row.item].at(-1).requirement = 'After receiving the Repeat Ball from the Devon employee on Route 116.'
  if (isShop && row.item === 3 && row.game !== 'FireRed / LeafGreen') entries[row.item].at(-1).requirement = 'Petalburg’s shop requires 4 badges.'
  if (isShop && row.item === 4 && row.game !== 'FireRed / LeafGreen') entries[row.item].at(-1).requirement = 'Oldale’s shop stocks them after receiving the Pokédex.'
}
for (const game of ['Emerald','Ruby / Sapphire']) {
  add(4, game, 'Littleroot Town · Professor Birch’s lab', 'Gift of 5 Poké Balls from your rival')
  add(3, game, 'Petalburg Woods', 'Gift from the Devon employee after defeating the grunt')
  add(3, game, 'Rustboro City', 'Gift from the Devon employee after recovering the Devon Goods')
  add(9, game, 'Route 116', 'Gift from the Devon employee')
  add(10, game, 'Route 110 · Trick House', 'Reward for completing the second puzzle')
  add(12, game, 'Rustboro City · apartment · 2F', 'Gift from the boy')
  add(12, game, 'Poké Marts / Lilycove Department Store', 'Receive 1 free when buying at least 10 Poké Balls in one purchase', 'Repeatable')
  add(1, game, 'Lilycove Department Store · lottery', 'Match all 5 Trainer ID digits', 'Daily')
  add(11, game, game === 'Emerald' ? 'Lilycove City · Contest Hall' : 'Lilycove City · Contest Hall · Master Rank', 'Win a Master Rank Contest again in a category your Pokémon has already won', 'Repeatable')
}
for (const id of [2,3]) {
  const bands = pickupBands.filter(band => band.items.some(item => item.item === id))
  const chances = [...new Set(bands.map(band => band.items.find(item => item.item === id).chance))].sort((a,b) => a-b)
  for (const game of ['Emerald','XD']) add(id, game, 'Pickup', `Pickup Pokémon at Lv. ${bands[0].min}–${bands.at(-1).max}`, 'Repeatable', `${chances.join('–')}% of successful Pickup rolls, depending on level.`)
}
add(2, 'Ruby / Sapphire / Colosseum', 'Pickup', 'Pickup Pokémon at any level', 'Repeatable', '10% of successful Pickup rolls.')
add(3, 'Emerald', 'Route 111 · Trainer Hill', 'Clear the challenge in 18 minutes or more', 'Repeatable', 'After entering the Hall of Fame.')
add(8, 'Emerald', 'Verdanturf Town · Battle Tent', 'Win 3 consecutive battles', 'Repeatable')
for (const id of [11,12]) add(id, 'Emerald', 'Lilycove City · Pokémon Center · Quiz Lady', 'Answer her quiz correctly when this is the offered prize', 'Once per quiz', 'The visiting lady and prize vary; record mixing can bring another quiz.')
add(11, 'Emerald', 'Lilycove City · Pokémon Center · Favor Lady', 'Complete her request when this is the offered prize', 'Once per request', 'The visiting lady and request vary; record mixing can bring another request.')
for (const game of ['Emerald','Ruby / Sapphire']) add(5, game, 'Route 121 · Safari Zone', 'Pay ₽500 for 30 Safari Balls', 'Per visit', 'Temporary balls for the Safari Zone; cannot be kept or traded.')
add(5, 'FireRed / LeafGreen', 'Fuchsia City · Safari Zone', 'Pay ₽500 for 30 Safari Balls', 'Per visit', 'Temporary balls for the Safari Zone; cannot be kept or traded.')
add(4, 'FireRed / LeafGreen', 'Pallet Town · Professor Oak’s lab', 'Gift of 5 Poké Balls after receiving the Pokédex')
add(1, 'FireRed / LeafGreen', 'Saffron City · Silph Co. · 11F', 'Gift from the president after defeating Giovanni')
add(3, 'FireRed / LeafGreen', 'Two Island · vendor', 'Buy for ₽600', 'Repeatable', 'Available before completing the Network Machine with the Ruby and Sapphire.')
add(6, 'FireRed / LeafGreen', 'Route 12 · Fishing House', 'Show a Magikarp that beats the size record', 'Repeatable', 'Each reward requires a new record.')
add(8, 'FireRed / LeafGreen', 'Six Island · Water Path · house', 'Show a Heracross that beats the size record', 'Repeatable', 'Each reward requires a new record.')
add(11, 'FireRed / LeafGreen', 'Five Island · Resort Gorgeous', 'Bring Selphy her requested Pokémon within 5 minutes', 'Repeatable', 'Random reward.')

for (const game of ['Colosseum','XD']) {
  for (const id of [2,3,4,6,8,10]) {
    const location = game === 'XD' && [2,3,4].includes(id) ? 'Gateon Port / Agate Village / Pyrite Town / Phenac City · Poké Marts / Outskirt Stand' : 'Outskirt Stand'
    add(id, game, location, `Buy for ₽${prices[id].toLocaleString('en-US')}`, 'Repeatable', game === 'Colosseum' && [2,10].includes(id) ? 'After Duking’s first email.' : undefined)
  }
  add(12, game, game === 'Colosseum' ? 'Outskirt Stand' : 'Poké Marts / Outskirt Stand', 'Receive 1 free when buying at least 10 Poké Balls in one purchase', 'Repeatable')
}
add(4, 'Colosseum', 'Outskirt Stand', 'Gift of 5 Poké Balls from the clerk')
add(3, 'Colosseum', 'Pyrite Building', 'Find as a field item', 'Once per pickup')
add(2, 'Colosseum', 'Pyrite Cave / Agate Village / The Under Subway / Snagem Hideout', 'Find as a field item', 'Once per pickup')
add(10, 'Colosseum', 'The Under Subway', 'Find as a field item', 'Once per pickup')
add(1, 'Colosseum', 'Agate Village · Eagun’s house', 'Gift from Eagun after reading his incomplete email in Realgam Tower')
add(1, 'Colosseum', 'Japanese Colosseum Bonus Disc', 'Claim the Gold rank reward after earning 30,000 Poké Coupons', 'Once per save', 'Requires the Japanese Bonus Disc.')
add(1, 'XD', 'Pokémon HQ Lab', 'Gift from Professor Krane after clearing Cipher Key Lair')
for (const [id, location] of [[4,'Pokémon HQ Lab / Gateon Port / Agate Village / Cipher Lab'],[3,'Cipher Lab / Pyrite Town'],[2,'Phenac City / Realgam Tower / Snagem Hideout / Cipher Key Lair / Citadark Isle'],[10,'Citadark Isle'],[11,'S.S. Libra']]) add(id, 'XD', location, 'Find as a field item', 'Once per pickup')
for (const [id, cds] of [[3,'03, 07'],[2,'13, 26, 30'],[10,'27, 28']]) add(id, 'XD', 'Realgam Tower · Battle CDs', `First-clear rewards for Battle CDs ${cds}`)

export const pokeBallAcquisition = Object.fromEntries(names.map((name,index) => [index+1, {
  sources: [`https://bulbapedia.bulbagarden.net/wiki/${name}`, 'https://github.com/pret/pokeemerald', 'https://github.com/pret/pokeruby', 'https://github.com/pret/pokefirered', 'https://www.serebii.net/colosseum/items.shtml', 'https://www.serebii.net/xd/items.shtml'],
  entries: entries[index+1],
}]))
