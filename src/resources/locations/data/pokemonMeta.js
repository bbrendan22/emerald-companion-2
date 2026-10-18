// Adapt canonical 2.0 metadata; encounter tables retain Emerald internal species IDs.
import reference from '../../../data/reference.json' with {type:'json'};
export const pokemonMeta=Object.fromEntries(Object.entries(reference.species).map(([id,species])=>[id,{name:species.name,dex:species.nationalDexId}]));
const internalIdsByDex=new Map(Object.entries(pokemonMeta).map(([id,species])=>[species.dex,id]));
export const internalIdForDex=dex=>internalIdsByDex.get(Number(dex));
