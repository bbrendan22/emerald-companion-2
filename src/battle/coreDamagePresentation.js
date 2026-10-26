import {isOhkoResult} from './ohkoDamage.js';
import {isAggregateResult} from './twoHitDamage.js';
import {isDeterministicResult,isLevelDamageResult} from './deterministicDamage.js';
import {preventionMessages} from './abilityPrevention.js';
// Presentation only: preserve the core engine's exact integer damage outcomes.
export function coreDamageDisplayParts(result,maximumHp) {
  if(isOhkoResult(result))return {message:result.outcome.toUpperCase()};
  if(isDeterministicResult(result)) {
    if(result.outcome==='blocked')return {message:preventionMessages[result.reason]};
    if(result.outcome==='immune')return {message:'Immune.'};
    if(result.outcome==='failed')return {message:'Move fails.'};
    if(!Number.isInteger(maximumHp)||maximumHp<1||maximumHp>999)return null;
    return {percentage:`${(result.damage*100/maximumHp).toFixed(1)}%`,hp:`${result.damage} HP damage`};
  }
  if (!result || (result.kind !== 'standard-damage' && !isLevelDamageResult(result) && !isAggregateResult(result))
    || !Number.isInteger(maximumHp) || maximumHp < 1 || maximumHp > 999
    || !Number.isInteger(result.min) || !Number.isInteger(result.max)
    || result.min < 0 || result.max < result.min) return null;
  const percentage = result.max === 0 ? '0% – 0%'
    : `${(result.min * 100 / maximumHp).toFixed(1)}% – ${(result.max * 100 / maximumHp).toFixed(1)}%`;
  return {percentage,hp:`${result.min}–${result.max} HP damage`,
    ...(isLevelDamageResult(result)?{note:'11 possible level-based damage rolls'}
      :result.kind==='aggregate-damage' && result.condition==='selected-hits-connected' && result.hitPowers
      ? {note:result.hitCount===1?'If 1 hit connects':`If all ${result.hitCount} hits connect`}
      :result.kind==='aggregate-damage' && result.condition==='all-three-connected' ? {note:'If all 3 hits connect'} : {})};
}
