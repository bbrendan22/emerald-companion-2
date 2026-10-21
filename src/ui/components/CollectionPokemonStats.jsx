import React, {useId} from 'react';
import {hiddenPower, statFields} from '../../pokemon/profile.js';
import {speciesBarPercents} from '../../pokemon/statBars.js';
import {publicAsset} from '../../assets/publicAsset.js';
import '../styles/collection-pokemon-stats.css';

const labels = {hp:'HP', attack:'Atk', defense:'Def', spAttack:'SpA', spDefense:'SpD', speed:'Spe'};
const total = values => statFields.reduce((sum, [key]) => sum + values[key], 0);

export default function CollectionPokemonStats({pokemon}) {
  const heading = useId();
  // Recalculated Gen 3 values, including the recorded level for party Pokémon.
  // Saved party stats/current HP are deliberately not used in this section.
  const stats = pokemon.calculated?.stats;
  const bars = speciesBarPercents(pokemon.internalSpeciesId);
  const power = hiddenPower(pokemon.ivs);
  return <div className="collection-training-stats">
    <section className="collection-battle-stats" aria-labelledby={heading}>
      <h2 id={heading}>Stats</h2>
      {statFields.map(([key]) => <div className="collection-battle-stat" data-stat={key} key={key}>
        <span>{labels[key]}</span><span className="collection-battle-stat-value">{stats?.[key] ?? '—'}</span>
        {stats && bars && <div className="collection-battle-stat-track" aria-hidden="true"><span style={{width:`${bars[key]}%`}}/></div>}
      </div>)}
      <div className="collection-hidden-power" role="group" aria-label="Hidden Power">
        {power ? <>
          <img src={publicAsset(`/types/icons/${power.type}.png`)} alt={`${power.type} type`}/>
          <span>{power.type[0].toUpperCase()+power.type.slice(1)}</span>
          <small>· {power.power} power</small>
        </> : <span>—</span>}
      </div>
    </section>
    <div className="collection-stat-divider" aria-hidden="true"/>
    <table className="collection-iv-ev-table" role="table" aria-label="IVs and EVs">
      <thead><tr><th scope="col">Stat</th><th scope="col">IV</th><th scope="col">EV</th></tr></thead>
      <tbody>{statFields.map(([key]) => <tr data-stat={key} key={key}>
        <th scope="row">{labels[key]}</th>
        <td className={pokemon.ivs[key] === 31 ? 'collection-training-highlight' : undefined}>{pokemon.ivs[key]}</td>
        <td className={pokemon.evs[key] >= 252 ? 'collection-training-highlight' : undefined}>{pokemon.evs[key]}</td>
      </tr>)}</tbody>
      <tfoot><tr><th scope="row">Total</th><td>{total(pokemon.ivs)}</td><td>{total(pokemon.evs)}</td></tr></tfoot>
    </table>
  </div>;
}
