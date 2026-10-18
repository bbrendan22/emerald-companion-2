import {emeraldStat} from '../../battle/stats.js';
import {baseStatPercent} from '../../pokemon/statBars.js';
export {fields,natures,searchSpecies} from './ivCalculator.js';
import {fields,evError} from './ivCalculator.js';
export const statInputs = value => Object.fromEntries(fields.map(([key]) => [key,value]));
export const validStatInput = (value,max) => /^\d+$/.test(String(value)) && Number(value) <= max;
const defaultInputs = (values,fallback) => Object.fromEntries(fields.map(([key])=>[key,values[key]==='' ? fallback : values[key]]));
export const statEVError = evs => evError(defaultInputs(evs,'0'),true);
export function calculateStats(pokemon,level,nature,ivs,evs) {
 ivs=defaultInputs(ivs,'31');evs=defaultInputs(evs,'0');
 const ready = pokemon && validStatInput(level,100) && Number(level)>=1 && !statEVError(evs);
 return fields.map(([key,,label]) => {
  const valid = ready && validStatInput(ivs[key],31);
  return {key,label,value:valid ? emeraldStat(pokemon.baseStats[key],key,Number(ivs[key]),Number(evs[key]),Number(level),nature || 'Hardy',pokemon.nationalDexId===292) : null,
   bar:valid ? baseStatPercent(key,pokemon.baseStats[key]) : null};
 });
}
