import {traceTargetAbilities,invalidTraceSelections} from '../../battle/traceTargets.js';
import {conditionalAbilityState} from '../../battle/conditionalAbilities.js';
import {playerAbilityOptions,opponentAbilityOptions} from '../../battle/abilityScenarios.js';
import {matchupObservations,identifiedMatchup} from '../../battle/towerSets.js';
import PokemonName from './PokemonName.js';
import React, {useEffect,useState} from 'react';
import {conditionWeather,conditionStatuses,conditionStats} from '../../battle/conditionState.js';

import {activeConditionSlot,slotConditions,conditionHp} from '../../battle/matchupConditions.js';

function HpInput({value,max,onChange,label,placeholder}) {
  const [draft,setDraft]=useState(value == null ? '' : String(value));
  useEffect(()=>setDraft(value == null ? '' : String(value)),[value]);
  return <input type="number" inputMode="numeric" min="1" max={max} step="1" aria-label={label} value={draft} placeholder={placeholder}
    onChange={event=>{const text=event.target.value;if(text===''){setDraft('');return;}const hp=Math.max(1,conditionHp(text,{max:max ?? Infinity}));setDraft(String(hp));onChange(hp);}}
    onBlur={()=>{if(draft===''){onChange(null);}}} />;
}
function ConditionSide({mon,side,state,dispatch,title,range,ability,traceChoices}) {
  const slot=activeConditionSlot(state,side), value=slotConditions(state,side,slot);
  const hp=conditionHp(value.currentHp,range);
  const maximum=range ? range.min===range.max ? String(range.max) : `${range.min}–${range.max}` : 'Unknown';
  const update=patch=>dispatch({type:'matchupCondition',side,slot,...patch});
  const label=side==='player'?'Player':'Opponent';
  return <section className="battle-condition-side" aria-label={`${label} conditions`}>
    <h4><PokemonName>{title}</PokemonName></h4>
    <label className="battle-condition-hp">HP <HpInput key={`${slot}:${mon.identity ?? mon.id}`} label={`${label} current HP`} value={hp ?? (range?.min === range?.max ? range?.max : null)} max={range?.max} placeholder="Full"
      onChange={hp=>update({field:'currentHp',value:hp,max:range?.max})} /><span>/ {maximum}</span></label>
    <label className="battle-condition-status">Status<span className="battle-observation-select battle-condition-select">
      <span className="battle-observation-display" aria-hidden="true"><span className="battle-observation-value">{value.status==='toxic'?'Badly Poisoned':conditionStatuses.find(([id])=>id===value.status)?.[1]}</span><span className="battle-observation-arrow">▾</span></span>
      <select aria-label={`${label} status`} value={value.status} onChange={event=>update({field:'status',value:event.target.value})}>
      {conditionStatuses.map(([id,name])=><option key={id} value={id}>{id==='toxic'?'Badly Poisoned':name}</option>)}
    </select></span></label>
    <div className="battle-condition-stages">{conditionStats.map(([stat,name])=><label key={stat}>{name.toUpperCase()}<span className="battle-observation-select battle-condition-select">
      <span className="battle-observation-display" aria-hidden="true"><span className="battle-observation-value">{value.stages[stat]>0?`+${value.stages[stat]}`:value.stages[stat] ?? 0}</span><span className="battle-observation-arrow">▾</span></span>
      <select aria-label={`${label} ${name} stage`} value={value.stages[stat] ?? 0}
      onChange={event=>update({field:'stage',stat,value:Number(event.target.value)})}>
      {Array.from({length:13},(_,i)=>i-6).map(stage=><option value={stage} key={stage}>{stage>0?`+${stage}`:stage}</option>)}
    </select></span></label>)}</div>
    {state.rules.format==='Doubles'&&<label className="battle-condition-activation"><input type="checkbox" aria-label={`${label} Helping Hand Active`} checked={Boolean(value.helpingHand)}
      onChange={event=>update({field:'helpingHand',value:event.target.checked})}/>Helping Hand Active</label>}
    <div className="battle-condition-screens">{[['reflect','Reflect'],['lightScreen','Light Screen']].map(([screen,name])=><label key={screen}>
      <input type="checkbox" aria-label={`${label} ${name}`} checked={Boolean(value.screens[screen])} onChange={event=>update({field:'screen',screen,value:event.target.checked})} />{name}
    </label>)}</div>
    <PokemonSpecificConditions side={side} slot={slot} ability={ability} traceChoices={traceChoices} dispatch={dispatch}/>
  </section>;
}
function PokemonSpecificConditions({side,slot,ability,traceChoices,dispatch}) {
  if(!ability.trace&&!ability.flashFire)return null;
  const label=side==='player'?'Player':'Opponent';
  const update=patch=>dispatch({type:'matchupCondition',side,slot,...patch});
  return <div className="battle-condition-special-controls">
    {ability.trace&&<label className="battle-condition-ability"><span>Trace Ability</span><span className="battle-observation-select battle-condition-select">
      <span className="battle-observation-display" aria-hidden="true"><span className="battle-observation-value">{ability.copiedAbility??'Unresolved'}</span><span className="battle-observation-arrow">▾</span></span>
      <select aria-label={`${label} Trace Ability`} value={ability.copiedAbility??''} onChange={event=>update({field:'copiedAbility',context:ability.context,value:event.target.value||null})}>
        <option value="">Unresolved</option>{traceChoices.map(name=><option key={name} value={name}>{name}</option>)}
      </select></span></label>}
    {ability.flashFire&&<label className="battle-condition-activation"><input type="checkbox" aria-label={`${label} Flash Fire Activated`} checked={ability.flashFireActivated}
      onChange={event=>update({field:'flashFireActivated',context:ability.context,value:event.target.checked})}/>Flash Fire Activated</label>}
  </div>;
}
export default function BattleMatchupConditions({state,dispatch,player,opponent,hpRange,records}) {
  const own={...player,abilityOptions:player.abilityOptions??playerAbilityOptions(player)};
  const other={...opponent,abilityOptions:opponent.abilityOptions??(opponent.ability?playerAbilityOptions(opponent):opponentAbilityOptions(opponent,identifiedMatchup(state).sets,matchupObservations(state).ability??''))};
  const roster=records??[player];
  const ownChoices=traceTargetAbilities(state,'player',roster),otherChoices=traceTargetAbilities(state,'enemy',roster);
  useEffect(()=>{
    if(invalidTraceSelections(state,roster).length)dispatch({type:'reconcileTraceSelections',records:roster});
  },[state,records,player,dispatch]);
  const playerSlot=activeConditionSlot(state,'player'),enemySlot=activeConditionSlot(state,'enemy');
  const ownState=conditionalAbilityState(own,slotConditions(state,'player',playerSlot));
  const otherState=conditionalAbilityState(other,slotConditions(state,'enemy',enemySlot));
  // Keep synchronization mounted even when no special controls are visible.
  useEffect(()=>{
    for(const [side,slot,ability] of [['player',playerSlot,ownState],['enemy',enemySlot,otherState]]) {
      const saved=slotConditions(state,side,slot).abilityState;
      if(slot!==null&&(ability.trace||ability.flashFire||saved)&&saved?.context!==ability.context)
        dispatch({type:'matchupCondition',side,slot,field:'abilityContext',context:ability.context});
    }
  },[playerSlot,enemySlot,ownState.context,otherState.context,state.team,state.opponentSpecies,state.matchupConditions,dispatch]);
  return <section className="battle-conditions" aria-label="Battle Conditions">
    <div className="battle-conditions-heading"><h2 className="battle-conditions-title">Battle Conditions</h2>
      <button type="button" className="battle-conditions-reset" onClick={()=>dispatch({type:'resetMatchupConditions'})}>Reset</button></div>
    <div id="battle-condition-controls">
      <div className="battle-condition-shared"><label>Weather<span className="battle-observation-select battle-condition-select">
        <span className="battle-observation-display" aria-hidden="true"><span className="battle-observation-value">{conditionWeather.find(([id])=>id===state.field.weather)?.[1]}</span><span className="battle-observation-arrow">▾</span></span>
        <select aria-label="Battle weather" value={state.field.weather} onChange={event=>dispatch({type:'conditionField',key:'weather',value:event.target.value})}>
        {conditionWeather.map(([id,name])=><option key={id} value={id}>{name}</option>)}
      </select></span></label><label><input type="checkbox" aria-label="Critical Hit" checked={state.field.critical} onChange={event=>dispatch({type:'conditionField',key:'critical',value:event.target.checked})} />Crit</label></div>
      <div className="battle-condition-columns"><ConditionSide side="player" mon={own} ability={ownState} traceChoices={ownChoices} title={player.name} range={{min:player.stats.hp,max:player.stats.hp}} state={state} dispatch={dispatch} />
        <ConditionSide side="enemy" mon={other} ability={otherState} traceChoices={otherChoices} title={opponent.name} range={hpRange} state={state} dispatch={dispatch} /></div>
    </div>
  </section>;
}
