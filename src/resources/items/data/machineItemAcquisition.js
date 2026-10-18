import { machineMapSources } from './machineMapSources.js'
import { machineItemPrices } from './itemShopData.js'
import { pickupBands } from './pickupResources.js'

// Handheld sources come from native pret map scripts; Orre rewards are cross-checked
// against the Gen III TM/HM location list and Serebii's Colosseum/XD TM lists.
const entries = Object.fromEntries(Array.from({ length:58 }, (_, i) => [289+i, []]))
const add = (id, game, location, method, availability = 'Once per save', requirement) => entries[id].push({ game, location, method, availability, ...(requirement ? { requirement } : {}) })
const hoennGifts = {
  291:'Reward for defeating the Sootopolis Gym Leader',292:'Reward for defeating Tate and Liza',293:'Gift from the gentleman with Poochyena',296:'Reward for defeating Brawly',297:'Gift from the boy near Petalburg Woods',298:'Guess the woman’s coin tosses correctly',300:'Reward for completing the sixth Trick House puzzle',307:'Show the girl a Grass-type Pokémon',309:'Gift for showing a Pokémon with low friendship',312:'Reward from Wattson after switching off New Mauville’s generator',315:'Gift for showing a Pokémon with high friendship',316:'Gift from the Fossil Maniac’s younger brother',319:'Gift from the Black Belt',322:'Reward for defeating Wattson',324:'Gift from the man after earning the Balance Badge',327:'Reward for defeating Roxanne',328:'Reward for defeating Winona',329:'Gift from the man',330:'Reward for defeating Norman',332:'Gift from the man',333:'Gift from the girl',334:'Gift from the Team Aqua grunt',335:'Gift from Steven after delivering the letter',337:'Find in a passenger’s room',338:'Reward for defeating Flannery',339:'Gift from the Cutter',340:'Gift from your rival after defeating them',341:'Gift from Wally’s father after defeating Norman',342:'Gift from the man after clearing the rocks',343:'Gift from the Hiker',344:'Gift from the Rock Smash man',345:'Gift from Wallace before entering the Sootopolis Gym',346:'Gift from Steven',
}
const kantoGifts = {291:'Reward for defeating Misty',292:'Reward for defeating Sabrina',294:'Reward for defeating Koga',307:'Reward for defeating Erika',314:'Reward for defeating Giovanni',315:'Gift from the girl upstairs',316:'Recover from the Team Rocket grunt',317:'Gift from Mr. Psychic',322:'Reward for defeating Lt. Surge',326:'Reward for defeating Blaine',327:'Reward for defeating Brock',330:'Give Lemonade to the memorial for Tectonix',339:'Gift from the captain after helping him',340:'Gift from the girl in the house',341:'Gift from the man in the Secret House',342:'Return the Gold Teeth to the Warden',343:'Gift from Professor Oak’s aide after catching 10 species',344:'Gift from the old man in Ember Spa'}
for (const row of machineMapSources) {
  const location = row.locations.join(' / ')
  const shop = row.kind === 'shop'
  let method = shop ? `Buy for ₽${machineItemPrices[row.item].toLocaleString('en-US')}` : 'Find as a field or hidden item'
  let availability = shop ? 'Repeatable' : 'Once per pickup'
  if (row.kind === 'gift') {
    method = (row.game === 'FireRed / LeafGreen' ? kantoGifts : hoennGifts)[row.item] || 'Gift from the resident'
    availability = 'Once per save'
    if ([309,315].includes(row.item) && location.includes('Pacifidlog')) availability = 'Weekly'
    if (row.item === 315 && location.includes('Fallarbor')) method = 'Return the Meteorite to Professor Cozmo'
  }
  add(row.item, row.game, location, method, availability)
  if (row.pickups) entries[row.item].at(-1).pickups = row.pickups
}
for (const game of ['Emerald','Ruby / Sapphire']) {
  add(331, game, 'Route 111', 'Gift from the man beside the tree')
  for (const [tm, coins] of [[13,4000],[24,4000],[29,3500],[32,1500],[35,4000]]) add(288+tm, game, 'Mauville City · Game Corner', `Exchange ${coins.toLocaleString('en-US')} coins`, 'Repeatable')
}
for (const [tm, coins] of [[13,4000],[23,3500],[24,4000],[30,4500],[35,4000]]) add(288+tm, 'FireRed / LeafGreen', 'Celadon City · Game Corner', `Exchange ${coins.toLocaleString('en-US')} coins`, 'Repeatable')
for (const [tm, drink] of [[16,'Fresh Water'],[20,'Soda Pop'],[33,'Lemonade']]) add(288+tm, 'FireRed / LeafGreen', 'Celadon Department Store · rooftop', `Give ${drink} to the thirsty girl`)
for (const id of [289,314,332]) {
  const bands = pickupBands.filter(b => b.items.some(i => i.item === id))
  for (const game of ['Emerald','XD']) add(id, game, 'Pickup', `Pickup Pokémon at Lv. ${bands[0].min}–${bands.at(-1).max}`, 'Repeatable', '1% of successful Pickup rolls.')
}
add(298, 'FireRed / LeafGreen', 'Pickup', 'Pickup Pokémon at any level', 'Repeatable', '5% of successful Pickup rolls.')
add(303, 'Emerald', 'Lilycove City · Pokémon Center · Quiz Lady', 'Answer her quiz when this is the offered prize', 'Once per quiz', 'The visiting lady and prize vary; record mixing can bring another quiz.')
for (const [tm, mode] of [[11,'Normal'],[19,'Unique'],[31,'Expert']]) add(288+tm, 'Emerald', 'Trainer Hill', `Clear ${mode} mode in under 12 minutes`, 'Repeatable')
for (const tm of [5,6,26,36,41,45,48]) add(288+tm, 'Emerald', 'Trainer Hill · e-Reader courses', 'Possible course prize for clearing in under 12 minutes', 'Repeatable', 'Japanese Emerald only; requires compatible e-Reader cards.')

for (const game of ['Colosseum','XD']) {
  for (const tm of [10,14,15,16,17,20,25,33,38]) add(288+tm, game, game === 'Colosseum' ? 'The Under · shop' : 'Realgam Tower · shop', `Buy for ₽${machineItemPrices[288+tm].toLocaleString('en-US')}`, 'Repeatable')
  for (const [tm,cost] of [[13,4000],[24,4000],[29,3500],[32,1500],[35,4000],...(game === 'XD' ? [[30,4500]] : [])]) add(288+tm, game, 'Mt. Battle · Poké Coupon exchange', `Exchange ${cost.toLocaleString('en-US')} Poké Coupons`, 'Repeatable')
}
const coloRounds = { 'Pyrite Colosseum':[[1,1],[7,2],[5,3],[31,4]], 'Phenac Stadium':[[18,1],[11,2],[19,3],[22,4]], 'Under Colosseum':[[37,1],[36,2],[30,3],[23,4]], 'Deep Colosseum':[[12,1],[48,2],[44,3],[2,4]] }
for (const [location, rewards] of Object.entries(coloRounds)) for (const [tm,round] of rewards) add(288+tm,'Colosseum',location,`First-clear reward for Round ${round}`)
add(294,'Colosseum','Pyrite Colosseum','Reward for winning the story tournament')
for (const [tm,location,method] of [[26,'Shadow Pokémon Lab','Find as a field item'],[27,'Phenac City · Pre Gym','Defeat Justy'],[41,'Phenac City','Defeat Roller Boy Kaib'],[45,'The Under · TV studio','Find after defeating Venus'],[46,'Pyrite Town · jail','Find as a field item'],[47,'Mt. Battle · lobby','Find after defeating Dakim']]) add(288+tm,'Colosseum',location,method)
add(337,'Colosseum','Pyrite Cave','Find as a field item','Once per pickup')
const xdRounds = { 'Pyrite Colosseum':[[31,1],[12,2],[41,3],[5,4]], 'Realgam Colosseum':[[49,1],[19,2],[23,3],[22,4]], 'Orre Colosseum':[[6,1],[27,2],[48,3],[36,4],[44,5],[47,6],[2,7]] }
for (const [location,rewards] of Object.entries(xdRounds)) for (const [tm,round] of rewards) add(288+tm,'XD',location,`First-clear reward for Round ${round}`)
for (const [tm,area] of [[3,2],[34,3],[42,4],[39,5],[50,6],[4,7],[8,8],[40,9]]) add(288+tm,'XD','Mt. Battle',`First-clear reward for Area ${area}`)
for (const [tm,cd] of [[1,21],[11,49],[18,50]]) add(288+tm,'XD','Realgam Tower · Battle CDs',`First-clear reward for Battle CD ${cd}`)
for (const [tm,location,method] of [[9,'Agate Village','Gift from Kurana'],[13,'Phenac Stadium','Find as a field item'],[24,'Cipher Key Lair','Find as a field item'],[26,'Cipher Key Lair','Find as a field item'],[29,'Snagem Hideout','Find as a field item'],[30,'Snagem Hideout','Find as a field item'],[32,'Phenac City · Pre Gym','Gift from Justy'],[35,'S.S. Libra','Find as a field item'],[45,'Gateon Port','Gift from Sailor Gonzui']]) add(288+tm,'XD',location,method)
export const machineItemAcquisition = Object.fromEntries(Object.entries(entries).map(([id, rows]) => [id, {
  sources:['https://github.com/pret/pokeemerald','https://github.com/pret/pokeruby','https://github.com/pret/pokefirered','https://bulbapedia.bulbagarden.net/wiki/List_of_TM_and_HM_locations_in_Generation_III','https://www.serebii.net/colosseum/tms.shtml','https://www.serebii.net/xd/tms.shtml'],
  entries:rows,
}]))
