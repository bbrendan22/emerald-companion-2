import { battleItemAcquisition } from './battleItemAcquisition.js'
import { utilityItemAcquisition } from './utilityItemAcquisition.js'
import { berryItemAcquisition } from './berryItemAcquisition.js'
import { miscItemAcquisition } from './miscItemAcquisition.js'
import { machineItemAcquisition } from './machineItemAcquisition.js'
import { pokeBallAcquisition } from './pokeBallAcquisition.js'

// Acquisition preview. Descriptions remain the original Emerald item text.
// Acquisition records are separate so location views can reuse them later.
const bulbapedia = name => `https://bulbapedia.bulbagarden.net/wiki/${name}`
export const itemAcquisition = {
  200: {
    sources: [bulbapedia('Leftovers')],
    entries: [
      { game:'Emerald', location:'Battle Frontier', method:'Buy for 48 BP', availability:'Repeatable' },
      { game:'Emerald', location:'Pickup', method:'Pickup Pokémon at Lv. 81–100', availability:'Repeatable', requirement:'1% of successful Pickup rolls.' },
      { game:'Emerald', location:'S.S. Tidal · basement', method:'Find in a trash can', availability:'Once per save' },
    ],
  },
  197: {
    sources:[bulbapedia('Lucky_Egg'),bulbapedia('Agate_Village')],
    entries:[
      { game:'FireRed / LeafGreen', location:'Safari Zone', method:'Catch a wild Chansey holding it', availability:'Repeatable', requirement:'5% held-item chance per Chansey.' },
      { game:'XD', location:'Agate Village', method:'Gift from Beluh · Pokémon Translator quest', availability:'Once per save' },
    ],
  },
  64: {
    sources:[bulbapedia('Protein')],
    entries:[
      { game:'Emerald', location:'Lilycove Department Store · 3F / Slateport Market · Energy Guru / Battle Frontier Poké Mart', method:'Buy for ₽9,800', availability:'Repeatable', requirement:'Energy Guru sale price: ₽4,900 when a sale is active.' },
      { game:'Emerald', location:'Battle Frontier · Exchange Service', method:'Buy for 1 BP', availability:'Repeatable' },
      { game:'Emerald', location:'Pickup', method:'Pickup Pokémon at Lv. 31–100', availability:'Repeatable' },
      { game:'Emerald', location:'Slateport City · Berry Powder exchange', method:'Exchange 1,000 Berry Powder', availability:'Repeatable', requirement:'Berry Powder comes from multiplayer Berry Crush.' },
      { game:'Emerald', location:'Routes 106, 111, 114, 128, 132 / Artisan Cave', method:'Find as a field item', availability:'Once per pickup' },
      { game:'Emerald', location:'Lilycove City · Favor Lady', method:'Possible reward for completing her request', availability:'Repeatable', requirement:'Depends on which Lilycove Lady is present; requests refresh daily.' },
    ],
  },
  168: {
    sources:[bulbapedia('Liechi_Berry')],
    entries:[
      { game:'Emerald', location:'Mirage Island · Route 130', method:'Harvest the berry tree', availability:'Once per save' },
    ],
  },
  ...battleItemAcquisition,
  ...utilityItemAcquisition,
  ...berryItemAcquisition,
  ...miscItemAcquisition,
  ...pokeBallAcquisition,
  ...machineItemAcquisition,
}

// Counts acquisition methods, with equivalent shops and wild species combined.
export function itemAcquisitionEntries(itemId) {
  const entries = (itemAcquisition[itemId]?.entries ?? []).filter(entry =>
    entry.availability !== 'Event distribution' && entry.availability !== 'Card reward' &&
    !/Historical Pokémon distribution|e-Reader/i.test(entry.location) &&
    (!miscItemAcquisition[itemId] || !/Colosseum|XD|event|e-Reader/i.test([entry.game, entry.location, entry.method, entry.requirement].join(' ')))
  )
  // Keep the full inventory; curate displayed sources one item at a time.
  const visibleEntries = Number(itemId) >= 133 && Number(itemId) <= 142
    ? entries.filter(entry => entry.game === 'Emerald' && (entry.availability === 'Daily' || entry.method === 'Harvest the existing berry trees' || (Number(itemId) === 136 && entry.pokemon === 'Numel') || (Number(itemId) === 134 && entry.location === 'Route 104 · south') || (Number(itemId) === 142 && entry.location.startsWith('Ever Grande City ·'))))
    : [298, 302, 303, 304, 305, 308, 309, 313, 315, 320, 321, 326, 331, 339, 340, 341, 342, 343, 344, 345, 346].includes(Number(itemId))
    ? entries.filter(entry => entry.game === 'Emerald')
    : [301, 312, 317, 323].includes(Number(itemId))
      ? entries.filter(entry => ['Emerald', 'FireRed / LeafGreen'].includes(entry.game))
    : Number(itemId) >= 289 && Number(itemId) <= 338
      ? entries.filter(entry => !/Colosseum|XD/.test(entry.game))
    : [179, 180, 183, 185, 186, 187, 198, 199, 202, 203, 204, 211, 213, 214, 219, 223, 195, 68, 111, 69, 71, 63, 64, 65, 67, 70, 66, 194, 80, 81, 83, 84, 85, 39, 40, 41, 42, 43, 93, 201, 46, 47, 48, 49, 50, 51, 168, 153, 154, 155, 156, 157, 158].includes(Number(itemId))
    ? entries.filter(entry => entry.game === 'Emerald')
    : [205, 206, 208, 209, 212, 215, 217, 189, 181, 184].includes(Number(itemId))
    ? entries.filter(entry => ['Emerald', 'Ruby / Sapphire', 'FireRed / LeafGreen'].includes(entry.game))
    : [222, 224, 225, 197, 104].includes(Number(itemId))
      ? entries.filter(entry => entry.game === 'FireRed / LeafGreen')
    : Number(itemId) === 196
      ? entries.filter(entry => entry.game === 'Emerald' || (entry.game === 'FireRed / LeafGreen' && entry.pokemon === 'Machoke'))
    : Number(itemId) === 210
      ? entries.filter(entry => entry.game === 'Emerald' || (entry.game === 'FireRed / LeafGreen' && entry.pokemon === 'Fearow'))
    : [188, 200, 216, 103, 95, 96, 97, 98].includes(Number(itemId))
      ? entries.filter(entry => ['Emerald', 'FireRed / LeafGreen'].includes(entry.game))
    : Number(itemId) === 207
    ? entries.filter(entry => entry.game === 'Emerald' || (entry.game === 'FireRed / LeafGreen' && entry.location === 'Route 15'))
    : Number(itemId) === 1
      ? entries.filter(entry => ['Emerald', 'Ruby', 'Sapphire', 'Ruby / Sapphire', 'FireRed / LeafGreen'].includes(entry.game))
    : Number(itemId) >= 2 && Number(itemId) <= 12
      ? entries.filter(entry => entry.game === 'Emerald' && (/^(Buy for|Pay ₽|Receive 1 free)/.test(entry.method) || /Contest Hall|Quiz Lady|Favor Lady|lottery/i.test(entry.location)))
    : Number(itemId) === 110
      ? entries.filter(entry => entry.game === 'Emerald' && (entry.location === 'Pickup' || entry.location === 'Lilycove City · Favor Lady' || entry.pickups))
    : Number(itemId) === 182
      ? entries.filter(entry => entry.game === 'Emerald' || entry.game === 'FireRed / LeafGreen' || (entry.game === 'Ruby / Sapphire' && entry.availability === 'Once per save'))
    : entries
  const gameOrder = ['Emerald', 'Ruby', 'Sapphire', 'Ruby / Sapphire', 'FireRed', 'LeafGreen', 'FireRed / LeafGreen', 'Colosseum', 'XD', 'Colosseum / XD']
  const gameRank = game => {
    const index = gameOrder.indexOf(game)
    return index < 0 ? gameOrder.length : index
  }
  const labelOrder = ['Repeatable', 'Repeatable before capture', 'Daily', 'Weekly', 'Once per save', 'Once per request', 'Once per quiz', 'Per visit']
  const labelRank = availability => {
    const label = availability === 'Once per pickup' ? 'Once per save' : availability
    const index = labelOrder.indexOf(label)
    return index < 0 ? labelOrder.length : index
  }
  return [...visibleEntries].sort((a, b) => gameRank(a.game) - gameRank(b.game) || labelRank(a.availability) - labelRank(b.availability))
}
