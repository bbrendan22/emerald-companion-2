import React, {useId} from 'react';
import {earnedRibbons, ribbonCatalog} from '../../pokemon/profile.js';
import {publicAsset} from '../../assets/publicAsset.js';
import '../styles/collection-pokemon-ribbons.css';

export default function CollectionPokemonRibbons({pokemon}) {
  const heading = useId();
  const raw = pokemon.ribbons?.raw;
  const earned = new Set(earnedRibbons(Number.isInteger(raw) && raw >= 0 && raw <= 0xffffffff ? raw : 0).map(ribbon => ribbon.file));
  return <section className="collection-pokemon-ribbons" aria-labelledby={heading}>
    <h2 id={heading}>Ribbons</h2>
    <ul>{ribbonCatalog.map(ribbon => {
      const owned = earned.has(ribbon.file);
      const label = ribbon.name.replace(/ Ribbon$/, '');
      return <li key={ribbon.file} data-earned={owned} aria-label={`${label}: ${owned ? 'Earned' : 'Not earned'}`}>
        <img src={publicAsset(`/ribbons/gen3/${ribbon.file}.png`)} alt=""/>
        <span>{label}</span>
      </li>;
    })}</ul>
  </section>;
}
