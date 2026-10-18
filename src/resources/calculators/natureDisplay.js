import {emeraldStat} from '../../battle/stats.js';
// Use the same nature rules as the calculators; HP and neutral natures stay plain.
export function natureStatClass(nature,key) {
 if (!nature || key==='hp') return '';
 const value=emeraldStat(100,key,0,0,100,nature);
 const neutral=emeraldStat(100,key,0,0,100,'Hardy');
 return value>neutral ? 'nature-increased' : value<neutral ? 'nature-decreased' : '';
}
