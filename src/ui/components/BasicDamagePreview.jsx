import React from 'react';
import {basicDamageScenarios} from '../../battle/basicDamage.js';
import {damageDisplayParts} from '../../battle/damagePresentation.js';

export default function BasicDamagePreview({move,attacker,defender,conditions}) {
 const groups=basicDamageScenarios(move,attacker,defender,conditions);
 if(!groups.length)return null;
 return <section className="battle-basic-damage" aria-label="Damage Calculation">
  <h3>Damage Calculation</h3>
  {groups.map(({result,label},i)=>{
   const {percentage,hp,color}=damageDisplayParts(result);
   return <p key={i}>{groups.length>1&&`${label}: `}<span className={`battle-preview-percent battle-preview-percent-${color}`}>{percentage}</span>{' · '}<span className="battle-preview-hp">{hp}</span></p>;
  })}
 </section>;
}
