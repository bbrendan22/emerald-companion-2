const key = 'emerald-companion-2.roles.v1';
export const roles = ['Collection', 'Frontier', 'Utility'];
// PID and original Trainer ID survive evolution, trade, nickname and location changes.
// Exact clones receive occurrence suffixes; indistinguishable clones share no unique game ID.
export function identifyPokemon(records) {
  const counts = new Map();
  return records.map(pokemon => {
    const base = `${pokemon.ot.id}:${pokemon.personality}`;
    const occurrence = counts.get(base) ?? 0;
    counts.set(base, occurrence + 1);
    return {...pokemon, identity: `${base}:${occurrence}`};
  });
}
export function loadRoles(storage) {
  const value = JSON.parse(storage.getItem(key) ?? '{}');
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, role]) => roles.includes(role)));
}
export function storeRole(storage, current, identity, role) {
  if (!roles.includes(role)) throw new Error('Unknown Pokémon role');
  const next = {...current, [identity]: role};
  storage.setItem(key, JSON.stringify(next));
  return next;
}
export function filterPokemon(records, assigned, query = '', filter = 'All') {
  const search = query.trim().toLocaleLowerCase();
  return records.filter(p => (!search || [p.speciesName, p.nickname].some(name => name.toLocaleLowerCase().includes(search)))
    && (filter === 'All' || (filter === 'Shinies' ? p.shiny : (assigned[p.identity] ?? 'Collection') === filter)))
    .sort((a, b) => a.nationalDexId - b.nationalDexId);
}
export function locationName(source) {
  return source.kind === 'box' ? `Box ${source.box + 1} · Slot ${source.slot + 1}`
    : `${source.kind === 'party' ? 'Party' : 'Day Care'} · Slot ${source.slot + 1}`;
}
