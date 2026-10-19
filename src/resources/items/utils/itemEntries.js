import {itemResources, machineResources} from '../data/itemResources.js';
import {machineIconIds} from '../data/itemIcons.js';
import {machineItemPrices} from '../data/itemShopData.js';
import {itemNames, moveNames} from '../data/emeraldData.js';
export const machines=machineResources.map(m=>({...itemResources[machineIconIds[m.code]],...m,id:machineIconIds[m.code],price:machineItemPrices[machineIconIds[m.code]],name:moveNames[m.moveId],machine:true}))
export const items=Object.entries(itemResources).map(([id,item])=>({id,...item,name:itemNames[id]??item.name})).sort((a,b)=>a.name.localeCompare(b.name))

// Resolve canonical IDs without mounting or navigating to the item browser.
export function getItemEntry(itemId) {
 const id = Number(itemId);
 if (!Number.isInteger(id) || id <= 0) return undefined;
 return machines.find(item => item.id === id) ?? items.find(item => Number(item.id) === id);
}
