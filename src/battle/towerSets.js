import {frontierPokemon} from './data/frontierPokemon.js';
import {towerBrainSets} from './towerRules.js';
import {selectedTowerSetIds} from './towerTrainers.js';
import {speciesByName} from './reference.js';
import {matchesBattleWords} from './searchWords.js';

export const frontierSetId = set => set.id ?? `${set.brainSet}:${set.species}`;
const setsById = new Map([...frontierPokemon, ...towerBrainSets].map(set => [frontierSetId(set), set]));
export function towerSetById(id) { return setsById.get(id); }
const speciesIds = new Map([...setsById].map(([id, set]) => [id, speciesByName.get(set.species.toLowerCase())?.internalSpeciesId]));
export function opponentSetDisabled(state, id) {
  const speciesId = speciesIds.get(id);
  return speciesId === undefined || state.opponents.length >= state.rules.teamSize
    || state.opponents.some(selected => speciesIds.get(selected) === speciesId);
}
export function availableTowerSets(state) {
  return state.selectedTrainer ? selectedTowerSetIds(state).map(id => setsById.get(id)).filter(Boolean) : frontierPokemon;
}
export const towerSetLabel = set => `${set.species}${Number.isInteger(set.instance) ? ` ${set.instance}` : ''}`;
export function possibleMatchupSets(state) {
  const speciesId = state.matchup?.opponent;
  if (!speciesId || !state.opponentSpecies?.slice(0,state.rules.teamSize).includes(speciesId)) return [];
  return [...new Map(availableTowerSets(state)
    .filter(set => speciesIds.get(frontierSetId(set)) === speciesId)
    .map(set => [frontierSetId(set),set])).values()]
    .sort((a,b) => (a.instance ?? Infinity)-(b.instance ?? Infinity));
}
export function visibleTowerSets(state) {
  const query = (state.setSearch?.query ?? '').trim().toLowerCase();
  const hidden = new Set(state.setSearch?.hiddenIds ?? []);
  return availableTowerSets(state).filter(set => !hidden.has(frontierSetId(set)) && matchesBattleWords(set.species,query));
}
// Same duplicate-move palette/ordering as the legacy workbench. Count once per set.
export function duplicateMoveColors(sets) {
  if (new Set(sets.map(set => set.species)).size !== 1) return new Map();
  const counts = new Map();
  for (const set of sets) for (const move of new Set(set.moves)) counts.set(move, (counts.get(move) ?? 0) + 1);
  return new Map([...counts].filter(([,count]) => count > 1).sort(([a],[b]) => a.localeCompare(b))
    .map(([move],index) => [move, `hsl(${(index * 137.508 + 25) % 360} 70% 76%)`]));
}
