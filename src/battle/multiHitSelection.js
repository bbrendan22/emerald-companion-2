import {isVariableMultiHitMove,isTripleKickMove,tripleKickPowers} from './twoHitDamage.js';

export function multiHitSelector(move) {
 const counts=isVariableMultiHitMove(move)?[2,3,4,5]:isTripleKickMove(move)?[1,2,3]:null;
 return counts?{label:'Hits',options:counts.map(count=>({value:String(count),label:String(count)})),defaultValue:'3'}:null;
}
export function selectedHitCount(move,value) {
 const config=multiHitSelector(move);
 return config?Number(config.options.some(option=>option.value===value)?value:config.defaultValue):null;
}
export function multiHitPowerLabel(move,count) {
 if(isTripleKickMove(move))return tripleKickPowers.slice(0,count).join(' / ');
 return move.power;
}
