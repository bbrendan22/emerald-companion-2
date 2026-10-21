import React, {useId, useRef, useState} from 'react';
import PokemonName, {SpeciesSymbol} from './PokemonName.js';
import {customNickname} from '../pokemonDisplayName.js';
import {collectionImage} from '../collectionFilters.js';
import {profileData} from '../../pokemon/profile.js';
import {roles} from '../../storage/pokemonRoles.js';
import {publicAsset} from '../../assets/publicAsset.js';
import '../styles/collection-pokemon-overview.css';
import CollectionPokemonInfoMoves from './CollectionPokemonInfoMoves.jsx';
import CollectionPokemonStats from './CollectionPokemonStats.jsx';
import CollectionPokemonCondition from './CollectionPokemonCondition.jsx';
import CollectionPokemonOrigin from './CollectionPokemonOrigin.jsx';
import CollectionPokemonRibbons from './CollectionPokemonRibbons.jsx';

function RoleDropdown({role, onAssign}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef(null);
  const id = useId();
  return <div className="collection-overview-role" data-detail-interactive
    onBlur={event => {if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);}}
    onKeyDown={event => {
      if (event.key === 'Escape' && open) {
        event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus({preventScroll:true});
      }
    }}>
    <button ref={trigger} type="button" aria-label={`Pokémon role: ${role}`} aria-expanded={open} aria-controls={id}
      className="collection-overview-role-trigger" onClick={() => setOpen(value => !value)}>{role}<span aria-hidden="true">▾</span></button>
    {open && <div id={id} className="collection-overview-role-options" role="group" aria-label="Assign role">
      {roles.map(value => <button type="button" key={value} aria-pressed={role === value} onClick={() => {
        onAssign(value); setOpen(false); trigger.current?.focus({preventScroll:true});
      }}>{value}</button>)}
    </div>}
  </div>;
}

export default function CollectionPokemonOverview({pokemon, role, onAssign, error}) {
  const {types, heldItem, moves} = profileData(pokemon);
  const nickname = customNickname(pokemon);
  const gender = pokemon.gender === 'male' ? '♂' : pokemon.gender === 'female' ? '♀' : null;
  return <><section className="collection-overview" aria-label={`${pokemon.speciesName} summary`}>
    <img className="collection-overview-artwork" src={publicAsset(collectionImage(pokemon, 'Gallery'))}
      alt={pokemon.isEgg ? 'Egg' : `${pokemon.shiny ? 'Shiny ' : ''}${pokemon.speciesName}`} />
    <div className="collection-overview-identity">
      <div className="collection-overview-name-line">
        <strong className="collection-overview-name"><PokemonName>{pokemon.speciesName}</PokemonName></strong>
        <span className="collection-overview-level-group">
          {gender && <span className="collection-overview-gender" data-gender={pokemon.gender} role="img" aria-label={pokemon.gender}><span className="pokemon-species-name"><SpeciesSymbol text={gender}/></span></span>}
          <span className="collection-overview-level">{pokemon.isEgg ? 'Egg' : `Lv. ${pokemon.recorded?.level ?? pokemon.derivedLevel}`}</span>
        </span>
      </div>
      {nickname && <p className="collection-overview-nickname">“<PokemonName>{nickname}</PokemonName>”</p>}
      <div className="collection-overview-metadata">
        <span>#{String(pokemon.nationalDexId).padStart(3,'0')} · Gen {pokemon.nationalDexId <= 151 ? 1 : pokemon.nationalDexId <= 251 ? 2 : 3}</span>
        {pokemon.shiny && <span className="collection-overview-shiny" role="img" aria-label="Shiny">★</span>}
      </div>
      <div className="collection-overview-types">{types?.map(type => <img key={type} src={publicAsset(`/types/icons/${type}.png`)} alt={`${type} type`}/>)}</div>
      <RoleDropdown role={role} onAssign={onAssign}/>
    </div>
  </section>
    <CollectionPokemonInfoMoves pokemon={pokemon} heldItem={heldItem} moves={moves}/>
    <CollectionPokemonStats pokemon={pokemon}/>
    <CollectionPokemonOrigin pokemon={pokemon}/>
    <CollectionPokemonCondition pokemon={pokemon}/>
    <CollectionPokemonRibbons pokemon={pokemon}/>
    {error && <p className="collection-overview-error" role="alert">{error}</p>}
  </>;
}
