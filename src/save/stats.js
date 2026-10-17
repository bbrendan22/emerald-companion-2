export function expForLevel(level, growthRate) {
  if (level <= 1) return 0
  const n = level
  switch (growthRate) {
    case 'GROWTH_ERRATIC':
      if (n <= 50) return Math.floor(n ** 3 * (100 - n) / 50)
      if (n <= 68) return Math.floor(n ** 3 * (150 - n) / 100)
      if (n <= 98) return Math.floor(n ** 3 * Math.floor((1911 - 10 * n) / 3) / 500)
      return Math.floor(n ** 3 * (160 - n) / 100)
    case 'GROWTH_FAST':
      return Math.floor(4 * n ** 3 / 5)
    case 'GROWTH_MEDIUM_SLOW':
      return Math.floor(6 * n ** 3 / 5 - 15 * n ** 2 + 100 * n - 140)
    case 'GROWTH_SLOW':
      return Math.floor(5 * n ** 3 / 4)
    case 'GROWTH_FLUCTUATING':
      if (n <= 15) return Math.floor(n ** 3 * (Math.floor((n + 1) / 3) + 24) / 50)
      if (n <= 36) return Math.floor(n ** 3 * (n + 14) / 50)
      return Math.floor(n ** 3 * (Math.floor(n / 2) + 32) / 50)
    default:
      return n ** 3
  }
}

export function levelFromExperience(experience, growthRate) {
  if (experience == null) return null
  const exp = Number(experience)
  let level = 1
  for (let candidate = 2; candidate <= 100; candidate++) {
    if (exp >= expForLevel(candidate, growthRate)) level = candidate
    else break
  }
  return level
}


// Nature/stat formula adapted from 1.0 ivCalculator.js; growth curves above from collectionDetails.js.
export const NATURES = ['Hardy','Lonely','Brave','Adamant','Naughty','Bold','Docile','Relaxed','Impish','Lax','Timid','Hasty','Serious','Jolly','Naive','Modest','Mild','Quiet','Bashful','Rash','Calm','Gentle','Sassy','Careful','Quirky'];
const order = ['attack','defense','speed','spAttack','spDefense'];
export function calculateStats(base,ivs,evs,level,natureIndex,shedinja=false) {
  const up=Math.floor(natureIndex/5), down=natureIndex%5;
  return Object.fromEntries(Object.keys(base).map(key => {
    const value=Math.floor((2*base[key]+ivs[key]+Math.floor(evs[key]/4))*level/100);
    if(key==='hp') return [key,shedinja ? 1:value+level+10];
    const multiplier=up===down ? 100:order[up]===key ? 110:order[down]===key ? 90:100;
    return [key,Math.floor((value+5)*multiplier/100)];
  }));
}
