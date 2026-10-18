import { pickupBands } from './pickupResources.js'
import { wildItemMethod } from './wildItemAcquisition.js'
import { utilityItemWildSources } from './utilityItemWildSources.js'
import { utilityItemMapSources } from './utilityItemMapSources.js'

// Verified against pret/pokeemerald map scripts, held items, lottery and Pickup tables.
// Field finds are grouped by item; duplicate Trick House deferred rewards are omitted.
const source = (location, method, availability = 'Once per save', requirement, game = 'Emerald') => ({ game, location, method, availability, ...(requirement ? { requirement } : {}) })
const wild = (location, pokemon, chance = 5, game = 'Emerald') => source(location, wildItemMethod(location, pokemon), 'Repeatable', `${chance}% held-item chance.`, game)
const powder = amount => source('Slateport City · Berry Powder exchange', `Exchange ${amount.toLocaleString('en-US')} Berry Powder`, 'Repeatable', 'Berry Powder comes from multiplayer Berry Crush.')
const favor = () => source('Lilycove City · Favor Lady', 'Possible reward for completing her request', 'Daily', 'Depends on which Lilycove Lady is present.')
const field = location => source(location, 'Find as a field or hidden item')

const entries = {
  189:[source('Littleroot Town · your house', 'Gift from Mom after earning the Balance Badge')],
  195:[wild('Granite Cave / Routes 111, 114 / Safari Zone north / Magma Hideout / Victory Road', 'Geodude / Graveler'), source('Granite Cave · B2F', 'Find the hidden items')],
  182:[source('Rustboro City · Devon Corporation · 3F', 'Gift from Mr. Stone after delivering Steven’s letter'), source('Lilycove Department Store · 1F', 'Lottery prize · match the last 3 Trainer ID digits', 'Daily')],
  197:[source('Safari Zone', 'Wild Chansey · catch', 'Repeatable', '5% held-item chance.', 'FireRed / LeafGreen'), source('Agate Village', 'Gift from Beluh · Pokémon Translator quest', 'Once per save', undefined, 'XD')],
  181:[source('Route 111 · Winstrate house', 'Gift from Victoria after defeating the family')],
  184:[source('Slateport City · Pokémon Fan Club', 'Gift from the woman when your lead Pokémon has high friendship')],
  68:[field('Petalburg City / Routes 108, 110, 111, 114, 119, 120, 123, 127, 132 / Granite Cave / Magma Hideout / Mt. Pyre / Safari Zone northeast / Shoal Cave'), source('Trick House · puzzle 1', 'Reward from the Trick Master'), favor(), source('Lilycove City · Quiz Lady', 'Possible reward for answering her quiz', 'Daily', 'Depends on which Lilycove Lady is present.')],
  110:[field('Routes 112, 113, 119, 120, 121 / Aqua Hideout / Fallarbor Town / Magma Hideout / Safari Zone northeast'), favor()],
  111:[wild('Route 128 / Ever Grande City · Super Rod', 'Luvdisc', 50), field('Lilycove City / Routes 104, 105, 106, 109, 115, 118, 128 / Underwater Routes 124, 126, 127'), favor()],
  69:[powder(3000), source('Lilycove Department Store · 1F', 'Lottery prize · match the last 2 Trainer ID digits', 'Daily'), field('Lilycove City / Routes 103, 104, 109, 115, 123 / Meteor Falls / Safari Zone southeast / Victory Road')],
  71:[field('Magma Hideout · 3F'), source('Trick House · puzzle 7', 'Reward from the Trick Master'), favor()],
  103:[field('Petalburg Woods'), wild('Mt. Moon / Safari Zone', 'Paras / Parasect', 50, 'FireRed / LeafGreen')],
  104:[wild('Mt. Moon / Safari Zone', 'Paras / Parasect', 5, 'FireRed / LeafGreen')],
  63:[field('Routes 111, 116, 121 / Artisan Cave / Underwater Route 127')],
  64:[field('Routes 106, 111, 114, 132 / Artisan Cave / Underwater Route 128'), favor()],
  65:[field('Routes 105, 115, 118 / Artisan Cave / Underwater Route 126')],
  67:[field('Routes 119, 123 / Artisan Cave / Safari Zone north / Underwater Route 124')],
  70:[field('Routes 119, 120, 121, 127 / Artisan Cave / Mt. Pyre / Safari Zone northeast')],
  66:[field('Routes 114, 121, 127, 134 / Artisan Cave / Underwater Route 124')],
  190:[source('Mt. Pyre · 1F', 'Gift from the old woman')],
  194:[wild('Fiery Path', 'Koffing'), source('Route 113 · Ninja Boy Lao', 'Use Thief / Covet on his Weezing', 'Repeatable', 'Fourth rematch onward.'), source('Trick House · puzzle 4', 'Reward from the Trick Master')],
  80:[source('Celadon Department Store · 4F', 'Buy for ₽1,000', 'Repeatable', undefined, 'FireRed / LeafGreen')],
  81:[source('Lilycove Department Store · 2F', 'Buy for ₽1,000', 'Repeatable'), source('Trainer Hill', 'Reward for finishing in 16–under 18 minutes', 'Repeatable')],
  86:[source('Poké Marts / Lilycove Department Store · 2F', 'Buy for ₽350', 'Repeatable'), field('Granite Cave / Routes 116, 117')],
  83:[source('Poké Marts / Lilycove Department Store · 2F', 'Buy for ₽500', 'Repeatable'), field('Mt. Pyre / Routes 113, 119, 123')],
  84:[source('Poké Marts / Lilycove Department Store · 2F / Battle Frontier Poké Mart', 'Buy for ₽700', 'Repeatable'), field('Lilycove City / Victory Road')],
  85:[source('Poké Marts / Lilycove Department Store · 2F', 'Buy for ₽550', 'Repeatable'), field('Abandoned Ship / Granite Cave / Magma Hideout / New Mauville')],
}

for (const id of [63,64,65,67,70,66]) {
  entries[id].unshift(
    source('Lilycove Department Store · 3F / Slateport Market · Energy Guru / Battle Frontier Poké Mart', 'Buy for ₽9,800', 'Repeatable', 'Energy Guru sale price: ₽4,900 when a sale is active.'),
    source('Battle Frontier · Exchange Service', 'Buy for 1 BP', 'Repeatable'),
    powder(1000),
  )
}
for (const [id, ash] of [[39,250],[40,500],[41,500],[42,1000],[43,1000]]) {
  entries[id] = [source('Route 113 · Glass Workshop', `Exchange ${ash.toLocaleString('en-US')} volcanic ash`, 'Repeatable', 'Collect ash with the Soot Sack.')]
}
for (const [id, rows] of Object.entries(entries)) {
  const bands = pickupBands.filter(band => band.items.some(item => item.item === Number(id)))
  if (bands.length) rows.unshift(source('Pickup', `Pickup Pokémon at Lv. ${bands[0].min}–${bands.at(-1).max}`, 'Repeatable'))
}

// Expand the inventory before individual display review. Exact map records are
// retained independently of the human-readable location list.
for (const id of Object.keys(entries)) {
  entries[id] = entries[id].filter(row => !row.method.startsWith('Wild ') && row.method !== 'Find as a field or hidden item' && !(Number(id) === 195 && row.method === 'Find the hidden items'))
}
for (const row of utilityItemWildSources) {
  entries[row.item].push({ ...wild(row.locations.join(' / '), row.pokemon, row.chance, row.game), maps:row.maps, pokemon:row.pokemon, heldItemChance:row.chance })
}
const shopPrices = {63:9800,64:9800,65:9800,66:9800,67:9800,70:9800,80:1000,81:1000,83:500,84:700,85:550,86:350}
for (const row of utilityItemMapSources) {
  if (row.kind === 'shop') {
    // Emerald shops already have concise labels and the Energy Guru sale note.
    if (row.game === 'Emerald' || Number(row.item) === 80) continue
    entries[row.item].push(source(row.locations.join(' / '), `Buy for ₽${shopPrices[row.item].toLocaleString('en-US')}`, 'Repeatable', row.game === 'Ruby / Sapphire' && row.locations.includes('Slateport City') ? 'Energy Guru sale price: ₽4,900 when a sale is active.' : undefined, row.game))
  } else {
    entries[row.item].push({ ...source(row.locations.join(' / '), row.kind === 'renewable' ? 'Find the recurring hidden items' : 'Find as a field or hidden item', row.kind === 'renewable' ? 'Repeatable' : 'Once per pickup', undefined, row.game), pickups:row.pickups })
  }
}

// Shared Hoenn gifts, lottery prizes, Trick House rewards and ash exchanges.
for (const id of [189,182,181,184,190,194,68,71,69,39,40,41,42,43]) {
  for (const row of entries[id].filter(row => row.game === 'Emerald' && (row.method.startsWith('Gift ') || row.method.startsWith('Lottery ') || row.method === 'Reward from the Trick Master' || row.method.startsWith('Use Thief / Covet') || row.location.includes('Glass Workshop')))) {
    entries[id].push({...row,game:'Ruby / Sapphire'})
  }
}
entries[81][0].location = 'Verdanturf Town · Poké Mart / Lilycove Department Store · 2F'

const add = (id,game,location,method,availability='Once per save',requirement) => entries[id].push(source(location,method,availability,requirement,game))
add(189,'FireRed / LeafGreen','Route 16 · gate 2F','Gift from Oak’s aide after catching 40 species')
add(189,'Colosseum','The Under','Find the item; use the L-Disk')
add(189,'XD','Gateon Port · Acri','Interview gift: answer Yes to all three','Once per save','One interview reward can be chosen.')
add(182,'FireRed / LeafGreen','Route 15 · gate 2F','Gift from Oak’s aide after catching 50 species')
add(182,'Colosseum','Agate Village','Find the item')
add(182,'XD','Phenac City','Gift from Mayor Trest after rescuing the city')
const machoBracePickup = entries[181].find(row => row.game === 'FireRed / LeafGreen')
Object.assign(machoBracePickup, { location:'Viridian Gym', method:'Use the Itemfinder while standing where Giovanni was', availability:'Once per save' })
add(181,'Colosseum','Pyrite Cave','Find the item')
add(181,'XD','Mt. Battle · Area 1','First-clear reward')
add(184,'FireRed / LeafGreen','Pokémon Tower · 7F','Use the Itemfinder while standing where Mr. Fuji was')
add(184,'XD','ONBS','Gift from the lost girl’s mother after reuniting them','Once per save','Missable: collect before the Cipher takeover.')
add(184,'Ruby / Sapphire','Historical Pokémon distribution','Held by Baby & Trade Week Azurill','Event distribution','Original 2004 event Pokémon required.')
add(195,'FireRed / LeafGreen','Route 10 · Pokémon Center','Gift from Oak’s aide after catching 20 species')
add(194,'FireRed / LeafGreen','Celadon City · Game Corner prize exchange','Buy for 800 Coins','Repeatable')
add(40,'FireRed / LeafGreen','Celadon City · Game Corner prize exchange','Buy for 1,600 Coins','Repeatable')
add(40,'XD','S.S. Libra','Find the item')

for (const id of [63,64,65,66,67,70]) {
  add(id,'FireRed / LeafGreen','Cerulean City · Berry Powder exchange','Exchange 1,000 Berry Powder','Repeatable','Berry Powder comes from multiplayer Berry Crush.')
  add(id,'Ruby / Sapphire','Battle Tower','Random vitamin prize for completing a set on a 7–35 win streak','Repeatable')
  add(id,'Colosseum','Agate Village · Poké Mart','Buy for ₽9,800','Repeatable')
  add(id,'XD','Phenac City · Poké Mart','Buy for ₽9,800','Repeatable')
}
add(69,'FireRed / LeafGreen','Cerulean City · Berry Powder exchange','Exchange 3,000 Berry Powder','Repeatable','Berry Powder comes from multiplayer Berry Crush.')
add(68,'FireRed / LeafGreen','Five Island · Resort Gorgeous','Possible reward for showing Selphy her requested Pokémon','Repeatable')
add(110,'FireRed / LeafGreen','Five Island · Resort Gorgeous','Possible reward for showing Selphy her requested Pokémon','Repeatable')
add(110,'FireRed / LeafGreen','Route 24 · Nugget Bridge','Gift before battling the Rocket Grunt','Once per save','Repeatable by losing to the Grunt in English and Japanese versions.')
add(110,'Emerald','Route 104','Use Thief / Covet on Rich Boy Winston’s or Lady Cindy’s Pokémon','Repeatable','Trainer rematches.')
add(110,'Ruby / Sapphire','Route 104','Use Thief / Covet on Rich Boy Winston’s or Lady Cindy’s Pokémon','Repeatable','Trainer rematches.')
for (const game of ['Emerald','Ruby / Sapphire']) {
  add(110,game,'Route 116','Use Thief / Covet on Lady Sarah’s or Rich Boy Dawson’s Pokémon','Once per trainer')
  add(110,game,'Sootopolis Gym','Use Thief / Covet on Lady Brianna’s Pokémon'+(game === 'Emerald' ? ' or Lady Daphne’s Pokémon' : ''),'Once per trainer')
  add(110,game,'S.S. Tidal','Use Thief / Covet on Rich Boy Garret’s or Lady '+(game === 'Emerald' ? 'Naomi' : 'Anette')+'’s Pokémon','Once per trainer')
}
add(110,'FireRed / LeafGreen','Five Island · Lost Cave','Use Thief / Covet on Lady Selphy’s Pokémon','Once per trainer')
add(110,'FireRed / LeafGreen','Five Island · Resort Gorgeous','Use Thief / Covet on Lady Gillian’s Flaaffy','Repeatable','Vs. Seeker rematches.')
add(110,'Colosseum','Realgam Tower','Held by Shadow Tyranitar')

// GameCube field finds and Battle CD first-clear rewards.
for (const [id,location] of [[63,'Shadow Pokémon Lab'],[64,'Pyrite Cave'],[65,'Pyrite Cave'],[66,'Pyrite Cave'],[70,'Pyrite Cave'],[68,'The Under / Snagem Hideout'],[69,'Shadow Pokémon Lab / Snagem Hideout']]) add(id,'Colosseum',location,'Find as a field item','Once per pickup')
for (const [id,location] of [[63,'ONBS / Cipher Key Lair'],[64,'Realgam Tower'],[65,'S.S. Libra'],[66,'Realgam Tower'],[68,'Kaminko’s House / Snagem Hideout / Cipher Key Lair / Citadark Isle'],[69,'Phenac Stadium / S.S. Libra / Snagem Hideout / Cipher Key Lair / Citadark Isle'],[71,'Citadark Isle']]) add(id,'XD',location,'Find as a field item','Once per pickup')
for (const [id,discs] of [[68,[22,40,41]],[69,[36,37]],[110,[33,34]]]) for (const disc of discs) add(id,'XD',`Realgam Tower · Battle CD ${disc}`,'First-clear reward')
add(71,'Colosseum','Japanese Colosseum Bonus Disc','Bonus-disc reward','Once per save','Japanese bonus disc required.')

// Pickup versions use different tables; level restrictions apply only in E/XD.
for (const id of [68,69,110,64]) {
  const chance = {68:10,69:4,110:10,64:5}[id]
  add(id,'Ruby / Sapphire / Colosseum','Pickup','Pickup Pokémon at any level','Repeatable',`${chance}% of successful Pickup rolls.`)
}
for (const id of [68,69,110]) add(id,'FireRed / LeafGreen','Pickup','Pickup Pokémon at any level','Repeatable','5% of successful Pickup rolls.')
for (const [id,rows] of Object.entries(entries)) {
  const pickup = rows.find(row=>row.game==='Emerald' && row.location==='Pickup')
  if (pickup && ![85,86].includes(Number(id))) rows.push({...pickup,game:'XD'})
}

export const utilityItemAcquisition = Object.fromEntries(Object.entries(entries).map(([id, rows]) => [id, {
  sources:['https://github.com/pret/pokeemerald', 'https://github.com/pret/pokeruby', 'https://github.com/pret/pokefirered', 'https://www.serebii.net/colosseum/items.shtml', 'https://www.serebii.net/xd/items.shtml'],
  entries:rows,
}]))
