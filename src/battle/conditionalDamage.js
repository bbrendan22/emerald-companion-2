import {battleMove} from './reference.js';

// Rollout/Ice Ball/Fury Cutter set dynamic power BEFORE CalculateBaseDamage.
// These are independent current-state hypotheses, not a sum or history model.
const progression=(initial,withCurl)=>Array.from({length:5},(_,index)=>{
 const stage=index+1,power=initial*2**index;
 const normal={id:`stage-${stage}`,label:`HIT ${stage}${!withCurl&&stage===5?'+':''}`,stage,power,formulaPower:power,multiplier:1};
 return withCurl?[{...normal,defenseCurl:false},{...normal,id:`stage-${stage}-curl`,
  label:`HIT ${stage} · DEFENSE CURL`,defenseCurl:true,power:power*2,formulaPower:power*2}]:[normal];
}).flat();

// Pursuit/Revenge instead use sDMG_MULTIPLIER AFTER +2, before STAB/type/random.
const cases=new Map([
 [228,[{id:'normal',label:'NORMAL HIT',power:40,multiplier:1},
  {id:'switching',label:'TARGET SWITCHING',power:80,multiplier:2}]],
 [279,[{id:'normal',label:'NORMAL HIT',power:60,multiplier:1},
  {id:'damaged',label:'AFTER TAKING QUALIFYING DAMAGE',power:120,multiplier:2}]],
 [205,progression(30,true)],
 [301,progression(30,true)],
 [210,progression(10,false)],
 [222,[10,30,50,70,90,110,150].map((power,index)=>({
  id:`magnitude-${index+4}`,label:`MAGNITUDE ${index+4}`,level:index+4,
  power,formulaPower:power,multiplier:1,
  probability:Object.freeze({numerator:[5,10,20,30,20,10,5][index],denominator:100}),
 }))],
 [217,[40,80,120].map((power,index)=>({
  id:`present-${power}`,label:'DAMAGING PRESENT',power,formulaPower:power,multiplier:1,
  probability:Object.freeze({numerator:[102,76,26][index],denominator:256}),
 }))],
].map(([id,values])=>[id,Object.freeze(values.map(value=>Object.freeze(value)))]));
export const isConditionalMove=move=>cases.has(move?.id);
export const conditionalCases=move=>cases.get(move?.id)??[];
export const presentHealingProbability=Object.freeze({numerator:52,denominator:256});
export const conditionalMoveNote=move=>move?.id===217?'Healing possibility: 20.3125% (not simulated).':null;
export const isConsecutiveUseMove=move=>[205,301,210].includes(move?.id);
export const isConsecutiveUsePower=(moveId,power)=>isConsecutiveUseMove({id:moveId})
 &&conditionalCases({id:moveId}).some(condition=>condition.formulaPower===power);
export const conditionalPowerLabel=move=>move?.id===222?'10–150':isConsecutiveUseMove(move)
 ? move.id===210?'10–160':'30–480 / 60–960'
 :conditionalCases(move).map(condition=>condition.power).join(' / ');
export const conditionalCaseLabel=condition=>`${condition.label} · ${condition.power} POWER${condition.probability
 ? ` · ${condition.probability.numerator*100/condition.probability.denominator}%`:''}`;

export function calculateConditionalDamage(move,attacker,defender,weather,critical,battleContext,calculateHit) {
 if(!isConditionalMove(move))return null;
 const canonical=battleMove(move.id);
 // Magnitude/Present retain selection probabilities separately from damage rolls.
 // Other conditions have no probabilities; none has combined endpoints.
 // Each retains its
 // complete conventional/prevention/unavailable result and is never inferred
 // from current HP, status or fabricated turn/switch state.
 return {kind:'conditional-damage',conditions:conditionalCases(move).map(condition=>({
  ...condition,result:calculateHit({...canonical,power:condition.power,
   formulaPower:condition.formulaPower??canonical.power,damageMultiplier:condition.multiplier},
  attacker,defender,weather,critical,battleContext),
 }))};
}
