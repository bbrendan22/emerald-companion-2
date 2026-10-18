// Gen 3 type products for labels and cartridge-ordered damage modifiers.
import { emeraldTypeChart } from './reference.js'
export const emeraldTypes=['NORMAL','FIGHTING','FLYING','POISON','GROUND','ROCK','BUG','GHOST','STEEL','FIRE','WATER','GRASS','ELECTRIC','PSYCHIC','ICE','DRAGON','DARK']
export function typeMultiplier(attack,defenders){
 return [...new Set(defenders.filter(Boolean))].reduce((value,type)=>value*(emeraldTypeChart[attack]?.[type]??1),1)
}

// gTypeEffectiveness order from pret/pokeemerald src/battle_main.c.
// Multipliers must be rounded at each table entry, not combined first.
const cartridgeTypeOrder = {
 NORMAL:'ROCK STEEL GHOST',
 FIRE:'FIRE WATER GRASS ICE BUG ROCK DRAGON STEEL',
 WATER:'FIRE WATER GRASS GROUND ROCK DRAGON',
 ELECTRIC:'WATER ELECTRIC GRASS GROUND FLYING DRAGON',
 GRASS:'FIRE WATER GRASS POISON GROUND FLYING BUG ROCK DRAGON STEEL',
 ICE:'WATER GRASS ICE GROUND FLYING DRAGON STEEL FIRE',
 FIGHTING:'NORMAL ICE POISON FLYING PSYCHIC BUG ROCK DARK STEEL GHOST',
 POISON:'GRASS POISON GROUND ROCK GHOST STEEL',
 GROUND:'FIRE ELECTRIC GRASS POISON FLYING BUG ROCK STEEL',
 FLYING:'ELECTRIC GRASS FIGHTING BUG ROCK STEEL',
 PSYCHIC:'FIGHTING POISON PSYCHIC DARK STEEL',
 BUG:'FIRE GRASS FIGHTING POISON FLYING PSYCHIC GHOST DARK STEEL',
 ROCK:'FIRE ICE FIGHTING GROUND FLYING BUG STEEL',
 GHOST:'NORMAL PSYCHIC DARK STEEL GHOST',
 DRAGON:'DRAGON STEEL',
 DARK:'FIGHTING PSYCHIC GHOST DARK STEEL',
 STEEL:'FIRE WATER ELECTRIC ICE ROCK STEEL',
};
export function orderedTypeDamage(damage,attack,defenders) {
 const types=new Set(defenders.filter(Boolean));
 for(const target of (cartridgeTypeOrder[attack] ?? '').split(' ')) {
  if(!types.has(target))continue;
  const multiplier=emeraldTypeChart[attack]?.[target]??1;
  if(multiplier===0)return 0;
  damage=Math.max(1,Math.floor(damage*multiplier));
 }
 return damage;
}
