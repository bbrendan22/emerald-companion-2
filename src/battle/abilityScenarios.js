import {isLightningRodEligible,resolveLightningRodTarget} from './lightningRodTarget.js';
import {fieldAbilityBranches,fieldAbilityLabels} from './fieldAbilities.js';
import {resolveBattleAbility,unresolvedTrace} from './conditionalAbilities.js';
import {isOhkoResult} from './ohkoDamage.js';
import {isAggregateResult} from './twoHitDamage.js';
import {isDeterministicResult,isLevelDamageResult} from './deterministicDamage.js';
import {reference,speciesByName} from './reference.js';
import {calculateCoreDamage} from './coreDamage.js';
import {coreDamageDisplayParts} from './coreDamagePresentation.js';
import {resolveConventionalMove} from './dynamicMoves.js';
import {isConditionalMove,conditionalCases} from './conditionalDamage.js';

const speciesByDex = new Map([...speciesByName.values()].map(species=>[species.nationalDexId,species]));
const gen3Abilities = new Set(Object.values(reference.abilityNames).filter(name=>name && name !== 'None'));
const speciesFor = mon => reference.species[mon?.species ?? mon?.id] ?? speciesByDex.get(mon?.dex);
const missing = source => ({status:'missing',source,values:[]});
const choices = (values,source) => ({status:values.length===1?'known':'uncertain',source,values});
const speciesAbilities = species => [...new Set((species?.abilities ?? []).map(id=>reference.abilityNames[id]))]
  .filter(name=>gen3Abilities.has(name));

export function playerAbilityOptions(mon) {
  const ability=mon?.ability, species=speciesFor(mon);
  if (!gen3Abilities.has(ability) || (species && !speciesAbilities(species).includes(ability))) return missing('save');
  return choices([ability],'save');
}

export function opponentAbilityOptions(mon,sets=[],selectedAbility) {
  const species=speciesFor(mon), values=speciesAbilities(species);
  if (!values.length) return missing('species');
  // Manual ability knowledge refines damage only; it never filters sets.
  if(selectedAbility==='' || values.includes(selectedAbility))
    return choices(selectedAbility?[selectedAbility]:values,'observation');
  // A slash-separated possibleAbility is a species list, not a known ability.
  // Only a single valid ability on the uniquely identified matching set narrows it.
  const set=sets.length===1 ? sets[0] : null;
  if (set?.species===species.name && values.includes(set.possibleAbility))
    return choices([set.possibleAbility],'frontier-set');
  return choices(values,'species');
}

const validOptions = options => options && ['known','uncertain'].includes(options.status)
  && Array.isArray(options.values) && options.values.length>0 && options.values.length<=2
  && options.values.every(value=>gen3Abilities.has(value))
  && (options.status==='known' ? options.values.length===1 : new Set(options.values).size===2);
const validRolls = rolls => Array.isArray(rolls) && rolls.length===16
  && Array.from(rolls).every(value=>Number.isSafeInteger(value) && value>=0);

// Coverage includes eight offensive abilities plus Thick Fat, Marvel Scale
// Levitate, Water Absorb, Volt Absorb, defensive Flash Fire, Wonder Guard,
// Soundproof, Damp, Cloud Nine and Air Lock. Other abilities,
// absorption healing remains outside it. Conditional ability state is pinned per branch.
// Basic and species-specific held items use the same pinned scenarios.
// Calculators may return {availability:'unsupported',reason} for a branch;
// it is retained, never silently dropped or grouped with an available result.
export function calculateAbilityScenarios(move,attacker,defender,options={}) {
  if(!isConditionalMove(move))return calculatePinnedAbilityScenarios(move,attacker,defender,options);
  // Keep condition and ability uncertainty as separate dimensions. Calculate
  // all conditions once per pinned ability pair, then group WITHIN each case.
  const results=new Map(),calculate=options.calculate??calculateCoreDamage;
  const calculatePair=(m,a,d,...args)=>{
    const key=JSON.stringify([a.ability,d.ability,args[2]?.fieldAbilityChoices]);
    if(!results.has(key))results.set(key,calculate(m,a,d,...args));
    return results.get(key);
  };
  return {kind:'conditional-ability-scenarios',conditions:conditionalCases(move).map(condition=>({
    ...condition,abilityDamage:calculatePinnedAbilityScenarios(move,attacker,defender,{
      ...options,calculate:calculatePair,
      selectResult:result=>result?.kind==='conditional-damage'
        ? result.conditions.find(value=>value.id===condition.id)?.result??null:result?.availability==='unsupported'?result:null,
    }),
  }))};
}

function calculatePinnedAbilityScenarios(move,attacker,defender,{weather='none',critical=false,battleContext={},calculate=calculateCoreDamage,selectResult=result=>result}={}) {
  const own=attacker?.abilityOptions ?? playerAbilityOptions(attacker);
  const other=defender?.abilityOptions ?? playerAbilityOptions(defender);
  const ownValues=validOptions(own) ? [...new Set(own.values)] : [null];
  const otherValues=validOptions(other) ? [...new Set(other.values)] : [null];
  const scenarios=[];
  for(const attackerAbility of ownValues)for(const defenderAbility of otherValues)for(const field of fieldAbilityBranches(battleContext,{lightningRod:isLightningRodEligible(move)})) {
    const branchContext=field.context;
    const pinnedAttacker=resolveBattleAbility({...attacker,ability:attackerAbility});
    const pinnedDefender=resolveBattleAbility({...defender,ability:defenderAbility});
    const target=resolveLightningRodTarget(move,pinnedAttacker,pinnedDefender,branchContext);
    const actualDefender=target?.pokemon??defender;
    const targetContext=target?.context??branchContext;
    const targetFailure=target?.reason;
    const resolved=move?.id===311&&attackerAbility&&defenderAbility&&!unresolvedTrace(pinnedAttacker)&&!unresolvedTrace(pinnedDefender)
      ? resolveConventionalMove(move,pinnedAttacker,pinnedDefender,weather,branchContext):null;
    let moveMetadata=resolved?{type:resolved.type,power:resolved.power}:null;
    const result=targetFailure?{availability:'unsupported',reason:targetFailure}
      :attackerAbility && defenderAbility && attacker && defender
      ? selectResult(calculate(move,{...attacker,ability:attackerAbility},target?.status==='redirected'?actualDefender:{...defender,ability:defenderAbility},weather,critical,targetContext)) : null;
    if(result?.fieldMoveMetadata===null)moveMetadata=null;
    const deterministic=isDeterministicResult(result),ohko=isOhkoResult(result);
    const parts=(ohko || deterministic || isLevelDamageResult(result) || isAggregateResult(result) || validRolls(result?.rolls)) ? coreDamageDisplayParts(result,actualDefender?.stats?.hp) : null;
    let availability='unavailable';
    if(result?.availability==='unsupported')availability='unsupported';
    else if(parts)availability=ohko?result.outcome:deterministic && result.outcome!=='damage' ? result.outcome : 'available';
    scenarios.push({attackerAbility,defenderAbility,...(target?{target:{status:target.status,side:target.side,slot:target.slot,name:target.name,pokemon:target.pokemon,reason:target.reason}}:{}),...(battleContext.battlefield?{fieldAbilities:field.fieldAbilities,fieldAbilityChoices:branchContext.fieldAbilityChoices}:{}),attackerOptions:own,defenderOptions:other,
      availability,reason:['available','ohko','immune','failed','blocked'].includes(availability) ? result?.reason ?? null : result?.reason ??
        (!attackerAbility || !defenderAbility ? 'missing-ability' : 'missing-damage-data'),
      calculationMode:'abilities-and-items',result,...(move?.id===311?{moveMetadata}:{}),rolls:result?.rolls ?? null,min:result?.min ?? null,max:result?.max ?? null,
      percentage:parts?.percentage ?? null,hp:parts?.hp ?? null,message:parts?.message ?? null,note:parts?.note ?? null});
  }
  const grouped=new Map();
  for(const scenario of scenarios) {
    const key=JSON.stringify([scenario.availability,scenario.moveMetadata,scenario.target&&[scenario.target.status,scenario.target.side,scenario.target.slot],isAggregateResult(scenario.result)
      ? [scenario.result.kind,scenario.result.totalOutcomes,scenario.result.distribution]
      : isLevelDamageResult(scenario.result)
      ? [scenario.result.kind,scenario.result.totalOutcomes,scenario.result.rolls,scenario.result.distribution]
      : isOhkoResult(scenario.result)
      ? [scenario.result.kind,scenario.result.outcome,scenario.result.reason]
      : isDeterministicResult(scenario.result)
      ? [scenario.result.kind,scenario.result.outcome,scenario.result.damage,scenario.result.reason]
      : scenario.availability==='available' ? scenario.rolls : [scenario.reason,scenario.rolls]]);
    if(grouped.has(key))grouped.get(key).scenarios.push(scenario);
    else grouped.set(key,{...scenario,scenarios:[scenario]});
  }
  const groups=[...grouped.values()];
  const differingMetadata=move?.id===311&&new Set(scenarios.map(s=>JSON.stringify(s.moveMetadata))).size>1;
  for(const group of groups) {
    if(differingMetadata)group.showMoveMetadata=true;
    group.label=groups.length===1 ? '' : [...new Set(group.scenarios.map(scenario=>[
      ownValues.length>1 && otherValues.length>1 ? `${scenario.attackerAbility} → ${scenario.defenderAbility}`
        : ownValues.length>1 ? scenario.attackerAbility : otherValues.length>1 ? scenario.defenderAbility : '',
      ...fieldAbilityLabels(scenarios,scenario)].filter(Boolean).join(' · ')))].filter(Boolean).join(' / ');
  }
  return {scenarios,groups};
}
