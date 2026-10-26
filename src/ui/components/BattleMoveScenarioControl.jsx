import React from 'react';

export default function BattleMoveScenarioControl({config,value,defenseCurl,onChange,onCurlChange}) {
 if(!config)return null;
 return <div className="battle-move-scenario-controls">
  <label>{config.label}<span className="battle-observation-select">
   <span className="battle-observation-display" aria-hidden="true"><span className="battle-observation-value">{config.options.find(option=>option.value===value)?.label}</span><span className="battle-observation-arrow">▾</span></span>
   <select aria-label={config.label} value={value} onChange={event=>onChange(event.target.value)}>
    {config.options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
   </select>
  </span></label>
  {config.defenseCurl&&<label><input type="checkbox" checked={defenseCurl} onChange={event=>onCurlChange(event.target.checked)}/>Defense Curl</label>}
 </div>;
}
