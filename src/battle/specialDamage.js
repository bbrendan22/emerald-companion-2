// Step 6C: resolve five approved moves without duplicating ordinary modifiers.
import {battleMove} from './reference.js';
import {battleWeather,possibleAbilities} from './battleConditions.js';
const ids=new Set([311,284,323,263,280]);
const weatherTypes={none:'NORMAL',sun:'FIRE',rain:'WATER',hail:'ICE',sand:'ROCK'};
export const isSpecialDamageMove=move=>ids.has(move?.id);
export function resolveSpecialMove(move,attacker,defender,conditions={}) {
 if(!isSpecialDamageMove(move))return move;
 const resolved={...battleMove(move.id)};
 if(move.id===311){
  const types=new Set(possibleAbilities(attacker).flatMap(own=>possibleAbilities(defender).map(other=>
   weatherTypes[battleWeather(conditions.weather??'none',own,other)]??'NORMAL')));
  // Damage scenarios pin both abilities. Ambiguous metadata keeps its normal icon.
  if(types.size===1)resolved.type=[...types][0];
 }else if(move.id===284||move.id===323){
  const maximum=attacker?.stats?.hp;
  const hp=conditions.attacker?.currentHp??attacker?.initialCurrentHp??attacker?.currentHp??maximum;
  if(!Number.isInteger(maximum)||maximum<1||maximum>999||!Number.isInteger(hp)||hp<1||hp>maximum)return null;
  resolved.power=Math.max(1,Math.floor(150*hp/maximum));
 }
 return resolved;
}
export function specialDamageModifiers(move,conditions,weather) {
 const facade=move.id===263&&['burn','poison','toxic','paralysis'].includes(conditions.attacker?.status);
 return {ignoreScreens:move.id===280,damageMultiplier:facade||move.id===311&&weather!=='none'?2:1};
}
