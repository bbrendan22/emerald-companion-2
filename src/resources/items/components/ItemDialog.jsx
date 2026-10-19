import React from 'react';
import ResourceDialog from '../../components/ResourceDialog.jsx';
import {getItemEntry} from '../utils/itemEntries.js';
import {pokeBallCatchRates} from '../data/pokeBallCatchRates.js';
import ItemSummary from './ItemSummary.jsx';
import ItemAcquisition from './ItemAcquisition.jsx';
import '../items.css';

// Controlled by a canonical item ID, independently of the Useful Items list.
export default function ItemDialog({itemId, onClose, returnFocus = null}) {
 const item = getItemEntry(itemId);
 if (!item) return null;
 const name = item.machine ? `${item.code} · ${item.name}` : item.name;
 return <ResourceDialog name={name} onClose={onClose} returnFocus={returnFocus}>
  <div className="resource-items-page resource-item-popup">
   <div className="resource-item-main"><ItemSummary item={item}/></div>
   <div className="resource-inline-learners" id={`item-sources-${item.id}`}>
    {pokeBallCatchRates[item.id]&&<p className="resource-note resource-item-secondary">Catch rate · {pokeBallCatchRates[item.id]}</p>}
    <ItemAcquisition itemId={item.id}/>
   </div>
  </div>
 </ResourceDialog>;
}
