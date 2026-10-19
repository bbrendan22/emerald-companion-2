import PokemonName from '../../ui/components/PokemonName.js';
import {publicAsset} from '../../assets/publicAsset.js';
import React from 'react';
import {moveLearners} from './learners.js';

export default function MoveLearners({move}) {
  const groups = moveLearners(move);
  return <div className="resources-move-learners" id={`resources-move-learners-${move}`}>
    {groups.length ? groups.map(group => <section key={group.title} aria-label={group.title}>
      <h2>{group.title}</h2>
      <ul className="resources-learner-grid">{group.pokemon.map(pokemon => <li key={pokemon.dex} data-dex={pokemon.dex}>
        <img src={publicAsset(`/pokemon/emerald/normal/${pokemon.dex}.png`)} alt="" width="40" height="40" loading="lazy" />
        <span><PokemonName>{pokemon.name}</PokemonName></span>
      </li>)}</ul>
    </section>) : <p className="resources-move-description">No verified learners recorded.</p>}
  </div>;
}
