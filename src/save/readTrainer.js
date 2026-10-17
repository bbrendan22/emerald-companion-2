import {view} from './binary.js';
import {decodeText} from './text.js';
// Raw trainer/save fields only; no UI or persistence. Source: pret/pokeemerald global.h.
export function readTrainer({blocks:{saveBlock1:b1,saveBlock2:b2}}) {
  if (b1.length !== 0x3d88 || b2.length !== 0xf2c) throw new Error('Expected validated Emerald save blocks');
  const a=view(b1),b=view(b2),warnings=[];
  const name=decodeText(b2.subarray(0,8));
  const trainerId=b.getUint16(0x0a,true),secretId=b.getUint16(0x0c,true);
  const playtime={hours:b.getUint16(0x0e,true),minutes:b2[0x10],seconds:b2[0x11]};
  const money=(a.getUint32(0x490,true)^b.getUint32(0xac,true))>>>0;
  const hasFlag=id=>Boolean(b1[0x1270+(id>>>3)] & (1<<(id%8)));
  const badges=Array.from({length:8},(_,i)=>hasFlag(0x867+i));
  const isChampion=hasFlag(0x864); // FLAG_SYS_GAME_CLEAR, independent of Pokémon ribbon bits.
  const flags=(block,offset)=>Array.from({length:386},(_,i)=>Boolean(block[offset+(i>>>3)] & (1<<(i%8))));
  const seen=flags(b2,0x5c),caught=flags(b2,0x28),mirror1=flags(b1,0x988),mirror2=flags(b1,0x3b24);
  const inconsistentSeenIds=seen.flatMap((value,i)=>value!==mirror1[i]||value!==mirror2[i] ? [i+1]:[]);
  const caughtWithoutSeenIds=caught.flatMap((value,i)=>value&&!seen[i] ? [i+1]:[]);
  if(inconsistentSeenIds.length) warnings.push('Pokédex seen mirrors disagree; counts below report raw main flags');
  if(caughtWithoutSeenIds.length) warnings.push('Caught flags exist without main seen flags');
  if(playtime.minutes>59||playtime.seconds>59) warnings.push('Invalid playtime minutes or seconds');
  if(money>999999) warnings.push('Money exceeds retail cap');
  if(name.includes('�')) warnings.push('Trainer name contains unsupported text bytes');
  // global.h uses SaveBlock2-relative offsets inside BattleFrontier as well.
  const gender=b2[0x08]===0 ? 'male' : b2[0x08]===1 ? 'female' : null;
  const battlePoints=b.getUint16(0xeb8,true);
  return {name,trainerId,secretId,gender,battlePoints,isChampion,playtime,money,badges,badgeCount:badges.filter(Boolean).length,
    pokedex:{seen,caught,seenCount:seen.filter(Boolean).length,caughtCount:caught.filter(Boolean).length,total:386,inconsistentSeenIds,caughtWithoutSeenIds},warnings};
}
