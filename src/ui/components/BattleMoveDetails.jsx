import {isOhkoMove} from '../../battle/ohkoDamage.js';
import {isUnsupportedSpecialMove} from '../../battle/moveDamagePolicy.js';
import useBattlePopupDismiss from './useBattlePopupDismiss.js';
import MoveTypeIcon from './MoveTypeIcon.jsx';
import React, {useLayoutEffect, useMemo, useRef, useState} from 'react';
import {evaluateFrontierCandidates} from '../../battle/frontierCandidateDamage.js';
import {aggregateFrontierDamage} from '../../battle/frontierDamageAggregation.js';
import {frontierMoveMetadataValues} from '../../battle/frontierDamagePresentation.js';
import {calculateAbilityScenarios} from '../../battle/abilityScenarios.js';
import BasicDamagePreview from './BasicDamagePreview.jsx';
import {movePopupValues} from '../../battle/matchupPresentation.js';
import {isHpDependentMove,isSupportedDynamicMove,resolveConventionalMove} from '../../battle/dynamicMoves.js';
import {isSpecialDamageMove,resolveSpecialMove} from '../../battle/specialDamage.js';
import {isConditionalMove} from '../../battle/conditionalDamage.js';
import {multiHitSelector,selectedHitCount,multiHitPowerLabel} from '../../battle/multiHitSelection.js';
import BattleMoveScenarioControl from './BattleMoveScenarioControl.jsx';
import {conditionalSelector,selectedConditionalCase,selectConditionalAbilityDamage} from '../../battle/conditionalSelection.js';
import {isPsywaveMove} from '../../battle/deterministicDamage.js';
import {moveResources} from '../../resources/learnset/data/moveResources.js';

export default function BattleMoveDetails(props) {
  return <BattleMoveDetailsContent key={props.move.id} {...props}/>;
}

function BattleMoveDetailsContent({move, attacker, defender, basicAttacker, basicDefender, weather, critical, battleRules, onClose,frontierState,frontierPlayer,frontierRecords,frontierDirection}) {
  const canonical=moveResources[move.id];
  const informational=canonical?.power===0;
  const config=informational?null:conditionalSelector(move)??multiHitSelector(move);
  const [selection,setSelection]=useState(()=>config?.defaultValue);
  const [defenseCurl,setDefenseCurl]=useState(false);
  const selected=informational?null:selectedConditionalCase(move,selection,defenseCurl);
  const hitCount=informational?null:selectedHitCount(move,selection);
  const battleContext=hitCount===null?battleRules:{...battleRules,hitCount};
  const dialog = useRef(null);
  useBattlePopupDismiss({popup:dialog,onClose,tapOnly:true,interactive:'.battle-move-scenario-controls'});
  const conditions={weather:attacker?.weather,critical:attacker?.critical,
    attacker:{stages:attacker?.stages,status:attacker?.status,currentHp:attacker?.currentHp},
    defender:{stages:defender?.stages,screens:defender?.screens,status:defender?.status,currentHp:defender?.currentHp}};
  const frontierDamage=useMemo(()=>!informational&&frontierState?aggregateFrontierDamage(evaluateFrontierCandidates(frontierState,frontierPlayer,move,
    {direction:frontierDirection,selection,defenseCurl,records:frontierRecords})):undefined,
    [frontierState?.selectedOpponentSetId,frontierState?.opponentSetSelections,frontierState?.viewed,frontierState?.rules,frontierState?.team,frontierState?.opponentSpecies,frontierState?.matchup,
      frontierState?.selectedTrainer,frontierState?.selectedBrainSymbol,frontierState?.opponentObservations,
      frontierState?.matchupConditions,frontierState?.matchupSides,frontierState?.field,
      informational,Boolean(frontierState),frontierPlayer,frontierRecords,frontierDirection,move,selection,defenseCurl]);
  const abilityDamage = !informational&&frontierDamage===undefined
    ?selectConditionalAbilityDamage(calculateAbilityScenarios(move,attacker,defender,{weather,critical,battleContext}),selected):undefined;
  const values = movePopupValues(informational?{...move,...canonical}:move,attacker,defender);
  if(informational)values.power='—';
  else if(isUnsupportedSpecialMove(move))values.power='—';
  else if(hitCount!==null)values.power=multiHitPowerLabel(move,hitCount);
  else if(isPsywaveMove(move))values.power='Level-based';
  else if(isConditionalMove(move))values.power=selected.power;
  else if(frontierDamage){
    const metadata=frontierMoveMetadataValues(frontierDamage);
    if(isSupportedDynamicMove(move)){values.type=metadata.type;values.power=metadata.power;}
  } else if(move.id===311){
    // Metadata comes from the SAME pinned ability branches as the damage.
    // Never select one branch's type when suppression is uncertain.
    const metadata=abilityDamage.scenarios.map(s=>s.moveMetadata);
    const known=metadata.length>0&&metadata.every(Boolean);
    const types=new Set(metadata.filter(Boolean).map(m=>m.type));
    const powers=[...new Set(metadata.filter(Boolean).map(m=>m.power))].sort((a,b)=>a-b);
    values.type=known&&types.size===1?[...types][0]:null;
    values.power=known?(powers.length===1?powers[0]:powers.join(' / ')):'—';
  } else if(isSupportedDynamicMove(move)){
    const resolved=resolveConventionalMove(move,attacker,defender,weather);
    if(resolved){values.type=resolved.type;values.power=resolved.power;}
    else if(isHpDependentMove(move))values.power='—';
  } else if(isSpecialDamageMove(move)){
    const resolved=resolveSpecialMove(move,basicAttacker,basicDefender,conditions);
    if(resolved){values.type=resolved.type;values.power=resolved.power;}
  }
  // Set the viewport and scroll lock before the browser paints the opening frame.
  useLayoutEffect(() => {
    const node=dialog.current, previous=document.activeElement;
    // Safari can focus the containing <main> when a move is tapped. Do not
    // let showModal save that page-level target and outline it on dismissal.
    // Keyboard activation still returns focus to the actual move control.
    const returnFocus=previous?.tabIndex>=0 && previous.matches(':focus-visible') ? previous : null;
    if (!returnFocus) previous?.blur();
    const root=document.documentElement, body=document.body;
    const bodyStyle=body.getAttribute('style'), minHeight=root.style.minHeight;
    const x=window.scrollX, y=window.scrollY;
    // In the iOS Home Screen app, hiding root overflow can shorten a short
    // page's layout viewport. Pin the page instead, and size the modal from
    // window/visual viewport pixels rather than that reduced containing block.
    const sizeViewport=()=>{
      const screenHeight=window.screen.width===window.innerWidth ? window.screen.height : 0;
      const appHeight=window.navigator.standalone===true ? Math.max(window.outerHeight,screenHeight) : 0;
      const height=Math.max(window.innerHeight,window.visualViewport?.height ?? 0,appHeight);
      node.style.height=`${height}px`;
      root.style.minHeight=`${height}px`;
      body.style.minHeight=`${height}px`;
    };
    sizeViewport();
    Object.assign(body.style,{position:'fixed',top:`${-y}px`,left:`${-x}px`,width:'100%'});
    window.scrollTo(0,0);
    // React's autoFocus runs at mount, before this closed dialog is focusable.
    // The native attribute makes showModal choose the dialog itself instead.
    node.setAttribute('autofocus','');
    node.showModal();
    window.addEventListener('resize',sizeViewport);
    window.visualViewport?.addEventListener('resize',sizeViewport);
    return () => {
      node.close();
      window.removeEventListener('resize',sizeViewport);
      window.visualViewport?.removeEventListener('resize',sizeViewport);
      if(bodyStyle===null)body.removeAttribute('style');else body.setAttribute('style',bodyStyle);
      root.style.minHeight=minHeight;
      window.scrollTo(x,y);
      returnFocus?.focus({preventScroll:true});
    };
  },[]);
  // Keep showModal's initial focus off native selectors during the opening tap.
  return <dialog ref={dialog} tabIndex={-1} className="battle-move-viewport" aria-labelledby="battle-move-title"
    onCancel={event=>{event.preventDefault();onClose();}}>
    <div className="battle-move-dialog">
    <header><MoveTypeIcon type={values.type} moveId={move.id} moveName={move.name} size={22} alt={values.type?`${values.type.toLowerCase()} type`:undefined} />
      <h2 id="battle-move-title">{move.name}</h2></header>
    <dl>{[[move.id===167?'Hit powers':hitCount!==null?'Power / hit':'Power',informational?'—':(frontierDamage||isUnsupportedSpecialMove(move)||isOhkoMove(move)||isHpDependentMove(move)||isPsywaveMove(move)||isConditionalMove(move)||move.id===167||move.id===311)?values.power:typeof values.power==='number'?values.power:move.power>1?move.power:'—'],['Accuracy',values.accuracy],['Effect %',values.effect]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {frontierDamage&&isSupportedDynamicMove(move)&&!frontierDamage.metadata.type&&<p className="battle-ability-label">
      {frontierDamage.metadata.status==='unknown'?'Type/power unavailable.':'Type varies across possible matchups.'}</p>}
    {!informational&&<BattleMoveScenarioControl config={config} value={selection} defenseCurl={defenseCurl} onChange={setSelection} onCurlChange={setDefenseCurl}/>}
    {moveResources[move.id]?.description && <p className="battle-move-description">{moveResources[move.id].description}</p>}
    {!informational&&<BasicDamagePreview frontierDamage={frontierDamage} abilityDamage={abilityDamage} move={move} attacker={attacker} defender={defender} conditions={conditions} showUnavailable />}
    </div>
  </dialog>;
}
