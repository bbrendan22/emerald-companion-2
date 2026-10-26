import {fieldAbilityPresence} from './fieldAbilities.js';
import {resolveBattleAbility,unresolvedTrace} from './conditionalAbilities.js';
import {isOhkoMove,calculateOhkoDamage} from './ohkoDamage.js';
import {isUnsupportedSpecialMove} from './moveDamagePolicy.js';
import {isTwoHitMove,calculateTwoHitDamage,isVariableMultiHitMove,calculateVariableMultiHitDamage,isTripleKickMove,calculateTripleKickDamage} from './twoHitDamage.js';
import {earlyAbilityPrevention,wonderGuardPrevention} from './abilityPrevention.js';
import {isConditionalMove,isConsecutiveUsePower,calculateConditionalDamage} from './conditionalDamage.js';
import {battleMove,reference} from './reference.js';
import {isDeterministicMove,calculateDeterministicDamage,isPsywaveMove,calculatePsywaveDamage} from './deterministicDamage.js';
import {resolveConventionalMove,isSupportedDynamicMove,isHpDependentMove} from './dynamicMoves.js';
// Core Gen III damage through Step 6J-1: Psywave and damaging Present outcomes.
import {heldItemAttack,heldItemDefense,heldItemSpecies} from './heldItemModifiers.js';
import {directDamageImmune} from './damageModifiers.js';
import {stageStat,resolveEffectiveWeather,resolveScriptWeather,battleTypes} from './battleConditions.js';
import {orderedTypeDamage,typeMultiplier} from './typeMatchups.js';
// Arithmetic follows pret/pokeemerald src/pokemon.c CalculateBaseDamage:
// https://github.com/pret/pokeemerald/blob/master/src/pokemon.c
const physicalTypes = new Set(['NORMAL','FIGHTING','FLYING','POISON','GROUND','ROCK','BUG','GHOST','STEEL']);
const specialTypes = new Set(['FIRE','WATER','GRASS','ELECTRIC','PSYCHIC','ICE','DRAGON','DARK']);
const lowHpTypes = {Torrent:'WATER',Blaze:'FIRE',Overgrow:'GRASS',Swarm:'BUG'};
const majorStatuses = new Set(['burn','poison','toxic','paralysis','sleep','freeze']);
const knownAbilities=new Set(Object.values(reference.abilityNames).filter(name=>name && name!=='None'));
const specialConventionalIds=new Set([206,153,120,165]);
const explosionIds=new Set([153,120]);
const integer = (value,min,max) => Number.isInteger(value) && value >= min && value <= max;

export function gen3DamageCategory(type) {
  return physicalTypes.has(type) ? 'Physical' : specialTypes.has(type) ? 'Special' : null;
}

// Validate raw stats before staging; a missing stat must never become a guess.
// An omitted stage is the existing neutral default; malformed stages are unknown.
export function coreStageStat(value,stage=0) {
  if (!integer(value,1,999) || !Number.isInteger(stage)) return null;
  return stageStat(value,stage);
}

// Emerald operand order: Huge/Pure Power, held item, Hustle/Guts, then stages.
// These abilities affect Attack only; matching items can also boost Special Attack.
export function offensiveAbilityModifiers(attack,ability,status='none',item='None',type='NORMAL',physical=true,holder,battleContext={}) {
  if (!integer(attack,1,999)) return null;
  const guts = physical && ability === 'Guts' && majorStatuses.has(status);
  if (physical && (ability === 'Huge Power' || ability === 'Pure Power')) attack *= 2;
  attack=heldItemAttack(attack,item,type,physical,holder,battleContext);
  if(attack===null)return null;
  if (physical && (ability === 'Hustle' || guts)) attack = Math.floor(attack * 3 / 2);
  return {attack,ignoreBurn:guts};
}

// Emerald boosts integer move power, rather than final damage, for these
// abilities. HP is required only when this ability can affect the move type.
export function lowHpMovePower(power,type,ability,currentHp,maximumHp) {
  if (lowHpTypes[ability] !== type) return power;
  if (!integer(maximumHp,1,999) || !integer(currentHp,0,maximumHp)) return null;
  return currentHp * 3 <= maximumHp ? Math.floor(power * 3 / 2) : power;
}

// Consume the explicit defending-side count (derived from slot liveness in
// the Battle page); never infer it from format, team size or the viewed pair.
function screenReduction(physical,screens,critical,moveId,context) {
  // Brick Break removes both screens before damagecalc. Preview its hit without
  // mutating the stored Battle Conditions; it also bypasses unknown Doubles count.
  if(critical || moveId===280)return 'none';
  const active=screens?.[physical?'reflect':'lightScreen'];
  if(active===undefined || active===false)return 'none';
  if(active!==true)return null;
  const format=context?.format===undefined?'Singles':context.format;
  if(format==='Singles')return 'half';
  if(format!=='Doubles')return null;
  if(context.defenderSideAlive===1)return 'half';
  if(context.defenderSideAlive===2)return 'two-thirds';
  return {availability:'unsupported',reason:'unknown-defender-side-count'};
}

export function neutralBaseDamage({level,attack,spAttack,defense,spDefense,power,type,moveId,attackStage=0,defenseStage=0,weather='none',critical=false,burnReduction=false,ability=null,status='none',currentHp,maximumHp,flashFireActivated=false,defenderAbility=null,defenderStatus='none',defenderScreens={},item='None',attackerDex,defenderDex,defenderItem='None',defenderTransformed,battleContext={}} = {}) {
  weather=resolveEffectiveWeather(weather,ability,defenderAbility);
  const category = gen3DamageCategory(type);
  const offense = category === 'Physical' ? attack : spAttack;
  const resistance = category === 'Physical' ? defense : spDefense;
  if (typeof burnReduction !== 'boolean' || typeof critical !== 'boolean' || !Number.isInteger(attackStage) || !Number.isInteger(defenseStage)
    || weather===null || !category || !integer(level,1,100) || !(integer(power,1,255)||isConsecutiveUsePower(moveId,power))
    || !integer(offense,1,999) || !integer(resistance,1,999)) return null;
  const effectivePower = lowHpMovePower(power,type,ability,currentHp,maximumHp);
  if (effectivePower === null) return null;
  const offensive = offensiveAbilityModifiers(offense,ability,status,item,type,category === 'Physical',{dex:attackerDex},battleContext);
  if(offensive===null)return null;
  const itemResistance=heldItemDefense(resistance,defenderItem,category === 'Physical',{dex:defenderDex,transformed:defenderTransformed},battleContext);
  if(itemResistance===null)return null;
  // Emerald applies Thick Fat and Marvel Scale to raw operands before stages.
  // Fire/Ice are Special in Gen III; a halved offensive operand may become zero.
  let effectiveOffense = defenderAbility === 'Thick Fat' && (type === 'FIRE' || type === 'ICE')
    ? Math.floor(offensive.attack / 2) : offensive.attack;
  // Emerald FIELD_SPORT searches either side. Apply once, after held items
  // and Thick Fat, before stat stages. Unrepresented Doubles partners are unknown.
  if(category==='Special' && ['Plus','Minus'].includes(ability)) {
    const opposite=ability==='Plus'?'Minus':'Plus';
    const present=battleContext?.format==='Doubles'&&battleContext.battlefield
      ? fieldAbilityPresence(battleContext,{ability},{ability:defenderAbility},[opposite])
      : defenderAbility===opposite?true:null;
    if(present===true)effectiveOffense=Math.floor(effectiveOffense*3/2);
    else if(battleContext?.format==='Doubles'&&present!==false)
      return {availability:'unsupported',reason:'unknown-plus-minus-field'};
  }
  let effectiveResistance = category === 'Physical' && defenderAbility === 'Marvel Scale' && majorStatuses.has(defenderStatus)
    ? Math.floor(itemResistance * 3 / 2) : itemResistance;
  // Emerald halves the item/Marvel Scale-adjusted raw Defense BEFORE stages.
  if (category==='Physical' && explosionIds.has(moveId)) effectiveResistance=Math.floor(effectiveResistance/2);
  // Raw stats were validated above. Ability-adjusted operands can exceed 999.
  const stagedOffense = stageStat(effectiveOffense,critical ? Math.max(0,attackStage) : attackStage);
  const stagedResistance = stageStat(effectiveResistance,critical ? Math.min(0,defenseStage) : defenseStage);
  if (stagedOffense === null || stagedResistance === null) return null;
  const levelFactor = Math.floor(2 * level / 5) + 2;
  const quotient = Math.floor(levelFactor * effectivePower * stagedOffense / Math.max(1,stagedResistance));
  let subtotal = Math.floor(quotient / 50);
  // Emerald halves the Physical subtotal before its minimum-one rule and +2.
  // Active Guts supplies its own Attack boost and suppresses this reduction.
  if (category === 'Physical' && burnReduction && !offensive.ignoreBurn) subtotal = Math.floor(subtotal / 2);
  // Screens act on the integer subtotal, after burn but before weather/+2.
  const screen=screenReduction(category==='Physical',defenderScreens,critical,moveId,battleContext);
  if(screen===null || screen?.availability==='unsupported')return screen;
  if(screen==='half')subtotal=Math.floor(subtotal/2);
  else if(screen==='two-thirds')subtotal=2*Math.floor(subtotal/3);
  // Emerald halves only canonical BOTH-target damage, after screens and before
  // weather/+2. Critical hits bypass screens, but never this spread division.
  const canonical=battleMove(moveId);
  if(battleContext?.format==='Doubles' && canonical?.power>0 && canonical.target==='MOVE_TARGET_BOTH') {
    if(![1,2].includes(battleContext.defenderSideAlive))return {availability:'unsupported',reason:'unknown-defender-side-count'};
    if(battleContext.defenderSideAlive===2)subtotal=Math.floor(subtotal/2);
  }
  // Emerald CalculateBaseDamage applies weather to this subtotal BEFORE +2.
  // Fire/Water are Special in Gen III. SolarBeam also weakens in adverse weather.
  const boosted = weather === 'rain' && type === 'WATER' || weather === 'sun' && type === 'FIRE';
  const weakened = weather === 'rain' && type === 'FIRE' || weather === 'sun' && type === 'WATER';
  if (boosted) subtotal = Math.floor(subtotal * 3 / 2);
  if (weakened) subtotal = Math.floor(subtotal / 2);
  // CalculateBaseDamage halves SolarBeam before +2, retaining reference power 120.
  if (moveId === 76 && ['rain','sand','hail'].includes(weather)) subtotal = Math.floor(subtotal / 2);
  // Emerald applies activated Flash Fire after weather, before +2 (not to SpA).
  if (ability==='Flash Fire' && type==='FIRE') {
    if(typeof flashFireActivated!=='boolean')return null;
    if(flashFireActivated)subtotal=Math.floor(subtotal*3/2);
  }
  // Emerald floors Physical damage to 1 before +2; Special has no such floor.
  const base = (category === 'Physical' ? Math.max(1,subtotal) : subtotal) + 2;
  return {kind:'neutral-base',category,base};
}

// Conventional connected-hit eligibility, shared with the legacy engine.
// Charging turns, use restrictions and conditional bonuses do not prevent a
// baseline hit calculation at reference power. These entries do not resolve
// execution conditions or underground interactions.
// Fixed/variable damage, multihit totals and exceptional damage formulas remain
// outside this path until their mechanics are explicitly supported.
const conventionalEffects=new Set(['HIT','HIGH_CRITICAL','PAY_DAY','ALWAYS_HIT','QUICK_ATTACK','VITAL_THROW',
 'BURN_HIT','FREEZE_HIT','PARALYZE_HIT','FLINCH_HIT','POISON_HIT','DEFENSE_DOWN_HIT',
 'CONFUSE_HIT','SPEED_DOWN_HIT','ATTACK_DOWN_HIT','ACCURACY_DOWN_HIT','SPECIAL_ATTACK_DOWN_HIT',
 'SPECIAL_DEFENSE_DOWN_HIT','DEFENSE_UP_HIT','ATTACK_UP_HIT','ALL_STATS_UP_HIT',
 'TRI_ATTACK','THIEF','RAPID_SPIN','KNOCK_OFF','BLAZE_KICK','POISON_FANG','POISON_TAIL',
 'EARTHQUAKE','ABSORB','RECOIL','DOUBLE_EDGE','RECOIL_IF_MISS','RECHARGE',
 'RAMPAGE','RAGE','THAW_HIT','SUPERPOWER','OVERHEAT','SECRET_POWER',
 'THUNDER','SKY_UPPERCUT','GUST','TWISTER','FLINCH_MINIMIZE_HIT','TRAP',
 'FACADE','SEMI_INVULNERABLE','RAZOR_WIND','SKULL_BASH','SKY_ATTACK','SOLAR_BEAM',
 'FOCUS_PUNCH','SNORE','DREAM_EATER','FAKE_OUT','UPROAR','PURSUIT','REVENGE',
 'SMELLINGSALT','BRICK_BREAK']);

export function isConventionalDamageMove(move) {
  return Boolean(move && conventionalEffects.has(move.effect) && move.id !== 165
    && integer(move.power,2,255));
}

const validTypes = types => Array.isArray(types) && types.length >= 1 && types.length <= 2
  && Array.from(types).every(type => gen3DamageCategory(type) !== null);

// Emerald battle_script_commands.c: Cmd_typecalc applies STAB, then table-ordered
// ModulateDmgByType calls. ApplyRandomDmgMultiplier runs last (85–100 inclusive).
// Preserve all 16 outcomes, including duplicates; never sample randomness here.
export function applyCoreDamageModifiers(baseResult,type,attackerTypes,defenderTypes,critical=false,defenderAbility=null,defenderStatus='none',moveDamageMultiplier=1,moveId,helpingHand=false) {
  if (typeof helpingHand !== 'boolean' || ![1,2].includes(moveDamageMultiplier) || typeof critical !== 'boolean' || !baseResult || baseResult.kind !== 'neutral-base'
    || !Number.isSafeInteger(baseResult.base) || baseResult.base < 2
    || !gen3DamageCategory(type) || !validTypes(attackerTypes) || !validTypes(defenderTypes)) return null;
  // Emerald Cmd_typecalc returns immediately for Struggle, skipping STAB/types.
  const typeless=moveId===165;
  const stab = !typeless && attackerTypes.includes(type) ? 1.5 : 1;
  // Emerald Cmd_damagecalc doubles AFTER weather/+2, BEFORE STAB/types/random.
  // Facade/SmellingSalt scripts set sDMG_MULTIPLIER; Cmd_damagecalc applies
  // it alongside critical, after +2 and before STAB/type/random truncation.
  const criticalDamage = baseResult.base * (critical ? 2 : 1) * moveDamageMultiplier;
  // Emerald Cmd_damagecalc: Helping Hand follows critical/script multipliers,
  // before Cmd_typecalc applies STAB and type effectiveness.
  const helpedDamage = helpingHand ? Math.floor(criticalDamage * 3 / 2) : criticalDamage;
  const withStab = stab === 1.5 ? Math.floor(helpedDamage * 3 / 2) : helpedDamage;
  // Shared Gen III gate only: no healing, activation state or offensive boost.
  const immune = !typeless && directDamageImmune(type,defenderAbility,defenderStatus);
  const effectiveness = typeless ? 1 : immune ? 0 : typeMultiplier(type,defenderTypes);
  const typed = typeless ? withStab : immune ? 0 : orderedTypeDamage(withStab,type,defenderTypes);
  const rolls = Array.from({length:16},(_,index) =>
    typed === 0 ? 0 : Math.max(1,Math.floor(typed * (85 + index) / 100)));
  return {...baseResult,kind:'standard-damage',rolls,min:rolls[0],max:rolls[15],stab,effectiveness};
}

// Accept the existing matchup models directly. Ranges/unknown stats are rejected
// by integer validation; never parse display strings or substitute guessed stats.
// Compare complete distributions, not just endpoints or intermediate base damage.
// An already unavailable calculation retains its original safeguard.
const fieldUnavailable=reason=>({availability:'unsupported',reason});
function fieldDamageKey(result) {
 if(!result)return null;
 if(result.conditions)return result.conditions.map(c=>fieldDamageKey(c.result));
 if(result.damage===0 || result.rolls?.every(n=>n===0))return 'no-damage';
 return [result.kind,result.outcome,result.reason,result.damage,result.rolls,result.distribution];
}
function guardFieldResult(result,alternatives,metadataUncertain=false) {
 if(result?.conditions)return {...result,conditions:result.conditions.map((condition,i)=>({...condition,
  result:guardFieldResult(condition.result,alternatives.map(a=>a?.conditions?.[i]?.result))}))};
 if(metadataUncertain)return {...(result?.availability==='unsupported'?result:fieldUnavailable('unknown-weather-suppression-field')),fieldMoveMetadata:null};
 if(!result || result.availability==='unsupported')return result;
 return alternatives.some(other=>JSON.stringify(fieldDamageKey(result))!==JSON.stringify(fieldDamageKey(other)))
  ? fieldUnavailable('unknown-weather-suppression-field'):result;
}
export function calculateCoreDamage(move,attacker,defender,weather='none',critical=false,battleContext={}) {
 const hasField=battleContext?.format==='Doubles'&&battleContext.battlefield;
 const fieldDamp=hasField&&explosionIds.has(move?.id)?fieldAbilityPresence(battleContext,attacker,defender,['Damp']):null;
 if(fieldDamp===true&&!isUnsupportedSpecialMove(move))return earlyAbilityPrevention(move,{ability:'Damp'},defender);
 const result=calculateFieldDamage(move,attacker,defender,weather,critical,battleContext);
 if(battleContext?.format!=='Doubles'||!attacker||!defender||isUnsupportedSpecialMove(move))return result;
 const a=resolveBattleAbility(attacker),d=resolveBattleAbility(defender);
 if(unresolvedTrace(a)||unresolvedTrace(d))return result;
 // Cmd_tryexplosion scans all four battler records without HP/absence checks.
 // Counts cannot rule out a retained Damp ability on an unrepresented record.
 if(explosionIds.has(move?.id)) {
  if(hasField&&fieldDamp===false)return result;
  if(hasField&&fieldDamp===null&&result&&result.availability!=='unsupported')return fieldUnavailable('unknown-damp-field');
  if(earlyAbilityPrevention(move,a,d)||!result||result.availability==='unsupported'
   ||fieldDamageKey(result)==='no-damage')return result;
  return fieldUnavailable('unknown-damp-field');
 }
 if(!['rain','sun','sand','hail'].includes(weather))return result;
 const scriptWeather=resolveScriptWeather(weather,a,d,battleContext);
 const basePresence=hasField?fieldAbilityPresence(battleContext,a,d,['Cloud Nine','Air Lock']):null;
 const scriptPresence=hasField?fieldAbilityPresence(battleContext,a,d,['Cloud Nine','Air Lock'],{livingOnly:true}):null;
 const baseWeather=basePresence===true?'none':resolveEffectiveWeather(weather,a.ability,d.ability);
 if(hasField&&basePresence!==null&&scriptPresence!==null)return result;
 if(scriptWeather==='none'&&baseWeather==='none')return result;
 // Neither lookup checks absentBattlerFlags. Active counts alone do not
 // establish the HP/ability records of the two unrepresented battler slots.
 const resolved=resolveConventionalMove(move,a,d,scriptWeather,battleContext);
 const baseSensitive=(['sun','rain'].includes(weather)&&['FIRE','WATER'].includes(resolved?.type))
  ||move?.id===76&&['rain','sand','hail'].includes(weather);
 const forecastSensitive=['sun','rain','hail'].includes(weather)&&[a,d].some(mon=>mon.dex===351&&mon.ability==='Forecast'&&mon.currentHp!==0);
 if(!baseSensitive&&!forecastSensitive&&move?.id!==311)return result;
 const alternatives=[];
 if(baseSensitive&&baseWeather!=='none'&&(!hasField||basePresence===null))alternatives.push(calculateFieldDamage(move,a,d,weather,critical,battleContext,'none'));
 if(scriptWeather!=='none'&&(!hasField||scriptPresence===null))alternatives.push(calculateFieldDamage(move,a,d,'none',critical,battleContext,'none'));
 const metadataUncertain=move?.id===311&&scriptWeather!=='none'&&(!hasField||scriptPresence===null);
 return guardFieldResult(result,alternatives,metadataUncertain);
}

function calculateFieldDamage(move,attacker,defender,weather='none',critical=false,battleContext={},baseWeather=weather) {
  if (!attacker || !defender || isUnsupportedSpecialMove(move)) return null;
  attacker=resolveBattleAbility(attacker);defender=resolveBattleAbility(defender);
  if(battleContext?.format==='Doubles'&&battleContext.battlefield
    &&fieldAbilityPresence(battleContext,attacker,defender,['Cloud Nine','Air Lock'])===true)baseWeather='none';
  // Fixed-damage and OHKO scripts discard offensive modifiers. An unresolved attacker
  // ability matters only if weather suppression can change Night Shade immunity
  // against Forecast Castform. Do not invent a neutral copied ability.
  const fixed=isDeterministicMove(move),psywave=isPsywaveMove(move),direct=fixed||psywave||isOhkoMove(move);
  if (direct && unresolvedTrace(attacker)
    && !(move.id===101 && defender.dex===351 && defender.ability==='Forecast' && ['sun','rain','hail'].includes(weather)))
    attacker={...attacker,traceResolved:true};
  // Direct chart immunity is certain for every copied ability on non-Castform.
  if (direct && unresolvedTrace(defender) && defender.dex!==351
    && validTypes(defender.types) && typeMultiplier(battleMove(move.id).type,defender.types)===0)
    defender={...defender,traceResolved:true};
  if(unresolvedTrace(attacker)||unresolvedTrace(defender))
    return earlyAbilityPrevention(move,attacker,defender)??{availability:'unsupported',reason:'unresolved-trace'};
  // Emerald Cmd_critcalc rejects armor crits before damage/stages/screens.
  // Resolve once per pinned ability pair, including each aggregate's crit policy.
  if (critical===true && ['Battle Armor','Shell Armor'].includes(defender.ability)) critical=false;
  // Fixed amounts ignore weather except when Forecast changes type immunity.
  // Project once per pinned ability pair, before every supported damage path.
  if ((!fixed && !psywave) || [attacker,defender].some(mon=>mon.dex===351 && mon.ability==='Forecast')) {
    weather=resolveScriptWeather(weather,attacker,defender,battleContext);
    if(weather===null)return null;
    attacker={...attacker,types:battleTypes(attacker,weather)};
    defender={...defender,types:battleTypes(defender,weather)};
  }
  const calculateHit=(m,a,d,w,c,context)=>calculateConventionalDamage(m,a,d,w,c,context,baseWeather);
  if (fixed) return calculateDeterministicDamage(move,attacker,defender);
  if (psywave) return calculatePsywaveDamage(move,attacker,defender);
  if(isOhkoMove(move))return calculateOhkoDamage(move,attacker,defender);
  if(isConditionalMove(move))return calculateConditionalDamage(move,attacker,defender,weather,critical,battleContext,calculateHit);
  if (isTwoHitMove(move)) return calculateTwoHitDamage(move,attacker,defender,weather,critical,battleContext,calculateHit);
  if (isVariableMultiHitMove(move)) return calculateVariableMultiHitDamage(move,attacker,defender,weather,critical,battleContext,calculateHit);
  if (isTripleKickMove(move)) return calculateTripleKickDamage(move,attacker,defender,weather,critical,battleContext,calculateHit);
  return calculateHit(move,attacker,defender,weather,critical,battleContext);
}

function calculateConventionalDamage(move,attacker,defender,weather,critical,battleContext,baseWeather=weather) {
  // Four canonical IDs only; the shared conventional effect allowlist stays intact.
  if (specialConventionalIds.has(move?.id)) move=battleMove(move.id);
  move=resolveConventionalMove(move,attacker,defender,weather,battleContext);
  // Conditional dispatch supplies only canonical case metadata, including the
  // verified dynamic powers480/960. The ordinary effect/power gate stays strict.
  if (!move || !(isConventionalDamageMove(move) || isSupportedDynamicMove(move) || isConditionalMove(move) || specialConventionalIds.has(move.id))) return null;
  if (explosionIds.has(move.id)) {
    // Scenario enumeration pins scalar abilities; never select a slash-list entry.
    if (!knownAbilities.has(attacker.ability) || !knownAbilities.has(defender.ability))return null;
    const damp=earlyAbilityPrevention(move,attacker,defender);
    if(damp)return damp;
    if (unresolvedTrace(attacker)||unresolvedTrace(defender))
      return {availability:'unsupported',reason:'unresolved-trace'};
  }
  const prevention=earlyAbilityPrevention(move,attacker,defender)||wonderGuardPrevention(move,defender);
  if(prevention)return prevention;
  let damageCap=null;
  if (move.id===206) {
    const maximum=defender.stats?.hp,hp=defender.currentHp===null?maximum:defender.currentHp;
    if (!integer(maximum,1,999) || !integer(hp,1,maximum))return null;
    damageCap=hp-1;
  }
  // HP resolution validated the maximum; share null-as-full with low-HP abilities.
  if (isHpDependentMove(move) && attacker.currentHp === null) attacker={...attacker,currentHp:attacker.stats.hp};
  const physical = gen3DamageCategory(move.type) === 'Physical';
  const baseResult = neutralBaseDamage({level:attacker.level,weather:baseWeather,critical,
    flashFireActivated:attacker.flashFireActivated,burnReduction:attacker.status === 'burn',ability:attacker.ability,status:attacker.status,item:attacker.item,
    currentHp:attacker.currentHp,maximumHp:attacker.stats?.hp,
    defenderAbility:defender.ability,defenderStatus:defender.status,defenderScreens:defender.screens,
    attackerDex:heldItemSpecies(attacker),defenderDex:heldItemSpecies(defender),
    defenderItem:defender.item,defenderTransformed:defender.transformed,battleContext,
    attackStage:attacker.stages?.[physical ? 'attack' : 'spAttack'],
    defenseStage:defender.stages?.[physical ? 'defense' : 'spDefense'],
    attack:attacker.stats?.attack,spAttack:attacker.stats?.spAttack,
    defense:defender.stats?.defense,spDefense:defender.stats?.spDefense,
    power:move.formulaPower ?? move.power,type:move.type,moveId:move.id});
  if(baseResult?.availability==='unsupported')return baseResult;
  // Connected hit without Substitute: no paralysis cure or volatile state mutation.
  const doubled = move.id === 263 && ['burn','poison','toxic','paralysis'].includes(attacker.status)
    || move.id === 265 && defender.status === 'paralysis';
  const result=applyCoreDamageModifiers(baseResult,move.type,attacker.types,defender.types,critical,defender.ability,defender.status,doubled ? 2 : move.damageMultiplier ?? 1,move.id,battleContext?.format==='Doubles' && attacker.helpingHand===true);
  if (!result || damageCap===null)return result;
  // False Swipe caps every final roll after STAB/types/random, not just endpoints.
  const rolls=result.rolls.map(roll=>Math.min(roll,damageCap));
  return {...result,rolls,min:rolls[0],max:rolls[15]};
}
