import {itemAcquisitionEntries} from '../data/itemAcquisition.js';

// Presentation curation only; retain the complete acquisition reference data.
export function displayItemSources(itemId) {
 const entries = itemAcquisitionEntries(itemId);
 const id = Number(itemId);
 return id >= 153 && id <= 158
  ? entries.filter(entry => !/game\s*corner/i.test(entry.location))
  : entries;
}
