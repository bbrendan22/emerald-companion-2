import {unresolvedTrace} from './conditionalAbilities.js';
import {battleMove} from './reference.js';
import {isDeterministicResult} from './deterministicDamage.js';

const ids=new Set([24,41,155]);
const variableIds=new Set([3,4,31,42,131,140,154,198,292,331,333,350]);
const contactIds=new Set([24,3,4,31,154,292,167]);
export const variableHitChances=Object.freeze([3,3,1,1].map((numerator,index)=>
 Object.freeze({hitCount:index+2,numerator,denominator:8})));
const weightedOutcomes=8*16**5;
const majorStatuses=new Set(['burn','poison','toxic','paralysis','sleep','freeze']);
const contactStatusAbilities=new Set(['Flame Body','Effect Spore','Static','Poison Point']);
const validRolls=rolls=>Array.isArray(rolls)&&rolls.length===16
 &&Array.from(rolls).every(value=>Number.isSafeInteger(value)&&value>=0);
export const tripleKickPowers=Object.freeze([10,20,30]);
export const isTripleKickMove=move=>move?.id===167;
export const isTwoHitMove=move=>ids.has(move?.id);
export const isVariableMultiHitMove=move=>variableIds.has(move?.id);
const unmodeledHitAbility=(move,attacker,defender)=>
 (unresolvedTrace(attacker)||unresolvedTrace(defender))
 ||defender.ability==='Color Change'
 ||contactIds.has(move.id)&&contactStatusAbilities.has(defender.ability)&&!majorStatuses.has(attacker.status);

// All 16x16 ordered pairs have equal probability; duplicates contribute frequency.
// Count/totalOutcomes is the exact probability, without rounded floating weights.
export function aggregateTwoHits(first,second,critical=false) {
 if(first?.kind!=='standard-damage'||second?.kind!=='standard-damage'
  ||!validRolls(first.rolls)||!validRolls(second.rolls)||typeof critical!=='boolean')return null;
 const counts=new Map();
 for(const a of first.rolls)for(const b of second.rolls) {
  const total=a+b;if(!Number.isSafeInteger(total))return null;
  counts.set(total,(counts.get(total)??0)+1);
 }
 const distribution=[...counts].sort(([a],[b])=>a-b).map(([damage,count])=>({damage,count}));
 return {kind:'aggregate-damage',hitCount:2,hits:[first,second],totalOutcomes:256,distribution,
  min:distribution[0].damage,max:distribution.at(-1).damage,
  criticalPolicy:critical?'both-critical':'both-noncritical'};
}
function validDistribution(distribution,totalOutcomes,min,max) {
 if(!Array.isArray(distribution)||!distribution.length||distribution.length>totalOutcomes)return false;
 let previous=-1,count=0;
 for(const entry of distribution) {
  if(!Number.isSafeInteger(entry?.damage)||entry.damage<=previous
   ||!Number.isSafeInteger(entry.count)||entry.count<1||entry.count>totalOutcomes)return false;
  previous=entry.damage;count+=entry.count;
 }
 return count===totalOutcomes&&min===distribution[0].damage&&max===previous;
}
export function isAggregateResult(result) {
 if(result?.kind!=='aggregate-damage'||result.rolls!==undefined)return false;
 if(result.condition==='selected-hits-connected')return Number.isInteger(result.hitCount)
  &&result.hitCount>=1&&result.hitCount<=5&&result.totalOutcomes===16**result.hitCount
  &&Array.isArray(result.hits)&&result.hits.length===result.hitCount
  &&validDistribution(result.distribution,result.totalOutcomes,result.min,result.max);
 if(result.hitCount===2)return result.totalOutcomes===256
  &&validDistribution(result.distribution,256,result.min,result.max);
 if(result.hitCount===3)return result.totalOutcomes===4096&&result.condition==='all-three-connected'
  &&validDistribution(result.distribution,4096,result.min,result.max);
 if(result.hitCount!=='2-5'||result.totalOutcomes!==weightedOutcomes
  ||!Array.isArray(result.hitCounts)||result.hitCounts.length!==4)return false;
 for(const [index,chance] of variableHitChances.entries()) {
  const branch=result.hitCounts[index];
  if(branch?.hitCount!==chance.hitCount||branch.chance?.numerator!==chance.numerator
   ||branch.chance?.denominator!==8||branch.totalOutcomes!==16**chance.hitCount
   ||!validDistribution(branch.distribution,branch.totalOutcomes,branch.min,branch.max))return false;
 }
 return validDistribution(result.distribution,weightedOutcomes,result.min,result.max);
}

export function calculateTwoHitDamage(move,attacker,defender,weather,critical,battleContext,calculateHit) {
 if(!isTwoHitMove(move)||!attacker||!defender)return null;
 const canonical=battleMove(move.id);
 // No new ability transitions are simulated between hits. Double Kick makes
 // contact; Twineedle and Bonemerang do not. Retain unsupported scenario branches.
 // Only verified per-hit metadata enters the private conventional calculator.
 const perHit={...canonical,effect:'HIT'};
 if(attacker.currentHp===null && Number.isInteger(attacker.stats?.hp) && attacker.stats.hp>=1 && attacker.stats.hp<=999)
  attacker={...attacker,currentHp:attacker.stats.hp};
 const first=calculateHit(perHit,attacker,defender,weather,critical,battleContext);
 if(first?.availability==='unsupported'||isDeterministicResult(first))return first;
 if(!validRolls(first?.rolls))return null;
 if(first.effectiveness!==0 && unmodeledHitAbility(move,attacker,defender))
  return {availability:'unsupported',reason:'unmodeled-two-hit-ability'};
 const second=calculateHit(perHit,attacker,defender,weather,critical,battleContext);
 if(second?.availability==='unsupported'||isDeterministicResult(second))return second;
 return aggregateTwoHits(first,second,critical);
}

// Convolve unique damage frequencies, not all16^5 ordered roll sequences.
function convolve(distribution,rolls) {
 const hit=new Map(),totals=new Map();
 for(const damage of rolls)hit.set(damage,(hit.get(damage)??0)+1);
 for(const entry of distribution)for(const [damage,count] of hit) {
  const total=entry.damage+damage;
  if(!Number.isSafeInteger(total))return null;
  totals.set(total,(totals.get(total)??0)+entry.count*count);
 }
 return [...totals].sort(([a],[b])=>a-b).map(([damage,count])=>({damage,count}));
}
// Exact total for an explicitly selected number of successful hits. Each hit
// keeps its own rounded rolls; no hit-count or accuracy probability is mixed in.
export function aggregateSelectedHits(hits,critical=false) {
 if(!Array.isArray(hits)||hits.length<1||hits.length>5||typeof critical!=='boolean'
  ||!Array.from(hits).every(hit=>hit?.kind==='standard-damage'&&validRolls(hit.rolls)))return null;
 let distribution=[{damage:0,count:1}];
 for(const hit of hits) {
  distribution=convolve(distribution,hit.rolls);
  if(!distribution)return null;
 }
 return {kind:'aggregate-damage',hitCount:hits.length,hits,totalOutcomes:16**hits.length,distribution,
  min:distribution[0].damage,max:distribution.at(-1).damage,condition:'selected-hits-connected',
  criticalPolicy:critical?'all-critical':'all-noncritical'};
}
export function aggregateVariableHits(hits,critical=false) {
 if(!Array.isArray(hits)||hits.length!==5||typeof critical!=='boolean'
  ||!Array.from(hits).every(hit=>hit?.kind==='standard-damage'&&validRolls(hit.rolls)))return null;
 let distribution=[{damage:0,count:1}];
 const hitCounts=[],weighted=new Map();
 for(let index=0;index<5;index++) {
  distribution=convolve(distribution,hits[index].rolls);
  if(!distribution)return null;
  const hitCount=index+1;
  if(hitCount<2)continue;
  const chance=variableHitChances[hitCount-2];
  hitCounts.push({hitCount,chance:{numerator:chance.numerator,denominator:8},
   totalOutcomes:16**hitCount,distribution,min:distribution[0].damage,max:distribution.at(-1).damage});
  // Convert chance * conditional frequency into a common denominator8*16^5.
  const scale=chance.numerator*16**(5-hitCount);
  for(const entry of distribution)weighted.set(entry.damage,(weighted.get(entry.damage)??0)+entry.count*scale);
 }
 const overall=[...weighted].sort(([a],[b])=>a-b).map(([damage,count])=>({damage,count}));
 return {kind:'aggregate-damage',hitCount:'2-5',hits,hitCounts,totalOutcomes:weightedOutcomes,distribution:overall,
  min:overall[0].damage,max:overall.at(-1).damage,criticalPolicy:critical?'all-critical':'all-noncritical'};
}
export function calculateVariableMultiHitDamage(move,attacker,defender,weather,critical,battleContext,calculateHit) {
 if(!isVariableMultiHitMove(move)||!attacker||!defender)return null;
 const selected=battleContext?.hitCount;
 if(selected!==undefined&&(!Number.isInteger(selected)||selected<2||selected>5))return null;
 const perHit={...battleMove(move.id),effect:'HIT'},hits=[];
 if(attacker.currentHp===null&&Number.isInteger(attacker.stats?.hp)&&attacker.stats.hp>=1&&attacker.stats.hp<=999)
  attacker={...attacker,currentHp:attacker.stats.hp};
 for(let index=0;index<(selected??5);index++) {
  const hit=calculateHit(perHit,attacker,defender,weather,critical,battleContext);
  if(hit?.availability==='unsupported'||isDeterministicResult(hit))return hit;
  if(!validRolls(hit?.rolls))return null;
  if(index===0&&hit.effectiveness!==0&&unmodeledHitAbility(move,attacker,defender))
   return {availability:'unsupported',reason:'unmodeled-multi-hit-ability'};
  hits.push(hit);
 }
 return selected===undefined?aggregateVariableHits(hits,critical):aggregateSelectedHits(hits,critical);
}

// Triple Kick is conditional on all three accuracy checks passing. Its damage
// distribution has16^3 outcomes, with no accuracy or variable-hit weights.
export function aggregateTripleKick(hits,critical=false) {
 if(!Array.isArray(hits)||hits.length!==3||typeof critical!=='boolean'
  ||!Array.from(hits).every(hit=>hit?.kind==='standard-damage'&&validRolls(hit.rolls)))return null;
 let distribution=[{damage:0,count:1}];
 for(const hit of hits) {
  distribution=convolve(distribution,hit.rolls);
  if(!distribution)return null;
 }
 return {kind:'aggregate-damage',hitCount:3,hitPowers:[...tripleKickPowers],hits,totalOutcomes:4096,distribution,
  min:distribution[0].damage,max:distribution.at(-1).damage,condition:'all-three-connected',
  criticalPolicy:critical?'all-critical':'all-noncritical'};
}
export function calculateTripleKickDamage(move,attacker,defender,weather,critical,battleContext,calculateHit) {
 if(!isTripleKickMove(move)||!attacker||!defender)return null;
 const selected=battleContext?.hitCount;
 if(selected!==undefined&&(!Number.isInteger(selected)||selected<1||selected>3))return null;
 const canonical=battleMove(167),hits=[];
 for(const power of tripleKickPowers.slice(0,selected??3)) {
  const hit=calculateHit({...canonical,effect:'HIT',power},attacker,defender,weather,critical,battleContext);
  if(hit?.availability==='unsupported'||isDeterministicResult(hit))return hit;
  if(!validRolls(hit?.rolls))return null;
  if(!hits.length&&hit.effectiveness!==0&&unmodeledHitAbility(move,attacker,defender))
   return {availability:'unsupported',reason:'unmodeled-triple-kick-ability'};
  hits.push(hit);
 }
 if(selected===undefined)return aggregateTripleKick(hits,critical);
 const result=aggregateSelectedHits(hits,critical);
 return result?{...result,hitPowers:tripleKickPowers.slice(0,selected)}:null;
}
