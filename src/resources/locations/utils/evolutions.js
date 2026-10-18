import {evolutions} from '../data/evolutionResources.js';
export function previousEvolutions(id) {
  return Object.entries(evolutions).flatMap(([from, entries]) => entries.filter(entry => String(entry.target) === String(id)).map(entry => ({ ...entry, from })))
}

export function evolutionFamily(id) {
  const family = new Set([String(id)])
  for (const species of family) {
    for (const entry of evolutions[species] ?? []) family.add(String(entry.target))
    for (const entry of previousEvolutions(species)) family.add(entry.from)
  }
  return [...family]
}
