import reference from '../../data/reference.json' with {type: 'json'};
import {emeraldStat, ivNatures} from '../../battle/stats.js';
export const fields = [['hp','HP','HP'],['attack','Atk','Attack'],['defense','Def','Defense'],['spAttack','SpA','Sp. Attack'],['spDefense','SpD','Sp. Defense'],['speed','Spe','Speed']];
export const species = Object.values(reference.species).sort((a,b) => a.nationalDexId-b.nationalDexId);
export const natures = [...ivNatures].sort();
export function searchSpecies(query) {
  const term = query.trim().toLowerCase();
  if (!term) return [];
  const match = species.find(p => p.name.toLowerCase().startsWith(term))
    ?? species.find(p => p.name.toLowerCase().includes(term));
  return match ? [match] : [];
}
const integer = value => /^\d+$/.test(String(value));
export function evError(evs, enabled) {
  if (!enabled) return null;
  if (fields.some(([key]) => !integer(evs[key]) || Number(evs[key]) > 255)) return 'Enter whole EVs from 0–255 for every stat.';
  if (fields.reduce((sum,[key]) => sum+Number(evs[key]),0)>510) return 'Total EVs cannot exceed 510.';
  return null;
}
export function calculateIVRows(pokemon, level, nature, observed, evs, enabled) {
  const ready = pokemon && integer(level) && Number(level)>=1 && Number(level)<=100 && !evError(evs,enabled);
  return fields.map(([key,,label]) => {
    const row = {key,label,base:pokemon?.baseStats[key] ?? null,range:null,iv:null};
    if (!ready) return row;
    const stat = iv => emeraldStat(row.base,key,iv,enabled?Number(evs[key]):0,Number(level),nature || 'Hardy',pokemon.nationalDexId===292);
    row.range = [stat(0),stat(31)];
    const value = observed[key];
    if (value === '' || value == null) return row;
    if (!integer(value) || Number(value)<1) {row.iv='Enter a positive whole stat'; return row;}
    const possible = Array.from({length:32},(_,i)=>i).filter(iv=>stat(iv)===Number(value));
    row.iv = !possible.length ? 'No valid IV' : key==='hp' && pokemon.nationalDexId===292 ? 'Cannot determine from HP' : [possible[0],possible.at(-1)];
    return row;
  });
}
