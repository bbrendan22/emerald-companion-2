import {speciesByName, speciesTypes, battleMove} from './reference.js';
import {emeraldStat} from './stats.js';
import {createTowerRules, towerOpponentIVs, towerTrainerSets} from './towerRules.js';
import {frontierPokemon} from './data/frontierPokemon.js';
import {towerBrainSets} from './towerRules.js';

const keys = {hp:'hp', attack:'atk', defense:'def', spAttack:'spa', spDefense:'spd', speed:'spe'};
const supportedSets = new Set([...frontierPokemon, ...towerBrainSets]);

// Shared by the opponent adapter and Frontier-only stat-bar reference distribution.
export function frontierSetStats(set, level, iv) {
  const species = speciesByName.get(set.species.toLowerCase());
  return Object.fromEntries(Object.entries(keys).map(([key, short]) =>
    [key, emeraldStat(species.baseStats[key], key, iv, set.evs[short] ?? 0, level, set.nature, species.nationalDexId === 292)]));
}

export function toTowerOpponent(set, rules = createTowerRules(), selectedTrainer = null) {
  if (!supportedSets.has(set)) throw new Error('Unknown or unsupported Tower set.');
  if (selectedTrainer !== null && !towerTrainerSets(selectedTrainer).includes(set)) throw new Error('Set does not belong to the selected trainer.');
  const normalized = createTowerRules(rules);
  const iv = towerOpponentIVs(selectedTrainer, set);
  const species = speciesByName.get(set.species.toLowerCase());
  const level = normalized.opponentLevel;
  const stats = frontierSetStats(set, level, iv.value);
  return {
    name:set.species, dex:species.nationalDexId, types:speciesTypes(species.nationalDexId),
    setId:set.id ?? `${set.brainSet}:${set.species}`, level, stats, ivAssumption:iv,
    ivs:Object.fromEntries(Object.keys(keys).map(key => [key, iv.value])),
    evs:Object.fromEntries(Object.entries(keys).map(([key, short]) => [key, set.evs[short] ?? 0])),
    nature:set.nature, item:set.item || 'None', ability:set.possibleAbility,
    friendship:set.moves.includes('Frustration') ? 0 : 255,
    moves:set.moves.map(name => battleMove(name)), currentHp:stats.hp, status:'none', stages:{}, screens:{},
  };
}
