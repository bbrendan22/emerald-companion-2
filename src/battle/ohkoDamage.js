import {unresolvedTrace} from './conditionalAbilities.js';
import {battleMove,reference} from './reference.js';
import {emeraldTypes,typeMultiplier} from './typeMatchups.js';
import {directDamageImmune} from './damageModifiers.js';
import {wonderGuardPrevention} from './abilityPrevention.js';

const ids=new Set([12,32,90,329]);
const abilities=new Set(Object.values(reference.abilityNames).filter(name=>name&&name!=='None'));
const level=value=>Number.isInteger(value)&&value>=1&&value<=100;
export const isOhkoMove=move=>ids.has(move?.id);
const reasons={ohko:[null],immune:['type-immunity','sturdy','levitate','wonder-guard'],blocked:['lower-level']};
export function isOhkoResult(result) {
 return result?.kind==='ohko'&&Boolean(reasons[result.outcome]?.includes(result.reason))
  &&result.rolls===undefined&&result.damage===undefined&&result.min===undefined&&result.max===undefined;
}
const outcome=(value,reason=null)=>({kind:'ohko',outcome:value,reason});

// Emerald: BattleScript_EffectOHKO runs typecalc before Cmd_tryKO; Sturdy
// precedes the level check. No ordinary formula, HP amount or accuracy rolls.
// https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c
export function calculateOhkoDamage(move,attacker,defender) {
 if(!isOhkoMove(move)||!attacker||!defender||!level(attacker.level)||!level(defender.level)
  ||!abilities.has(attacker.ability)||!abilities.has(defender.ability)
  ||!Array.isArray(defender.types)||defender.types.length<1||defender.types.length>2
  ||!defender.types.every(type=>emeraldTypes.includes(type))
  ||attacker.currentHp===0||defender.currentHp===0)return null;
 const canonical=battleMove(move.id);
 if(typeMultiplier(canonical.type,defender.types)===0)return outcome('immune','type-immunity');
 if(directDamageImmune(canonical.type,defender.ability))return outcome('immune','levitate');
 if(wonderGuardPrevention(canonical,defender))return outcome('immune','wonder-guard');
 // Direct callers retain the unresolved Trace safeguard.
 if(unresolvedTrace(attacker)||unresolvedTrace(defender))return {availability:'unsupported',reason:'unresolved-trace'};
 if(defender.ability==='Sturdy')return outcome('immune','sturdy');
 if(attacker.level<defender.level)return outcome('blocked','lower-level');
 return outcome('ohko');
}
