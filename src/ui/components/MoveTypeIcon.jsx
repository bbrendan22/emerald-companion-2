import React from 'react';
import {publicAsset} from '../../assets/publicAsset.js';

// Presentation only: Emerald's Curse retains its ??? mechanics/data, but no icon.
export default function MoveTypeIcon({type, moveId, moveName, size = 18, className, alt}) {
  const normalized = type?.toLowerCase();
  const blank = Number(moveId) === 174 || moveName?.toLowerCase() === 'curse'
    || !normalized || normalized === 'mystery' || normalized === '???';
  const style = {width:size,height:size,flexShrink:0,display:'inline-block',objectFit:'contain'};
  return blank ? <span className={className} style={style} aria-hidden="true" />
    : <img className={className} style={style} src={publicAsset(`/types/icons/${normalized}.png`)}
      width={size} height={size} alt={alt ?? `${normalized[0].toUpperCase()}${normalized.slice(1)} type`} />;
}
