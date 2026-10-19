import React from 'react';
import {publicAsset} from '../../../assets/publicAsset.js';
import {itemDescription} from '../utils/itemCategories.js';
import {moveResources} from '../data/moveResources.js';

// Shared markup keeps the list row and popup summary identical.
export default function ItemSummary({item}) {
 return <><img loading="lazy" src={publicAsset(`/items/${item.id}.png`)} alt=""/><div><strong>{item.machine?`${item.code} · ${item.name}`:item.name}</strong><small>{item.machine?moveResources[item.moveId].description:itemDescription(item)}</small></div></>;
}
