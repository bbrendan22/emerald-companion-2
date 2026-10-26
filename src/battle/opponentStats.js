import {frontierSetStats} from './frontierAdapter.js';
import {ivNatures} from './stats.js';
import {speciesByName} from './reference.js';
import {selectedTowerTrainer} from './towerTrainers.js';
import {towerOpponentIVs} from './towerRules.js';
import {frontierPokemon} from './data/frontierPokemon.js';
import {towerBrainSets} from './towerRules.js';
import {possibleMatchupSets} from './towerSets.js';

const keys = {hp:'hp',attack:'atk',defense:'def',spAttack:'spa',spDefense:'spd',speed:'spe'};
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

const towerSets=new Set([...frontierPokemon,...towerBrainSets]);
// Derive each input independently, retaining only agreement across canonical sets.
// Ordinary Tower friendship is known without a trainer; IVs are not.
export function opponentMoveInputs(state,sets=possibleMatchupSets(state)) {
  const unknown={friendship:null,ivs:null};
  if(state.rules?.facility!=='Tower' || !sets.length || sets.some(set=>!towerSets.has(set)))return unknown;
  const trainer=selectedTowerTrainer(state);
  if(state.selectedTrainer && (!trainer || sets.some(set=>!trainer.setIds.includes(set.id??`${set.brainSet}:${set.species}`))))return unknown;
  const friendships=new Set(sets.map(set=>set.moves.includes('Frustration')?0:255));
  const ivs=sets.map(set=>towerOpponentIVs(state.selectedTrainer,set));
  const known=ivs.every(iv=>!iv.assumed && integer(iv.value,0,31)) && new Set(ivs.map(iv=>iv.value)).size===1;
  return {friendship:friendships.size===1?[...friendships][0]:null,
    ivs:known?Object.fromEntries(Object.keys(keys).map(key=>[key,ivs[0].value])):null};
}

// Display-only ranges, derived from the identification list, never observations.
// Missing inputs invalidate the result rather than silently becoming neutral/zero/31.
export function opponentStatRanges(state, sets = possibleMatchupSets(state)) {
  const trainer = selectedTowerTrainer(state), level = state.rules.opponentLevel;
  if (!trainer || !sets.length || !integer(level,1,100)) return null;
  const calculated = [];
  for (const set of sets) {
    if (!trainer.setIds.includes(set.id ?? `${set.brainSet}:${set.species}`)) return null;
    const species = speciesByName.get(set.species.toLowerCase());
    const iv = towerOpponentIVs(state.selectedTrainer,set);
    if (iv.assumed || !integer(iv.value,0,31) || !ivNatures.includes(set.nature)
      || !Object.entries(keys).every(([key,short]) => integer(species?.baseStats?.[key],1,255)
        && integer(set.evs?.[short],0,255))
      || Object.values(set.evs).reduce((sum,ev) => sum+ev,0) > 510) return null;
    calculated.push(frontierSetStats(set,level,iv.value));
  }
  return Object.fromEntries(Object.keys(keys).map(key => {
    const values = calculated.map(stats => stats[key]);
    return [key,{min:Math.min(...values),max:Math.max(...values)}];
  }));
}

export function opponentStatDisplay(ranges) {
  return Object.fromEntries(Object.keys(keys).map(key => {
    const range = ranges?.[key];
    return [key,!range ? '—' : range.min === range.max ? range.min : `${range.min}–${range.max}`];
  }));
}
