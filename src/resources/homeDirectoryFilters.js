import pokemonTypes from '../data/pokemonTypes.json' with {type:'json'};
import {GEN3_TYPE_DISPLAY_ORDER} from '../pokemon/typeDisplayOrder.js';
import {moveTypeOptions, moveCategory} from './moves/filterMoves.js';
import {moveResources} from './learnset/data/moveResources.js';
import {itemCategories, itemCategory, berryGroups} from './items/utils/itemCategories.js';

const options = values => values.map(value => ({value, label:value}));
export function directoryFilterFields(category) {
  if (category === 'pokemon') return [
    {key:'type', label:'Type', options:GEN3_TYPE_DISPLAY_ORDER.map(value => ({value, label:value[0].toUpperCase()+value.slice(1)}))},
    {key:'generation', label:'Generation', options:[1,2,3].map(value => ({value:String(value), label:`Gen ${value}`}))},
  ];
  if (category === 'moves') return [
    {key:'type', label:'Type', options:moveTypeOptions.slice(1)},
    {key:'category', label:'Category', options:options(['Physical','Special','Status'])},
  ];
  if (category === 'berries') return [{key:'group', label:'Group', options:options(Object.keys(berryGroups))}];
  if (category === 'items') return [
    {key:'category', label:'Category', options:options(itemCategories)},
  ];
  return [];
}
export function matchesDirectoryFilters(category, entry, filters = {}) {
  if (category === 'pokemon') return (!filters.type || pokemonTypes[entry.id]?.includes(filters.type))
    && (!filters.generation || Number(filters.generation) === (entry.id <= 151 ? 1 : entry.id <= 251 ? 2 : 3));
  if (category === 'moves') {
    const move = moveResources[entry.id];
    return (!filters.type || move.type === filters.type) && (!filters.category || moveCategory(move) === filters.category);
  }
  if (category === 'berries') return !filters.group || berryGroups[filters.group]?.includes(Number(entry.id));
  if (category === 'items') return !filters.category || itemCategory(entry) === filters.category;
  return true;
}
