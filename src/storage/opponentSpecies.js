import {opponentSpeciesById} from '../battle/opponentSpecies.js';

const key = 'emerald-companion-2.opponent-species.v1';
function sanitize(value) {
  return Array.isArray(value) ? Array.from(value.slice(0,4), id => opponentSpeciesById(id) ? id : null) : [];
}
export function loadOpponentSpecies(storage) {
  try { return sanitize(JSON.parse(storage.getItem(key) ?? '[]')); }
  catch { return []; }
}
export function storeOpponentSpecies(storage, species) {
  try { storage.setItem(key, JSON.stringify(sanitize(species))); return true; }
  catch { return false; }
}
