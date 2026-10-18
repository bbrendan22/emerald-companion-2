// Migrated from Emerald Companion 1.0; calculation behavior retained.
const types = ['Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark']
const order = ['hp', 'attack', 'defense', 'speed', 'spAttack', 'spDefense']
export function calculateHiddenPower(ivs) {
  const values = order.map(key => ivs[key])
  if (values.some(value => value === '' || value == null || !Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > 31)) return null
  const typeBits = values.reduce((sum, value, index) => sum + (Number(value) % 2) * 2 ** index, 0)
  const powerBits = values.reduce((sum, value, index) => sum + (Math.floor(Number(value) / 2) % 2) * 2 ** index, 0)
  return { type: types[Math.floor(typeBits * 15 / 63)], power: Math.floor(powerBits * 40 / 63) + 30 }
}
