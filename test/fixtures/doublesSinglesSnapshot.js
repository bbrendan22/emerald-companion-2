import {createHash} from 'node:crypto';
import {calculateCoreDamage} from '../../src/battle/coreDamage.js';
import {battleMove} from '../../src/battle/reference.js';
const mon={level:50,dex:143,types:['NORMAL'],ability:'Immunity',item:'None',currentHp:133,friendship:255,status:'none',ivs:{hp:31,attack:30,defense:29,spAttack:28,spDefense:27,speed:26},stats:{hp:200,attack:101,defense:103,spAttack:107,spDefense:109},stages:{attack:-1,spAttack:1},screens:{reflect:true,lightScreen:true}};
export const singlesProfiles=[
 {name:'neutral-50',attacker:mon,defender:{...mon,currentHp:200}},
 {name:'forecast-1',attacker:{...mon,level:1,dex:351,ability:'Forecast',currentHp:1},defender:{...mon,types:['GRASS','STEEL']}},
 {name:'copied-flash-fire-100',attacker:{...mon,level:100,dex:282,types:['FIRE'],ability:'Trace',copiedAbility:'Flash Fire',flashFireActivated:true,item:'Charcoal',status:'burn'},defender:{...mon,level:100,types:['WATER','ROCK'],ability:'Shell Armor'}},
];
export function singlesSnapshot() {
 return singlesProfiles.flatMap(profile=>['none','sun','rain','sand','hail'].flatMap(weather=>[false,true].map(critical=>{
  const results=Array.from({length:354},(_,i)=>calculateCoreDamage(battleMove(i+1),profile.attacker,profile.defender,weather,critical,{format:'Singles',defenderSideAlive:2,hitCount:3}));
  return {profile:profile.name,weather,critical,cases:results.length,sha256:createHash('sha256').update(JSON.stringify(results)).digest('hex')};
 })));
}
