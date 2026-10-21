import locations from '../data/originLocations.json' with {type:'json'};
import gameCubeLocations from '../data/gameCubeLocations.json' with {type:'json'};
import reference from '../data/profileReference.json' with {type:'json'};
import {originGames} from './collectionFilters.js';
import {identifyGameCubeOrigin} from '../pokemon/gameCubeOrigin.js';

const specialLocations = {253:'Special egg',254:'In-game trade',255:'Fateful encounter'};
const integerIn = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

const gameCubeNames = {colosseum:'Colosseum',xd:'XD'};

// Uses each Pokémon's decoded secure origin word and OT record, never the
// currently imported save's trainer or current level.
export function pokemonOrigin(pokemon) {
  const origin = pokemon?.origin ?? {};
  const gameCube = identifyGameCubeOrigin(pokemon);
  const gba = integerIn(origin.gameId,1,5);
  const map = origin.gameId === 3 ? locations.maps.emerald
    : origin.gameId === 1 || origin.gameId === 2 ? locations.maps.rubySapphire
    : origin.gameId === 4 || origin.gameId === 5 ? locations.maps.fireRedLeafGreen : null;
  const locationId = origin.metLocationId;
  // A shared special marker is meaningful even when the game is unresolved.
  // Other IDs require a validated encounter, not merely a named map entry.
  const metLocation = origin.gameId === 15 ? (gameCubeLocations.maps[gameCube]?.[locationId]
    ?? (locationId === 254 ? 'In-game trade' : 'Distant Land'))
    : gba && integerIn(locationId,0,255) ? specialLocations[locationId] ?? map?.[locationId] ?? null : null;
  let metLevel = integerIn(origin.metLevel,1,100) && !pokemon?.isEgg ? origin.metLevel : null;
  // Gen 3 stores hatched Pokémon with metLevel=0; the GBA summary displays
  // EGG_HATCH_LEVEL (5). Only apply that rule to a decoded ordinary GBA location.
  if (gba && origin.metLevel === 0 && !pokemon?.isEgg && metLocation && locationId < 253) metLevel = 5;
  const ball = integerIn(origin.ballId,1,12) ? origin.ballId : null;
  const name = pokemon?.ot?.name?.trim();
  const westernText = pokemon?.languageId == null || [2,3,4,5,7].includes(pokemon.languageId);
  const tid = pokemon?.ot?.trainerId;
  return {
    ot: westernText && name && !name.includes('�') ? name : null,
    tid: integerIn(tid,0,65535) ? String(tid).padStart(5,'0') : null,
    game: gameCubeNames[gameCube] ?? originGames[origin.gameId] ?? null,
    ball: ball ? reference.itemNames[ball]?.replace(/^Poke /,'Poké ') ?? null : null,
    ballItemId: ball,
    metLocation,
    metLevel,
  };
}
