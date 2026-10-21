import React from 'react';
import {pokerusState} from '../../pokemon/profile.js';
import '../styles/collection-pokemon-condition.css';

export default function CollectionPokemonCondition({pokemon}) {
  return <dl className="collection-pokemon-condition">
    <div><dt>Friendship</dt><dd className="text-tabular">{pokemon.friendship ?? '—'}</dd></div>
    <div><dt>Pokérus</dt><dd>{pokerusState(pokemon.pokerus)}</dd></div>
  </dl>;
}
