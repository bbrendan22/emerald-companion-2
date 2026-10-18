import React, {useState} from 'react';
import {battleItemId} from '../../battle/itemLookup.js';

export default function BattleSetItem({name}) {
  const id = battleItemId(name);
  const [failed, setFailed] = useState(null);
  return <span className="battle-set-item"><span>{name}</span>{id && failed !== id
    && <img src={`/items/${id}.png`} width="12" height="12" alt="" loading="lazy" onError={() => setFailed(id)} />}</span>;
}
