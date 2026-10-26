import {koDisplayLabels,scalarKoDisplayResult} from '../../battle/koPresentation.js';
import {moveDamageNotice} from '../../battle/moveDamagePolicy.js';
import React from 'react';
import {coreDamageDisplayParts} from '../../battle/coreDamagePresentation.js';
import {basicDamageScenarios} from '../../battle/basicDamage.js';
import {damageDisplayParts} from '../../battle/damagePresentation.js';
import {conditionalCaseLabel,conditionalMoveNote} from '../../battle/conditionalDamage.js';
import {frontierAbilityResults} from '../../battle/frontierDamageAggregation.js';
import {frontierDamageDisplayParts,frontierTargetMessage} from '../../battle/frontierDamagePresentation.js';

function KoRow({ko}) {
 const labels=koDisplayLabels(ko);
 return labels.length?<p className="battle-core-damage-ko">{labels.map(label=><span key={label}>{label}</span>)}</p>:null;
}
function AbilityDamageGroups({groups,scenarios,defender,move}) {
 const targets=new Set(scenarios.map(s=>s.target?`${s.target.status}:${s.target.side}:${s.target.slot}`:'original'));
 const koDefender=targets.size===1?(scenarios[0]?.target?.pokemon??defender):null;
 return <>{groups.map((group,index)=><div className="battle-ability-result" key={index}>
    {(group.label||group.showMoveMetadata) && <p className="battle-ability-label">{group.label}{group.showMoveMetadata&&<>
     {group.label?' · ':''}{group.moveMetadata?`${group.moveMetadata.type[0]}${group.moveMetadata.type.slice(1).toLowerCase()} · Power ${group.moveMetadata.power}`:'Type/power unavailable'}
    </>}</p>}
    {group.target&&<p className="battle-ability-label">{frontierTargetMessage({branches:group.scenarios.map(scenario=>({target:scenario.target}))})}</p>}
    {group.availability==='available' ? <>
     <p className="battle-core-damage-percent">{group.percentage}</p>
     <p className="battle-core-damage-hp">{group.hp}</p>
     {group.note && <p className="battle-ability-label battle-core-damage-note">{group.note}</p>}
    </> : group.message ? <p className={group.result?.kind==='ohko'?'battle-core-damage-outcome':'battle-core-damage-hp'}>{group.message}</p>
    : <p className="battle-damage-unavailable">{group.reason==='unresolved-trace'?'Damage unavailable: select the copied ability for Trace.':'Damage unavailable for this matchup.'}</p>}
   </div>)}<KoRow ko={koDefender?scalarKoDisplayResult(scenarios,koDefender,move):null}/></>;
}

function FrontierDamageResult({summary:frontierDamage,move}) {
 const parts=frontierDamageDisplayParts(frontierDamage);
 return <>
   {frontierDamage.evaluation.condition&&<p className="battle-ability-label">{conditionalCaseLabel(frontierDamage.evaluation.condition)}</p>}
   {parts.targetMessage&&<p className="battle-ability-label">{parts.targetMessage}</p>}
   {parts.percentage&&<><p className="battle-core-damage-percent">{parts.percentage}</p><p className="battle-core-damage-hp">{parts.hp}</p></>}
   <KoRow ko={parts.percentage||parts.outcomes?frontierDamage.ko:null}/>
   {parts.message&&<p className="battle-damage-unavailable">{parts.message}</p>}
   {parts.outcomes?.map((outcome,index)=><div className="battle-ability-result" key={index}>
    {outcome.label&&<p className="battle-ability-label">{outcome.label}</p>}
    <p className="battle-core-damage-outcome">{outcome.message}</p>
   </div>)}
   {parts.notes.map(note=><p className="battle-ability-label battle-core-damage-note" key={note}>{note}</p>)}
   {conditionalMoveNote(move)&&<p className="battle-ability-label battle-core-damage-note">{conditionalMoveNote(move)}</p>}
 </>;
}

export default function BasicDamagePreview({move,attacker,defender,conditions,showUnavailable=false,coreDamage,abilityDamage,frontierDamage}) {
 const notice=moveDamageNotice(move);
 if(frontierDamage!==undefined&&!['status','unsupported'].includes(frontierDamage.kind)) {
  const alternatives=frontierAbilityResults(frontierDamage);
  return <section className="battle-basic-damage" aria-label="Damage Calculation">
   <h3>Damage Calculation</h3>
   {alternatives.length ? alternatives.map(({label,summary})=><div className="battle-ability-result" role="group" aria-label={label} key={label}>
    <p className="battle-ability-label">{label}</p><FrontierDamageResult summary={summary} move={move}/>
   </div>) : <FrontierDamageResult summary={frontierDamage} move={move}/>}
  </section>;
 }
 if(notice)return <section className="battle-basic-damage" aria-label={notice.heading}>
  <h3>{notice.heading}</h3>{frontierDamage&&frontierTargetMessage(frontierDamage)&&<p className="battle-ability-label">{frontierTargetMessage(frontierDamage)}</p>}<p className="battle-core-damage-hp">{notice.message}</p>
 </section>;
 if(abilityDamage !== undefined) {
  return <section className="battle-basic-damage" aria-label="Damage Calculation">
   <h3>Damage Calculation</h3>
   {abilityDamage.kind==='conditional-ability-scenarios'
    ? abilityDamage.conditions.map(condition=><div className="battle-ability-result" role="group" aria-label={conditionalCaseLabel(condition)} key={condition.id}>
      <p className="battle-ability-label">{conditionalCaseLabel(condition)}</p>
      <AbilityDamageGroups {...condition.abilityDamage} defender={defender} move={move}/>
     </div>)
    : <AbilityDamageGroups {...abilityDamage} defender={defender} move={move}/>}
   {conditionalMoveNote(move)&&<p className="battle-ability-label battle-core-damage-note">{conditionalMoveNote(move)}</p>}
  </section>;
 }
 if(coreDamage !== undefined) {
  const parts=coreDamageDisplayParts(coreDamage,defender?.stats?.hp);
  if(!parts && !showUnavailable)return null;
  return <section className="battle-basic-damage" aria-label="Damage Calculation">
   <h3>Damage Calculation</h3>
   {parts?.message ? <p className={coreDamage?.kind==='ohko'?'battle-core-damage-outcome':'battle-core-damage-hp'}>{parts.message}</p> : parts ? <>
    <p className="battle-core-damage-percent">{parts.percentage}</p>
    <p className="battle-core-damage-hp">{parts.hp}</p>
    <KoRow ko={scalarKoDisplayResult([{availability:'available',result:coreDamage}],defender,move)}/>
    {parts.note && <p className="battle-ability-label battle-core-damage-note">{parts.note}</p>}
   </> : <p className="battle-damage-unavailable">Damage unavailable for this matchup.</p>}
  </section>;
 }
 // Legacy callers retain their existing preview behavior.
 const groups=basicDamageScenarios(move,attacker,defender,conditions);
 if(!groups.length && !showUnavailable)return null;
 return <section className="battle-basic-damage" aria-label="Damage Calculation">
  <h3>Damage Calculation</h3>
  {!groups.length && <p className="battle-damage-unavailable">Damage unavailable for this matchup.</p>}
  {groups.map(({result,label},i)=>{
   const {percentage,hp,color}=damageDisplayParts(result);
   return <p key={i}>{groups.length>1&&`${label}: `}<span className={`battle-preview-percent battle-preview-percent-${color}`}>{percentage}</span>{' · '}<span className="battle-preview-hp">{hp}</span></p>;
  })}
 </section>;
}
