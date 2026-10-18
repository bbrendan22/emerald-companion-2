import {frontierPokemon} from './data/frontierPokemon.js';
import {towerBrainSets, towerOpponentIVs} from './towerRules.js';
import {frontierSetStats} from './frontierAdapter.js';
import {stageStat,battleSpeedValues,possibleAbilities} from './battleConditions.js';
import {battleMoveEffectiveness} from './battleMoveEffectiveness.js';
import {calculateHiddenPower} from './hiddenPower.js';
import {battleMove} from './reference.js';

export const matchupStats = [['hp','HP'],['attack','Atk'],['defense','Def'],['spAttack','SpA'],['spDefense','SpD'],['speed','Spe']];
const rangeCache = new Map();
export function frontierStatRanges(rules, trainer = null) {
  // All ordinary migrated sets use this trainer's IV tier (31 when unselected
  // or selecting Anabel); Anabel sets retain their fixed cartridge IVs.
  // Team selections and abilities never change this reference population.
  const iv = towerOpponentIVs(trainer === 'Anabel' ? null : trainer).value;
  const level = rules.opponentLevel;
  const key = `${level}:${iv}`;
  if (rangeCache.has(key)) return rangeCache.get(key);
  const ranges = Object.fromEntries(matchupStats.map(([stat]) => [stat,{min:Infinity,max:-Infinity}]));
  for (const set of [...frontierPokemon, ...towerBrainSets]) {
    const stats = frontierSetStats(set, level, set.brainSet ? set.fixedIVs : iv);
    for (const [stat] of matchupStats) {
      ranges[stat].min = Math.min(ranges[stat].min, stats[stat]);
      ranges[stat].max = Math.max(ranges[stat].max, stats[stat]);
    }
  }
  Object.values(ranges).forEach(Object.freeze);Object.freeze(ranges);
  rangeCache.set(key,ranges);
  return ranges;
}
export function matchupBarPercent(value,{min,max}) {
  if (max === min) return value > max ? 100 : 5;
  return Math.max(5,Math.min(100,5+95*(value-min)/(max-min)));
}
// Display-only numbers: never replace mon.stats or feed this object to damage.
export function stagedMatchupStats(mon, stages = {}) {
  if (!mon) return null;
  return Object.fromEntries(matchupStats.map(([stat]) => [stat, stat === 'hp' ? mon.stats.hp : stageStat(mon.stats[stat],stages[stat])]));
}
export function fasterSide(player, opponent, playerStats = player?.stats, opponentStats = opponent?.stats) {
  if (!player || !opponent || playerStats.speed === opponentStats.speed) return null;
  return playerStats.speed > opponentStats.speed ? 'player' : 'enemy';
}
export function movePpLabel(move, player) {
  const base = battleMove(move.id)?.pp ?? move.pp;
  const max = Math.floor(base*(5+(move.ppUps ?? 0))/5);
  return player ? `${move.currentPp}/${max}` : `PP ${max}`;
}
export function matchupEffectiveness(move, attacker, defender) {
  if (!move) return {label:'-',type:null};
  const result = battleMoveEffectiveness(move,defender ? {...defender,status:'none'} : null,attacker.ivs,attacker);
  if (!defender || move.power === 0) return {...result,label:'-'};
  if (move.name === 'Struggle' || result.label === '*' || result.multiplier == null) return {...result,label:'*'};
  const value = result.multiplier;
  return {...result,label:`${String(value).replace(/^0\./,'.')}x`};
}
const variablePower = {
  BEAT_UP:'Party-based', OHKO:'OHKO', SONICBOOM:'20 HP', DRAGON_RAGE:'40 HP', LEVEL_DAMAGE:'Level',
  COUNTER:'2× received', MIRROR_COAT:'2× received', BIDE:'2× stored', PSYWAVE:'0.5–1.5× Lv.',
  SUPER_FANG:'½ HP', ENDEAVOR:'HP difference', LOW_KICK:'20–120', FLAIL:'20–200',
  RETURN:'1–102', FRUSTRATION:'1–102', PRESENT:'40–120 / heal', MAGNITUDE:'10–150',
  ERUPTION:'1–150', SPIT_UP:'100–300', WEATHER_BALL:'50 / 100',
  ROLLOUT:'30–960', FURY_CUTTER:'10–160', TRIPLE_KICK:'10 / 20 / 30',
};
const secondaryEffects = new Set(['BURN_HIT','FREEZE_HIT','PARALYZE_HIT','FLINCH_MINIMIZE_HIT','FLINCH_HIT',
  'POISON_HIT','TWINEEDLE','DEFENSE_DOWN_HIT','CONFUSE_HIT','SPEED_DOWN_HIT','ATTACK_DOWN_HIT','THUNDER',
  'SPECIAL_DEFENSE_DOWN_HIT','SKY_ATTACK','TRI_ATTACK','ACCURACY_DOWN_HIT','THAW_HIT','SNORE',
  'DEFENSE_UP_HIT','ATTACK_UP_HIT','TWISTER','ALL_STATS_UP_HIT','SECRET_POWER','SPECIAL_ATTACK_DOWN_HIT',
  'BLAZE_KICK','POISON_FANG','SEMI_INVULNERABLE','POISON_TAIL']);
export function movePopupValues(move, attacker, defender) {
  const hidden = move.effect === 'HIDDEN_POWER' ? calculateHiddenPower(attacker?.ivs ?? {}) : null;
  const power = move.effect === 'HIDDEN_POWER' ? hidden?.power ?? '30–70'
    : variablePower[move.effect] ?? (move.power > 1 ? move.power : '—');
  return {
    power,
    accuracy:move.effect === 'OHKO' ? 'Level-based' : move.accuracy > 0 ? `${move.accuracy}%` : '—',
    effect:secondaryEffects.has(move.effect) && move.effectChance > 0 ? `${move.effectChance}%` : '—',
    type:battleMoveEffectiveness(move,defender ?? {types:[],ability:'Unknown'},attacker?.ivs,attacker).type,
  };
}

// Conservative comparison: every possible effective Speed must agree. Raw
// stage-adjusted displayed numbers and stat bars remain separate.
export function effectiveFasterSide(player,opponent) {
 if(!player || !opponent)return null;
 const results=new Set(possibleAbilities(player).flatMap(ability=>possibleAbilities(opponent).map(otherAbility=>{
  const own={...player,ability},other={...opponent,ability:otherAbility};
  return Math.sign(battleSpeedValues(own,other)[0]-battleSpeedValues(other,own)[0]);
 })));
 if(results.size!==1 || results.has(0))return null;
 return results.has(1)?'player':'enemy';
}
