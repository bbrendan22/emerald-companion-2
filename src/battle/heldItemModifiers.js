import {battleItemId} from './itemLookup.js';
import {profile,reference} from './reference.js';
import {typeItems} from './damageModifiers.js';

// Reuse the existing type-item effect map and canonical item IDs/names.
const typeBoosts=new Map(Object.entries(typeItems).map(([name,type])=>
  [Number(battleItemId(name)),{type,percent:name==='seaincense'?105:110}]));
const specializedIds=Object.fromEntries(['Light Ball','Thick Club','Soul Dew','DeepSeaTooth','DeepSeaScale','Metal Powder'].map(name=>[name,Number(battleItemId(name))]));
const choiceBand=Number(battleItemId('Choice Band'));
function itemId(item) {
  // Omitted item keeps the original no-item API; explicit null means unknown.
  if(item===undefined || item===0 || item==='None')return 0;
  if(typeof item==='number')return Number.isInteger(item) && profile.itemNames[item] ? item : null;
  if(typeof item!=='string')return null;
  const id=battleItemId(item);
  return id===undefined ? null : Number(id);
}
// Canonical National Dex IDs from existing adapters/reference, never display names.
export function heldItemSpecies(mon) {
  const species=reference.species[mon?.species ?? mon?.id];
  if(Number.isInteger(mon?.dex) && mon.dex>=1 && mon.dex<=386)
    return species && species.nationalDexId!==mon.dex ? null : mon.dex;
  return species?.nationalDexId ?? null;
}
// All current app contexts are Frontier. A standalone caller must explicitly
// opt out AND omit a facility; a facility can never be overridden to enable Dew.
const soulDewAllowed = context => context?.frontier===false && context?.facility==null;
function appliesTo(holder,ids) {
  const dex=heldItemSpecies(holder);
  return dex===null ? null : ids.includes(dex);
}
export function heldItemAttack(value,item,type,physical,holder,battleContext={}) {
  const id=itemId(item);if(id===null)return null;
  const boost=typeBoosts.get(id);
  if(boost?.type===type)value=Math.floor(value*boost.percent/100);
  if(physical && id===choiceBand)value=Math.floor(value*3/2);
  let species;
  if(!physical && id===specializedIds['Soul Dew'] && soulDewAllowed(battleContext)) {
    species=appliesTo(holder,[380,381]);if(species===null)return null;
    if(species)value=Math.floor(value*3/2);
  }
  if(!physical && [specializedIds['Light Ball'],specializedIds.DeepSeaTooth].includes(id)) {
    species=appliesTo(holder,id===specializedIds['Light Ball']?[25]:[366]);if(species===null)return null;
    if(species)value*=2;
  }
  if(physical && id===specializedIds['Thick Club']) {
    species=appliesTo(holder,[104,105]);if(species===null)return null;
    if(species)value*=2;
  }
  return value;
}
export function heldItemDefense(value,item,physical,holder,battleContext={}) {
  const id=itemId(item);if(id===null)return null;
  let species;
  if(!physical && id===specializedIds['Soul Dew'] && soulDewAllowed(battleContext)) {
    species=appliesTo(holder,[380,381]);if(species===null)return null;
    if(species)value=Math.floor(value*3/2);
  }
  if(!physical && id===specializedIds.DeepSeaScale) {
    species=appliesTo(holder,[366]);if(species===null)return null;
    if(species)value*=2;
  }
  if(physical && id===specializedIds['Metal Powder']) {
    if(holder?.transformed===true)return value;
    species=appliesTo(holder,[132]);if(species===null)return null;
    if(species) {
      // Save species does not establish whether Ditto has transformed in battle.
      if(typeof holder?.transformed!=='boolean')return null;
      if(!holder.transformed)value*=2;
    }
  }
  return value;
}
