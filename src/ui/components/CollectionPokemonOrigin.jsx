import React from 'react';
import {pokemonOrigin} from '../pokemonOrigin.js';
import {publicAsset} from '../../assets/publicAsset.js';
import '../styles/collection-pokemon-origin.css';

export default function CollectionPokemonOrigin({pokemon}) {
  const data = pokemonOrigin(pokemon);
  return <section className="collection-pokemon-origin" aria-label="Origin">
    <dl>
      <div><dt>OT</dt><dd>{data.ot ?? '—'}</dd></div>
      <div><dt>TID</dt><dd className="text-tabular">{data.tid ?? '—'}</dd></div>
      <div><dt>Origin Game</dt><dd>{data.game ?? '—'}</dd></div>
      <div><dt>Poké Ball</dt><dd className="collection-origin-ball"><span>{data.ball ?? '—'}</span>
        {data.ball && <img src={publicAsset(`/items/${data.ballItemId}.png`)} alt=""/>}
      </dd></div>
      <div><dt>Met Location</dt><dd>{data.metLocation ?? '—'}</dd></div>
      <div><dt>Met Level</dt><dd className="text-tabular">{data.metLevel ?? '—'}</dd></div>
    </dl>
  </section>;
}
