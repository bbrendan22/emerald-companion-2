import {frontierTrainers} from '../../battle/data/frontierTrainers.js';
import {trainerKey, towerTrainerSets} from '../../battle/towerRules.js';
import {frontierBrains, searchFrontierBrains} from './sets.js';

export const resourceBrainEntries = frontierBrains.flatMap(brain => ['Silver', 'Gold'].map(symbol => ({...brain, symbol, key: `${brain.name} ${symbol}`})));

export function searchResourceTrainers(query = '', tab = 'trainers') {
  const terms = query.trim().toLowerCase().split(/\s+/);
  const entries = tab === 'brains' ? resourceBrainEntries : frontierTrainers;
  return entries.filter(trainer => {
    const text = `${trainer.name} ${trainer.trainerClass ?? trainer.facility}`.toLowerCase();
    return terms.every(term => text.includes(term));
  });
}
export function resourceTrainerSets(trainer) {
  // Battle resolves these exact IDs from the trainer's allowed pool.
  return towerTrainerSets(trainerKey(trainer)).sort((a, b) => a.entry - b.entry);
}
export function resourceBrainTeams(brain) {
  const sets = searchFrontierBrains(brain.name);
  return (brain.symbol ? [brain.symbol] : ['Silver', 'Gold']).map(symbol => ({symbol,
    sets:sets.filter(set => set.brainSet === `${brain.name} ${symbol}`)}));
}

export function resourceBrainIVRange(brain) {
  const values = resourceBrainTeams(brain).flatMap(team => team.sets.map(set => set.fixedIVs));
  if (!values.length || values.some(value => !Number.isInteger(value))) return '—';
  const min = Math.min(...values), max = Math.max(...values);
  return min === max ? String(min) : `${min}–${max}`;
}
