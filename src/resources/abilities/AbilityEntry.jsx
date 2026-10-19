import PokemonName from '../../ui/components/PokemonName.js';
import {publicAsset} from '../../assets/publicAsset.js';
import React from 'react';
import {abilityDescription, abilityPokemon} from './abilities.js';

export default function AbilityEntry({entry, expanded = false, onOpen}) {
  const pokemon = expanded ? abilityPokemon(entry.id) : [];
  return <>
    <div className="resources-move-summary">
      {onOpen && <button type="button" className="resources-move-toggle" aria-label={entry.name} aria-haspopup="dialog" onClick={onOpen} />}
      <div className="resources-move-heading"><strong>{entry.name}</strong></div>
      <p className="resources-move-description resources-ability-description">{abilityDescription(entry.id)}</p>
    </div>
    {expanded && <div className="resources-move-learners" id={`resources-ability-pokemon-${entry.id}`}>
      {pokemon.length ? <ul className="resources-learner-grid">{pokemon.map(species => <li key={species.dex} data-dex={species.dex}>
        <img src={publicAsset(`/pokemon/emerald/normal/${species.dex}.png`)} alt="" width="40" height="40" loading="lazy" />
        <span><PokemonName>{species.name}</PokemonName></span>
      </li>)}</ul> : <p className="resources-move-description">No Pokémon have this ability in Emerald.</p>}
    </div>}
  </>;
}
