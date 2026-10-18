import {frontierTrainers} from './data/frontierTrainers.js';
import {frontierBrainPokemon} from './data/frontierBrains.js';
import {frontierPokemon} from './data/frontierPokemon.js';

export const towerBrainSets = frontierBrainPokemon.filter(set => set.brainSet.startsWith('Anabel '));
export const trainerKey = trainer => `${trainer.trainerClass}:${trainer.name}`;
const trainers = new Map(frontierTrainers.map(trainer => [trainerKey(trainer), trainer]));
const setsById = new Map(frontierPokemon.map(set => [set.id, set]));

export function towerTrainerSets(selectedTrainer = null) {
  if (selectedTrainer === null) return [...frontierPokemon, ...towerBrainSets];
  if (selectedTrainer === 'Anabel') return [...towerBrainSets];
  const trainer = trainers.get(selectedTrainer);
  if (!trainer) throw new Error('Unknown Tower trainer.');
  return trainer.pokemonSetIds.map(id => setsById.get(id));
}

export function createTowerRules({levelMode = '50', openLevel = 60} = {}) {
  if (!['50','open'].includes(levelMode)) throw new Error('Choose Level 50 or Open Level.');
  if (!Number.isInteger(openLevel) || openLevel < 60 || openLevel > 100) throw new Error('Open Level must be an integer from 60 to 100.');
  return {facility:'Tower', format:'Singles', teamSize:3, levelMode, openLevel, opponentLevel:levelMode === '50' ? 50 : openLevel};
}

export function towerOpponentIVs(selectedTrainer = null, set = null) {
  if (selectedTrainer !== null && selectedTrainer !== 'Anabel' && !trainers.has(selectedTrainer)) throw new Error('Unknown Tower trainer.');
  if (set?.brainSet) {
    if (!towerBrainSets.includes(set)) throw new Error('Only Anabel Brain sets are supported.');
    return {value:set.fixedIVs, source:'brain', assumed:false};
  }
  if (selectedTrainer === 'Anabel') throw new Error('Choose an Anabel set.');
  if (selectedTrainer !== null) return {value:trainers.get(selectedTrainer).ivs, source:'trainer', assumed:false};
  return {value:31, source:'assumption', assumed:true};
}

// Retained cartridge exception for a future Dome adapter; no Dome mode is exposed.
export function domeOrdinaryOpponentIVs() { return 3; }

export function freshBattleConditions() {
  return {hpByPokemon:{}, conditionsByPokemon:{}, field:{weather:'none', critical:false, playerScreens:{}, enemyScreens:{}, playerStages:{}, enemyStages:{}}};
}
export function selectTowerTrainer(state, selectedTrainer) {
  if (selectedTrainer !== null && selectedTrainer !== 'Anabel' && !trainers.has(selectedTrainer)) throw new Error('Unknown Tower trainer.');
  return {...state, selectedTrainer, opponents:[], enemy:null};
}
