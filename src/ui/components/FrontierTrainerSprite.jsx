import {publicAsset} from '../../assets/publicAsset.js';
import React, {useState} from 'react';

export default function FrontierTrainerSprite({src, className = '', loading = 'lazy'}) {
  const [failed, setFailed] = useState(null);
  return src && failed !== src ? <img src={publicAsset(src)} className={className} alt="" loading={loading} decoding="async" onError={() => setFailed(src)} />
    : <span className={`${className} battle-trainer-empty`} aria-hidden="true">—</span>;
}
