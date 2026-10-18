import profileReference from '../data/profileReference.json' with {type:'json'};

const normalize = name => name.toLowerCase().replace(/[^a-z0-9]/g, '');
const itemIds = new Map(Object.entries(profileReference.itemNames).filter(([id]) => Number(id) > 0)
  .map(([id, name]) => [normalize(name), id]));

// String input preserves the Sets contract; tolerant callers normalize nulls first.
export const battleItemId = name => itemIds.get(normalize(name));
