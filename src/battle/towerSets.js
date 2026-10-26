import {towerRoundSetIds} from './towerRoundEligibility.js';
import {frontierPokemon} from './data/frontierPokemon.js';
import {towerBrainSets} from './towerRules.js';
import {selectedTowerSetIds} from './towerTrainers.js';
import {speciesByName,isSelectableBattleMove} from './reference.js';
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
  const eligible = towerRoundSetIds(state);
  if (eligible) return [...eligible].map(id => setsById.get(id)).filter(Boolean);
  return state.selectedTrainer ? selectedTowerSetIds(state).map(id => setsById.get(id)).filter(Boolean) : frontierPokemon;
}
export const towerSetLabel = set => `${set.species}${Number.isInteger(set.instance) ? ` ${set.instance}` : ''}`;
export function eligibleMatchupSets(state) {
  const speciesId = state.matchup?.opponent;
  if (!speciesId || !state.opponentSpecies?.slice(0,state.rules.teamSize).includes(speciesId)) return [];
  return [...new Map(availableTowerSets(state)
    .filter(set => speciesIds.get(frontierSetId(set)) === speciesId)
    .map(set => [frontierSetId(set),set])).values()]
    .sort((a,b) => (a.instance ?? Infinity)-(b.instance ?? Infinity));
}
export function matchupOpponentSlot(state) {
  if (!state.matchup?.opponent) return null;
  const slot = state.opponentSpecies?.indexOf(state.matchup.opponent) ?? -1;
  return slot >= 0 && slot < state.rules.teamSize ? slot : null;
}
export function matchupObservations(state) {
  const slot = matchupOpponentSlot(state);
  return (slot === null ? null : state.opponentObservations?.[slot]) ?? {moves:['','','',''], item:''};
}
export function matchesObservations(set, observations) {
  return (!observations.item || set.item === observations.item)
    && observations.moves.filter(Boolean).every(move => set.moves.includes(move));
}
export function possibleMatchupSets(state) {
  return eligibleMatchupSets(state).filter(set => matchesObservations(set, matchupObservations(state)));
}
// Analysis is separate from evidence; each Doubles slot owns its selection.
export const usesSelectedSet = state => state.rules.facility === 'Tower' && ['Singles','Doubles'].includes(state.rules.format);
export function analysisMatchupSets(state) {
  const sets = possibleMatchupSets(state);
  if (!usesSelectedSet(state)) return sets;
  const selectedId = state.rules.format === 'Doubles'
    ? state.opponentSetSelections?.[matchupOpponentSlot(state)] : state.selectedOpponentSetId;
  return [sets.find(set => frontierSetId(set) === selectedId) ?? sets[0]].filter(Boolean);
}
// Legacy replacement controls exclude the edited field. Progressive controls
// retain every observation so each offered addition is compatible with all evidence.
export function observationChoices(state, field, {replace = true} = {}) {
  const observations = matchupObservations(state);
  const other = {...observations, moves:[...observations.moves]};
  if (replace) {
    if (field === 'item') other.item = '';
    else other.moves[field] = '';
  }
  const sets = eligibleMatchupSets(state).filter(set => matchesObservations(set,other));
  return [...new Set(sets.flatMap(set => field === 'item' ? [set.item] : set.moves))]
    .filter(value => value && (field === 'item' || isSelectableBattleMove(value)&&!other.moves.includes(value)))
    .sort((a,b) => a.localeCompare(b));
}
export function identifiedMatchup(state) {
  const observations = matchupObservations(state), sets = analysisMatchupSets(state);
  if (usesSelectedSet(state)) return {observations,sets,moves:sets[0]?.moves ?? [],item:sets[0]?.item ?? ''};
  const unique = sets.length === 1 ? sets[0] : null;
  const remaining = unique ? unique.moves.filter(move => move && !observations.moves.includes(move)) : [];
  return {observations, sets, moves:observations.moves.map(move => move || remaining.shift() || ''),
    item:observations.item || unique?.item || ''};
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
