import {calculateHiddenPower} from '../../battle/hiddenPower.js';
import {GEN3_TYPE_DISPLAY_ORDER} from '../../pokemon/typeDisplayOrder.js';
export const fields = [['hp','HP'],['attack','Atk'],['defense','Def'],['spAttack','SpA'],['spDefense','SpD'],['speed','Spe']];
export const hiddenPowerTypes = GEN3_TYPE_DISPLAY_ORDER.filter(type => type !== 'normal');
// Supplied Psypokes values, retained in source column order: HP, Atk, Def, Speed, SpA, SpD.
const referenceRows = {
 bug:[31,31,31,30,31,30], dark:[31,31,31,31,31,31], dragon:[30,31,31,31,31,31],
 electric:[31,31,31,31,30,31], fighting:[31,31,30,30,30,30], fire:[31,30,31,30,30,31],
 flying:[31,31,31,30,30,30], ghost:[31,30,31,31,31,30], grass:[30,31,31,31,30,31],
 ground:[31,31,31,31,30,30], ice:[31,31,31,30,31,31], poison:[31,31,30,31,30,30],
 psychic:[30,31,31,30,31,31], rock:[31,31,30,30,31,30], steel:[31,31,31,31,31,30],
 water:[31,31,31,30,30,31],
};
const referenceOrder = ['hp','attack','defense','speed','spAttack','spDefense'];
export const recommendedIVs = Object.fromEntries(Object.entries(referenceRows).map(([type,row]) =>
 [type,Object.fromEntries(referenceOrder.map((key,index) => [key,row[index]]))]));
export const emptyIVs = () => Object.fromEntries(fields.map(([key]) => [key,'']));
export const validIV = value => value === '' || /^\d+$/.test(String(value)) && Number(value) <= 31;
export function liveHiddenPower(values) {
 if (fields.every(([key]) => values[key] === '') || fields.some(([key]) => !validIV(values[key]))) return null;
 return {...calculateHiddenPower(Object.fromEntries(fields.map(([key]) => [key,values[key] === '' ? 0 : Number(values[key])]))),
  preview:fields.some(([key]) => values[key] === '')};
}
