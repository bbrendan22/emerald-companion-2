import {publicAsset} from '../../assets/publicAsset.js';
import React from 'react';
import {typeChartTypes, typeChartRows, typeChartName} from './typeChart.js';
import './typeChart.css';

export default function TypeChart() {
  return <section className="resources-home type-chart" aria-labelledby="type-chart-heading">
    <h1 id="type-chart-heading">Type Chart</h1>
    <p className="type-chart-orientation" id="type-chart-orientation">Rows: Attacking · Columns: Defending</p>
    <table aria-labelledby="type-chart-heading" aria-describedby="type-chart-orientation">
      <thead><tr><td aria-hidden="true"><span /></td>{typeChartTypes.map(type => <th scope="col" key={type} aria-label={`${typeChartName(type)} defending`}><span><img src={publicAsset(`/types/icons/${type}.png`)} alt="" /></span></th>)}</tr></thead>
      <tbody>{typeChartRows.map(({attack, cells}) => <tr key={attack}>
        <th scope="row" aria-label={`${typeChartName(attack)} attacking`}><span><img src={publicAsset(`/types/icons/${attack}.png`)} alt="" /></span></th>
        {cells.map(({defense, multiplier, label}) => <td key={defense} data-multiplier={multiplier} aria-label={`${typeChartName(attack)} against ${typeChartName(defense)}: ${multiplier}×`}><span>{label}</span></td>)}
      </tr>)}</tbody>
    </table>
  </section>;
}
