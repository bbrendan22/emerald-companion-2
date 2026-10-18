import {publicAsset} from '../../assets/publicAsset.js';
import React, {useState} from 'react';
import {emeraldPickupBands, pickupBandLabel, aggregatePickupItems, pickupPercent} from './emeraldPickup.js';
import './emeraldPickup.css';

export default function EmeraldPickupTable() {
  const [bandIndex, setBandIndex] = useState(0);
  const rows = aggregatePickupItems(emeraldPickupBands[bandIndex].items);
  return <section className="resources-home emerald-pickup" aria-labelledby="emerald-pickup-heading">
    <h1 id="emerald-pickup-heading">Emerald Pickup Table</h1>
    <label className="emerald-pickup-levels" htmlFor="emerald-pickup-levels">Level range
      <select id="emerald-pickup-levels" value={bandIndex} onChange={event => setBandIndex(Number(event.target.value))}>
        {emeraldPickupBands.map((band, index) => <option key={band.min} value={index}>{pickupBandLabel(band)}</option>)}
      </select>
    </label>
    <table aria-label={`Emerald Pickup · ${pickupBandLabel(emeraldPickupBands[bandIndex])}`} aria-describedby="emerald-pickup-note">
      <colgroup><col className="emerald-pickup-sprite-column" /><col /><col className="emerald-pickup-odds-column" /><col className="emerald-pickup-odds-column" /></colgroup>
      <thead><tr><th scope="col" aria-label="Item Sprite">Sprite</th><th scope="col">Item Name</th><th scope="col">Per Pickup</th><th scope="col">Per Battle</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.item}>
        <td><img src={publicAsset(row.icon)} alt="" width="24" height="24" /></td>
        <th scope="row">{row.name}</th>
        <td>{pickupPercent(row.perPickup)}</td><td>{pickupPercent(row.perBattle)}</td>
      </tr>)}</tbody>
    </table>
    <p id="emerald-pickup-note" className="emerald-pickup-note">Per battle: one eligible Pokémon holding no item · 10% Pickup activation.</p>
  </section>;
}
