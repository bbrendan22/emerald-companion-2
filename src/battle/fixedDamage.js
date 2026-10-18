// Only the five approved Emerald fixed-damage move IDs. No ordinary formula/RNG.
import {battleMove} from './reference.js';
import {emeraldTypes,typeMultiplier} from './typeMatchups.js';
import {battleWeather,battleTypes} from './battleConditions.js';
import {directDamageImmune} from './damageModifiers.js';
const fixedMoves=new Map([[69,'level'],[101,'level'],[82,40],[49,20],[162,'half']]);
const integer=(value,min,max)=>Number.isInteger(value)&&value>=min&&value<=max;
const validTypes=types=>Array.isArray(types)&&types.length>=1&&types.length<=2&&types.every(type=>emeraldTypes.includes(type));
export const isFixedDamageMove=move=>fixedMoves.has(move?.id);
export function calculateFixedDamage(move,attacker,defender,conditions={}) {
 if(!isFixedDamageMove(move)||!attacker||!defender)return null;
 const reference=battleMove(move.id),mode=fixedMoves.get(move.id),maximumHp=defender.stats?.hp;
 if(!integer(attacker.level,1,100)||!integer(maximumHp,1,999)||!validTypes(attacker.types)||!validTypes(defender.types))return null;
 // Keep Step 5's safe unknown-copy/unimplemented Wonder Guard boundaries.
 if([attacker.ability,defender.ability].includes('Trace')||defender.ability==='Wonder Guard'
  ||[attacker.ability,defender.ability].some(a=>String(a).includes('/')))return null;
 let damage=mode==='level'?attacker.level:mode;
 if(mode==='half'){
  const hp=conditions.defender?.currentHp??defender.initialCurrentHp??defender.currentHp??maximumHp;
  if(!integer(hp,1,maximumHp))return null; // No minimum-one hit against a fainted/invalid target.
  damage=Math.max(1,Math.floor(hp/2));
 }
 const weather=battleWeather(conditions.weather??'none',attacker.ability,defender.ability);
 const types=battleTypes(defender,weather,defender.ability);
 // Scripts preserve immunity flags, then overwrite damage and clear weakness/
 // resistance flags. There is no STAB, type scaling or random multiplier here.
 if(typeMultiplier(reference.type,types)===0||directDamageImmune(reference.type,defender.ability,conditions.defender?.status))damage=0;
 return {fixed:true,base:damage,rolls:[damage],min:damage,max:damage,maximumHp};
}
