import {reference} from './reference.js';
// Emerald ABILITYEFFECT_TRACE copies any nonzero ability, including Trace,
// Forecast and Wonder Guard. Cacophony is unused and has no legal holder.
// https://github.com/pret/pokeemerald/blob/master/src/battle_util.c#L2892-L2947
export const traceAbilities=Object.freeze([...new Set(Object.values(reference.abilityNames))]
 .filter(name=>name && !['None','Cacophony'].includes(name)).sort());
export const isTraceAbility=ability=>traceAbilities.includes(ability);
export const unresolvedTrace=mon=>mon?.ability==='Trace' && !mon.traceResolved;
export function resolveBattleAbility(mon) {
 if(mon?.ability!=='Trace'||mon.traceResolved)return mon;
 // Calculation-only fallback: keep Trace itself (no passive modifiers) when
 // no copy is selected. Never write a guessed ability into condition state.
 return {...mon,ability:isTraceAbility(mon.copiedAbility)?mon.copiedAbility:'Trace',traceResolved:true};
}
export function abilityConditionContext(mon) {
 const values=mon?.abilityOptions?.values ?? String(mon?.ability??'').split(/\s*\/\s*/);
 return [...new Set(values)].sort().join('|');
}
export function conditionalAbilityState(mon,conditions={}) {
 const context=abilityConditionContext(mon),saved=conditions.abilityState;
 const valid=saved?.context===context;
 const trace=context.split('|').includes('Trace');
 const copiedAbility=trace&&valid&&isTraceAbility(saved.copiedAbility)?saved.copiedAbility:null;
 const flashFire=context.split('|').includes('Flash Fire') || trace&&copiedAbility==='Flash Fire';
 return {context,trace,copiedAbility,flashFire,flashFireActivated:Boolean(flashFire&&valid&&saved.flashFireActivated)};
}
export function projectAbilityConditions(mon,conditions) {
 const state=conditionalAbilityState(mon,conditions);
 return {...mon,copiedAbility:state.copiedAbility,flashFireActivated:state.flashFireActivated};
}
