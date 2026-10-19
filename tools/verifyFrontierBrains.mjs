// Usage: node tools/verifyFrontierBrains.mjs /path/to/pret/pokeemerald/src/frontier_util.c
// Read-only comparison with Emerald's source; no generation or dataset mutation.
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {searchFrontierBrains, frontierBrains} from '../src/resources/frontier/sets.js';
import {speciesByName, reference} from '../src/battle/reference.js';
const source = await readFile(process.argv[2], 'utf8');
const table = source.slice(source.indexOf('static const struct FrontierBrainMon sFrontierBrainsMons')).split('\n};')[0];
const facilities = {TOWER:'Anabel', DOME:'Tucker', ARENA:'Greta', PIKE:'Lucy', PALACE:'Spenser', PYRAMID:'Brandon'};
const normalize = value => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const sets = searchFrontierBrains();
let checked = 0;
for (const block of table.split('[FRONTIER_FACILITY_').slice(1)) {
  const brain = facilities[block.split(']')[0]];
  if (!brain) continue;
  const mons = [...block.matchAll(/\.species = SPECIES_(\w+),(.*?)\.moves = \{([^}]+)\}/gs)];
  assert.equal(mons.length, 6, brain);
  for (const [index, [, species, body, moves]] of mons.entries()) {
    const symbol = index < 3 ? 'Silver' : 'Gold';
    const set = sets.find(set => set.brainSet === `${brain} ${symbol}` && normalize(set.species) === normalize(species));
    assert.ok(set, `${brain} ${symbol} ${species}`);
    assert.equal(normalize(set.item), normalize(body.match(/\.heldItem = ITEM_(\w+)/)[1]), set.brainSet);
    assert.equal(normalize(set.nature), normalize(body.match(/\.nature = NATURE_(\w+)/)[1]), set.brainSet);
    const fixedIV = body.match(/\.fixedIV = (\w+)/)[1];
    assert.equal(set.fixedIVs, fixedIV === 'MAX_PER_STAT_IVS' ? 31 : Number(fixedIV), set.brainSet);
    assert.deepEqual(set.moves.map(normalize), [...moves.matchAll(/MOVE_(\w+)/g)].map(match => normalize(match[1])), set.brainSet);
    assert.deepEqual(['hp','atk','def','spe','spa','spd'].map(key => set.evs[key]), body.match(/\.evs = \{([^}]+)/)[1].split(',').map(Number), set.brainSet);
    const abilities = speciesByName.get(set.species.toLowerCase()).abilities.map(id => reference.abilityNames[id]);
    assert.deepEqual([...set.possibleAbility.split(' / ')].sort(), [...new Set(abilities)].sort());
    checked++;
  }
}
assert.equal(checked, 36);
assert.equal(frontierBrains.length, 6);
console.log(`Verified ${checked} Brain records: species, items, natures, four moves, all six EVs, fixed IVs, and species ability alternatives.`);
console.log(`Source SHA-256: ${createHash('sha256').update(source).digest('hex')}`);
