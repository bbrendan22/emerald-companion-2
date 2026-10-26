import {frontierSetStats} from './frontierAdapter.js';
import {createTowerRules, towerOpponentIVs} from './towerRules.js';
import {towerTrainerEntries, towerTrainerSupportsFormat} from './towerTrainers.js';
import {towerSetById} from './towerSets.js';

const keys = ['hp','attack','defense','spAttack','spDefense','speed'];
const populations = new Map();
const references = new Map();

// Only real trainer/set/IV associations enter the reference. A set shared by
// several trainers contributes once per actual IV tier, not once at assumed IV31.
function frontierPopulation(rules) {
  const key = `${rules.facility}:${rules.format}`;
  if (populations.has(key)) return populations.get(key);
  const unique = new Map();
  for (const trainer of towerTrainerEntries) {
    if (!towerTrainerSupportsFormat(trainer,rules.format)) continue;
    for (const id of trainer.setIds) {
      const set = towerSetById(id);
      const iv = towerOpponentIVs(trainer.trainer,set);
      unique.set(`${id}:${iv.value}`,{set,iv:iv.value});
    }
  }
  const population = [...unique.values()];
  populations.set(key,population);
  return population;
}

// Rules alone define the scale; teams, selected trainer and observations cannot
// affect the cache. Tower is the only supported facility; its existing format
// restriction excludes Anabel from Doubles. No additional legality is inferred.
export function frontierStatReference(rules = createTowerRules()) {
  const normalized = createTowerRules(rules);
  const key = `${normalized.facility}:${normalized.format}:${normalized.opponentLevel}`;
  if (references.has(key)) return references.get(key);
  const ranges = Object.fromEntries(keys.map(stat => [stat,{min:Infinity,max:-Infinity}]));
  for (const {set,iv} of frontierPopulation(normalized)) {
    const stats = frontierSetStats(set,normalized.opponentLevel,iv);
    for (const stat of keys) {
      ranges[stat].min = Math.min(ranges[stat].min,stats[stat]);
      ranges[stat].max = Math.max(ranges[stat].max,stats[stat]);
    }
  }
  Object.values(ranges).forEach(Object.freeze);
  Object.freeze(ranges);
  references.set(key,ranges);
  return ranges;
}

export function frontierBarPercent(value,range) {
  if (!Number.isFinite(value) || !range || !Number.isFinite(range.min) || !Number.isFinite(range.max)) return null;
  if (range.min === range.max) return value > range.max ? 100 : 5;
  return Math.max(5,Math.min(100,5+95*(value-range.min)/(range.max-range.min)));
}
