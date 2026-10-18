import {publicAsset} from '../../assets/publicAsset.js';
import React, {useEffect, useRef} from 'react';
import BasicDamagePreview from './BasicDamagePreview.jsx';
import {movePopupValues} from '../../battle/matchupPresentation.js';
import {isVariableDamageMove,resolveVariableMove} from '../../battle/variableDamage.js';
import {isSpecialDamageMove,resolveSpecialMove} from '../../battle/specialDamage.js';

export default function BattleMoveDetails({move, attacker, defender, basicAttacker, basicDefender, onClose}) {
  const dialog = useRef(null), outside = useRef(false);
  const conditions={weather:attacker?.weather,critical:attacker?.critical,
    attacker:{stages:attacker?.stages,status:attacker?.status,currentHp:attacker?.currentHp},
    defender:{stages:defender?.stages,screens:defender?.screens,status:defender?.status,currentHp:defender?.currentHp}};
  const values = movePopupValues(move,attacker,defender);
  if(isVariableDamageMove(move)||isSpecialDamageMove(move)){
    const resolved=resolveSpecialMove(resolveVariableMove(move,basicAttacker,basicDefender,conditions),basicAttacker,basicDefender,conditions);
    if(resolved){values.type=resolved.type;values.power=resolved.power;}
  }
  useEffect(() => {
    const node=dialog.current, previous=document.activeElement;
    node.showModal();
    return () => {node.close();previous?.focus({preventScroll:true});};
  },[]);
  function isOutside(event) {
    const r=dialog.current.getBoundingClientRect();
    return event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom;
  }
  return <dialog ref={dialog} className="battle-move-dialog" aria-labelledby="battle-move-title"
    onCancel={event=>{event.preventDefault();onClose();}}
    onPointerDown={event=>{outside.current=isOutside(event);}}
    onClick={event=>{if(outside.current && isOutside(event))onClose();}}>
    <header>{values.type === 'MYSTERY' ? <span aria-hidden="true" style={{width:22,height:22,flexShrink:0}} /> : <img src={publicAsset(`/types/icons/${values.type.toLowerCase()}.png`)} alt={`${values.type.toLowerCase()} type`} width="22" height="22" />}
      <h2 id="battle-move-title">{move.name}</h2></header>
    <dl>{[['Power',values.power],['Accuracy',values.accuracy],['Effect',values.effect]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p>{move.description}</p>
    <BasicDamagePreview move={move} attacker={basicAttacker} defender={basicDefender} conditions={conditions} />
  </dialog>;
}
