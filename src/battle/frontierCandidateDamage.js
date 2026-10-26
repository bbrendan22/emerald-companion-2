import {doublesBattlefieldContext,projectBattlePokemon as project} from './battlefieldContext.js';
import {frontierMatchupCandidates} from './frontierCandidates.js';
import {identifiedMatchup} from './towerSets.js';
import {battleMove} from './reference.js';
import {activeConditionSlot,slotConditions,matchupBattleContext} from './matchupConditions.js';
import {resolveBattleAbility,unresolvedTrace} from './conditionalAbilities.js';
import {calculateAbilityScenarios,playerAbilityOptions} from './abilityScenarios.js';
import {selectedConditionalCase,selectConditionalAbilityDamage} from './conditionalSelection.js';
import {selectedHitCount} from './multiHitSelection.js';
import {resolveConventionalMove} from './dynamicMoves.js';

const completeOutcomes=new Set(['available','immune','blocked','failed','ohko']);

// One entry per construction candidate, in source order. No cross-set grouping,
// envelopes, percentage formatting, or overrides of the core's field safeguards.
// direction uses the same player/enemy ownership names as matchupBattleContext.
export function evaluateFrontierCandidates(state,player,selectedMove,{direction='player',selection,defenseCurl=false,records}={}) {
  const construction=frontierMatchupCandidates(state);
  const move=battleMove(selectedMove?.id);
  const condition=move?selectedConditionalCase(move,selection,defenseCurl):null;
  const hitCount=move?selectedHitCount(move,selection):null;
  const battlefield=doublesBattlefieldContext(state,records??(player?[player]:[]),{direction,construction});
  const context={...matchupBattleContext(state,direction),...(battlefield?{battlefield}:{})};
  const battleContext=hitCount===null?{...context}:{...context,hitCount};
  const {weather='none',critical=false}=state.field??{};
  const playerSlot=activeConditionSlot(state,'player');
  const enemySlot=activeConditionSlot(state,'enemy');
  const projectedPlayer=player&&player.identity===state.matchup?.player&&playerSlot!==null
    ? project({...player,abilityOptions:player.abilityOptions??playerAbilityOptions(player)},slotConditions(state,'player',playerSlot)):null;
  const identification=direction==='enemy'&&construction.candidates.some(candidate=>candidate.availability==='available')
    ?identifiedMatchup(state):null;
  // A known move must be exposed by the current observation/unique-inference
  // context AND belong to every remaining source. Never filter on this check.
  const justified=move&&identification?.moves.includes(move.name);
  const consistent=move&&construction.candidates.every(candidate=>Array.isArray(candidate.sourceSet.moves)
    &&candidate.sourceSet.moves.includes(move.name));
  const evaluations=construction.candidates.map(candidate=>{
    const opponent=candidate.opponent&&enemySlot!==null
      ? project(candidate.opponent,slotConditions(state,'enemy',enemySlot)):null;
    const attacker=direction==='enemy'?opponent:projectedPlayer;
    const defender=direction==='enemy'?projectedPlayer:opponent;
    const entry={candidate,setId:candidate.setId,sourceSet:candidate.sourceSet,
      constructionAvailability:candidate.availability,constructionReason:candidate.reason,
      direction,move,condition,hitCount,weather,critical,battleContext,
      opponent,attacker,defender,candidateMaximumHp:candidate.opponent?.stats.hp??null,
      defenderMaximumHp:defender?.stats?.hp??null};
    const unavailable=(reason,details=null)=>({...entry,availability:'unavailable',reason,details,abilityDamage:null});
    if(candidate.availability!=='available')return unavailable(candidate.reason);
    if(!['player','enemy'].includes(direction))return unavailable('invalid-attack-direction');
    if(!move)return unavailable('invalid-selected-move');
    if(direction==='enemy'&&(!justified||!consistent))return unavailable('opponent-move-input-inconsistency');
    if(!projectedPlayer||!opponent)return unavailable('missing-active-matchup-pokemon');
    for(const [side,mon] of [['player',projectedPlayer],['enemy',opponent]]) {
      const maximumHp=mon.stats?.hp,currentHp=mon.currentHp;
      if(!Number.isInteger(maximumHp)||maximumHp<1||maximumHp>999)
        return unavailable('invalid-condition-maximum-hp',{side,currentHp,maximumHp});
      if(!Number.isInteger(currentHp)||currentHp<0||currentHp>maximumHp)
        return unavailable('invalid-condition-current-hp',{side,currentHp,maximumHp});
    }
    const calculated=selectConditionalAbilityDamage(calculateAbilityScenarios(move,attacker,defender,
      {weather,critical,battleContext}),condition);
    // The existing ability engine also builds legacy display groups. Retain only
    // individual raw branches here; none of that formatted presentation escapes.
    const raw=damage=>({scenarios:damage.scenarios.map(scenario=>rawScenario(scenario,move,attacker,defender,weather,condition,battleContext))});
    const abilityDamage=calculated.kind==='conditional-ability-scenarios'
      ? {kind:calculated.kind,conditions:calculated.conditions.map(value=>({...value,abilityDamage:raw(value.abilityDamage)}))}
      :raw(calculated);
    const scenarios=abilityDamage.conditions?abilityDamage.conditions.flatMap(value=>value.abilityDamage.scenarios):abilityDamage.scenarios;
    const reasons=[...new Set(scenarios.filter(value=>!completeOutcomes.has(value.availability)).map(value=>value.reason))];
    return {...entry,availability:reasons.length?'unavailable':'available',
      reason:reasons.length?'incomplete-ability-scenarios':null,reasons,abilityDamage};
  });
  return {construction,direction,move,condition,hitCount,weather,critical,battleContext,evaluations};
}

function rawScenario(scenario,move,attacker,defender,weather,condition,battleContext) {
  const {attackerAbility,defenderAbility,attackerOptions,defenderOptions,availability,reason,calculationMode,result}=scenario;
  const a=resolveBattleAbility({...attacker,ability:attackerAbility});
  const d=scenario.target?.status==='redirected'?scenario.target.pokemon:resolveBattleAbility({...defender,ability:defenderAbility});
  const resolved=attackerAbility&&defenderAbility&&!unresolvedTrace(a)&&!unresolvedTrace(d)
    ? resolveConventionalMove(move,a,d,weather,{...battleContext,fieldAbilityChoices:scenario.fieldAbilityChoices}):null;
  const moveMetadata=result?.fieldMoveMetadata===null?null:condition
    ? {type:move.type,power:condition.power,formulaPower:condition.formulaPower??move.power,damageMultiplier:condition.multiplier}
    :resolved?{type:resolved.type,power:resolved.power,
      ...(resolved.formulaPower!==undefined?{formulaPower:resolved.formulaPower}:{}),
      ...(resolved.damageMultiplier!==undefined?{damageMultiplier:resolved.damageMultiplier}:{}),
      ...scenario.moveMetadata}:scenario.moveMetadata??null;
  return {attackerAbility,defenderAbility,...(scenario.target?{target:scenario.target}:{}),attackerOptions,defenderOptions,availability,reason,calculationMode,result,moveMetadata,
    ...(scenario.fieldAbilities?{fieldAbilities:scenario.fieldAbilities,fieldAbilityChoices:scenario.fieldAbilityChoices}:{})};
}
