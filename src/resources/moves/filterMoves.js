import {catalogEntries} from '../search.js';
import {moveResources} from '../learnset/data/moveResources.js';
import {GEN3_TYPE_DISPLAY_ORDER} from '../../pokemon/typeDisplayOrder.js';

export const moveTypeOptions = [
  {value: '', label: 'Type'},
  ...GEN3_TYPE_DISPLAY_ORDER.map(type => ({value: type.toUpperCase(), label: type[0].toUpperCase() + type.slice(1)})),
  {value: 'MYSTERY', label: 'Typeless'},
];
const physicalTypes = new Set(['NORMAL', 'FIGHTING', 'FLYING', 'POISON', 'GROUND', 'ROCK', 'BUG', 'GHOST', 'STEEL']);

export function moveCategory(move) {
  // The canonical Emerald data uses 0 for status and 1 for variable/fixed
  // damage. Keep that sentinel damaging; the Gen 3 split is based on type.
  if (move.power === 0) return 'Status';
  return physicalTypes.has(move.type) ? 'Physical' : 'Special';
}

export function filterMoves(query = '', type = '', category = '') {
  const prefix = query.trim().toLowerCase();
  return catalogEntries('moves').filter(entry => {
    const move = moveResources[entry.id];
    return entry.searchName.startsWith(prefix)
      && (!type || move.type === type)
      && (!category || moveCategory(move) === category);
  });
}
