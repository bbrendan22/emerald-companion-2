import {emeraldTypes,typeMultiplier} from './typeMatchups.js';

// Emerald battle_util.c sSoundMovesTable, not a modern sound-move flag.
// Heal Bell and Perish Song have separate non-damage scripts, outside this path.
const soundIds=new Set([45,46,47,48,103,173,253,319,320,304]);
export const isEmeraldSoundMove=move=>soundIds.has(move?.id);
export const preventionMessages=Object.freeze({
 'wonder-guard':'Blocked by Wonder Guard',
 soundproof:'Blocked by Soundproof',
 damp:'Prevented by Damp',
});
// Reuse the deterministic terminal outcome contract, without damage rolls.
const blocked=reason=>({kind:'deterministic-damage',outcome:'blocked',damage:0,reason});
export function earlyAbilityPrevention(move,attacker,defender) {
 if(defender?.ability==='Soundproof'&&isEmeraldSoundMove(move))return blocked('soundproof');
 // Cmd_tryexplosion checks the user as well as the target before typecalc.
 if([120,153].includes(move?.id)&&[attacker?.ability,defender?.ability].includes('Damp'))return blocked('damp');
 return null;
}
export function wonderGuardPrevention(move,defender) {
 // Cmd_typecalc returns immediately for Struggle. All supported fixed-damage
 // scripts otherwise run typecalc with reference power1 before setting damage.
 if(defender?.ability!=='Wonder Guard'||move?.id===165||!move?.power)return null;
 if(!Array.isArray(defender.types)||defender.types.length<1||defender.types.length>2
  ||!Array.from(defender.types).every(type=>emeraldTypes.includes(type))||!emeraldTypes.includes(move.type))return null;
 const effectiveness=typeMultiplier(move.type,defender.types);
 // Ordinary chart immunity remains an immunity, not ability prevention.
 return effectiveness>0&&effectiveness<=1?blocked('wonder-guard'):null;
}
