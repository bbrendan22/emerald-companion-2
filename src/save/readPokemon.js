import reference from '../data/reference.json' with {type:'json'};
import {bytes, view} from './binary.js';
import {decodeText} from './text.js';
import {levelFromExperience, calculateStats, NATURES} from './stats.js';
// Copied from 1.0 saveParser: physical secure-block order for PID % 24.
const ORDERS = ['GAEM','GAME','GEAM','GEMA','GMAE','GMEA','AGEM','AGME','AEGM','AEMG','AMGE','AMEG','EGAM','EGMA','EAGM','EAMG','EMGA','EMAG','MGAE','MGEA','MAGE','MAEG','MEGA','MEAG'];
const KEYS = ['hp','attack','defense','speed','spAttack','spDefense'];
// Shared by full Pokémon records and the compact Hall of Fame records.
export function isShiny(personality, otId) {
  return ((personality & 65535) ^ (personality >>> 16) ^ (otId & 65535) ^ (otId >>> 16)) < 8;
}
export function pokemonChecksum(input) {
  const v = view(input);
  if (v.byteLength !== 48) throw new Error('Expected 48 decrypted secure bytes');
  let sum = 0;
  for (let i = 0; i < 48; i += 2) sum = (sum + v.getUint16(i,true)) & 0xffff;
  return sum;
}
export function readPokemon(input) {
  const data = bytes(input);
  if (![80,100].includes(data.length)) throw new Error('Expected an 80-byte boxed or 100-byte party record');
  if (data.every(b => b === 0) || data.every(b => b === 255)) return null;
  const v = view(data), personality = v.getUint32(0,true), otId = v.getUint32(4,true);
  const secure = new Uint8Array(48), s = view(secure), key = (personality ^ otId) >>> 0;
  for (let i = 0; i < 48; i += 4) s.setUint32(i, v.getUint32(32+i,true) ^ key, true);
  if (pokemonChecksum(secure) !== v.getUint16(28,true)) throw new Error('Pokémon checksum mismatch');
  if (data[19] & 1) throw new Error('Bad Egg flag is set');
  const blocks = Object.fromEntries([...ORDERS[personality % 24]].map((name,i) => [name,view(secure.subarray(i*12,i*12+12))]));
  const {G,A,E,M} = blocks, internalSpeciesId = G.getUint16(0,true);
  if (!internalSpeciesId) {
    if (data[19] & 6) throw new Error('Species flag is set on an empty record');
    return null;
  }
  if (!(data[19] & 2)) throw new Error('Nonempty record lacks hasSpecies flag');
  const species = reference.species[internalSpeciesId];
  if (!species) throw new Error(`Unsupported internal species ID ${internalSpeciesId}`);
  const ivWord = M.getUint32(4,true), origins = M.getUint16(2,true), isEgg = Boolean(ivWord & 0x40000000);
  const warnings = [];
  if (Boolean(data[19] & 4) !== isEgg) warnings.push('Header and secure egg flags disagree');
  const nickname = decodeText(data.subarray(8,18)), otName = decodeText(data.subarray(20,27));
  if (data[18] !== 2 || nickname.includes('�') || otName.includes('�')) warnings.push('Text decoding is limited to a Western character subset');
  const ivs = Object.fromEntries(KEYS.map((k,i) => [k,(ivWord >>> (5*i)) & 31]));
  const evs = Object.fromEntries(KEYS.map((k,i) => [k,E.getUint8(i)]));
  const experience = G.getUint32(4,true), derivedLevel = levelFromExperience(experience,species.growthRate);
  const natureIndex = personality % 25;
  const abilitySlot = ivWord >>> 31, abilityId = species.abilities[abilitySlot] ?? species.abilities[0];
  let recorded = null;
  if (data.length === 100) {
    recorded = {level:data[84], status:v.getUint32(80,true), currentHp:v.getUint16(86,true),stats:{hp:v.getUint16(88,true),attack:v.getUint16(90,true),defense:v.getUint16(92,true),speed:v.getUint16(94,true),spAttack:v.getUint16(96,true),spDefense:v.getUint16(98,true)}};
    if (recorded.level < 1 || recorded.level > 100) throw new Error('Invalid recorded party level');
    if (recorded.level !== derivedLevel && !isEgg) warnings.push('Recorded party level differs from experience-derived level');
  }
  const ratio = species.genderRatio, low = personality & 255;
  return {
    internalSpeciesId, nationalDexId:species.nationalDexId, speciesName:species.name,
    personality, ot:{id:otId,trainerId:otId & 65535,secretId:otId >>> 16,name:otName,gender:(origins >>> 15) ? 'female':'male'},
    nickname, languageId:data[18], markings:data[27], isEgg, headerIsEgg:Boolean(data[19]&4),
    experience, derivedLevel, nature:NATURES[natureIndex],
    gender:ratio === 255 ? 'genderless' : ratio === 254 ? 'female' : ratio === 0 ? 'male' : low < ratio ? 'female':'male',
    shiny:isShiny(personality, otId),
    ability:{id:abilityId,slot:abilitySlot,name:reference.abilityNames[abilityId]},
    heldItemId:G.getUint16(2,true), friendship:isEgg ? null:G.getUint8(9), hatchCycles:isEgg ? G.getUint8(9):null,
    origin:{gameId:(origins >>> 7)&15,metLevel:origins & 127,metLocationId:M.getUint8(1),ballId:(origins >>> 11)&15},
    moves:Array.from({length:4},(_,slot) => {
      const id = A.getUint16(slot*2,true), ppUps = (G.getUint8(8) >>> (slot*2)) & 3, move = reference.moves[id];
      if (id && !move) warnings.push(`Unknown move ID ${id} in slot ${slot}`);
      return {slot,id,name:id ? move?.name ?? null:null,currentPp:A.getUint8(8+slot),ppUps,maxPp:id && move ? Math.floor(move.pp*(5+ppUps)/5):null};
    }),
    ivs, evs, contest:Object.fromEntries(['cool','beauty','cute','smart','tough','feel'].map((k,i)=>[k,E.getUint8(6+i)])),
    pokerus:M.getUint8(0), ribbons:{raw:M.getUint32(8,true),contestRanks:Array.from({length:5},(_,i)=>(M.getUint32(8,true) >>> (i*3))&7)},
    recorded, calculated:isEgg ? null:{level:recorded?.level ?? derivedLevel,stats:calculateStats(species.baseStats,ivs,evs,recorded?.level ?? derivedLevel,natureIndex,species.nationalDexId === 292)},
    checksumValid:true, warnings,
  };
}
