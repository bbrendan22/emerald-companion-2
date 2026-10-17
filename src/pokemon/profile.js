import reference from '../data/reference.json' with {type: 'json'};
import types from '../data/pokemonTypes.json' with {type: 'json'};
import profileReference from '../data/profileReference.json' with {type: 'json'};
export const statFields = [['hp','HP'],['attack','Attack'],['defense','Defense'],['spAttack','Sp. Atk'],['spDefense','Sp. Def'],['speed','Speed']];
const hiddenOrder = ['hp','attack','defense','speed','spAttack','spDefense'];
const hiddenTypes = ['fighting','flying','poison','ground','rock','bug','ghost','steel','fire','water','grass','electric','psychic','ice','dragon','dark'];
export function hiddenPower(ivs) {
  if (!ivs || hiddenOrder.some(key => !Number.isInteger(ivs[key]) || ivs[key] < 0 || ivs[key] > 31)) return null;
  const bits = bit => hiddenOrder.reduce((sum,key,i) => sum + ((ivs[key] >> bit) & 1) * 2 ** i, 0);
  return {type: hiddenTypes[Math.floor(bits(0) * 15 / 63)], power: 30 + Math.floor(bits(1) * 40 / 63)};
}
export function typeMatchups(defenders) {
  return Object.keys(profileReference.typeChart).map(type => ({type, multiplier: [...new Set(defenders)].reduce((n,defender) => n * (profileReference.typeChart[type]?.[defender] ?? 1), 1)}));
}
export function pokerusState(value) {
  if (value == null) return 'Unavailable';
  return value === 0 ? 'Never infected' : value & 15 ? 'Active' : 'Cured';
}
export function earnedRibbons(raw = 0) {
  const earned = [], ranks = ['Normal','Super','Hyper','Master'];
  ['Cool','Beauty','Cute','Smart','Tough'].forEach((category,i) => {
    const rank = (raw >>> (3*i)) & 7;
    // Rank is cumulative; invalid values are reported separately, never fabricated.
    if (rank > 4) return;
    for (let r=0; r<rank; r++) earned.push({name: `${category} ${ranks[r]} Ribbon`, file: `${category.toLowerCase()}-ribbon-${r ? `${ranks[r].toLowerCase()}-` : ''}hoenn`});
  });
  ['Champion','Winning','Victory','Artist','Effort','Marine','Land','Sky','Country','National','Earth','World'].forEach((name,i) => {
    if ((raw >>> (15+i)) & 1) earned.push({name: `${name} Ribbon`, file: `${name.toLowerCase()}-ribbon`});
  });
  return earned;
}
export function profileStats(pokemon) {
  if (pokemon.isEgg) return {values:null, currentHp:null, description:'Stats are unavailable for an egg.'};
  return pokemon.recorded ? {values:pokemon.recorded.stats, currentHp:pokemon.recorded.currentHp, description:'Saved party stats.'}
    : {values:pokemon.calculated?.stats ?? null, currentHp:null, description:pokemon.source.kind === 'daycare' ? 'Calculated at deposit level. Day Care experience applies on withdrawal. Current HP is not stored.' : 'Calculated from saved level, nature, IVs and EVs. Current HP is not stored in PC records.'};
}
export function profileData(pokemon) {
  const power = hiddenPower(pokemon.ivs);
  return {
    types: types[pokemon.nationalDexId], baseStats: reference.species[pokemon.internalSpeciesId]?.baseStats,
    stats: profileStats(pokemon), hiddenPower: power, pokerus: pokerusState(pokemon.pokerus),
    ribbons: earnedRibbons(pokemon.ribbons.raw), invalidRibbonRanks: pokemon.ribbons.contestRanks.some(rank => rank > 4),
    heldItem: pokemon.heldItemId ? profileReference.itemNames[pokemon.heldItemId] ?? `Unknown item (ID ${pokemon.heldItemId})` : 'None',
    moves: pokemon.moves.map(move => ({...move, type: move.id === 237 ? power?.type : profileReference.moveTypes[move.id]})),
  };
}

// The 20 cumulative contest awards followed by the 12 single-bit Gen 3 awards.
// Use the decoder's existing labels and asset mapping for a stable collection order.
const allContestRanks = [0,1,2,3,4].reduce((raw,i) => raw | (4 << (3*i)), 0);
export const ribbonCatalog = earnedRibbons(allContestRanks | (0xfff << 15));
