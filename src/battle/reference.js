import reference from '../data/reference.json' with {type:'json'};
import profile from '../data/profileReference.json' with {type:'json'};
import types from '../data/pokemonTypes.json' with {type:'json'};
import {moveResources} from './data/moveResources.js';

// Normalize the existing reference at the calculation boundary, not in save data.
export const speciesByName = new Map(Object.entries(reference.species).map(([id, species]) =>
  [species.name.toLowerCase(), {...species, internalSpeciesId:Number(id)}]));
export const emeraldTypeChart = Object.fromEntries(Object.entries(profile.typeChart).map(([type, targets]) =>
  [type.toUpperCase(), Object.fromEntries(Object.entries(targets).map(([target, value]) => [target.toUpperCase(), value]))]));
const moveIds = new Map(Object.entries(reference.moves).map(([id, move]) => [move.name, Number(id)]));
export function battleMove(idOrName) {
  const id = typeof idOrName === 'string' ? moveIds.get(idOrName) : idOrName;
  const data = moveResources[id];
  return data && reference.moves[id] ? {id, name:reference.moves[id].name, ...data} : null;
}
// Selection policy only; imported moves and direct database lookup stay intact.
export function isSelectableBattleMove(idOrName) {
  const move=battleMove(idOrName);
  return Boolean(move&&move.id!==165);
}
export function speciesTypes(dex) { return types[dex]?.map(type => type.toUpperCase()); }
export {reference, profile};
