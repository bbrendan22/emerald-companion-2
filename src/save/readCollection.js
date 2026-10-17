import {view} from './binary.js';
import {readPokemon} from './readPokemon.js';
// No identity-based deduplication: location identifies each imported occurrence.
export function readCollection({blocks}) {
  const {saveBlock1,storage} = blocks, records = [], issues = [];
  function add(data,source) {
    try { const pokemon = readPokemon(data); if (pokemon) records.push({...pokemon,source}); }
    catch (error) { issues.push({source,message:error.message,rawBytes:data.slice()}); }
  }
  const count = view(saveBlock1).getUint32(0x234,true);
  if (count > 6) throw new Error('Party count exceeds six');
  for (let slot=0; slot<count; slot++) add(saveBlock1.subarray(0x238+slot*100,0x238+(slot+1)*100),{kind:'party',slot});
  for (let box=0; box<14; box++) for (let slot=0; slot<30; slot++) {
    const start=4+(box*30+slot)*80;
    add(storage.subarray(start,start+80),{kind:'box',box,slot});
  }
  // DayCare.mons: two 140-byte entries beginning with BoxPokemon.
  // Experience earned while deposited is not applied until withdrawal.
  for (let slot=0; slot<2; slot++) {
    const start=0x3030+slot*140;
    add(saveBlock1.subarray(start,start+80),{kind:'daycare',slot});
  }
  return {records,issues};
}
