import React from 'react';
import {frontierStatReference, frontierBarPercent} from '../../battle/frontierStatReference.js';
import '../styles/collection-pokemon-stats.css';

const stats = [['hp','HP'], ['attack','ATK'], ['defense','DEF'],
  ['spAttack','SPA'], ['spDefense','SPD'], ['speed','SPE']];
export default function BattleStatRow({values, speedComparison, referenceRanges = frontierStatReference()}) {
  return <dl className="battle-active-stats" aria-label="Stats">
    {stats.map(([key, name]) => {
      const value = values?.[key] ?? '—';
      const [min, max = min] = String(value).split('/').at(-1).split('–').map(Number);
      const known = Number.isFinite(min) && Number.isFinite(max);
      const minimum = known ? frontierBarPercent(min,referenceRanges[key]) : 0;
      const maximum = known ? frontierBarPercent(max,referenceRanges[key]) : 0;
      return <div className="collection-battle-stat battle-stat-bar" key={key} data-stat={key}>
        <dt>{name}</dt>
        <dd data-value={value} style={String(value).length>7 ? {gridTemplateColumns:`${String(value).length}ch minmax(0,1fr)`} : undefined}>
          <span className={`battle-stat-value${key==='speed' && speedComparison ? ` battle-speed-${speedComparison}` : ''}`}>{value}</span>
          <div className="collection-battle-stat-track battle-stat-track" aria-hidden="true">
            {known && <>
              <span className="battle-stat-solid" style={{width:`${minimum}%`}} />
              {maximum > minimum && <span className="battle-stat-extension" style={{left:`${minimum}%`,width:`${maximum-minimum}%`}} />}
            </>}
          </div>
        </dd>
      </div>;
    })}
  </dl>;
}
