// Raw damage thresholds only; these colors make no survival/KO prediction.
import {formatBasicDamage} from './basicDamage.js';
export function damagePercentageColor({min,max,maximumHp}) {
 if(min===0&&max===0)return 'red';
 if(min>=maximumHp)return 'green';
 return max*2>=maximumHp?'amber':'white';
}
export function damageDisplayParts(result) {
 const [percentage,hp]=formatBasicDamage(result).split(' · ');
 return {percentage,hp,color:damagePercentageColor(result)};
}
