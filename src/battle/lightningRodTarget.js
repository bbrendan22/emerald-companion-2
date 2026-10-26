import {battleMove,reference} from './reference.js';
import {resolveBattleAbility,unresolvedTrace} from './conditionalAbilities.js';

// HandleAction_UseMove checks canonical type before Hidden Power/Weather Ball
// scripts resolve their damage type. Charge's zero-power USER target is excluded.
export function isLightningRodEligible(move) {
 const canonical=battleMove(move?.id);
 return Boolean(canonical?.type==='ELECTRIC'&&(canonical.power!==0||canonical.target!=='MOVE_TARGET_USER'));
}
const known=new Set(Object.values(reference.abilityNames).filter(value=>value&&value!=='None'));
function rod(mon,choice) {
 if(!mon)return null;
 const abilities=choice?[choice]:mon.abilityOptions?.values??[mon.ability];
 const values=abilities.map(ability=>{
  const resolved=resolveBattleAbility({...mon,ability});
  return !known.has(resolved.ability)||unresolvedTrace(resolved)?null:resolved.ability==='Lightning Rod';
 });
 if(values.length&&values.every(value=>value===true))return true;
 if(values.length&&values.every(value=>value===false))return false;
 return null;
}

// Target selection only: damage arithmetic remains in the existing calculator.
// The selected opposing target stays selected if it already has Lightning Rod.
// Otherwise there is at most one other opposing slot in this two-by-two UI.
export function resolveLightningRodTarget(move,attacker,defender,context) {
 const field=context?.format==='Doubles'?context.battlefield:null;
 if(!field||!isLightningRodEligible(move))return null;
 const selected=field.defending,otherSlot=selected?.slot===0?1:0;
 if(!selected||![0,1].includes(selected.slot)||selected.side===field.attacking?.side)
  return {status:'unresolved',side:null,slot:null,name:null,pokemon:null,reason:'unsupported-lightning-rod-target-position'};
 const normal={status:'selected',side:selected.side,slot:selected.slot,name:defender?.name,pokemon:defender};
 const selectedRod=rod(defender,defender?.ability);
 if(selectedRod===true)return normal;
 const other=field[selected.side]?.[otherSlot];
 // Step 4C null means explicitly unassigned, not an unknown battler record.
 // Emerald scans actual ability records; do not invent one for an empty slot.
 if(other===null)return normal;
 // Missing entries and populated records with unresolved data stay uncertain.
 // Assigned fainted holders still follow Emerald's scan without an HP check.
 const choice=context.fieldAbilityChoices?.[`${selected.side}:${otherSlot}`];
 const otherRod=rod(other?.pokemon,choice);
 if(otherRod===false)return normal;
 if(otherRod===null||selectedRod===null)return {status:'unresolved',side:null,slot:null,name:other?.pokemon?.name,
  reason:'unknown-lightning-rod-target',pokemon:null};
 const actual=resolveBattleAbility({...other.pokemon,ability:choice??other.pokemon.ability});
 const target={status:'redirected',side:selected.side,slot:otherSlot,name:actual.name,pokemon:actual};
 if(other.liveness==='fainted'||actual.currentHp===0)return {...target,reason:'lightning-rod-fainted-target'};
 if(!Number.isInteger(actual.stats?.hp)||!Number.isInteger(actual.currentHp)||actual.currentHp<0||actual.currentHp>actual.stats.hp)
  return {...target,reason:'invalid-redirected-target-data'};
 // Preserve the original selected defender's pinned ability after it becomes a
 // hidden slot, so field-ability checks remain correlated with this scenario.
 const fieldAbilityChoices={...context.fieldAbilityChoices,[`${selected.side}:${selected.slot}`]:defender.ability};
 return {...target,context:{...context,fieldAbilityChoices,battlefield:{...field,defending:{side:selected.side,slot:otherSlot}}}};
}
