import profileReference from '../../data/profileReference.json' with {type: 'json'};
import {GEN3_TYPE_DISPLAY_ORDER} from '../../pokemon/typeDisplayOrder.js';

export const typeChartTypes = GEN3_TYPE_DISPLAY_ORDER;
export const typeChartName = type => type[0].toUpperCase() + type.slice(1);
export const typeChartRows = typeChartTypes.map(attack => ({
  attack,
  cells: typeChartTypes.map(defense => {
    const multiplier = profileReference.typeChart[attack]?.[defense] ?? 1;
    return {defense, multiplier, label: multiplier === 1 ? '' : multiplier === 0.5 ? '½×' : `${multiplier}×`};
  }),
}));
