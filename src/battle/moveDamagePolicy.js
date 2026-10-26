import {battleMove} from './reference.js';

const unsupportedIds=new Set([68,243,117,251,248,353,255]);
export const specialBattleStateMessage='Damage unavailable: requires special battle-state handling.';
export const isUnsupportedSpecialMove=move=>unsupportedIds.has(move?.id);
export function moveDamageNotice(move) {
 if(isUnsupportedSpecialMove(move))return {heading:'Damage Calculation',message:specialBattleStateMessage};
 const canonical=battleMove(move?.id);
 return canonical?.power===0?{heading:'Move effect',message:canonical.description}:null;
}
