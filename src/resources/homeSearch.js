import {matchesDirectoryFilters} from './homeDirectoryFilters.js';
import {resourceIndex} from './search.js';
import {items, machines} from './items/utils/itemEntries.js';
import {itemCategories, itemCategory} from './items/utils/itemCategories.js';

// Search projections reuse the canonical catalogs and item entries.
const itemEntries = [...items.filter(item => item.pocket !== 'TM_HM'), ...machines];
const matchesEntry = (entry, prefix) => entry.name.toLowerCase().startsWith(prefix)
  || Boolean(entry.machine && entry.code.toLowerCase().startsWith(prefix));
const groups = [
  ...resourceIndex,
  {id:'items', title:'Useful Items', entries:itemEntries.filter(item => itemCategories.includes(itemCategory(item)))},
  {id:'berries', title:'Berries', entries:itemEntries.filter(item => itemCategory(item) === 'Berries')},
];
export function searchHomeResources(value) {
  const prefix = value.trim().toLowerCase();
  if (!prefix) return [];
  return groups.map(group => ({id:group.id, title:group.title,
    results:group.entries.filter(entry => matchesEntry(entry, prefix))
  })).filter(group => group.results.length);
}

// A directory exposes the same canonical projection without Master Search's
// empty-query suppression or cross-category grouping.
export function homeDirectory(category, value = '', filters = {}) {
  const group = groups.find(group => group.id === category);
  if (!group) return null;
  const prefix = value.trim().toLowerCase();
  return {id:group.id, title:category === 'pokemon' ? 'Pokédex' : group.title,
    results:group.entries.filter(entry => matchesEntry(entry, prefix) && matchesDirectoryFilters(category, entry, filters))};
}
