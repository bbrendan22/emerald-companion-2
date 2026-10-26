import {fieldAbilityLabels} from './fieldAbilities.js';
import {calculateKoProbabilities} from './koProbability.js';
import {isAggregateResult} from './twoHitDamage.js';
import {isDeterministicResult,isLevelDamageResult} from './deterministicDamage.js';
import {isOhkoResult} from './ohkoDamage.js';
import {isUnsupportedSpecialMove} from './moveDamagePolicy.js';

const integer=value=>Number.isSafeInteger(value)&&value>=0;
const unique=values=>[...new Set(values.filter(value=>value!=null))];

// Envelopes describe possibilities, never a pooled distribution or set odds.
// Input/result references are retained as provenance and must be treated read-only.
export function aggregateFrontierDamage(evaluation) {
  const candidates=evaluation.construction.candidates,entries=evaluation.evaluations;
  const policy=isUnsupportedSpecialMove(evaluation.move)?'unsupported-move'
    :evaluation.move?.power===0?'status-move-no-damage':null;
  const coverageValid=entries.length===candidates.length
    &&entries.every((entry,index)=>entry.candidate===candidates[index]);
  const branches=entries.flatMap(entry=>{
    const conditions=entry.abilityDamage?.conditions;
    const leaves=conditions?conditions.flatMap(condition=>condition.abilityDamage.scenarios.map(scenario=>({scenario,condition})))
      :(entry.abilityDamage?.scenarios??[]).map(scenario=>({scenario,condition:entry.condition}));
    return leaves.length?leaves.map(({scenario,condition})=>normalize(entry,scenario,condition,policy))
      :[normalize(entry,null,entry.condition,policy)];
  });
  for(const branch of branches)attachKoProbabilities(branch);
  const failures=unique([
    ...(!coverageValid?['invalid-evaluation-coverage']:[]),
    ...entries.filter(entry=>entry.availability!=='available').map(entry=>entry.reason),
    ...branches.filter(branch=>branch.availability!=='available').map(branch=>branch.reason),
  ]);
  const groups=equivalentGroups(branches);
  const metadata=aggregateMetadata(branches);
  const reasons=unique([...failures,...branches.map(branch=>branch.reason)]);
  const notes=unique(branches.flatMap(branch=>branch.notes));
  const base={evaluation,candidateCount:candidates.length,setIds:unique(candidates.map(candidate=>candidate.setId)),
    branches,groups,metadata,categories:unique(branches.map(branch=>branch.category)),reasons,notes,
    hp:null,percentage:null,ko:aggregateKoProbabilities(branches,coverageValid,entries)};
  if(!candidates.length)return {...base,availability:'unavailable',kind:'no-candidates',reason:'no-matching-frontier-sets'};
  const inputFailure=!coverageValid||entries.some(entry=>entry.constructionAvailability!=='available'||!entry.abilityDamage);
  if(policy&&!inputFailure)return {...base,availability:'unavailable',kind:policy==='unsupported-move'?'unsupported':'status',reason:policy};
  if(failures.length)return {...base,availability:'unavailable',kind:'incomplete',reason:'incomplete-candidate-results'};
  const targets=new Set(branches.map(branch=>branch.target?`${branch.target.side}:${branch.target.slot}`:'selected'));
  if(targets.size>1)return {...base,availability:'available',kind:'target-alternatives',reason:null,
    ko:{availability:'unavailable',reason:'different-possible-targets',reasons:['different-possible-targets'],chances:null}};
  const categorical=branches.filter(branch=>branch.category.startsWith('ohko-'));
  if(categorical.length) {
    if(categorical.length!==branches.length)return {...base,availability:'unavailable',kind:'incomplete',reason:'incompatible-result-categories'};
    return {...base,availability:'available',kind:'categorical-ohko',reason:null};
  }
  if(branches.some(branch=>branch.category==='immune'||branch.category==='prevented')) {
    notes.push(branches.every(branch=>['immune','prevented'].includes(branch.category))
      ?'all-possibilities-prevent-damage':'some-possibilities-prevent-damage');
  }
  return {...base,availability:'available',kind:'damage-envelope',reason:null,
    hp:{min:Math.min(...branches.map(branch=>branch.min)),max:Math.max(...branches.map(branch=>branch.max))},
    percentage:{min:Math.min(...branches.map(branch=>branch.percentage.min)),max:Math.max(...branches.map(branch=>branch.percentage.max))}};
}

function normalize(entry,scenario,condition,policy) {
  const result=scenario?.result??null;
  const branch={evaluation:entry,candidate:entry.candidate,setId:entry.setId,scenario,condition,result,
    ...(scenario?.target?{target:scenario.target}:{}),
    defenderMaximumHp:scenario?.target?.pokemon?.stats?.hp??entry.defenderMaximumHp,moveMetadata:scenario?.moveMetadata??null,
    assumptions:{condition:condition?Object.fromEntries(Object.entries(condition).filter(([key])=>key!=='abilityDamage')):null,
      hitCount:entry.hitCount,criticalPolicy:result?.criticalPolicy??null,
      hitCondition:result?.condition??null,hitPowers:result?.hitPowers??null,
      ...(scenario?.target?{target:{status:scenario.target.status,side:scenario.target.side,slot:scenario.target.slot}}:{})},
    availability:'unavailable',category:'unavailable',reason:scenario?.reason??entry.reason,
    min:null,max:null,percentage:null,notes:[]};
  const unavailable=reason=>({...branch,reason});
  if(entry.constructionAvailability!=='available'||!scenario)return unavailable(entry.reason??'missing-ability-scenarios');
  if(policy)return {...branch,category:policy==='unsupported-move'?'unsupported':'status',reason:policy};
  if(!['available','immune','blocked','failed','ohko'].includes(scenario.availability))
    return unavailable(scenario.reason??'missing-damage-data');
  if(isOhkoResult(result))return {...branch,availability:'available',category:`ohko-${result.outcome}`,reason:result.reason};
  let min,max,category='damage';
  if(isDeterministicResult(result)) {
    min=max=result.damage;
    category={damage:'damage',immune:'immune',blocked:'prevented',failed:'failed'}[result.outcome];
  } else if(result?.kind==='standard-damage') {
    if(!Array.isArray(result.rolls)||result.rolls.length!==16||!Array.from(result.rolls).every(integer)
      ||result.min!==Math.min(...result.rolls)||result.max!==Math.max(...result.rolls))return unavailable('invalid-damage-result');
    min=result.min;max=result.max;
    if(result.effectiveness===0)category='immune';
  } else if(isLevelDamageResult(result)||isAggregateResult(result)) {
    min=result.min;max=result.max;
    if(result.kind==='aggregate-damage'&&result.hits?.length&&result.hits.every(hit=>hit.effectiveness===0))category='immune';
  } else return unavailable('invalid-damage-result');
  const hp=branch.defenderMaximumHp;
  if(!Number.isInteger(hp)||hp<1||hp>999)return unavailable('invalid-defender-maximum-hp');
  const notes=[];
  if(result.kind==='level-damage')notes.push('eleven-level-based-rolls');
  if(result.condition)notes.push(result.condition);
  if(category==='failed')notes.push('move-fails');
  return {...branch,availability:'available',category,reason:result.reason??scenario.reason??null,min,max,
    percentage:{min:100*min/hp,max:100*max/hp},notes};
}

function equivalentGroups(branches) {
  const groups=new Map();
  for(const branch of branches) {
    // Ignore intermediate arithmetic when final distributions agree. Full raw
    // results remain on every contributor; they are never merged or discarded.
    const result=branch.result;
    const signature=result&&{kind:result.kind,outcome:result.outcome,reason:result.reason,
      damage:result.damage,min:result.min,max:result.max,rolls:result.rolls,
      distribution:result.distribution,totalOutcomes:result.totalOutcomes,hitCounts:result.hitCounts};
    const key=JSON.stringify([branch.availability,branch.category,branch.reason,signature,
      branch.defenderMaximumHp,branch.moveMetadata,branch.assumptions,branch.notes]);
    if(!groups.has(key))groups.set(key,{representative:branch,contributors:[],setIds:[]});
    const group=groups.get(key);
    group.contributors.push(branch);
    if(!group.setIds.includes(branch.setId))group.setIds.push(branch.setId);
  }
  return [...groups.values()];
}

function aggregateMetadata(branches) {
  const alternatives=new Map();
  for(const branch of branches) {
    const key=JSON.stringify(branch.moveMetadata);
    if(!alternatives.has(key))alternatives.set(key,{value:branch.moveMetadata,contributors:[]});
    alternatives.get(key).contributors.push(branch);
  }
  const known=branches.length>0&&branches.every(branch=>typeof branch.moveMetadata?.type==='string'
    &&Number.isFinite(branch.moveMetadata?.power));
  const types=unique(branches.map(branch=>branch.moveMetadata?.type));
  const powers=unique(branches.map(branch=>branch.moveMetadata?.power));
  return {status:!known?'unknown':alternatives.size===1?'known':'varying',
    type:known&&types.length===1?types[0]:null,power:known&&powers.length===1?powers[0]:null,
    alternatives:[...alternatives.values()]};
}

// KO calculations retain each raw leaf's defender HP and move provenance. They
// never consume damage envelopes or the legacy display-equivalence groups.
function attachKoProbabilities(branch) {
  const entry=branch.evaluation;
  branch.defenderCurrentHp=branch.target?.pokemon?.currentHp??entry.defender?.currentHp??null;
  const unavailable=reason=>({availability:'unavailable',reason,chances:null});
  if(branch.availability!=='available'||entry.availability!=='available') {
    branch.ko=unavailable(branch.reason??entry.reason??'unavailable-damage-result');
    return;
  }
  const hp=branch.defenderCurrentHp,max=branch.defenderMaximumHp;
  if(!Number.isInteger(hp)||hp<1||hp>max) {
    branch.ko=unavailable('invalid-current-hp');
    return;
  }
  branch.ko=calculateKoProbabilities(branch.result,hp,entry.move);
}

function aggregateKoProbabilities(branches,coverageValid,entries) {
  const reasons=unique([
    ...(!coverageValid?['invalid-evaluation-coverage']:[]),
    ...entries.filter(entry=>entry.availability!=='available').map(entry=>entry.reason??'unavailable-candidate'),
    ...branches.filter(branch=>branch.ko.availability!=='available').map(branch=>branch.ko.reason),
  ]);
  if(!branches.length)reasons.push('no-candidate-branches');
  if(reasons.length)return {availability:'unavailable',reason:'incomplete-ko-results',reasons,chances:null};
  // Compare exact fractions, including distributions with different denominators.
  const less=(a,b)=>a.numerator*b.denominator<b.numerator*a.denominator;
  const chances=[0,1,2].map(index=>{
    const values=branches.map(branch=>branch.ko.chances[index]);
    let min=values[0],max=values[0];
    for(const value of values) {
      if(less(value,min))min=value;
      if(less(max,value))max=value;
    }
    return {attacks:index+1,min,max};
  });
  return {availability:'available',reason:null,reasons:[],chances};
}

// Present exact ability alternatives for one canonical matchup. Reuse the same
// full-outcome equivalence groups and aggregation/KO pipeline for every row.
export function frontierAbilityResults(summary) {
  if (summary.candidateCount !== 1) return [];
  const pairKey = scenario => JSON.stringify([scenario?.attackerAbility,scenario?.defenderAbility,scenario?.fieldAbilities,scenario?.target&&[scenario.target.status,scenario.target.side,scenario.target.slot]]);
  const pairs = new Map();
  for (const branch of summary.branches) {
    if (!branch.scenario) continue;
    const key = pairKey(branch.scenario);
    if (!pairs.has(key)) pairs.set(key,{scenario:branch.scenario,groups:[]});
    pairs.get(key).groups.push(summary.groups.findIndex(group=>group.contributors.includes(branch)));
  }
  const equivalent = new Map();
  for (const [key,pair] of pairs) {
    const signature = JSON.stringify(pair.groups.slice().sort((a,b)=>a-b));
    if (!equivalent.has(signature)) equivalent.set(signature,[]);
    equivalent.get(signature).push({key,...pair});
  }
  if (equivalent.size < 2) return [];
  const targetVaries=new Set([...pairs.values()].map(pair=>JSON.stringify(pair.scenario.target&&[pair.scenario.target.status,pair.scenario.target.side,pair.scenario.target.slot]))).size>1;
  const attackerVaries = new Set([...pairs.values()].map(pair=>pair.scenario.attackerAbility)).size > 1;
  const defenderVaries = new Set([...pairs.values()].map(pair=>pair.scenario.defenderAbility)).size > 1;
  return [...equivalent.values()].map(group=>{
    const key = group[0].key;
    const filter = damage => ({...damage,scenarios:damage.scenarios.filter(scenario=>pairKey(scenario)===key)});
    const evaluation = {...summary.evaluation,evaluations:summary.evaluation.evaluations.map(entry=>{
      const abilityDamage = entry.abilityDamage?.conditions
        ? {...entry.abilityDamage,conditions:entry.abilityDamage.conditions.map(condition=>({...condition,abilityDamage:filter(condition.abilityDamage)}))}
        : entry.abilityDamage ? filter(entry.abilityDamage) : entry.abilityDamage;
      if (entry.reason !== 'incomplete-ability-scenarios') return {...entry,abilityDamage};
      // An unresolved alternative must not mark another complete ability's row
      // unavailable. Retain all construction and non-ability failures unchanged.
      const scenarios = abilityDamage.conditions
        ? abilityDamage.conditions.flatMap(condition=>condition.abilityDamage.scenarios) : abilityDamage.scenarios;
      const reasons = unique(scenarios.filter(scenario=>!['available','immune','blocked','failed','ohko'].includes(scenario.availability)).map(scenario=>scenario.reason));
      return {...entry,abilityDamage,reasons,availability:reasons.length?'unavailable':'available',reason:reasons.length?entry.reason:null};
    })};
    const allScenarios=[...pairs.values()].map(pair=>pair.scenario);
    // Equivalent original-defender abilities need not repeat the same target
    // explanation. Keep other field modifiers, but name the LR outcome once.
    const showAttacker=attackerVaries&&(!targetVaries||new Set(group.map(pair=>pair.scenario.attackerAbility)).size<new Set(allScenarios.map(s=>s.attackerAbility)).size);
    const showDefender=defenderVaries&&(!targetVaries||new Set(group.map(pair=>pair.scenario.defenderAbility)).size<new Set(allScenarios.map(s=>s.defenderAbility)).size);
    const withoutRodLabel=scenario=>!targetVaries?scenario:{...scenario,fieldAbilities:(scenario.fieldAbilities??[]).filter(entry=>
      entry.side!==scenario.target?.side||entry.slot!==(scenario.target.status==='redirected'?scenario.target.slot:1-scenario.target.slot))};
    const labels = group.map(({scenario})=>[showAttacker && showDefender
      ? `${scenario.attackerAbility} → ${scenario.defenderAbility}`
      : showAttacker ? scenario.attackerAbility : showDefender ? scenario.defenderAbility : '',
      ...fieldAbilityLabels(allScenarios.map(withoutRodLabel),withoutRodLabel(scenario)),
      targetVaries?(scenario.target?.status==='redirected'?`Lightning Rod → ${scenario.target.name}`:scenario.target?.status==='selected'?`Selected target: ${scenario.target.name}`:'Target unresolved'):''].filter(Boolean).join(' · '));
    return {label:[...new Set(labels)].join(' / '),summary:aggregateFrontierDamage(evaluation)};
  });
}
