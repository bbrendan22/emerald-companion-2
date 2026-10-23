const key = 'emerald-companion-2.battle-teams.v1';
// National Pokédex IDs are stable species identifiers on collection battle records.
export const playerSpeciesId = mon => Number.isInteger(mon?.dex) && mon.dex > 0 ? mon.dex : null;
export function teamHasSpecies(ids, pool, mon) {
  const species = playerSpeciesId(mon);
  return species === null || ids.some(id => id && playerSpeciesId(pool.find(member => member.identity === id)) === species);
}
export function createTeamId(cryptoApi = globalThis.crypto) {
  if (typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();
  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}
export function validateTeam(team, pool, size = team.ids?.length) {
  if (!team.name?.trim()) return 'Enter a team name.';
  if (![3,4].includes(size) || team.ids?.length !== size || new Set(team.ids).size !== size) return `Choose ${size === 4 ? 'four' : 'three'} distinct Pokémon.`;
  if (Array.from(team.ids).some(id => typeof id !== 'string' || !pool.some(mon => mon.identity === id))) return 'A selected Pokémon is unavailable or no longer assigned Frontier.';
  const species = team.ids.map(id => playerSpeciesId(pool.find(mon => mon.identity === id)));
  if (species.includes(null)) return 'A selected Pokémon species is unavailable.';
  if (new Set(species).size !== species.length) return 'Choose Pokémon of different species.';
  return '';
}
export function loadBattleTeams(storage) {
  const teams = JSON.parse(storage.getItem(key) ?? '[]');
  if (!Array.isArray(teams) || teams.some(t => !t || typeof t.id !== 'string' || !t.id || typeof t.name !== 'string' || !t.name.trim() || !Array.isArray(t.ids) || ![3,4].includes(t.ids.length) || t.ids.some(id => typeof id !== 'string') || new Set(t.ids).size !== t.ids.length) || new Set(teams.map(t => t.id)).size !== teams.length) throw new Error('Saved teams could not be loaded.');
  return teams.map(({id,name,ids}) => ({id,name,ids:[...ids]}));
}
export function storeBattleTeams(storage, teams) {
  storage.setItem(key, JSON.stringify(teams.map(({id,name,ids}) => ({id,name:name.trim(),ids:[...ids]}))));
}
