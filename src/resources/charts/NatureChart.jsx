import React from 'react';
import {natureChartStats, natureChartRows} from './natureChart.js';
import './natureChart.css';

export default function NatureChart() {
  return <section className="resources-home nature-chart" aria-labelledby="nature-chart-heading">
    <h1 id="nature-chart-heading">Nature Chart</h1>
    <div className="nature-chart-layout">
      <p className="nature-chart-increased" id="nature-chart-increased">Increased Stat (+10%)</p>
      <p className="nature-chart-decreased" id="nature-chart-decreased">Decreased Stat (−10%)</p>
      <table aria-labelledby="nature-chart-heading" aria-describedby="nature-chart-increased nature-chart-decreased">
        <thead><tr><td aria-hidden="true" />{natureChartStats.map(stat => <th scope="col" key={stat.key} aria-label={`${stat.name} increased`}><abbr title={stat.name}>{stat.short}</abbr></th>)}</tr></thead>
        <tbody>{natureChartRows.map(row => <tr key={row.key}>
          <th scope="row" aria-label={`${row.name} decreased`}><abbr title={row.name}>{row.short}</abbr></th>
          {row.cells.map(cell => <td key={cell.name} className={cell.neutral ? 'nature-chart-neutral' : undefined}>{cell.name}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}
