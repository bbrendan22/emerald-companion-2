import reference from '../data/reference.json' with {type: 'json'};
import profileReference from '../data/profileReference.json' with {type: 'json'};
import types from '../data/pokemonTypes.json' with {type: 'json'};
import overview from './data/overview.json' with {type: 'json'};

export const speciesByDex = new Map(Object.values(reference.species).map(species => [species.nationalDexId, species]));
export function genderSummary(ratio) {
  if (ratio === 255) return 'Genderless';
  if (ratio === 254) return 'Female only';
  if (ratio === 0) return 'Male only';
  const female = {31: 12.5, 63: 25, 127: 50, 191: 75, 223: 87.5}[ratio];
  return female == null ? 'Gender ratio unavailable' : `${100 - female}% male · ${female}% female`;
}
export function evolutionRequirement({method, param}) {
  const level = `Level ${param}`;
  switch (method) {
    case 'LEVEL': case 'LEVEL_NINJASK': return level;
    case 'ITEM': return `Use ${profileReference.itemNames[param]}`;
    case 'TRADE': return 'Trade';
    case 'TRADE_ITEM': return `Trade holding ${profileReference.itemNames[param]}`;
    case 'FRIENDSHIP': return 'Level up · Friendship 220+';
    case 'FRIENDSHIP_DAY': return 'Level up · Friendship 220+ · Noon–11:59 PM (game clock)';
    case 'FRIENDSHIP_NIGHT': return 'Level up · Friendship 220+ · Midnight–11:59 AM (game clock)';
    case 'LEVEL_ATK_GT_DEF': return `${level} · Attack > Defense`;
    case 'LEVEL_ATK_EQ_DEF': return `${level} · Attack = Defense`;
    case 'LEVEL_ATK_LT_DEF': return `${level} · Attack < Defense`;
    case 'LEVEL_SILCOON': return `${level} · Personality branch (upper 16 bits mod 10: 0–4)`;
    case 'LEVEL_CASCOON': return `${level} · Personality branch (upper 16 bits mod 10: 5–9)`;
    case 'LEVEL_SHEDINJA': return `Nincada evolves at Level ${param}+ · Empty party slot`;
    case 'BEAUTY': return `Level up · Beauty ${param}+`;
    default: return 'Evolution requirement unavailable';
  }
}
export function evolutionFamily(dex) {
  if (!speciesByDex.has(dex)) return [];
  const family = new Set([dex]);
  for (const id of family) for (const edge of overview.evolutions) {
    if (edge.from === id) family.add(edge.to);
    if (edge.to === id) family.add(edge.from);
  }
  const roots = [...family].filter(id => !overview.evolutions.some(edge => edge.to === id));
  const stages = [];
  function visit(id, depth, incoming = null) {
    (stages[depth] ??= []).push({id, name: speciesByDex.get(id).name, incoming, requirement: incoming ? evolutionRequirement(incoming) : null});
    for (const edge of overview.evolutions.filter(edge => edge.from === id).sort((a, b) => a.to - b.to)) visit(edge.to, depth + 1, edge);
  }
  roots.sort((a, b) => a - b).forEach(id => visit(id, 0));
  return stages;
}
export function speciesOverview(dex) {
  const species = speciesByDex.get(dex);
  if (!species) return null;
  return {...species, dex, generation: dex <= 151 ? 1 : dex <= 251 ? 2 : 3, types: types[dex],
    gender: genderSummary(species.genderRatio), entry: overview.emeraldEntries[dex],
    abilities: species.abilities.filter(id => id !== 0).map(id => ({id, name: reference.abilityNames[id], description: overview.abilityDescriptions[id]})),
    family: evolutionFamily(dex)};
}
