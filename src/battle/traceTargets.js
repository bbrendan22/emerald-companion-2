import {playerAbilityOptions,opponentAbilityOptions} from './abilityScenarios.js';
import {isTraceAbility,projectAbilityConditions,resolveBattleAbility,conditionalAbilityState} from './conditionalAbilities.js';
import {activeConditionSlot,battlefieldSlotLiveness,slotConditions} from './matchupConditions.js';
import {opponentSpeciesById} from './opponentSpecies.js';
import {identifiedMatchup,matchupObservations} from './towerSets.js';

function activeSlots(state,side) {
  if(state.rules.format==='Doubles')return [0,1].filter(slot=>battlefieldSlotLiveness(state,side,slot)==='active');
  const slot=activeConditionSlot(state,side);
  return slot!==null&&slotConditions(state,side,slot).currentHp!==0?[slot]:[];
}
function slotPokemon(state,side,slot,records) {
  if(side==='player') {
    const mon=records.find(record=>record.identity===state.team[slot]);
    return mon?{...mon,abilityOptions:mon.abilityOptions??playerAbilityOptions(mon)}:null;
  }
  const mon=opponentSpeciesById(state.opponentSpecies[slot]);
  if(!mon)return null;
  // Project each opponent independently, exactly as the matchup/field readers do.
  const projected={...state,matchup:{...state.matchup,opponent:mon.id}};
  return {...mon,abilityOptions:opponentAbilityOptions(mon,identifiedMatchup(projected).sets,matchupObservations(projected).ability??'')};
}
export function traceTargetAbilities(state,side,records=[]) {
  const opposing=side==='player'?'enemy':'player';
  return [...new Set(activeSlots(state,opposing).flatMap(slot=>{
    const mon=slotPokemon(state,opposing,slot,records);
    if(!mon)return [];
    const projected=projectAbilityConditions(mon,slotConditions(state,opposing,slot));
    return mon.abilityOptions.values.map(ability=>resolveBattleAbility({...projected,ability}).ability).filter(isTraceAbility);
  }))].sort();
}
export function invalidTraceSelections(state,records=[]) {
  return ['player','enemy'].flatMap(side=>{
    const choices=traceTargetAbilities(state,side,records);
    return activeSlots(state,side).flatMap(slot=>{
      const mon=slotPokemon(state,side,slot,records);
      if(!mon)return [];
      const ability=conditionalAbilityState(mon,slotConditions(state,side,slot));
      return ability.trace&&ability.copiedAbility&&!choices.includes(ability.copiedAbility)?[{side,slot}]:[];
    });
  });
}
// Clear only ineligible copies, including an unviewed active Trace user. Keep the
// existing context and all personal/side conditions; copying again stays manual.
export function reconcileTraceSelections(state,records) {
  const invalid=invalidTraceSelections(state,records);
  if(!invalid.length)return state;
  const conditions={...state.matchupConditions};
  for(const {side,slot} of invalid) {
    const current=conditions[side][slot];
    conditions[side]={...conditions[side],[slot]:{...current,abilityState:{...current.abilityState,copiedAbility:null,flashFireActivated:false}}};
  }
  return {...state,matchupConditions:conditions};
}
