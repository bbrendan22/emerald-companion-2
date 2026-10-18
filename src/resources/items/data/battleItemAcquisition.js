import { frontierItemPrices } from './itemShopData.js'
import { pickupBands } from './pickupResources.js'
import { wildItemMethod } from './wildItemAcquisition.js'
import { battleItemWildSources } from './battleItemWildSources.js'

// Emerald map scripts, species held items and trainer parties:
// https://github.com/pret/pokeemerald/tree/master/data/maps
// https://github.com/pret/pokeemerald/blob/master/src/data/pokemon/species_info.h
// https://github.com/pret/pokeemerald/blob/master/src/data/trainer_parties.h
// External-only sources are documented on each item's Bulbapedia page.
const source = (location, method, availability = 'Once per save', requirement, game = 'Emerald') => ({ game, location, method, availability, ...(requirement ? { requirement } : {}) })
const wild = (location, pokemon, game = 'Emerald') => source(location, wildItemMethod(location, pokemon), 'Repeatable', '5% held-item chance.', game)
const rematch = (location, trainer, pokemon) => source(location, `Use Thief / Covet on ${trainer}’s ${pokemon}`, 'Repeatable', 'Fourth rematch onward.')

const entries = {
  207:[rematch('Route 115', 'Black Belt Nob', 'Machamp')],
  206:[source('Route 116 · east of Rusturf Tunnel', 'Hidden item near the man looking for his glasses')],
  215:[source('Lavaridge Town · Herb Shop', 'Gift from the old man')],
  216:[rematch('Meteor Falls · back room', 'Dragon Tamer Nicolas', 'Shelgon')],
  204:[wild('Granite Cave / Victory Road', 'Aron / Lairon'), source('Trick House · puzzle 3', 'Reward from the Trick Master')],
  208:[source('Trick House · puzzle 6', 'Reward from the Trick Master')],
  199:[wild('New Mauville', 'Magnemite / Magneton')],
  205:[source('Petalburg Woods · northeast', 'Gift from the girl')],
  209:[source('Route 119 · Weather Institute', 'Held by the gift Castform')],
  212:[source('Shoal Cave · ice room', 'Find on the raised platform')],
  211:[wild('Route 111 · desert', 'Cacnea')],
  210:[wild('Safari Zone', 'Doduo / Dodrio')],
  217:[source('Dewford Town · house north of the dock', 'Gift from the man')],
  188:[rematch('Route 120', 'Bug Maniac Jeffrey', 'Masquerain')],
  203:[wild('Route 111 · desert / Mirage Tower', 'Trapinch'), source('Route 109 · beach', 'Gift from the girl')],
  213:[wild('Mt. Pyre / Routes 121, 123 / Sky Pillar', 'Shuppet / Duskull / Banette')],
  214:[wild('Route 116 / Granite Cave', 'Abra')],
  220:[source('Mt. Pyre · 4F', 'Find in the southwest; drop down from 5F')],
  179:[],
  186:[],
  196:[source('Shoal Cave · low-tide lower room', 'Gift from the Black Belt')],
  187:[wild('Victory Road', 'Hariyama'), source('Mossdeep City · outside Steven’s house', 'Gift from the boy')],
  221:[source('Mt. Pyre · 5F', 'Find in the south; drop down from 6F')],
  200:[source('S.S. Tidal · basement', 'Hidden in the northwest trash can')],
  185:[source('Fortree City · northeast house', 'Gift from the man after the Wingull delivery')],
  183:[wild('Route 111 · desert / Mirage Tower', 'Sandshrew'), source('Rustboro City · Trainers’ School', 'Gift from the teacher')],
  198:[],
  219:[source('Shoal Cave · entrance', 'Exchange 4 Shoal Salts and 4 Shoal Shells with the old man', 'Repeatable', 'Requires a working game clock for tide changes and ingredient replenishment.')],
  180:[source('Route 104 · north', 'Gift from the girl outside the flower shop'), source('Lavaridge Gym · Flannery', 'Use Thief / Covet on Torkoal; also Magcargo / Camerupt in rematches', 'Repeatable')],
  193:[source('Slateport City · harbor', 'Exchange the Scanner with Captain Stern', 'Once per save', 'Choose Deep Sea Scale or Deep Sea Tooth.')],
  192:[source('Slateport City · harbor', 'Exchange the Scanner with Captain Stern', 'Once per save', 'Choose Deep Sea Tooth or Deep Sea Scale.')],
  202:[wild('Safari Zone', 'Pikachu')],
  222:[source('Seven Island · Sevault Canyon house', 'Pick up the item inside the house', 'Once per save', undefined, 'FireRed / LeafGreen'), source('Citadark Isle', 'Held by Shadow Chansey', 'Once per save', undefined, 'XD')],
  223:[wild('Desert Underpass', 'Ditto')],
  191:[source('Southern Island', 'Use Thief / Covet on Latias / Latios, then flee', 'Repeatable before capture', 'Eon Ticket event.')],
  225:[source('Vermilion City', 'Held by the Farfetch’d traded for your Spearow', 'Once per save', undefined, 'FireRed / LeafGreen'), source('Citadark Isle', 'Held by Shadow Farfetch’d', 'Once per save', undefined, 'XD')],
  224:[source('Pokémon Tower / Sevault Canyon', 'Wild Cubone / Marowak · catch or use Thief / Covet', 'Repeatable', '5% held-item chance.', 'FireRed / LeafGreen'), source('Citadark Isle', 'Held by Shadow Marowak', 'Once per save', undefined, 'XD')],
}

// Replace the earlier selected wild sources with the complete reachable-map
// inventory. Species stay separate when their locations or probabilities differ.
for (const id of Object.keys(entries)) entries[id] = entries[id].filter(row => !row.method.startsWith('Wild '))

// Shared finite Hoenn sources, verified against the Ruby/Sapphire scripts.
for (const id of [206,215,204,208,205,209,212,217,203,220,196,187,221,200,185,183,219,193,192]) {
  entries[id].push(...entries[id].filter(row => row.game === 'Emerald').map(row => ({ ...row, game:'Ruby / Sapphire' })))
}
entries[180].push({ ...entries[180][0], game:'Ruby / Sapphire' })
entries[191].push(source('Southern Island', 'Held by the event Latias / Latios', 'Once per save', 'Eon Ticket event.', 'Ruby / Sapphire'))
entries[207].push({ ...entries[207][0], game:'Ruby / Sapphire' })
entries[216].push({ ...entries[216][0], game:'Ruby / Sapphire' })
entries[188].push(source('Route 120', 'Use Thief / Covet on Bug Maniac Brandon’s Masquerain', 'Repeatable', 'Fourth rematch onward.', 'Ruby / Sapphire'))

for (const row of battleItemWildSources) {
  const location = row.locations.join(' / ')
  entries[row.item].push({ ...source(location, wildItemMethod(location, row.pokemon), 'Repeatable', `${row.chance}% held-item chance.`, row.game), maps:row.maps, pokemon:row.pokemon, heldItemChance:row.chance })
}

// Kanto/Sevii gifts, field finds, prizes and trainer-held sources.
for (const [id, location] of [[206,'Rocket Hideout · B3F'],[212,'Four Island · Icefall Cave B1F'],[217,'Five Island · Lost Cave room 10'],[221,'Five Island · Lost Cave room 11'],[220,'Five Island · Lost Cave room 12'],[183,'Safari Zone · north']]) {
  entries[id].push(source(location, 'Find the field item', 'Once per save', undefined, 'FireRed / LeafGreen'))
}
for (const id of [215,205,209]) entries[id].push(source('Celadon City · Game Corner prize exchange', 'Buy for 1,000 Coins', 'Repeatable', undefined, 'FireRed / LeafGreen'))
entries[200].push(source('Routes 12, 16 · Snorlax spots', 'Use the Itemfinder while standing where each Snorlax was', 'Once per save', undefined, 'FireRed / LeafGreen'))
entries[207].push(
  source('Saffron City · Fighting Dojo', 'Use Thief / Covet on Black Belts Hideki, Hitoshi, Mike, Aaron or Koichi’s Pokémon', 'Once per trainer', undefined, 'FireRed / LeafGreen'),
  source('Viridian Gym', 'Use Thief / Covet on Black Belts Kiyo, Atsushi or Takashi’s Pokémon', 'Once per trainer', undefined, 'FireRed / LeafGreen'),
  source('Victory Road', 'Use Thief / Covet on Black Belt Daisuke’s Pokémon', 'Once per trainer', undefined, 'FireRed / LeafGreen'),
  source('Route 15', 'Use Thief / Covet on Crush Kin Ron & Mya’s Pokémon', 'Repeatable', 'Vs. Seeker rematches.', 'FireRed / LeafGreen'),
  source('Seven Island · Sevault Canyon', 'Use Thief / Covet on Crush Girl Cyndy’s Pokémon', 'Repeatable', 'Vs. Seeker rematches.', 'FireRed / LeafGreen'),
  source('One Island · Kindle Road', 'Use Thief / Covet on Crush Girls Tanya / Sharon, Crush Kin Mik & Kia, or Black Belts Hugh / Shea’s Pokémon', 'Repeatable', 'First rematch onward.', 'FireRed / LeafGreen'),
)
entries[199].push(
  source('Five Island · Memorial Pillar', 'Find the field item', 'Once per save', undefined, 'FireRed / LeafGreen'),
  source('Trainer Tower', 'First-clear prize for Knockout Mode', 'Once per save', undefined, 'FireRed / LeafGreen'),
)
entries[187].push(
  source('Seven Island · Sevault Canyon', 'Find the field item', 'Once per save', undefined, 'FireRed / LeafGreen'),
  source('Trainer Tower', 'First-clear prize for Mixed Mode', 'Once per save', undefined, 'FireRed / LeafGreen'),
)

// Each Shadow Pokémon can supply one held item. Locations name the initial
// snag opportunity; missed Shadow Pokémon may return in later encounters.
const shadows = {
  Colosseum:[[207,'Agate Village · Relic Cave','Hitmontop'],[215,'Phenac City','Quilava'],[216,'Shadow Pokémon Lab','Vibrava'],[204,'Pyrite Cave','Sudowoodo'],[199,'Realgam Tower','Metagross'],[205,'Phenac City','Bayleef'],[209,'Phenac City','Croconaw'],[212,'Realgam Tower','Delibird'],[211,'Pyrite Cave · entrance','Qwilfish'],[210,'Realgam Tower','Skarmory'],[188,'Shadow Pokémon Lab','Ariados'],[203,'The Under','Piloswine'],[213,'Pyrite Town','Misdreavus'],[214,'Pyrite Cave','Meditite']],
  XD:[[207,'Citadark Isle','Hitmonlee'],[206,'Cipher Lab','Carvanha'],[215,'Cipher Lab','Numel'],[216,'Citadark Isle','Altaria'],[204,'Phenac City · stadium','Lunatone'],[208,'Cave Poké Spot','Voltorb'],[199,'Cipher Key Lair','Magneton'],[205,'Cipher Key Lair','Tangela'],[209,'Phenac City · stadium','Seel'],[212,'Phenac City · stadium','Swinub'],[211,'Cipher Key Lair','Beedrill'],[210,'Phenac City · stadium','Spearow'],[217,'Cipher Key Lair','Zangoose'],[188,'Cipher Key Lair','Venomoth'],[203,'Citadark Isle','Dugtrio'],[213,'Citadark Isle','Banette'],[214,'ONBS','Ralts'],[200,'Citadark Isle','Snorlax']],
}
for (const [game, rows] of Object.entries(shadows)) {
  for (const [id, location, pokemon] of rows) entries[id].push(source(location, `Held by Shadow ${pokemon}`, 'Once per save', id === 211 && game === 'Colosseum' ? 'First battle only.' : undefined, game))
}
entries[206].push(source('The Under · Subway', 'Find the item', 'Once per save', undefined, 'Colosseum'))
entries[217].push(source('Agate Village · western cave', 'Find the item', 'Once per save', undefined, 'Colosseum'))
entries[183].push(source('Agate Village · south of Relic Cave', 'Find the item', 'Once per save', undefined, 'Colosseum'))
entries[180].push(source('Phenac City · Pre Gym', 'Reward for defeating Justy’s four junior Trainers', 'Once per save', undefined, 'Colosseum'))
entries[196].push(source('Pyrite Town · Super Grand Hotel', 'Find the item', 'Once per save', undefined, 'XD'))
entries[200].push(source('S.S. Libra', 'Find the item', 'Once per save', undefined, 'XD'))
for (const [id, answers] of [[180,'exactly one Yes'],[185,'exactly two Yes'],[183,'No to all three']]) entries[id].push(source('Gateon Port · Acri', `Interview gift: answer ${answers}`, 'Once per save', 'One interview reward can be chosen.', 'XD'))
entries[180].push(source('Citadark Isle · 2F', 'Find the chest containing 2 White Herbs', 'Once per save', undefined, 'XD'), source('Realgam Tower · Battle CD 25', 'First-clear reward', 'Once per save', undefined, 'XD'))
entries[185].push(source('Realgam Tower · Battle CD 23', 'First-clear reward', 'Once per save', undefined, 'XD'))

for (const id of [179,180,183,185,186,187,196,198,200]) entries[id].push(source('Battle Tower', 'Random held-item prize for completing a set on a 35+ win streak', 'Repeatable', undefined, 'Ruby / Sapphire'))
for (const id of [179,180,183,185,186,187,196,198,200]) entries[id].push(source('Mt. Battle · coupon exchange', `Buy for ${[180,185].includes(id) ? '8,000' : '10,000'} Poké Coupons`, 'Repeatable', undefined, 'Colosseum'))
for (const id of [179,180,183,185,186,187,196,198,219]) entries[id].push(source('Mt. Battle · coupon exchange', `Buy for ${[180,185].includes(id) ? '6,000' : '8,000'} Poké Coupons`, 'Repeatable', undefined, 'XD'))
entries[187].push(source('Pickup', 'Pickup Pokémon at any level', 'Repeatable', '1% of successful Pickup rolls.', 'Ruby / Sapphire / Colosseum'))

// Special hardware and historical distributions remain explicit so they can
// be reviewed separately from ordinary in-game acquisition methods.
for (const id of [179,180,185,186,187,198,199]) entries[id].push(source('Trainer Tower · e-Reader challenge', 'Clear a scanned card challenge awarding this item within the target time', 'Card reward', 'Japanese FireRed / LeafGreen only; requires the matching Battle e cards.', 'FireRed / LeafGreen'))
entries[202].push(source('Japanese Colosseum Bonus Disc', 'Held by the bonus-disc Pikachu', 'Once per save', 'Japanese bonus disc required.', 'Colosseum'))
entries[202].push(source('Historical Pokémon distributions', 'Held by ANA, Yokohama, GW, Sapporo, Party of the Decade or Top 10 event Pikachu', 'Event distribution', 'Original event Pokémon required.', 'Ruby / Sapphire / Emerald / FireRed / LeafGreen'))
entries[179].push(source('Historical Pokémon distribution', 'Held by Ancient & Aliens Week Sableye', 'Event distribution', 'Original 2004 event Pokémon required.', 'Ruby / Sapphire'))
entries[186].push(source('Historical Pokémon distribution', 'Held by Campaign 6 Machamp', 'Event distribution', 'Original 2004 event Pokémon required.', 'Ruby / Sapphire'))
entries[183].push(source('Historical Pokémon distribution', 'Held by Slither & Swim Week Zangoose', 'Event distribution', 'Original 2004 event Pokémon required.', 'Ruby / Sapphire'))

const referencePages = {179:'Bright_Powder',180:'White_Herb',183:'Quick_Claw',185:'Mental_Herb',186:'Choice_Band',187:'King%27s_Rock',188:'Silver_Powder',191:'Soul_Dew',192:'Deep_Sea_Tooth',193:'Deep_Sea_Scale',196:'Focus_Band',198:'Scope_Lens',199:'Metal_Coat',200:'Leftovers',202:'Light_Ball',203:'Soft_Sand',204:'Hard_Stone',205:'Miracle_Seed',206:'Black_Glasses',207:'Black_Belt_(item)',208:'Magnet',209:'Mystic_Water',210:'Sharp_Beak',211:'Poison_Barb',212:'Never-Melt_Ice',213:'Spell_Tag',214:'Twisted_Spoon',215:'Charcoal',216:'Dragon_Fang',217:'Silk_Scarf',219:'Shell_Bell',220:'Sea_Incense',221:'Lax_Incense',222:'Lucky_Punch',223:'Metal_Powder',224:'Thick_Club',225:'Stick'}

for (const [id, rows] of Object.entries(entries)) {
  if (frontierItemPrices[id]) rows.unshift(source('Battle Frontier · Exchange Service', `Buy for ${frontierItemPrices[id]} BP`, 'Repeatable'))
  const bands = pickupBands.filter(band => band.items.some(item => item.item === Number(id)))
  if (bands.length) rows.push(source('Pickup', `Pickup Pokémon at Lv. ${bands[0].min}–${bands.at(-1).max}`, 'Repeatable', '1% of successful Pickup rolls.'))
  if (bands.length) rows.push(source('Pickup', `Pickup Pokémon at Lv. ${bands[0].min}–${bands.at(-1).max}`, 'Repeatable', '1% of successful Pickup rolls.', 'XD'))
}

export const battleItemAcquisition = Object.fromEntries(Object.entries(entries).map(([id, rows]) => [id, {
  sources:['https://github.com/pret/pokeemerald', 'https://github.com/pret/pokeruby', 'https://github.com/pret/pokefirered', `https://bulbapedia.bulbagarden.net/wiki/${referencePages[id]}`, 'https://www.serebii.net/colosseum/items.shtml', 'https://www.serebii.net/xd/items.shtml', 'https://www.serebii.net/xd/pokecoupon.shtml', 'https://bulbapedia.bulbagarden.net/wiki/Trainer_Tower_(game)'],
  entries:rows.sort((a,b) => {
    const order = ['Emerald','Ruby / Sapphire','Ruby','Sapphire','FireRed / LeafGreen','FireRed','LeafGreen','Colosseum','XD']
    const rank = game => order.includes(game) ? order.indexOf(game) : order.length
    return rank(a.game)-rank(b.game)
  }),
}]))
