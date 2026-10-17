import {bytes, view, sectorChecksum} from './binary.js';
// Retail Emerald struct sizes; sector order on flash rotates between saves.
export const SECTION_LENGTHS = [0xf2c,0xf80,0xf80,0xf80,0xf08,0xf80,0xf80,0xf80,0xf80,0xf80,0xf80,0xf80,0xf80,0x7d0];
function inspectSlot(data, index) {
  const sections = new Map(), counters = new Set(), errors = [];
  for (let physical = 0; physical < 14; physical++) {
    const sector = data.subarray((index * 14 + physical) * 4096, (index * 14 + physical + 1) * 4096);
    const v = view(sector), id = v.getUint16(0xff4, true);
    if (id > 13) { errors.push(`Sector ${physical}: invalid section ID ${id}`); continue; }
    if (sections.has(id)) errors.push(`Duplicate section ID ${id}`);
    sections.set(id, sector.slice(0, SECTION_LENGTHS[id]));
    if (v.getUint32(0xff8, true) !== 0x08012025) errors.push(`Section ${id}: invalid signature`);
    if (v.getUint16(0xff6, true) !== sectorChecksum(sector.subarray(0, SECTION_LENGTHS[id]))) errors.push(`Section ${id}: checksum mismatch`);
    counters.add(v.getUint32(0xffc, true));
  }
  for (let id = 0; id < 14; id++) if (!sections.has(id)) errors.push(`Missing section ${id}`);
  // Conservative policy: do not assemble an apparently interrupted/mixed generation.
  if (counters.size !== 1) errors.push('Inconsistent save counters');
  return {index, valid: errors.length === 0, counter: counters.size === 1 ? [...counters][0] : null, errors, sections};
}
function join(sections, ids) {
  const result = new Uint8Array(ids.reduce((n, id) => n + sections.get(id).length, 0));
  let offset = 0;
  for (const id of ids) { result.set(sections.get(id), offset); offset += sections.get(id).length; }
  return result;
}
export function readSave(input) {
  const data = bytes(input);
  if (data.length !== 0x20000) throw new Error('Expected a raw 128 KiB Emerald save; wrappers and truncated saves are unsupported');
  const slots = [inspectSlot(data, 0), inspectSlot(data, 1)];
  const valid = slots.filter(s => s.valid);
  if (!valid.length) {
    const error = new Error('No complete valid save slot');
    error.slots = slots.map(({sections, ...diagnostic}) => diagnostic);
    throw error;
  }
  let selected = valid[0];
  if (valid.length === 2) {
    const [a,b] = valid;
    // Match retail Emerald's ordinary comparison, including FFFFFFFF -> 0 rollover.
    if (a.counter === 0xffffffff && b.counter === 0) selected = b;
    else if (b.counter === 0xffffffff && a.counter === 0) selected = a;
    else if (b.counter > a.counter) selected = b;
  }
  return {
    slotIndex: selected.index, saveCounter: selected.counter,
    slots: slots.map(({sections, ...diagnostic}) => diagnostic),
    blocks: {saveBlock2: join(selected.sections,[0]), saveBlock1: join(selected.sections,[1,2,3,4]), storage: join(selected.sections,[5,6,7,8,9,10,11,12,13])},
  };
}
