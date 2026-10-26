import {isAggregateResult} from './twoHitDamage.js';
import {isDeterministicResult,isLevelDamageResult} from './deterministicDamage.js';

const integer=value=>Number.isSafeInteger(value)&&value>=0;
const unavailable=reason=>({availability:'unavailable',reason,chances:null});

// Repeat one complete attack's unchanged distribution independently, assuming
// successful attacks. No accuracy, automatic critical odds, or residual effects.
// Exact (unreduced) BigInt counts are authoritative; probability is a UI-friendly
// number in [0,1]. Deterministic results require the originating move as the
// optional third argument; HP-dependent and categorical OHKO moves are excluded.
export function calculateKoProbabilities(result,currentHp,move=null) {
  if(!integer(currentHp)||currentHp===0)return unavailable('invalid-current-hp');
  if(move?.id===206)return unavailable('false-swipe-cannot-ko');
  if(result?.availability!==undefined&&result.availability!=='available')
    return unavailable('unavailable-damage-result');
  let distribution,total;
  if(result?.kind==='standard-damage') {
    if(!Array.isArray(result.rolls)||result.rolls.length!==16
      ||!Array.from(result.rolls).every(integer)
      ||result.min!==Math.min(...result.rolls)||result.max!==Math.max(...result.rolls))
      return unavailable('invalid-damage-result');
    const counts=new Map();
    for(const damage of result.rolls)counts.set(damage,(counts.get(damage)??0)+1);
    distribution=[...counts].map(([damage,count])=>({damage,count}));
    total=16;
  } else if(result?.kind==='level-damage'||result?.kind==='aggregate-damage') {
    if(!(result.kind==='level-damage'?isLevelDamageResult(result):isAggregateResult(result)))
      return unavailable('invalid-damage-result');
    distribution=result.distribution;
    total=result.totalOutcomes;
  } else if(result?.kind==='deterministic-damage') {
    if(!isDeterministicResult(result))return unavailable('invalid-damage-result');
    if(![69,101,82,49].includes(move?.id))return unavailable('unsupported-deterministic-move');
    distribution=[{damage:result.damage,count:1}];
    total=1;
  } else return unavailable('unsupported-damage-result');

  const hp=BigInt(currentHp),base=BigInt(total);
  const rolls=distribution.map(({damage,count})=>[BigInt(damage),BigInt(count)]);
  // Cap accumulated damage at HP: all KO paths are absorbing. This also avoids
  // unsafe Number addition and keeps only distinct surviving damage totals.
  let states=new Map([[0n,1n]]),denominator=1n;
  const chances=[];
  for(let attacks=1;attacks<=3;attacks++) {
    const next=new Map();
    for(const [accumulated,frequency] of states)for(const [damage,count] of rolls) {
      const sum=accumulated+damage,target=sum>=hp?hp:sum;
      next.set(target,(next.get(target)??0n)+frequency*count);
    }
    states=next;
    denominator*=base;
    const numerator=states.get(hp)??0n;
    chances.push({attacks,numerator,denominator,probability:Number(numerator)/Number(denominator)});
  }
  return {availability:'available',reason:null,chances};
}
