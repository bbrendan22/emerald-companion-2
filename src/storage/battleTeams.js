const key = 'emerald-companion-2.battle-teams.v1';
export function createTeamId(cryptoApi = globalThis.crypto) {
  if (typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();
  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}
export function validateTeam(team, pool) {
  if (!team.name?.trim()) return 'Enter a team name.';
  if (team.ids?.length !== 3 || new Set(team.ids).size !== 3) return 'Choose three distinct Pokémon.';
  if (Array.from(team.ids).some(id => typeof id !== 'string' || !pool.some(mon => mon.identity === id))) return 'A selected Pokémon is unavailable or no longer assigned Frontier.';
  return '';
}
export function loadBattleTeams(storage) {
  const teams = JSON.parse(storage.getItem(key) ?? '[]');
  if (!Array.isArray(teams) || teams.some(t => !t || typeof t.id !== 'string' || !t.id || typeof t.name !== 'string' || !t.name.trim() || !Array.isArray(t.ids) || t.ids.length !== 3 || t.ids.some(id => typeof id !== 'string') || new Set(t.ids).size !== 3) || new Set(teams.map(t => t.id)).size !== teams.length) throw new Error('Saved teams could not be loaded.');
  return teams.map(({id,name,ids}) => ({id,name,ids:[...ids]}));
}
export function storeBattleTeams(storage, teams) {
  storage.setItem(key, JSON.stringify(teams.map(({id,name,ids}) => ({id,name:name.trim(),ids:[...ids]}))));
}
