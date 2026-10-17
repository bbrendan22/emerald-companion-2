import reference from '../data/reference.json' with {type: 'json'};
const keys = ['hp','attack','defense','spAttack','spDefense','speed'];

export function deriveBaseStatRanges(species) {
  const records = Object.values(species);
  const ids = new Set(records.map(p => p.nationalDexId));
  if (records.length !== 386 || ids.size !== 386 || Array.from({length:386}, (_,i) => i+1).some(id => !ids.has(id))) {
    throw new Error('Stat bar scaling requires complete base stats for all 386 Gen 1–3 species.');
  }
  return Object.fromEntries(keys.map(key => {
    const values = records.map(p => p.baseStats?.[key]);
    if (values.some(n => !Number.isInteger(n) || n < 1 || n > 255)) throw new Error(`Incomplete base-stat data for ${key}.`);
    const min = Math.min(...values), max = Math.max(...values);
    if (min === max) throw new Error(`No base-stat range for ${key}.`);
    return [key, {min, max}];
  }));
}
// One record per National Dex species. The validated reference uses Emerald's
// Speed Forme for Deoxys, matching the parser's existing stat calculations.
export const baseStatRanges = deriveBaseStatRanges(reference.species);
export function baseStatPercent(key, value) {
  const range = baseStatRanges[key];
  if (!range || !Number.isFinite(value)) return null;
  return Math.min(100, Math.max(5, 5 + 95 * (value - range.min) / (range.max - range.min)));
}
export function speciesBarPercents(internalSpeciesId) {
  const base = reference.species[internalSpeciesId]?.baseStats;
  if (!base) return null;
  return Object.fromEntries(keys.map(key => [key, baseStatPercent(key, base[key])]));
}
