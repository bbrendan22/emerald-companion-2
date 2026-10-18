import reference from '../../data/reference.json' with {type:'json'};
import {typeMultiplier} from '../../battle/typeMatchups.js';
const supported=new Set(['Levitate','Flash Fire','Water Absorb','Volt Absorb','Wonder Guard']);
// Standard Emerald slots only. Zero means no ability; duplicate slots are one ability.
const guaranteed=new Map(Object.entries(reference.species).flatMap(([id,pokemon])=>{
 const ids=[...new Set(pokemon.abilities.filter(id=>id>0))];
 const ability=ids.length===1 ? reference.abilityNames[ids[0]] : null;
 return supported.has(ability) ? [[id,ability]] : [];
}));
export const guaranteedCoverageAbility = pokemon => guaranteed.get(String(pokemon.id)) ?? null;
export function coverageMultiplier(attack,pokemon) {
 const base=typeMultiplier(attack,pokemon.types);
 const ability=guaranteedCoverageAbility(pokemon);
 if (ability==='Levitate' && attack==='GROUND' || ability==='Flash Fire' && attack==='FIRE' || ability==='Water Absorb' && attack==='WATER' || ability==='Volt Absorb' && attack==='ELECTRIC') return 0;
 if (ability==='Wonder Guard' && base<=1) return 0;
 return base;
}
