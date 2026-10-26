import {unresolvedTrace} from './conditionalAbilities.js';
import {battleMove,reference} from './reference.js';
import {emeraldTypes,typeMultiplier} from './typeMatchups.js';
import {preventionMessages,wonderGuardPrevention} from './abilityPrevention.js';

const modes=new Map([[69,'level'],[101,'level'],[82,40],[49,20],[162,'half'],[283,'difference'],[149,'psywave']]);
const abilities=new Set(Object.values(reference.abilityNames).filter(name=>name&&name!=='None'));
const integer=(value,min,max)=>Number.isInteger(value)&&value>=min&&value<=max;
const validTypes=types=>Array.isArray(types)&&types.length>=1&&types.length<=2&&Array.from(types).every(type=>emeraldTypes.includes(type));
export const isPsywaveMove=move=>move?.id===149;
export const isDeterministicMove=move=>modes.has(move?.id)&&!isPsywaveMove(move);
export function isLevelDamageResult(result) {
 if(result?.kind!=='level-damage'||result.totalOutcomes!==11||!Array.isArray(result.rolls)||result.rolls.length!==11
  ||!Array.from(result.rolls).every(n=>integer(n,0,150))||!Array.isArray(result.distribution))return false;
 const counts=new Map();for(const n of result.rolls)counts.set(n,(counts.get(n)??0)+1);
 const expected=[...counts].sort(([a],[b])=>a-b).map(([damage,count])=>({damage,count}));
 return result.min===expected[0].damage&&result.max===expected.at(-1).damage
  &&JSON.stringify(result.distribution)===JSON.stringify(expected);
}
export function isDeterministicResult(result) {
 return result?.kind==='deterministic-damage' && ['damage','immune','failed','blocked'].includes(result.outcome)
  && integer(result.damage,result.outcome==='damage'?1:0,result.outcome==='damage'?999:0)
  && (result.outcome!=='blocked'||Object.hasOwn(preventionMessages,result.reason))
  && result.rolls===undefined;
}
const outcome=(status,damage=0,reason=null)=>({kind:'deterministic-damage',outcome:status,damage,reason});
const currentHp=mon=>{
 const maximum=mon?.stats?.hp,hp=mon?.currentHp===null?maximum:mon?.currentHp;
 return integer(maximum,1,999)&&integer(hp,0,maximum)?hp:null;
};
// Separate from the conventional formula: no Attack/Defense, STAB, weather,
// critical, type scaling, items or random rolls. These are connected-hit previews.
// Emerald scripts retain type immunity flags, then overwrite the damage amount.
export function calculateDeterministicDamage(move,attacker,defender) {
 if(!isDeterministicMove(move))return null;
 return calculateDirectSpecialDamage(move,attacker,defender);
}
export function calculatePsywaveDamage(move,attacker,defender) {
 if(!isPsywaveMove(move))return null;
 return calculateDirectSpecialDamage(move,attacker,defender);
}
function calculateDirectSpecialDamage(move,attacker,defender) {
 if(!attacker||!defender||!validTypes(defender.types))return null;
 const canonical=battleMove(move.id),mode=modes.get(move.id);
 if(!abilities.has(attacker.ability)||!abilities.has(defender.ability))return null;
 if(attacker.currentHp===0)return outcome('failed',0,'attacker-fainted');
 if(defender.currentHp===0)return outcome('failed',0,'defender-fainted');
 let damage=mode;
 if(mode==='level'||mode==='psywave') {
  if(!integer(attacker.level,1,100))return null;
  damage=attacker.level;
 } else if(mode==='half'||mode==='difference') {
  const target=currentHp(defender);
  if(target===null)return null;
  if(target===0)return outcome('failed',0,'defender-fainted');
  if(mode==='half')damage=Math.max(1,Math.floor(target/2));
  else {
   const own=currentHp(attacker);
   if(own===null)return null;
   if(own===0)return outcome('failed',0,'attacker-fainted');
   // Endeavor tests HP before typecalc on cartridge.
   if(target<=own)return outcome('failed',0,'hp-not-lower');
   damage=target-own;
  }
 }
 if(typeMultiplier(canonical.type,defender.types)===0)return outcome('immune',0,'type-immunity');
 const prevention=wonderGuardPrevention(canonical,defender);
 if(prevention)return prevention;
 // Retain explicit boundaries for mechanics that the active core does not model.
 // SonicBoom is NOT in Emerald's Soundproof move list and requires no new ability.
 if(unresolvedTrace(attacker)||unresolvedTrace(defender))
  return {availability:'unsupported',reason:'unmodeled-ability'};
 if(mode==='psywave') {
  // Cmd_psywavedamageeffect rejection-samples r0..10, then uses integer division.
  // Emerald has no minimum-one clamp here or in adjustsetdamage/datahpupdate.
  // Level1 therefore retains five zero rolls and six one rolls.
  const rolls=Array.from({length:11},(_,r)=>Math.floor(attacker.level*(50+10*r)/100));
  const counts=new Map();for(const damage of rolls)counts.set(damage,(counts.get(damage)??0)+1);
  const distribution=[...counts].sort(([a],[b])=>a-b).map(([damage,count])=>({damage,count}));
  return {kind:'level-damage',rolls,totalOutcomes:11,distribution,min:rolls[0],max:rolls[10]};
 }
 return outcome('damage',damage);
}
