// Steps 2–6C: single-use damage; explicit conditions, items and ability scenarios. No old engine.
import {orderedTypeDamage} from './typeMatchups.js';
import {stageStat,possibleAbilities} from './battleConditions.js';
import {directDamageModifiers} from './damageModifiers.js';
import {isFixedDamageMove,calculateFixedDamage} from './fixedDamage.js';
import {isVariableDamageMove,resolveVariableMove} from './variableDamage.js';
import {isSpecialDamageMove,resolveSpecialMove,specialDamageModifiers} from './specialDamage.js';
const physicalTypes=new Set(['NORMAL','FIGHTING','FLYING','POISON','GROUND','ROCK','BUG','GHOST','STEEL']);
const specialTypes=new Set(['FIRE','WATER','GRASS','ELECTRIC','PSYCHIC','ICE','DRAGON','DARK']);
// Ordinary connected-hit damage in the represented Singles conditions. Effects
// after the hit (drain/recoil/recharge/stat changes) do not alter its formula.
// Underground/airborne/underwater/minimized states are not represented here;
// their conditional bonuses, like Surf's, are outside this preview's scope.
const basicEffects=new Set(['HIT','HIGH_CRITICAL','PAY_DAY','ALWAYS_HIT','QUICK_ATTACK','VITAL_THROW',
 'BURN_HIT','FREEZE_HIT','PARALYZE_HIT','FLINCH_HIT','POISON_HIT','DEFENSE_DOWN_HIT',
 'CONFUSE_HIT','SPEED_DOWN_HIT','ATTACK_DOWN_HIT','ACCURACY_DOWN_HIT','SPECIAL_ATTACK_DOWN_HIT',
 'SPECIAL_DEFENSE_DOWN_HIT','DEFENSE_UP_HIT','ATTACK_UP_HIT','ALL_STATS_UP_HIT',
 'TRI_ATTACK','THIEF','RAPID_SPIN','KNOCK_OFF','BLAZE_KICK','POISON_FANG','POISON_TAIL',
 'EARTHQUAKE','ABSORB','RECOIL','DOUBLE_EDGE','RECOIL_IF_MISS','RECHARGE',
 'RAMPAGE','RAGE','THAW_HIT','SUPERPOWER','OVERHEAT','SECRET_POWER',
 'THUNDER','SKY_UPPERCUT','GUST','TWISTER','FLINCH_MINIMIZE_HIT','TRAP']);
// Struggle shares RECOIL but skips ordinary STAB/type handling in Emerald.
const nonOrdinaryMoveIds=new Set([165]);
const integer=(value,min,max)=>Number.isInteger(value)&&value>=min&&value<=max;
const validTypes=types=>Array.isArray(types)&&types.length>=1&&types.length<=2
 &&types.every(type=>physicalTypes.has(type)||specialTypes.has(type));
export function prepareBasicDamage(move,attacker,defender,conditions={}) {
 const variable=isVariableDamageMove(move)||isSpecialDamageMove(move);
 move=resolveSpecialMove(resolveVariableMove(move,attacker,defender,conditions),attacker,defender,conditions);
 if(!move||!attacker||!defender||(!variable&&(!basicEffects.has(move.effect)||nonOrdinaryMoveIds.has(move.id)))||!integer(move.power,variable?1:2,255))return null;
 const category=physicalTypes.has(move.type)?'Physical':specialTypes.has(move.type)?'Special':null;
 if(!category||!validTypes(attacker.types)||!validTypes(defender.types))return null;
 const attack=attacker.stats?.[category==='Physical'?'attack':'spAttack'];
 const defense=defender.stats?.[category==='Physical'?'defense':'spDefense'];
 const maximumHp=defender.stats?.hp,level=attacker.level;
 if(!integer(level,1,100)||!integer(attack,1,999)||!integer(defense,1,999)||!integer(maximumHp,1,999))return null;
 const modifiers=directDamageModifiers({move,attacker,defender,conditions,physical:category==='Physical',attack,defense});
 if(!modifiers)return null;
 const {critical}=modifiers;
 const attackStage=conditions.attacker?.stages?.[category==='Physical'?'attack':'spAttack']??0;
 const defenseStage=conditions.defender?.stages?.[category==='Physical'?'defense':'spDefense']??0;
 return {...modifiers,...specialDamageModifiers(move,conditions,modifiers.weather),level,
  // Emerald permits a zero offensive operand (e.g. Thick Fat then -6 SpA).
  attack:stageStat(modifiers.attack,critical?Math.max(0,attackStage):attackStage),
  defense:Math.max(1,stageStat(modifiers.defense,critical?Math.min(0,defenseStage):defenseStage)),
  category,maximumHp,type:move.type,
  stab:modifiers.attackerTypes.includes(move.type)};
}
export function basicBaseDamage({level,power,attack,defense,category,type,guts,ignoreScreens=false},conditions={}) {
 const levelFactor=Math.floor(2*level/5)+2;
 let subtotal=Math.floor(Math.floor(levelFactor*power*attack/defense)/50);
 // Singles modifiers precede +2. Crit bypasses screens but not burn/weather.
 if(category==='Physical'){
  if(conditions.attacker?.status==='burn'&&!guts)subtotal=Math.floor(subtotal/2);
  if(!ignoreScreens&&!conditions.critical&&conditions.defender?.screens?.reflect)subtotal=Math.floor(subtotal/2);
  subtotal=Math.max(1,subtotal);
 }else{
  if(!ignoreScreens&&!conditions.critical&&conditions.defender?.screens?.lightScreen)subtotal=Math.floor(subtotal/2);
  const boosts=conditions.weather==='rain'&&type==='WATER'||conditions.weather==='sun'&&type==='FIRE';
  const weakens=conditions.weather==='rain'&&type==='FIRE'||conditions.weather==='sun'&&type==='WATER';
  if(boosts)subtotal=Math.floor(subtotal*3/2);
  if(weakens)subtotal=Math.floor(subtotal/2);
 }
 return subtotal+2;
}
export function basicDamageRolls(base) {
 return Array.from({length:16},(_,i)=>base===0?0:Math.max(1,Math.floor(base*(85+i)/100)));
}
function singleDamage(move,attacker,defender,conditions) {
 if(isFixedDamageMove(move))return calculateFixedDamage(move,attacker,defender,conditions);
 const input=prepareBasicDamage(move,attacker,defender,conditions);if(!input)return null;
 const base=basicBaseDamage(input,{...conditions,weather:input.weather,critical:input.critical});
 const criticalDamage=base*(input.critical?2:1)*input.damageMultiplier;
 const withStab=input.stab?Math.floor(criticalDamage*3/2):criticalDamage;
 const typed=input.immune?0:orderedTypeDamage(withStab,input.type,input.defenderTypes);
 const rolls=basicDamageRolls(typed);
 return {base,rolls,min:rolls[0],max:rolls[15],maximumHp:input.maximumHp};
}
// Enumerate known possibilities, never average or choose one silently.
export function basicDamageScenarios(move,attacker,defender,conditions={}) {
 if(!move||!attacker||!defender)return [];
 const own=[...new Set(possibleAbilities(attacker))],other=[...new Set(possibleAbilities(defender))],groups=new Map();
 for(const attackAbility of own)for(const defendAbility of other){
  const result=singleDamage(move,{...attacker,ability:attackAbility},{...defender,ability:defendAbility},conditions);
  if(!result)return []; // An unknown branch cannot be safely discarded.
  const key=JSON.stringify(result.rolls),label=own.length>1&&other.length>1?`${attackAbility} → ${defendAbility}`:own.length>1?attackAbility:other.length>1?defendAbility:'';
  if(groups.has(key))groups.get(key).labels.push(label);else groups.set(key,{result,labels:[label]});
 }
 return [...groups.values()].map(({result,labels})=>({result,label:[...new Set(labels)].filter(Boolean).join(' / ')}));
}
// Single-range callers get a result only when every possible ability agrees.
export function calculateBasicDamage(move,attacker,defender,conditions={}) {
 const groups=basicDamageScenarios(move,attacker,defender,conditions);
 return groups.length===1?groups[0].result:null;
}
export function formatBasicDamage({min,max,maximumHp,fixed=false}) {
 if(min===0&&max===0)return '0.0% · 0 HP';
 if(fixed&&min===max)return `${(min*100/maximumHp).toFixed(1)}% · ${min} HP`;
 return `${(min*100/maximumHp).toFixed(1)}–${(max*100/maximumHp).toFixed(1)}% · ${min}–${max} HP`;
}
