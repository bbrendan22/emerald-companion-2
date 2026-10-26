import {battleMove} from './reference.js';
import {calculateHiddenPower} from './hiddenPower.js';
import {resolveScriptWeather} from './battleConditions.js';
import weights from './data/weights.json' with {type:'json'};

const hpIds=new Set([175,179,284,323]);
const ids=new Set([216,218,237,67,311,...hpIds]);
export const isHpDependentMove=move=>hpIds.has(move?.id);
export const isSupportedDynamicMove=move=>ids.has(move?.id);
export function lowKickPower(weight) {
  if(typeof weight!=='number' || !Number.isFinite(weight) || weight<=0)return null;
  const bucket=[10,25,50,100,200].findIndex(limit=>weight<limit);
  return bucket<0?120:(bucket+1)*20;
}

// Only explicitly supported cartridge moves may bypass the conventional effect/power gate.
// Emerald's zero friendship override falls back to the reference power of 1.
// See pret/pokeemerald battle_script_commands.c and pokemon.c CalculateBaseDamage.
export function resolveConventionalMove(move,attacker,defender,weather='none',battleContext) {
  if(!isSupportedDynamicMove(move))return move;
  const reference=battleMove(move.id);
  let power,type=reference.type;
  if(move.id===311) {
    weather=resolveScriptWeather(weather,attacker,defender,battleContext);
    if(weather===null)return null;
    const types={none:'NORMAL',sun:'FIRE',rain:'WATER',sand:'ROCK',hail:'ICE'};
    if(!Object.hasOwn(types,weather))return null;
    const damageMultiplier=weather==='none'?1:2;
    // Emerald Cmd_setweatherballtype sets sDMG_MULTIPLIER, not dynamic power.
    // Display effective power100, but retain power50 and post-+2 doubling in core.
    return {...reference,type:types[weather],power:50*damageMultiplier,formulaPower:50,damageMultiplier};
  } else if(move.id===216 || move.id===218) {
    const friendship=attacker?.friendship;
    if(!Number.isInteger(friendship) || friendship<0 || friendship>255)return null;
    power=Math.max(1,Math.floor((move.id===216?friendship:255-friendship)*10/25));
  } else if(move.id===237) {
    const hidden=calculateHiddenPower(attacker?.ivs??{});
    if(!hidden)return null;
    power=hidden.power;type=hidden.type.toUpperCase();
  } else if(isHpDependentMove(move)) {
    const maximum=attacker?.stats?.hp;
    // Only null carries the Battle Conditions full-HP meaning. Missing HP is unknown.
    const hp=attacker?.currentHp===null?maximum:attacker?.currentHp;
    if(!Number.isInteger(maximum) || maximum<1 || maximum>999
      || !Number.isInteger(hp) || hp<1 || hp>maximum)return null;
    if(move.id===175 || move.id===179) {
      // Emerald Cmd_remaininghptopower / GetScaledHPFraction, with inclusive limits.
      const fraction=Math.max(1,Math.floor(48*hp/maximum));
      power=[[1,200],[4,150],[9,100],[16,80],[32,40],[48,20]]
        .find(([limit])=>fraction<=limit)[1];
    } else power=Math.max(1,Math.floor(150*hp/maximum));
  } else {
    // dex is the canonical national species ID, never a nickname or supplied weight.
    power=Number.isInteger(defender?.dex)?lowKickPower(weights[defender.dex]):null;
    if(power===null)return null;
  }
  return {...reference,type,power};
}
