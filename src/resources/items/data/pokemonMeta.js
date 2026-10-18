import {pokemonMeta as species} from '../../learnset/data/pokemonMeta.js';
import types from '../../../data/pokemonTypes.json' with {type:'json'};
export const pokemonMeta=Object.fromEntries(Object.entries(species).map(([id,meta])=>[id,{...meta,types:types[meta.dex].map(type=>type.toUpperCase())}]));
