import reference from '../data/reference.json' with {type:'json'};
import {hoennRequiredSpecies} from './hoennRequiredSpecies.js';

const facilityIds = ['tower','dome','palace','arena','factory','pike','pyramid'];
const emptyEarned = () => ({hallOfFame:false, hoennPokedex:false, contestMaster:false, battleFrontier:false});

// Emerald trainer_card.c: reproduce the displayed card, not just
// CountPlayerTrainerStars (which differs for a zero HOF debut time).
// Stable keyed booleans are separate from raw diagnostics for future Settings overrides.
export function readTrainerCardAchievements(save, frontier) {
  const earned = emptyEarned(), warnings = [];
  const b1 = save?.blocks?.saveBlock1, b2 = save?.blocks?.saveBlock2;
  if (!(b1 instanceof Uint8Array) || b1.length !== 0x3d88 || !(b2 instanceof Uint8Array) || b2.length !== 0xf2c) {
    return {earned, starCount:0, diagnostics:{available:false}, warnings:['Trainer Card achievements unavailable: expected validated Emerald save blocks.']};
  }
  const a = new DataView(b1.buffer,b1.byteOffset,b1.byteLength), b = new DataView(b2.buffer,b2.byteOffset,b2.byteLength);
  const stat = index => (a.getUint32(0x159c + index*4,true) ^ b.getUint32(0xac,true)) >>> 0;
  const entries = stat(10), debutTime = stat(1);
  const hours = debutTime >>> 16, minutes = (debutTime >>> 8) & 255, seconds = debutTime & 255;
  // Retail caps hours over 999 to 999:59:59 for display. Reject malformed
  // minute/second fields rather than granting a star from corrupt statistics.
  const hofValid = entries <= 0xffffff && minutes < 60 && seconds < 60 && !(entries === 0 && debutTime !== 0);
  earned.hallOfFame = hofValid && entries !== 0 && debutTime !== 0;
  if (!hofValid) warnings.push('Trainer Card Hall of Fame statistics are invalid or inconsistent.');
  else if (entries && !debutTime) warnings.push('Hall of Fame entries exist but debut time is zero; Emerald displays no Hall of Fame star.');
  const bit = (block, offset, dex) => Boolean(block[offset + ((dex-1) >>> 3)] & (1 << ((dex-1) & 7)));
  const missingSpecies = [], inconsistentSpecies = [];
  let caughtCount = 0, validCaughtCount = 0;
  for (const dex of hoennRequiredSpecies) {
    const caught = bit(b2,0x28,dex), seen = bit(b2,0x5c,dex), seen1 = bit(b1,0x988,dex), seen2 = bit(b1,0x3b24,dex);
    if (caught) caughtCount++;
    if (caught && seen && seen1 && seen2) validCaughtCount++;
    else missingSpecies.push(dex);
    if (seen !== seen1 || seen !== seen2 || (caught && !seen)) inconsistentSpecies.push(dex);
  }
  earned.hoennPokedex = validCaughtCount === 200 && inconsistentSpecies.length === 0;
  if (inconsistentSpecies.length) warnings.push('Trainer Card Hoenn Pokédex has inconsistent required-species flags.');
  const paintings = ['Cool','Beauty','Cute','Smart','Tough'].map((category,i) => {
    const speciesId = a.getUint16(0x2e90 + (8+i)*0x20 + 8,true);
    return {category, speciesId, present:speciesId !== 0, valid:speciesId === 0 || Boolean(reference.species[speciesId])};
  });
  earned.contestMaster = paintings.every(painting => painting.present && painting.valid);
  if (paintings.some(painting => !painting.valid)) warnings.push('Trainer Card museum painting contains an invalid species.');
  const symbols = frontier?.symbols;
  const frontierAvailable = Array.isArray(symbols) && symbols.length === 7 && facilityIds.every(id => symbols.filter(symbol => symbol.id === id).length === 1)
    && symbols.every(symbol => typeof symbol.silver === 'boolean' && typeof symbol.gold === 'boolean');
  const frontierConsistent = frontierAvailable && symbols.every(symbol => !symbol.gold || symbol.silver);
  earned.battleFrontier = frontierConsistent && symbols.every(symbol => symbol.silver && symbol.gold);
  if (!frontierAvailable) warnings.push('Trainer Card Frontier symbol data is unavailable or invalid.');
  else if (!frontierConsistent) warnings.push('Trainer Card Frontier has Gold flags without corresponding Silver flags.');
  return {earned, starCount:Object.values(earned).filter(Boolean).length, diagnostics:{
    available:true,
    hallOfFame:{valid:hofValid, entries, debutTime, debut:{hours,minutes,seconds}, displayedDebut:entries ? (hours > 999 ? {hours:999,minutes:59,seconds:59} : {hours,minutes,seconds}) : {hours:0,minutes:0,seconds:0}},
    hoennPokedex:{valid:inconsistentSpecies.length === 0, requiredCount:200, caughtCount, validCaughtCount, missingSpecies, inconsistentSpecies},
    contestMaster:{valid:paintings.every(painting => painting.valid), paintingCount:paintings.filter(painting => painting.present && painting.valid).length, paintings},
    battleFrontier:{valid:Boolean(frontierConsistent), silverCount:frontierAvailable ? symbols.filter(symbol => symbol.silver).length : null, goldCount:frontierAvailable ? symbols.filter(symbol => symbol.gold).length : null},
  }, warnings};
}
