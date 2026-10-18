export const itemCategories = ['Battle', 'Utility', 'Berries', 'Poké Balls', 'TMs/HMs', 'Misc.']
export const utilityGroups = {
  Training: [189,195,182,197,181,184,68],
  Valuables: [110,111,69,71,103,104],
  Vitamins: [63,64,65,67,70,66],
  Encounters: [190,194,80,81,86,83,84,85],
  Flutes: [39,40,41,42,43],
}
export const miscGroups = {
  'Evolution Stones': [93,94,95,96,97,98],
  'Evolution Items': [201,218],
  'Exchange Items': [46,47,48,49,50,51],
}
export const battleGroups = {
  'Type Boosters': [207,206,215,216,204,208,199,205,209,212,211,210,217,188,203,213,214,220],
  'Battle Items': [179,186,196,187,221,200,185,183,198,219,180],
  'Pokémon-Specific Items': [193,192,202,222,223,191,225,224],
}
export const berryGroups = {
  Recovery: [133,134,135,136,137,138,139,140,141,142],
  'Stat Boost': [168,169,170,171,172,173,174],
  EVs: [153,154,155,156,157,158],
}
export function itemBerryGroup(item) {
  return Object.keys(berryGroups).find(group => berryGroups[group].includes(Number(item.id)))
}
const utility = new Set(Object.values(utilityGroups).flat())
const misc = new Set(Object.values(miscGroups).flat())
export function itemBattleGroup(item) {
  return Object.keys(battleGroups).find(group => battleGroups[group].includes(Number(item.id)))
}
export function itemCategory(item) {
  if (item.machine || item.pocket === 'TM_HM') return 'TMs/HMs'
  if (item.pocket === 'POKE_BALLS') return 'Poké Balls'
  if (item.pocket === 'BERRIES') return itemBerryGroup(item) ? 'Berries' : null
  if (itemBattleGroup(item)) return 'Battle'
  if (utility.has(Number(item.id))) return 'Utility'
  if (misc.has(Number(item.id))) return 'Misc.'
  return null
}
export function itemDescription(item) {
  return item.description
}
