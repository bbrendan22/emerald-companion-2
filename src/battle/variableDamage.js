// Step 6B resolves only type/power; the ordinary damage pipeline owns modifiers.
import {battleMove} from './reference.js';
import {calculateHiddenPower} from './hiddenPower.js';
import weights from './data/weights.json' with {type:'json'};
const ids=new Set([237,216,218,67,175,179]);
const integer=(value,min,max)=>Number.isInteger(value)&&value>=min&&value<=max;
export const isVariableDamageMove=move=>ids.has(move?.id);
export function resolveVariableMove(move,attacker,defender,conditions={}) {
 if(!isVariableDamageMove(move))return move;
 const reference=battleMove(move.id);let power,type=reference.type;
 switch(move.id){
  case 237:{
   const hidden=calculateHiddenPower(attacker?.ivs??{});if(!hidden)return null;
   power=hidden.power;type=hidden.type.toUpperCase();break;
  }
  case 216:case 218:{
   let friendship=attacker?.friendship;
   if(friendship==null){
    // Frontier adapters supply the verified generation value. Never guess it here.
    if(!attacker||attacker.setId!=null)return null;
    friendship=move.id===216?255:0;
   }
   if(!integer(friendship,0,255))return null;
   // A zero dynamic override falls back to the cartridge's reference power (1).
   power=Math.max(1,Math.floor(10*(move.id===216?friendship:255-friendship)/25));break;
  }
  case 67:{
   const weight=weights[defender?.dex]??defender?.weight;
   if(typeof weight!=='number'||!Number.isFinite(weight)||weight<=0)return null;
   power=[10,25,50,100,200].findIndex(limit=>weight<limit);
   power=power===-1?120:(power+1)*20;break;
  }
  case 175:case 179:{
   const maximum=attacker?.stats?.hp;
   const hp=conditions.attacker?.currentHp??attacker?.initialCurrentHp??attacker?.currentHp??maximum;
   if(!integer(maximum,1,999)||!integer(hp,1,maximum))return null;
   const fraction=Math.max(1,Math.floor(48*hp/maximum));
   power=[[1,200],[4,150],[9,100],[16,80],[32,40],[48,20]].find(([limit])=>fraction<=limit)[1];break;
  }
 }
 return {...reference,type,power};
}
