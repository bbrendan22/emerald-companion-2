import React from 'react';
import '../styles/dashboard.css';
import '../styles/achievements.css';
import '../styles/frontier.css';

export default function FrontierSymbols({frontier}) {
  return <section className="dashboard-card achievement-card frontier-card" aria-labelledby="frontier-heading">
    <div className="section-heading achievement-heading"><h2 id="frontier-heading">Battle Frontier</h2></div>
    <dl className="frontier-totals">
      <div className="frontier-silver"><dt>Silver</dt><dd>{frontier.silverCount}/7</dd></div>
      <div className="frontier-gold"><dt>Gold</dt><dd>{frontier.goldCount}/7</dd></div>
    </dl>
    <ol className="frontier-symbols">{frontier.symbols.map(({id, facility, symbol, status}) => {
      const label = status === 'unearned' ? 'Not earned' : status === 'gold' ? 'Gold earned' : 'Silver earned';
      return <li key={id}>
        <img src={`/frontier-symbols/${id}-${status === 'gold' ? 'gold' : 'silver'}.png`}
          className={status === 'unearned' ? 'frontier-unearned' : ''}
          width="64" height="64" alt={`${facility}, ${symbol} Symbol: ${label.toLowerCase()}`} />
        <strong>{facility.replace('Battle ', '')}</strong><span className="frontier-state">{status === 'unearned' ? '' : status === 'gold' ? 'Gold' : 'Silver'}</span>
      </li>;
    })}</ol>
  </section>;
}
