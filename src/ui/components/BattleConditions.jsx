import React, {useEffect,useState} from 'react';
import {conditionWeather,conditionStatuses,conditionStats,conditionKey,conditionedBattlePokemon,clampConditionHp} from '../../battle/conditionState.js';

function HpInput({value,max,onChange,label}) {
  const [draft,setDraft]=useState(String(value));
  useEffect(()=>setDraft(String(value)),[value,max]);
  return <input type="number" inputMode="numeric" min="0" max={max} step="1" aria-label={label} value={draft}
    onChange={event=>{const text=event.target.value;if(text===''){setDraft('');return;}const hp=clampConditionHp(text,max);setDraft(String(hp));onChange(hp);}}
    onBlur={()=>{if(draft===''){setDraft('0');onChange(0);}}} />;
}
function ConditionSide({mon,side,state,dispatch,title}) {
  const key=conditionKey(mon,side), value=conditionedBattlePokemon(mon,side,state);
  const label=side==='player'?'Player':'Opponent';
  return <section className="battle-condition-side" aria-label={`${label} conditions`}>
    <h4>{title}</h4>
    <label className="battle-condition-hp">HP <HpInput key={key} label={`${label} current HP`} value={value.currentHp} max={mon.stats.hp}
      onChange={hp=>dispatch({type:'conditionHp',key,value:hp,max:mon.stats.hp})} /><span>/ {mon.stats.hp}</span></label>
    <label className="battle-condition-status">Status<select aria-label={`${label} status`} value={value.status} onChange={event=>dispatch({type:'conditionStatus',key,value:event.target.value})}>
      {conditionStatuses.map(([id,name])=><option key={id} value={id}>{name}</option>)}
    </select></label>
    <div className="battle-condition-stages">{conditionStats.map(([stat,name])=><label key={stat}>{name}<select aria-label={`${label} ${name} stage`} value={value.stages[stat] ?? 0}
      onChange={event=>dispatch({type:'conditionStage',side,stat,value:Number(event.target.value)})}>
      {Array.from({length:13},(_,i)=>i-6).map(stage=><option value={stage} key={stage}>{stage>0?`+${stage}`:stage}</option>)}
    </select></label>)}</div>
    <div className="battle-condition-screens">{[['reflect','Reflect'],['lightScreen','Light Screen']].map(([screen,name])=><label key={screen}>
      <input type="checkbox" aria-label={`${label} ${name}`} checked={Boolean(value.screens[screen])} onChange={event=>dispatch({type:'conditionScreen',side,screen,value:event.target.checked})} />{name}
    </label>)}</div>
  </section>;
}
export default function BattleConditions({state,dispatch,player,opponent,set}) {
  return <section className="battle-conditions" aria-label="Battle Conditions">
    <div className="battle-conditions-heading"><button type="button" aria-expanded={state.conditionsExpanded} aria-controls="battle-condition-controls"
      onClick={()=>dispatch({type:'conditionsOpen',open:!state.conditionsExpanded})}>Battle Conditions<span aria-hidden="true">{state.conditionsExpanded?'▴':'▾'}</span></button>
      <button type="button" className="battle-conditions-reset" onClick={()=>dispatch({type:'resetConditions'})}>Reset</button></div>
    {state.conditionsExpanded && <div id="battle-condition-controls">
      <div className="battle-condition-shared"><label>Weather<select aria-label="Battle weather" value={state.field.weather} onChange={event=>dispatch({type:'conditionField',key:'weather',value:event.target.value})}>
        {conditionWeather.map(([id,name])=><option key={id} value={id}>{name}</option>)}
      </select></label><label><input type="checkbox" aria-label="Critical Hit" checked={state.field.critical} onChange={event=>dispatch({type:'conditionField',key:'critical',value:event.target.checked})} />Critical Hit</label></div>
      <div className="battle-condition-columns"><ConditionSide side="player" mon={player} title={player.name} state={state} dispatch={dispatch} />
        <ConditionSide side="enemy" mon={opponent} title={`${opponent.name}${set?.instance?` #${set.instance}`:''}`} state={state} dispatch={dispatch} /></div>
    </div>}
  </section>;
}
