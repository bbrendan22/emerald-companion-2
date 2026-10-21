import encounters from '../data/gameCubeEncounters.json' with {type:'json'};
import overview from '../resources/data/overview.json' with {type:'json'};
import {NATURES} from '../save/stats.js';

const integerIn = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
const languages = new Set([1,2,3,4,5,7]);
const statKeys = ['hp','attack','defense','speed','spAttack','spDefense'];
const parents = new Map();
for (const edge of overview.evolutions) {
  if (edge.from > 386 || edge.to > 386) continue;
  if (!parents.has(edge.to)) parents.set(edge.to, []);
  parents.get(edge.to).push(edge.from);
}

// Walk only backwards: siblings in a branching evolution family are not
// interchangeable encounter species. Never treat breeding as de-evolution.
function possibleEncounterSpecies(dex) {
  const result = new Set([dex]);
  for (const species of result) {
    for (const parent of parents.get(species) ?? []) result.add(parent);
  }
  return result;
}

function matches(pokemon, encounter, game, ancestors) {
  const {metLevel, metLocationId, ballId} = pokemon.origin;
  if (!ancestors.has(encounter.species) || metLevel < encounter.levels[0] || metLevel > encounter.levels[1]) return false;
  const shadow = encounter.kind === 'shadow' || encounter.kind === 'ereader';
  const rematch = game === 'xd' && shadow && encounters.xdShadowRematches.includes(metLocationId);
  if (!encounter.locations.includes(metLocationId) && !rematch) return false;
  if (encounter.ball && ballId !== encounter.ball) return false;
  const ribbons = pokemon.ribbons.raw;
  if (Boolean(ribbons >>> 31) !== (game === 'xd')) return false;
  if (Boolean(ribbons & (1 << 24)) !== shadow) return false;
  if (encounter.nonShiny && pokemon.shiny !== false) return false;
  if (encounter.gender && pokemon.gender !== encounter.gender) return false;
  if (encounter.language && pokemon.languageId !== encounter.language) return false;
  if (encounter.nature != null && pokemon.nature !== NATURES[encounter.nature]) return false;
  if (encounter.zeroIvs && !statKeys.every(key => pokemon.ivs?.[key] === 0)) return false;
  if (encounter.ot) {
    const name = encounters.otNames[encounter.ot][pokemon.languageId];
    // PK3 conversion truncates Japanese OT names to five characters, others
    // to seven. Unsupported/undecodable names must not become a positive match.
    const expected = name?.slice(0, pokemon.languageId === 1 ? 5 : 7);
    if (!expected || pokemon.ot.name !== expected || pokemon.ot.trainerId !== encounter.tid) return false;
    if (encounter.sid != null && pokemon.ot.secretId !== encounter.sid) return false;
  }
  return true;
}

// Identifies native C/XD encounters, not general legality or historical proof.
// PID/IV RNG reconstruction and mutable original moves are deliberately outside
// this matcher. Both/no matching games remain unresolved; raw data is untouched.
export function identifyGameCubeOrigin(pokemon) {
  const origin = pokemon?.origin;
  if (origin?.gameId !== 15 || pokemon.isEgg !== false) return null;
  if (!integerIn(pokemon.nationalDexId,1,386) || !integerIn(origin.metLevel,1,100)
    || !integerIn(origin.metLocationId,0,255) || !integerIn(origin.ballId,1,12)
    || origin.ballId === 5 || !integerIn(pokemon.ribbons?.raw,0,0xffffffff)
    || !languages.has(pokemon.languageId) || pokemon.ot?.gender !== 'male') return null;
  const ancestors = possibleEncounterSpecies(pokemon.nationalDexId);
  const games = ['colosseum','xd'].filter(game => encounters[game].some(encounter => matches(pokemon,encounter,game,ancestors)));
  return games.length === 1 ? games[0] : null;
}
