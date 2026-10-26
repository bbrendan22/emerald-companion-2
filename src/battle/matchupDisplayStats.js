import {fieldAbilityPresence,fieldAbilityBranches} from './fieldAbilities.js';
import {battleItemId} from './itemLookup.js';
import {stageStat,battleSpeed,battleWeather} from './battleConditions.js';
import {heldItemAttack,heldItemDefense} from './heldItemModifiers.js';
import {resolveBattleAbility,traceAbilities} from './conditionalAbilities.js';
import {opponentStatRanges,opponentStatDisplay} from './opponentStats.js';

const keys=['hp','attack','defense','spAttack','spDefense','speed'];
const statuses=new Set(['burn','poison','toxic','paralysis','sleep','freeze']);
const suppresses=ability=>['Cloud Nine','Air Lock'].includes(ability);
const resolved=(mon,ability)=>resolveBattleAbility({...mon,ability}).ability;
function abilities(mon) {
 const options=mon?.abilityOptions;
 if(!options || !['known','uncertain'].includes(options.status))return null;
 return [...new Set(options.values.flatMap(ability=>{
  const value=resolved(mon,ability);
  return value==='Trace'?traceAbilities.filter(a=>a!=='Trace'): [value];
 }))];
}
function confirmedAbility(mon) {
 return mon?.abilityOptions?.status==='known' ? resolved(mon,mon.abilityOptions.values[0]) : null;
}
// No move type is supplied: type-boosting items affect damage, not these stats.
// Emerald operand order follows src/pokemon.c CalculateBaseDamage; Speed
// follows src/battle_main.c GetWhoStrikesFirst (pret/pokeemerald).
// Unknown item/ability modifiers are deliberately omitted from DISPLAY values.
export function effectiveDisplayStats(mon,{weather='none',ability=confirmedAbility(mon),item=mon?.item,otherAbility=null,oppositeAbilityPresent}={}) {
 if(!mon?.stats)return null;
 const result={};
 for(const key of keys) {
  let value=mon.stats[key];
  if(!Number.isInteger(value)||value<1){result[key]=null;continue;}
  if(key==='hp'){result.hp=value;continue;}
  if(key==='speed'){
   result.speed=battleSpeed({...mon,item:item??'None'},ability,weather);continue;
  }
  if(key==='attack' && ['Huge Power','Pure Power'].includes(ability))value*=2;
  if(['attack','spAttack'].includes(key))
   value=heldItemAttack(value,item??'None',null,key==='attack',mon)??value;
  else value=heldItemDefense(value,item??'None',key==='defense',mon)??value;
  if(key==='attack' && (ability==='Hustle'||ability==='Guts'&&statuses.has(mon.status)))value=Math.floor(value*3/2);
  if(key==='spAttack' && (oppositeAbilityPresent===true || oppositeAbilityPresent===undefined&&(ability==='Plus'&&otherAbility==='Minus'||ability==='Minus'&&otherAbility==='Plus')))value=Math.floor(value*3/2);
  if(key==='defense' && ability==='Marvel Scale'&&statuses.has(mon.status))value=Math.floor(value*3/2);
  result[key]=stageStat(value,mon.stages?.[key]);
 }
 return result;
}
function ranges(rows) {
 if(!rows.length)return null;
 return Object.fromEntries(keys.map(key=>{
  const values=rows.map(row=>row?.[key]);
  return [key,values.every(Number.isFinite)?{min:Math.min(...values),max:Math.max(...values)}:null];
 }));
}
// Each row retains its canonical stats and item for certainty checks; display
// modifiers use only globally confirmed knowledge, never a speculative set item.
export function opponentDisplayRows(state,sets,mon) {
 return sets.map(set=>{
  const stats=opponentStatRanges(state,[set]);
  return stats ? {...mon,stats:Object.fromEntries(keys.map(key=>[key,stats[key].min])),item:set.item} : null;
 });
}
export function displayStatValues(rows,{weather='none',item,otherAbility=null}={}) {
 const values=opponentStatDisplay(ranges(rows.map(mon=>effectiveDisplayStats(mon,{weather,item,otherAbility}))));
 const current=rows[0]?.currentHp;
 if(current!=null && values.hp!=='—')values.hp=`${current}/${values.hp}`;
 return values;
}
function speedRange(rows,otherRows,weather,format) {
 if(!rows.length||!otherRows.length||rows.some(row=>!row)||otherRows.some(row=>!row))return null;
 const speeds=[];
 for(const mon of rows) {
  const own=abilities(mon);
  if(!own || !Number.isInteger(mon.stats?.speed) || mon.item==null || mon.item==='' || mon.item==='Enigma Berry' || mon.item!=='None'&&!battleItemId(mon.item))return null;
  for(const other of otherRows) {
   const opposing=abilities(other);if(!opposing)return null;
   for(const ability of own)for(const otherAbility of opposing) {
    const active=battleWeather(weather,mon.currentHp===0?null:ability,other.currentHp===0?null:otherAbility);
    // Unrepresented Doubles partners could suppress weather. Their abilities
    // cannot be inferred from roster slots or the selected matchup alone.
    const weatherValues=format==='Doubles'&&active!=='none'?[active,'none']:[active];
    for(const effectiveWeather of weatherValues)speeds.push(battleSpeed(mon,ability,effectiveWeather));
   }
  }
 }
 return speeds.length&&speeds.every(Number.isFinite)?{min:Math.min(...speeds),max:Math.max(...speeds)}:null;
}
export function compareSpeedRanges(player,opponent) {
 if(!player||!opponent)return {player:null,opponent:null};
 if(player.min>opponent.max)return {player:'faster',opponent:'slower'};
 if(player.max<opponent.min)return {player:'slower',opponent:'faster'};
 return {player:null,opponent:null};
}
// Same pinned possibilities as damage, without guessing a hidden ability or
// applying a confirmed boost from only the currently viewed opponent.
function battlefieldDisplay(rows,otherRows,weather,battlefield,side) {
 const stats=[];
 const field={...battlefield,attacking:{side,slot:battlefield.viewed[side==='player'?'player':'opponent']},
  defending:{side:side==='player'?'enemy':'player',slot:battlefield.viewed[side==='player'?'opponent':'player']}};
 for(const mon of rows)for(const other of otherRows) {
  const own=abilities(mon),opposing=abilities(other);
  if(!own||!opposing)return {values:displayStatValues(rows,{weather:'none',item:mon?.item}),speed:null};
  for(const ability of own)for(const otherAbility of opposing)for(const branch of fieldAbilityBranches({format:'Doubles',battlefield:field})) {
   const a=resolveBattleAbility({...mon,ability}),d=resolveBattleAbility({...other,ability:otherAbility});
   const suppressed=fieldAbilityPresence(branch.context,a,d,['Cloud Nine','Air Lock'],{livingOnly:true});
   const weathers=suppressed===true?['none']:suppressed===false?[weather]:[weather,'none'];
   const opposite=['Plus','Minus'].includes(a.ability)?fieldAbilityPresence(branch.context,a,d,[a.ability==='Plus'?'Minus':'Plus']):false;
   for(const active of weathers)for(const boost of opposite===null?[false,true]:[opposite]) {
    // Retain the existing confirmed-only policy for unrelated stat modifiers.
    const row=effectiveDisplayStats(mon,{weather:active,ability:confirmedAbility(mon),item:mon.item,oppositeAbilityPresent:boost});
    row.speed=battleSpeed(mon,a.ability,active);
    stats.push(row);
   }
  }
 }
 const bounds=ranges(stats),values=opponentStatDisplay(bounds);
 if(rows[0]?.currentHp!=null&&values.hp!=='—')values.hp=`${rows[0].currentHp}/${values.hp}`;
 return {values,speed:bounds?.speed??null};
}
export function matchupDisplayStats({player,opponent,state,sets=[],battlefield}) {
 const own=player?[player]:[],enemy=opponent?opponentDisplayRows(state,sets,opponent):[];
 const weather=state.field?.weather??'none';
 if(state.rules.format==='Doubles'&&battlefield&&player&&opponent) {
  const p=battlefieldDisplay(own,enemy,weather,battlefield,'player'),e=battlefieldDisplay(enemy,own,weather,battlefield,'enemy');
  return {player:p.values,opponent:e.values,speed:compareSpeedRanges(p.speed,e.speed)};
 }
 const potential=[player,opponent].filter(mon=>mon&&mon.currentHp!==0).flatMap(mon=>abilities(mon)??[]);
 // A weather boost is only confirmed when suppression cannot be unresolved.
 const displayWeather=potential.some(suppresses) ? 'none':weather;
 return {
  player:displayStatValues(own,{weather:displayWeather,item:player?.item,otherAbility:confirmedAbility(opponent)}),
  opponent:displayStatValues(enemy,{weather:displayWeather,item:opponent?.item??null,otherAbility:confirmedAbility(player)}),
  speed:compareSpeedRanges(speedRange(own,enemy,weather,state.rules.format),speedRange(enemy,own,weather,state.rules.format)),
 };
}
