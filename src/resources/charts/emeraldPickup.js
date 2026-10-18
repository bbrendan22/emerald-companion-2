import {pickupBands} from '../items/data/pickupResources.js';
import {itemNames} from '../items/data/emeraldData.js';
import {machineIconIds} from '../items/data/itemIcons.js';

// Verified against pret/pokeemerald src/battle_script_commands.c:
// sPickupItems, sRarePickupItems, sPickupProbabilities, and Cmd_pickup.
// Ordinary Emerald Pickup only; no Battle Pyramid or other games' tables.
export const emeraldPickupBands = pickupBands;
export const pickupBandLabel = ({min, max}) => `Levels ${min}–${max}`;
export const perBattlePercent = perPickup => perPickup / 10;
export const pickupPercent = value => `${Number(value.toFixed(2))}%`;

export function aggregatePickupItems(slots) {
  const items = new Map();
  for (const {item, chance, code} of slots) {
    const existing = items.get(item);
    if (existing) existing.perPickup += chance;
    else items.set(item, {item, name: itemNames[item], icon: `/items/${code ? machineIconIds[code] : item}.png`, perPickup: chance});
  }
  return [...items.values()].map(item => ({...item, perBattle: perBattlePercent(item.perPickup)}));
}
