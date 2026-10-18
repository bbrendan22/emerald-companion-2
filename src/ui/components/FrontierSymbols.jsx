import {publicAsset} from '../../assets/publicAsset.js';
import React from 'react';
import '../styles/dashboard.css';
import '../styles/frontier.css';

export default function FrontierSymbols({frontier}) {
  return <section className="dashboard-card achievement-card frontier-card" aria-labelledby="frontier-heading">
    <div className="section-heading achievement-heading"><h2 id="frontier-heading">Frontier Symbols</h2></div>
    <ol className="frontier-symbols">{frontier.symbols.map(({id, facility, symbol, status}) => {
      const label = status === 'unearned' ? 'Not earned' : status === 'gold' ? 'Gold earned' : 'Silver earned';
      return <li key={id}>
        <img src={publicAsset(`/frontier-symbols/${id}-${status === 'gold' ? 'gold' : 'silver'}.png`)}
          className={status === 'unearned' ? 'frontier-unearned' : ''}
          width="64" height="64" alt={`${facility}, ${symbol} Symbol: ${label.toLowerCase()}`} />
      </li>;
    })}</ol>
  </section>;
}
