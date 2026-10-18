// Stat/nature helpers migrated unchanged from 1.0 ivCalculator.js.
export const ivNatures = ['Hardy','Lonely','Brave','Adamant','Naughty','Bold','Docile','Relaxed','Impish','Lax','Timid','Hasty','Serious','Jolly','Naive','Modest','Mild','Quiet','Bashful','Rash','Calm','Gentle','Sassy','Careful','Quirky']
const natureOrder=['attack','defense','speed','spAttack','spDefense']
export function emeraldStat(base,key,iv,ev,level,nature,shedinja=false){
 if(key==='hp'&&shedinja)return 1
 const value=Math.floor((2*base+iv+Math.floor(ev/4))*level/100)
 if(key==='hp')return value+level+10
 const n=ivNatures.indexOf(nature),up=Math.floor(n/5),down=n%5
 const multiplier=up===down?100:natureOrder[up]===key?110:natureOrder[down]===key?90:100
 return Math.floor((value+5)*multiplier/100)
}
