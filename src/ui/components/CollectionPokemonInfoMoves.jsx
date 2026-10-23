import React from 'react';
import {publicAsset} from '../../assets/publicAsset.js';
import '../styles/collection-pokemon-info-moves.css';
import MoveTypeIcon from './MoveTypeIcon.jsx';

export default function CollectionPokemonInfoMoves({pokemon, heldItem, moves}) {
  return <div className="collection-info-moves">
    <dl className="collection-pokemon-info">
      <div><dt>Nature</dt><dd>{pokemon.nature}</dd></div>
      <div><dt>Ability</dt><dd>{pokemon.ability.name ?? `Unknown ability (ID ${pokemon.ability.id})`}</dd></div>
      <div><dt>Held Item</dt><dd className="collection-pokemon-held-item">
        <span>{heldItem}</span>
        {pokemon.heldItemId > 0 && pokemon.heldItemId <= 376 && <img src={publicAsset(`/items/${pokemon.heldItemId}.png`)} alt=""/>}
      </dd></div>
    </dl>
    <ol className="collection-pokemon-moves" aria-label="Moves">
      {moves.map(move => <li key={move.slot}>
        {move.id ? <>
          <MoveTypeIcon type={move.type} moveId={move.id} moveName={move.name} size={21} alt={`${move.type} type`} />
          <span className="collection-pokemon-move-name">{move.name ?? `Unknown move (ID ${move.id})`}</span>
          <small className="collection-pokemon-move-pp">PP {move.maxPp ?? '—'}</small>
        </> : <span className="collection-pokemon-empty-move">—</span>}
      </li>)}
    </ol>
  </div>;
}
