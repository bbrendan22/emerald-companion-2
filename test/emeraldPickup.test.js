import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {emeraldPickupBands, aggregatePickupItems, perBattlePercent, pickupPercent, pickupBandLabel} from '../src/resources/charts/emeraldPickup.js';
import {itemNames} from '../src/resources/items/data/emeraldData.js';

// Independent fixtures from pret/pokeemerald's normal/rare arrays and cumulative
// thresholds 30,40,50,60,70,80,90,94,98. No other game's Pickup data.
const common = [13,14,22,3,86,85,75,23,2,21,68,64,24,63,19,25,69,37];
const rare = [21,110,187,19,34,180,332,36,289,200,314];
const chances = [30,10,10,10,10,10,10,4,4,1,1];

test('All ten Emerald brackets match game slots, names, sprites and odds', () => {
  assert.equal(emeraldPickupBands.length, 10);
  for (const [index, band] of emeraldPickupBands.entries()) {
    assert.equal(band.min, index*10+1); assert.equal(band.max, index*10+10);
    assert.equal(pickupBandLabel(band), `Levels ${band.min}–${band.max}`);
    const ids = [...common.slice(index,index+9),...rare.slice(index,index+2)];
    assert.deepEqual(band.items.map(slot => slot.item), ids);
    assert.deepEqual(band.items.map(slot => slot.chance), chances);
    const rows = aggregatePickupItems(band.items);
    assert.equal(rows.reduce((sum,row) => sum+row.perPickup,0),100);
    assert.ok(Math.abs(rows.reduce((sum,row) => sum+row.perBattle,0)-10)<1e-9);
    assert.equal(new Set(rows.map(row => row.item)).size,rows.length);
    for (const row of rows) {
      assert.equal(row.name,itemNames[row.item]);
      assert.ok(existsSync(new URL(`../public${row.icon}`,import.meta.url)));
      assert.equal(row.perBattle,row.perPickup/10);
    }
  }
});

test('Duplicate rarity slots combine into one row before calculating odds without mutation', () => {
  const slots = [{item:13,chance:30},{item:14,chance:10},{item:13,chance:4},{item:13,chance:1}];
  const original = structuredClone(slots);
  const rows = aggregatePickupItems(slots);
  assert.deepEqual(rows.map(({item,perPickup,perBattle}) => ({item,perPickup,perBattle})),[
    {item:13,perPickup:35,perBattle:3.5},{item:14,perPickup:10,perBattle:1},
  ]);
  assert.deepEqual(slots,original);
});

test('Single eligible Pokémon has 10% activation; percentages omit trailing zeroes', () => {
  for (const [pickup,battle] of [[30,3],[10,1],[4,0.4],[1,0.1]]) {
    assert.equal(perBattlePercent(pickup),battle);
    assert.equal(pickupPercent(battle),`${battle}%`);
  }
});
