import {preventionMessages} from './abilityPrevention.js';

const reasonMessages={
  'unresolved-trace':'Select the copied ability for Trace.',
  'unknown-weather-suppression-field':'Unseen abilities may suppress the weather.',
  'unknown-plus-minus-field':'The opposite Plus/Minus field ability is unknown.',
  'unknown-damp-field':'An unseen Damp ability may prevent this move.',
  'unknown-lightning-rod-target':'The Lightning Rod target cannot be established from the available ability/slot data.',
  'unsupported-lightning-rod-target-position':'This calculator previews selected opposing targets; other targeting positions require unsupported turn information.',
  'invalid-redirected-target-data':'The redirected target has invalid HP or missing calculation data.',
  'lightning-rod-fainted-target':'Lightning Rod selected a fainted slot; redirected damage is unavailable.',
  'unknown-defender-side-count':'The number of active defenders is unknown.',
  'invalid-condition-current-hp':'Entered HP is invalid for a possible matchup.',
  'missing-trainer-ivs':'Opponent IVs are not established by a known trainer.',
  'missing-verified-ivs':'A possible Frontier set has no verified IVs.',
  'missing-or-invalid-candidate-item':'A possible Frontier set has missing or invalid item data.',
  'invalid-candidate-evs':'A possible Frontier set has missing or invalid EV data.',
  'opponent-move-input-inconsistency':'The selected move is not established for every possible set.',
};

export function frontierTargetMessage(summary) {
 const targets=(summary.branches??[]).map(branch=>branch.target).filter(Boolean);
 if(!targets.length)return undefined;
 const keys=new Set(targets.map(target=>JSON.stringify([target.status,target.side,target.slot])));
 if(keys.size>1)return `Lightning Rod may redirect this move. Possible targets: ${[...new Set(targets.map(target=>target.name?`${target.name} (${target.status==='redirected'?'redirected':'selected'})`:'unresolved'))].join(', ')}.`;
 const target=targets[0];
 if(target.status==='unresolved')return 'Lightning Rod targeting is uncertain. A hit on the selected Pokémon is not assumed.';
 const side=target.side==='player'?'Player':'Opponent';
 if(target.status==='redirected')return `Lightning Rod redirects to ${target.name} (${side} Slot ${target.slot+1}).${target.reason==='lightning-rod-fainted-target'?' This slot is fainted; redirected damage is unavailable.':''}`;
 return `Target: ${target.name} (${side} Slot ${target.slot+1}, selected).`;
}

export function frontierDamageDisplayParts(summary) {
  const notes=[];
 const targetMessage=frontierTargetMessage(summary);
 const targetInfo=targetMessage?{targetMessage}:{};
  if(summary.kind==='no-candidates')return {...targetInfo,message:'No matching Frontier sets.',notes};
  if(new Set((summary.branches??[]).map(branch=>branch.target&&JSON.stringify([branch.target.status,branch.target.side,branch.target.slot]))).size>1)
  return {...targetInfo,message:'Damage to different possible targets is not combined.',notes};
 if(summary.availability!=='available') {
    const explanations=[...new Set(summary.reasons.map(reason=>reasonMessages[reason]).filter(Boolean))];
    return {...targetInfo,message:`Damage unavailable for all possible sets. ${explanations.join(' ')||'Some matchup data is missing or unsupported.'}`,notes};
  }
  if(summary.kind==='categorical-ohko') {
    const outcomes=new Map();
    for(const group of summary.groups) {
      const branch=group.representative,result=branch.result;
      const key=JSON.stringify([result.outcome,result.reason]);
      if(!outcomes.has(key))outcomes.set(key,{message:result.outcome.toUpperCase(),reason:result.reason,abilities:new Set()});
      const outcome=outcomes.get(key);
      for(const contributor of group.contributors)outcome.abilities.add(
        `${contributor.scenario.attackerAbility} → ${contributor.scenario.defenderAbility}`);
    }
    return {...targetInfo,outcomes:[...outcomes.values()].map(value=>({...value,label:outcomes.size>1?[...value.abilities].join(' / '):''})),notes};
  }
  if(summary.notes.includes('some-possibilities-prevent-damage'))notes.push('Some possibilities prevent damage.');
  if(summary.notes.includes('all-possibilities-prevent-damage')) {
    const messages=summary.reasons.map(reason=>preventionMessages[reason]).filter(Boolean);
    notes.push(messages.length?[...new Set(messages)].join(' / '):'Immune.');
  }
  if(summary.notes.includes('move-fails'))notes.push('Move fails in some possible matchups.');
  if(summary.notes.includes('eleven-level-based-rolls'))notes.push('11 possible level-based damage rolls');
  if(summary.notes.includes('selected-hits-connected')) {
    const count=summary.evaluation.hitCount;
    notes.push(count===1?'If 1 hit connects':`If all ${count} hits connect`);
  } else if(summary.notes.includes('all-three-connected'))notes.push('If all 3 hits connect');
  return {...targetInfo,percentage:summary.hp.max===0?'0% – 0%':`${summary.percentage.min.toFixed(1)}% – ${summary.percentage.max.toFixed(1)}%`,
    hp:`${summary.hp.min}–${summary.hp.max} HP damage`,notes};
}

// Static accuracy/effect and categorical power labels stay in movePopupValues.
export function frontierMoveMetadataValues(summary) {
  const metadata=summary.metadata;
  const powers=[...new Set(metadata.alternatives.map(value=>value.value?.power).filter(Number.isFinite))].sort((a,b)=>a-b);
  return {type:metadata.type,power:metadata.status==='unknown'?'—'
    :metadata.power??(powers.length<=3?powers.join(' / '):`${powers[0]}–${powers.at(-1)}`)};
}
