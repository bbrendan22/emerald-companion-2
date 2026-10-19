import {catalogEntries} from '../search.js';

export function filterAbilities(value = '') {
  const query = value.trim().toLowerCase();
  return catalogEntries('abilities').filter(entry => entry.searchName.startsWith(query));
}
