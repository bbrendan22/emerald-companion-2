// Step 5, direct single-use modifiers only. Order follows Emerald CalculateBaseDamage.
import {battleWeather,battleTypes} from './battleConditions.js';
const itemKey=value=>String(value??'').toLowerCase().replace(/[^a-z]/g,'');
const typeItems={silkscarf:'NORMAL',blackbelt:'FIGHTING',sharpbeak:'FLYING',poisonbarb:'POISON',softsand:'GROUND',hardstone:'ROCK',silverpowder:'BUG',spelltag:'GHOST',metalcoat:'STEEL',charcoal:'FIRE',mysticwater:'WATER',miracleseed:'GRASS',magnet:'ELECTRIC',twistedspoon:'PSYCHIC',nevermeltice:'ICE',dragonfang:'DRAGON',blackglasses:'DARK',seaincense:'WATER'};
const pinchTypes={Torrent:'WATER',Blaze:'FIRE',Overgrow:'GRASS',Swarm:'BUG'};
const statusActive=status=>Boolean(status&&status!=='none');
// Shared immunity gate only; no boosts, healing or state changes.
export function directDamageImmune(type,ability,status='none') {
 return ability==='Water Absorb'&&type==='WATER'||ability==='Volt Absorb'&&type==='ELECTRIC'
  ||ability==='Flash Fire'&&type==='FIRE'&&status!=='freeze'||ability==='Levitate'&&type==='GROUND';
}
export function directDamageModifiers({move,attacker,defender,conditions,physical,attack,defense}) {
 const own=attacker.ability,other=defender.ability,type=move.type;
 if(String(own).includes('/')||String(other).includes('/'))return null;
 // No copied/activated state exists. Unimplemented direct immunity abilities
 // and customizable Enigma effects also omit results rather than guess.
 if(own==='Plus'&&other==='Minus'||own==='Minus'&&other==='Plus')return null;
 if([own,other].includes('Trace')||own==='Flash Fire'&&type==='FIRE'
  ||other==='Wonder Guard'||other==='Soundproof'&&move.name==='Hyper Voice'
  ||[attacker.item,defender.item].some(item=>itemKey(item)==='enigmaberry'))return null;
 const ownItem=itemKey(attacker.item),otherItem=itemKey(defender.item);
 const ownStatus=conditions.attacker?.status??'none',otherStatus=conditions.defender?.status??'none';
 const weather=battleWeather(conditions.weather??'none',own,other);
 const critical=Boolean(conditions.critical)&&!['Battle Armor','Shell Armor'].includes(other);
 const attackerTypes=battleTypes(attacker,weather,own),defenderTypes=battleTypes(defender,weather,other);
 if(physical&&['Huge Power','Pure Power'].includes(own))attack*=2;
 if(typeItems[ownItem]===type)attack=Math.floor(attack*(ownItem==='seaincense'?105:110)/100);
 if(physical&&ownItem==='choiceband')attack=Math.floor(attack*3/2);
 // Soul Dew has no effect in this app's Battle Frontier context.
 if(!physical&&ownItem==='deepseatooth'&&attacker.dex===366)attack*=2;
 if(!physical&&otherItem==='deepseascale'&&defender.dex===366)defense*=2;
 if(!physical&&ownItem==='lightball'&&attacker.dex===25)attack*=2;
 if(physical&&otherItem==='metalpowder'&&defender.dex===132)defense*=2;
 if(physical&&ownItem==='thickclub'&&[104,105].includes(attacker.dex))attack*=2;
 if(!physical&&other==='Thick Fat'&&['FIRE','ICE'].includes(type))attack=Math.floor(attack/2);
 if(physical&&own==='Hustle')attack=Math.floor(attack*3/2);
 if(physical&&own==='Guts'&&statusActive(ownStatus))attack=Math.floor(attack*3/2);
 if(physical&&other==='Marvel Scale'&&statusActive(otherStatus))defense=Math.floor(defense*3/2);
 let power=move.power;
 const hp=conditions.attacker?.currentHp??attacker.initialCurrentHp??attacker.currentHp??attacker.stats.hp;
 if(pinchTypes[own]===type&&Number.isFinite(hp)&&hp<=Math.floor(attacker.stats.hp/3))power=Math.floor(power*3/2);
 const immune=directDamageImmune(type,other,otherStatus);
 return {attack,defense,power,weather,critical,attackerTypes,defenderTypes,immune,guts:own==='Guts'};
}
