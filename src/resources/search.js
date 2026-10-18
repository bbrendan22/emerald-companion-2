import reference from '../data/reference.json' with {type: 'json'};

// Keep the canonical data in one place; only the search projection is indexed here.
export const resourceIndex = [
  {id: 'pokemon', title: 'Pokémon', label: 'Pokémon', entries: Object.values(reference.species)
    .map(({nationalDexId, name}) => ({id: nationalDexId, name})).sort((a, b) => a.id - b.id)},
  {id: 'moves', title: 'Moves', label: 'Move', entries: Object.entries(reference.moves)
    .filter(([id]) => Number(id) > 0).map(([id, {name}]) => ({id: Number(id), name}))},
  {id: 'abilities', title: 'Abilities', label: 'Ability', entries: Object.entries(reference.abilityNames)
    .filter(([id]) => Number(id) > 0).map(([id, name]) => ({id: Number(id), name}))},
].map(group => ({...group, entries: group.entries.map(entry => ({...entry, searchName: entry.name.toLowerCase()}))}));

export function catalogEntries(category, value = '') {
  const group = resourceIndex.find(group => group.id === category);
  if (!group) return [];
  const query = value.trim().toLowerCase();
  const dex = /^#?\d+$/.test(query) ? Number(query.replace('#', '')) : null;
  return group.entries.filter(entry => entry.searchName.includes(query)
    || (category === 'pokemon' && entry.id === dex));
}

export function searchResources(value) {
  if (!value.trim()) return [];
  return resourceIndex.map(({entries, ...group}) => {
    const matches = catalogEntries(group.id, value);
    return {...group, total: matches.length, results: matches.slice(0, 5)};
  });
}
