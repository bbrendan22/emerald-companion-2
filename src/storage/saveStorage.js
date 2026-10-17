import {readTrainerSnapshot} from '../save/readTrainerSnapshot.js';

const key = 'emerald-companion-2.save.v1';
const saveSize = 131072;

export function loadStoredSave(storage) {
  const encoded = storage.getItem(key);
  if (encoded === null) return null;
  const raw = atob(encoded);
  if (raw.length !== saveSize) throw new Error('Stored save has an unsupported size.');
  return readTrainerSnapshot(Uint8Array.from(raw, character => character.charCodeAt(0)));
}

export function importSave(bytes, storage) {
  const snapshot = readTrainerSnapshot(bytes);
  let raw = '';
  for (let start = 0; start < bytes.length; start += 8192) {
    raw += String.fromCharCode(...bytes.subarray(start, start + 8192));
  }
  // setItem is atomic: validation or a storage failure leaves the prior save intact.
  storage.setItem(key, btoa(raw));
  return snapshot;
}
