import {frontierPokemon} from './data/frontierPokemon.js';
import {towerBrainSets} from './towerRules.js';
import {selectedTowerSetIds} from './towerTrainers.js';
import {towerSetById} from './towerSets.js';
import {speciesByName} from './reference.js';
import {matchesBattleWords} from './searchWords.js';

function uniqueSpecies(sets) {
  return [...new Map(sets.map(set => {
    const species = speciesByName.get(set.species.toLowerCase());
    return species ? [species.internalSpeciesId, {
      id:species.internalSpeciesId, name:species.name, dex:species.nationalDexId,
    }] : [null, null];
  }).filter(([id]) => id !== null)).values()].sort((a,b) => a.name.localeCompare(b.name));
}

export const towerSpecies = uniqueSpecies([...frontierPokemon, ...towerBrainSets]);
const byId = new Map(towerSpecies.map(species => [species.id, species]));
export const opponentSpeciesById = id => byId.get(id);

// Species eligibility only: no streak, level, or set identification assumptions.
export function availableOpponentSpecies(state, query = '') {
  const species = state.selectedTrainer
    ? uniqueSpecies(selectedTowerSetIds(state).map(towerSetById).filter(Boolean)) : towerSpecies;
  return species.filter(mon => matchesBattleWords(mon.name,query));
}
