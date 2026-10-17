import reference from '../data/reference.json' with {type: 'json'};
import {bytes, view, sectorChecksum} from './binary.js';
import {decodeText} from './text.js';
import {isShiny} from './readPokemon.js';

const result = (status, message, team = null, teamIndex = null, warnings = []) => ({status, message, team, teamIndex, warnings});

// pret/pokeemerald save.c and hall_of_fame.c: physical sectors 28/29,
// 3968 payload bytes each; 50 chronological teams of six 20-byte records.
export function readHallOfFame(input) {
  const data = bytes(input);
  if (data.length !== 0x20000) return result('unavailable', 'Hall of Fame requires a raw 128 KiB save.');
  const sectors = [28, 29].map(index => data.subarray(index * 4096, (index + 1) * 4096));
  if (sectors.every(sector => sector.every(value => value === 255))) {
    return result('empty', 'No Hall of Fame record is stored in this save.');
  }
  const payload = new Uint8Array(3968 * 2);
  for (const [index, sector] of sectors.entries()) {
    const footer = view(sector);
    // Special HOF sectors store their checksum in the ordinary section-ID field.
    if (footer.getUint32(0xff8, true) !== 0x08012025 || footer.getUint16(0xff4, true) !== sectorChecksum(sector.subarray(0, 3968))) {
      return result('unavailable', 'Hall of Fame data is unavailable: its sector signature or checksum is invalid.');
    }
    payload.set(sector.subarray(0, 3968), index * 3968);
  }
  const v = view(payload), warnings = [];
  for (let teamIndex = 0; teamIndex < 50; teamIndex++) {
    // The game terminates the chronological list at a team whose first species is zero.
    if ((v.getUint16(teamIndex * 120 + 8, true) & 511) === 0) break;
    const team = [];
    let invalid = false, ended = false;
    for (let slot = 0; slot < 6; slot++) {
      const start = teamIndex * 120 + slot * 20;
      const packed = v.getUint16(start + 8, true), internalSpeciesId = packed & 511, level = packed >>> 9;
      if (!internalSpeciesId) { ended = true; continue; }
      const isEgg = internalSpeciesId === 412, species = reference.species[internalSpeciesId];
      if (ended || (!species && !isEgg) || level < 1 || level > 100) { invalid = true; break; }
      const otId = v.getUint32(start, true), personality = v.getUint32(start + 4, true);
      const nickname = decodeText(payload.subarray(start + 10, start + 20));
      team.push({slot, internalSpeciesId, nationalDexId: species?.nationalDexId ?? null,
        speciesName: isEgg ? 'Egg' : species.name, nickname, level, isEgg,
        personality, otId, shiny: isShiny(personality, otId)});
    }
    if (!invalid && team.length) {
      if (team.some(pokemon => pokemon.nickname.includes('�'))) warnings.push('Some recorded nicknames contain unsupported text bytes.');
      return result('available', 'Earliest stored team', team, teamIndex, warnings);
    }
    if (!warnings.length) warnings.push('Earlier stored entries could not be decoded; this is the earliest valid team still available.');
  }
  return warnings.length ? result('unavailable', 'No stored Hall of Fame team could be reliably decoded.', null, null, warnings)
    : result('empty', 'No Hall of Fame record is stored in this save.');
}
