import React from 'react';
import {publicAsset} from '../../assets/publicAsset.js';
import {moveResources} from '../learnset/data/moveResources.js';

export default function MoveSummary({entry, onOpen}) {
  const move = moveResources[entry.id];
  return <>
    <div className="resources-move-summary">
      {onOpen && <button type="button" className="resources-move-toggle" aria-label={entry.name} aria-haspopup="dialog" onClick={onOpen} />}
      <div className="resources-move-heading">{move.type === 'MYSTERY' ? <span className="resources-move-icon-space" aria-hidden="true" /> : <img src={publicAsset(`/types/icons/${move.type.toLowerCase()}.png`)} alt={`${move.type[0]}${move.type.slice(1).toLowerCase()} type`} width="18" height="18" />}<strong>{entry.name}</strong></div>
      <p className="resources-move-description">{move.description}</p>
      <dl className="resources-move-values">{[
        ['Pwr', move.power === 0 ? '—' : move.power === 1 ? 'Var' : move.power],
        ['Acc', move.accuracy === 0 ? '—' : `${move.accuracy}%`],
        ['Eff', move.effectChance > 0 ? `${move.effectChance}%` : '—'],
        ['PP', move.pp],
      ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </div>
  </>;
}
