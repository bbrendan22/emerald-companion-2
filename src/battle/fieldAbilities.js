import {reference} from './reference.js';
import {resolveBattleAbility,unresolvedTrace} from './conditionalAbilities.js';

const known=new Set(Object.values(reference.abilityNames).filter(value=>value&&value!=='None'));
const effective=mon=>{
 if(!mon)return null;
 const resolved=resolveBattleAbility(mon);
 return unresolvedTrace(resolved)||!known.has(resolved.ability)?null:resolved.ability;
};
const isPair=(field,side,slot)=>[field.attacking,field.defending].some(ref=>ref?.side===side&&ref.slot===slot);

// Enumerate only legitimate hidden-slot ability alternatives. Missing data and
// unresolved Trace stay unknown; they never acquire a guessed copied ability.
export function fieldAbilityBranches(context,{lightningRod=false}={}) {
 const field=context?.format==='Doubles'?context.battlefield:null;
 if(!field)return [{context,fieldAbilities:[]}];
 let branches=[{context,fieldAbilities:[]}];
 for(const side of ['player','enemy'])for(const slot of [0,1]) {
  const entry=field[side]?.[slot],mon=entry?.pokemon,options=mon?.abilityOptions;
  if(!entry||!mon||isPair(field,side,slot)||!['known','uncertain'].includes(options?.status)||!options.values?.length)continue;
  const signatures=options.values.map(ability=>{
   const value=effective({...mon,ability});
   return value==null?'unknown':['Cloud Nine','Air Lock'].includes(value)?'weather':(['Damp','Plus','Minus'].includes(value)||lightningRod&&side===field.defending?.side&&value==='Lightning Rod')?value:'none';
  });
  if(new Set(signatures).size<2)continue;
  branches=branches.flatMap(branch=>options.values.map(ability=>({
   context:{...branch.context,fieldAbilityChoices:{...branch.context.fieldAbilityChoices,[`${side}:${slot}`]:ability}},
   fieldAbilities:[...branch.fieldAbilities,{side,slot,name:mon.name,ability}],
  })));
 }
 return branches;
}

// livingOnly is used exclusively for CHECK_ON_FIELD (weather scripts/Speed).
// FIELD_SPORT and Cmd_tryexplosion inspect records without HP/absence checks.
// Neither cartridge lookup checks absence flags. A null app slot carries no
// retained ability/HP history, so it stays unknown. A confirmed holder wins.
export function fieldAbilityPresence(context,attacker,defender,names,{livingOnly=false}={}) {
 const field=context?.format==='Doubles'?context.battlefield:null;
 if(!field)return null;
 let unknown=false;
 for(const side of ['player','enemy'])for(const slot of [0,1]) {
  const entry=field[side]?.[slot];
  if(!entry){unknown=true;continue;}
  if(livingOnly&&entry.liveness==='fainted')continue;
  let mon=entry.pokemon,values;
  if(field.attacking?.side===side&&field.attacking.slot===slot)mon=attacker??mon;
  else if(field.defending?.side===side&&field.defending.slot===slot)mon=defender??mon;
  else {
   const choice=context.fieldAbilityChoices?.[`${side}:${slot}`];
   if(choice)mon={...mon,ability:choice};
   else if(['known','uncertain'].includes(mon?.abilityOptions?.status))values=mon.abilityOptions.values;
  }
  if(livingOnly&&mon?.currentHp===0)continue;
  const outcomes=(values??[mon?.ability]).map(ability=>{
   const value=effective(mon?{...mon,ability}:null);
   return value==null?null:names.includes(value);
  });
  if(outcomes.length&&outcomes.every(value=>value===true))return true;
  if(!outcomes.length||outcomes.some(value=>value===null||value===true))unknown=true;
 }
 return unknown?null:false;
}

export function fieldAbilityLabels(scenarios,scenario) {
 return (scenario?.fieldAbilities??[]).filter(entry=>new Set(scenarios.flatMap(s=>s.fieldAbilities??[])
  .filter(other=>other.side===entry.side&&other.slot===entry.slot).map(other=>other.ability)).size>1)
  .map(entry=>`${entry.name}: ${entry.ability}`);
}
