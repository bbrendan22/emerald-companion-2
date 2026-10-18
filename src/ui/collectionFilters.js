import pokemonTypes from '../data/pokemonTypes.json' with {type: 'json'};
import {GEN3_TYPE_DISPLAY_ORDER} from '../pokemon/typeDisplayOrder.js';

// Gen 3 origin IDs. Colosseum and XD share the same stored value.
export const originGames = {1: 'Sapphire', 2: 'Ruby', 3: 'Emerald', 4: 'FireRed', 5: 'LeafGreen', 15: 'Colosseum / XD'};
export const typeOptions = GEN3_TYPE_DISPLAY_ORDER;
export function representedGames(records) {
  return [...new Set(records.map(p => p.origin?.gameId).filter(id => originGames[id]))]
    .sort((a, b) => a - b).map(id => ({id: String(id), name: originGames[id]}));
}
export function filterDetails(records, {generation = 'All', type = 'All', game = 'All'} = {}) {
  return records.filter(p => (generation === 'All' || Number(generation) === (p.nationalDexId <= 151 ? 1 : p.nationalDexId <= 251 ? 2 : 3))
    && (type === 'All' || pokemonTypes[p.nationalDexId]?.includes(type))
    && (game === 'All' || (p.origin?.gameId != null && Number(game) === p.origin.gameId)));
}
export function collectionImage(pokemon, view) {
  if (view === 'Box') return `/pokemon/box/${pokemon.nationalDexId}.png`;
  if (pokemon.isEgg) return '/pokemon/egg.png';
  return `/pokemon/artwork/${pokemon.shiny ? 'shiny' : 'normal'}/${pokemon.nationalDexId}.png`;
}
