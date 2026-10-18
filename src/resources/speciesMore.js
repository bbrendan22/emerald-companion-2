import data from './data/more.json' with {type:'json'};
import items from '../data/profileReference.json' with {type:'json'};
import {speciesByDex} from './speciesOverview.js';
const eggNames = {MONSTER:'Monster',WATER_1:'Water 1',WATER_2:'Water 2',WATER_3:'Water 3',BUG:'Bug',FLYING:'Flying',FIELD:'Field',FAIRY:'Fairy',GRASS:'Grass',HUMAN_LIKE:'Human-Like',MINERAL:'Mineral',AMORPHOUS:'Amorphous',DITTO:'Ditto',DRAGON:'Dragon',NO_EGGS_DISCOVERED:'Undiscovered'};
const statNames = {hp:'HP',attack:'Attack',defense:'Defense',spAttack:'Sp. Attack',spDefense:'Sp. Defense',speed:'Speed'};
export function wildHeldItems(common, rare) {
  if (common && common === rare) return `${items.itemNames[common]} · 100%`;
  return [[common,50,'common'],[rare,5,'rare']].filter(([id]) => id).map(([id,chance,slot]) => `${items.itemNames[id]} · ${chance}% (${slot})`).join(' / ') || 'None';
}
export function speciesMore(dex) {
 const info = data.species[dex], species = speciesByDex.get(dex); if (!info || !species) return null;
 return [
  ['Height',`${info.height} m`], ['Weight',`${info.weight} kg`],
  ['Experience growth',species.growthRate.replace('GROWTH_','').replaceAll('_',' ').toLowerCase()],
  ['Catch rate',`${info.catchRate} / 255`], ['Wild held items',wildHeldItems(info.commonItem,info.rareItem)],
  ['Base friendship',String(info.friendship)], ['Base experience yield',String(info.expYield)],
  ['EV yield',Object.entries(statNames).filter(([key]) => info.evYield[key]).map(([key,name]) => `${info.evYield[key]} ${name}`).join(' · ') || 'None'],
  ['Egg groups',info.eggGroups.map(group => eggNames[group]).join(' / ')], ['Egg cycles',String(info.eggCycles)],
  ['Approx. hatch steps',(info.eggCycles * 256).toLocaleString('en-US')],
 ];
}
