// Reuse verified canonical edges rather than duplicate evolution data.
import overview from '../../data/overview.json' with {type:'json'};
import {internalIdForDex} from './pokemonMeta.js';
export const evolutions={};
for(const edge of overview.evolutions) (evolutions[internalIdForDex(edge.from)]??=[]).push({target:Number(internalIdForDex(edge.to)),method:edge.method,param:edge.param});
