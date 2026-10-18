// Migrated from Emerald Companion 1.0; calculation behavior retained.
import {battleWeather,weatherMove,possibleAbilities,battleTypes} from './battleConditions.js'
import {calculateHiddenPower} from './hiddenPower.js'
import {typeMultiplier} from './typeMatchups.js'
const explanations={
 HIDDEN_POWER:'Hidden Power’s type depends on its IVs. Complete IVs are needed.',
 OHKO:'A one-hit knockout move; success depends on level and accuracy.',
 SONICBOOM:'Deals 20 HP of damage, unless the target is immune.',
 DRAGON_RAGE:'Deals 40 HP of damage, unless the target is immune.',
 LEVEL_DAMAGE:'Damage equals the user’s level, unless the target is immune.',
 COUNTER:'Returns twice the physical damage received this turn.',
 MIRROR_COAT:'Returns twice the special damage received this turn.',
 BIDE:'Returns twice the damage stored over two turns.',
 PSYWAVE:'Damage varies with the user’s level and a random roll.',
 SUPER_FANG:'Removes half the target’s remaining HP, unless immune.',
 ENDEAVOR:'Lowers the target’s HP to the user’s remaining HP, unless immune.',
 LOW_KICK:'Power depends on the target’s weight.',
 FLAIL:'Power increases as the user’s remaining HP falls.',
 RETURN:'Power increases with friendship.',
 FRUSTRATION:'Power increases as friendship falls.',
 PRESENT:'Randomly deals damage or heals the target.',
 MAGNITUDE:'Power is chosen randomly each use.',
 FUTURE_SIGHT:'Delayed damage uses special Generation III rules and ignores type effectiveness.',
 BEAT_UP:'Damage depends on eligible party members and uses special Generation III rules.',
}
const soundMoves=new Set(['Growl','Roar','Sing','Supersonic','Screech','Snore','Uproar','Metal Sound','GrassWhistle','Hyper Voice'])
function abilityMultiplier(ability,move,type,base,status){
 if(move.name==='Struggle'||move.effect==='FUTURE_SIGHT'||move.effect==='BEAT_UP')return base
 if(ability==='Levitate'&&type==='GROUND'||ability==='Water Absorb'&&type==='WATER'||ability==='Volt Absorb'&&type==='ELECTRIC'||ability==='Flash Fire'&&type==='FIRE'&&status!=='freeze'||ability==='Soundproof'&&soundMoves.has(move.name))return 0
 if(ability==='Wonder Guard'&&base<=1)return 0
 if(ability==='Thick Fat'&&['FIRE','ICE'].includes(type))return base/2
 return base
}
const formatMultiplier=value=>String(value).replace(/^0\./,'.')
export function battleMoveEffectiveness(move,other,ivs,attacker={}){
 if(!move)return {label:'—',type:null}
 const hidden=move.effect==='HIDDEN_POWER'?calculateHiddenPower(ivs??{}):null
 const type=hidden?.type.toUpperCase()??move.type
 if(move.power===0)return {label:'—',type}
 const special=!hidden&&(move.power===1||['FUTURE_SIGHT','BEAT_UP'].includes(move.effect))
 const base=other&&type?typeMultiplier(type,other.types):null
 const unknownHidden=move.effect==='HIDDEN_POWER'&&!hidden
 const abilities=String(other?.ability??'Unknown').split(/\s*\/\s*/)
 const outcomes=base===null||unknownHidden?[]:abilities.flatMap(ability=>possibleAbilities(attacker).map(attackAbility=>{
  const weather=battleWeather(attacker.weather??'none',ability,attackAbility);
  const adjusted=weatherMove({...move,type},weather);
  const types=battleTypes(other,weather,ability);
  return {ability,type:adjusted.type,value:abilityMultiplier(ability,adjusted,adjusted.type,typeMultiplier(adjusted.type,types),other.status)}
 }))
 const values=[...new Set(outcomes.map(result=>result.value))].sort((a,b)=>a-b)
 const changed=outcomes.some(result=>result.value!==base)
 const displayType=new Set(outcomes.map(result=>result.type)).size===1?outcomes[0].type:type
 const abilityExplanation=changed?outcomes.map(result=>`${result.ability}: ${formatMultiplier(result.value)}×`).join('; ')+'.'+(abilities.includes('Thick Fat')?' Includes Thick Fat’s damage reduction.':''):null
 if(special){
  if(values.length&&values.every(value=>value===0)&&changed)return {label:'0×',type,multiplier:0,explanation:abilityExplanation}
  return {label:'*',type,explanation:[explanations[move.effect]??'This move uses special damage rules.',changed?'The target’s ability may block this move.':null].filter(Boolean).join(' ')}
 }
 const multiplier=values.length===1?values[0]:null
 return {label:values.length?`${values.map(formatMultiplier).join('/')}×`:'—',type:displayType,multiplier,explanation:abilityExplanation}
}
