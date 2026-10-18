import breedingEvolutions from '../data/breedingEvolutions.json' with {type:'json'};
export function descendants(id){const found=new Set([String(id)]);for(const current of found)for(const next of breedingEvolutions[current]??[])found.add(String(next));return [...found]}
