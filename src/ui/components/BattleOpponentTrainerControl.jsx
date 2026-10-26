import React, {useLayoutEffect,useRef} from 'react';
import {searchTowerTrainers, selectedTowerTrainer, towerTrainerEntries} from '../../battle/towerTrainers.js';

export const trainerResultText = text => text.replace(/\s*\([^)]*\)/g,'').replace(/[♂♀]/g,'').trim();
const titleCase = text => trainerResultText(text).toLowerCase().replace(/(^|[\s-])\p{L}/gu, letter => letter.toUpperCase());
export const trainerLabel = entry => `${titleCase(entry.name)} · ${titleCase(entry.trainerClass)}`;

export default function BattleOpponentTrainerControl({state, dispatch, entries = towerTrainerEntries}) {
  const trainer = selectedTowerTrainer(state);
  const control=useRef(null),text=useRef(null);
  useLayoutEffect(()=>{
    const label=control.current,heading=label?.closest('.battle-single-selection .battle-selection-trainer h3');
    if(!heading)return;
    let fittedWidth;
    const fit=()=>{
      const width=heading.clientWidth;
      if(width===fittedWidth)return;
      fittedWidth=width;
      label.style.fontSize='16px';
      const natural=text.current.getBoundingClientRect().width;
      const available=width-12; // adjacent 8px chevron and 4px gap
      if(natural>available && available>0)label.style.fontSize=`${Math.floor(16*available/natural*20)/20}px`;
    };
    fit();
    let frame;
    const observer=new ResizeObserver(()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(fit);
    });
    observer.observe(heading);
    return ()=>{observer.disconnect();cancelAnimationFrame(frame);};
  },[trainer?.key]);
  const trainers = searchTowerTrainers('', {entries, format:state.rules.format, state})
    .sort((a,b) => titleCase(a.name).localeCompare(titleCase(b.name))
      || titleCase(a.trainerClass).localeCompare(titleCase(b.trainerClass)) || a.key.localeCompare(b.key));
  return <h3><label ref={control} className="battle-opponent-trainer-control">
    <span className="battle-opponent-trainer-caption" aria-hidden="true">
      <span ref={text}>{trainer && state.rules.format==='Singles' ? <><span className="battle-opponent-trainer-name">{titleCase(trainer.name)}</span><span className="battle-opponent-trainer-class"> · {titleCase(trainer.trainerClass)}</span></> : trainer ? trainerLabel(trainer) : 'Select Trainer'}</span>
      <span className="battle-round-chevron">▾</span>
    </span>
    <select className="battle-opponent-trainer-select" aria-label="Select Trainer"
    value={trainer?.key ?? ''}
    onChange={event => {
      const key = event.target.value;
      if (key === (trainer?.key ?? '')) return;
      dispatch(key ? {type:'opponentTrainer',key} : {type:'clearOpponentTrainer'});
    }}>
    <option value="">Select Trainer</option>
    {trainers.map(entry => <option key={entry.key} value={entry.key}>{trainerLabel(entry)}</option>)}
  </select></label></h3>;
}
