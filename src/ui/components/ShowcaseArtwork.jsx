import {publicAsset} from '../../assets/publicAsset.js';
import React, {useState} from 'react';

// Share artwork paths and failure handling between the portrait and its editor.
export default function ShowcaseArtwork({pokemon, alt = '', width = 64, height = 64, ...props}) {
  const src = pokemon.isEgg ? '/pokemon/egg.png' : `/pokemon/artwork/${pokemon.shiny ? 'shiny' : 'normal'}/${pokemon.nationalDexId}.png`;
  const [failedSource, setFailedSource] = useState(null);
  if (failedSource === src) return <span className="showcase-artwork-unavailable" role="img" aria-label={`${alt || 'Pokémon'} artwork unavailable`} title="Artwork unavailable" style={{width, height, maxWidth: '100%'}}>?</span>;
  return <img {...props} draggable="false" src={publicAsset(src)} alt={alt} width={width} height={height} onError={() => setFailedSource(src)} />;
}
