import {identifyPokemon} from '../storage/pokemonRoles.js';
import {reference, profile, battleMove, speciesTypes} from './reference.js';
import weights from './data/weights.json' with {type:'json'};
import {NATURES} from '../save/stats.js';

const keys = ['hp','attack','defense','spAttack','spDefense','speed'];
const whole = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const validValues = (values, min, max) => values && keys.every(key => whole(values[key], min, max));

// Null means unavailable/invalid, never substitute guessed stats or another Pokémon.
export function toBattlePokemon(record) {
  if (!record || record.isEgg || record.checksumValid !== true || typeof record.identity !== 'string' || !record.identity) return null;
  const species = reference.species[record.internalSpeciesId];
  const level = record.recorded?.level ?? record.calculated?.level;
  const stats = record.recorded?.stats ?? record.calculated?.stats;
  if (!species || species.nationalDexId !== record.nationalDexId || !whole(level, 1, 100)
    || !validValues(stats, 1, 999) || !validValues(record.ivs, 0, 31) || !validValues(record.evs, 0, 255)
    || !NATURES.includes(record.nature)
    || Object.values(record.evs).reduce((sum, value) => sum + value, 0) > 510
    || !(record.friendship === null || whole(record.friendship, 0, 255))
    || !record.ability?.name || !species.abilities.includes(record.ability.id)
    || reference.abilityNames[record.ability.id] !== record.ability.name
    || !Array.isArray(record.moves) || record.moves.length !== 4
    || !profile.itemNames[record.heldItemId]) return null;
  const moves = record.moves.map(move => {
    if (!move || !whole(move.id, 0, 354)) return undefined;
    if (move.id === 0) return null;
    const data = battleMove(move.id);
    return data ? {...data, pp:move.maxPp, currentPp:move.currentPp, ppUps:move.ppUps} : undefined;
  });
  if (moves.includes(undefined)) return null;
  return {
    identity:record.identity, name:species.name, nickname:record.nickname,
    dex:species.nationalDexId, species:record.internalSpeciesId, types:speciesTypes(species.nationalDexId),
    gender:record.gender, shiny:record.shiny, level, stats:{...stats},
    nature:record.nature, ability:record.ability.name, item:profile.itemNames[record.heldItemId],
    moves, ivs:{...record.ivs}, evs:{...record.evs}, friendship:record.friendship,
    weight:weights[species.nationalDexId],
    // Base battle data stays healthy; the manual Conditions view can initialize
    // from recorded HP without modifying the imported record.
    initialCurrentHp:Math.max(0,Math.min(stats.hp,record.recorded?.currentHp ?? stats.hp)),
    currentHp:stats.hp, status:'none', stages:{}, screens:{},
  };
}

export function frontierPokemonPool(records = [], assignedRoles = {}) {
  // Assign occurrence suffixes before filtering, exactly as My Pokémon does.
  return identifyPokemon(records).filter(record => assignedRoles[record.identity] === 'Frontier')
    .map(toBattlePokemon).filter(Boolean);
}
