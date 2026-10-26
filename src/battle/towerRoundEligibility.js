import {frontierTrainers} from './data/frontierTrainers.js';
import {frontierPokemon} from './data/frontierPokemon.js';
import {towerBrainSets, trainerKey} from './towerRules.js';
import {towerTrainerIds} from './towerTrainerIds.js';

// pokeemerald battle_tower.c: sFrontierTrainerIdRanges and ...RangesHard.
const ordinary = [[0,99],[80,119],[100,139],[120,159],[140,179],[160,199],[180,219],[200,299]];
const seventh = [[100,119],[120,139],[140,159],[160,179],[180,199],[200,219],[220,239],[200,299]];
export function towerRoundActive(state) {
  return state.rules.facility === 'Tower' && ['Singles','Doubles'].includes(state.rules.format)
    && ['1','2','3','4','5','6','7','8+'].includes(state.round);
}
function buildTrainerIds(round) {
  const index = round === '8+' ? 7 : Number(round)-1;
  if (!Number.isInteger(index) || index < 0 || index > 7) return null;
  const ids = new Set();
  for (const [first,last] of [ordinary[index],seventh[index]]) {
    for (let id=first;id<=last;id++) ids.add(id);
  }
  return ids;
}
const trainerIds = new Map(['1','2','3','4','5','6','7','8+'].map(round => [round,buildTrainerIds(round)]));
export function towerRoundTrainerIds(round) {return trainerIds.has(round) ? new Set(trainerIds.get(round)) : null;}
export function towerRoundTrainerEligible(entry, state) {
  if (state.rules.format === 'Doubles' && (entry.trainer === 'Anabel' || ['Anabel Silver','Anabel Gold'].includes(entry.key))) return false;
  if (!towerRoundActive(state)) return true;
  if (entry.trainer === 'Anabel') return entry.symbol === (state.round === '5' ? 'Silver' : state.round === '8+' ? 'Gold' : null);
  return trainerIds.get(state.round).has(towerTrainerIds[entry.key]);
}
const standardSets = new Map(frontierPokemon.map(set => [set.id,set]));
// null means retain the existing unfiltered set resolver. No level filtering is
// introduced outside selected Tower Singles/Doubles rounds in this milestone.
export function towerRoundSetIds(state) {
  if (!towerRoundActive(state)) return null;
  const ids = new Set();
  for (const trainer of frontierTrainers) {
    const key = trainerKey(trainer);
    if (state.selectedTrainer && state.selectedTrainer !== key) continue;
    if (!towerRoundTrainerEligible({key},state)) continue;
    for (const id of trainer.pokemonSetIds) {
      // Canonical set ID = spreadsheet entry - 1; HIGH_TIER is 849.
      if (state.rules.levelMode !== '50' || standardSets.get(id)?.entry <= 850) ids.add(id);
    }
  }
  for (const symbol of ['Silver','Gold']) {
    if (state.selectedTrainer && (state.selectedTrainer !== 'Anabel' || state.selectedBrainSymbol !== symbol)) continue;
    if (!towerRoundTrainerEligible({trainer:'Anabel',symbol},state)) continue;
    for (const set of towerBrainSets.filter(set => set.brainSet === `Anabel ${symbol}`)) ids.add(`${set.brainSet}:${set.species}`);
  }
  return ids;
}
