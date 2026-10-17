import React from 'react';
import {profileData, statFields} from '../../pokemon/profile.js';
import {speciesBarPercents} from '../../pokemon/statBars.js';
import {originGames} from '../collectionFilters.js';
import '../styles/pokemon-profile.css';
import RibbonCollection from '../components/RibbonCollection.jsx';

function TypeIcon({type}) {
  if (type === 'mystery') return <span className="profile-note" aria-label="Mystery type, Generation 3">???</span>;
  return type ? <img className="profile-type-icon" src={`/types/icons/${type}.png`} alt={`${type} type`} /> : null;
}
function Card({title, area, heading=true, children}) {
  return <section className={`profile-card profile-${area}`} aria-label={title}>{heading && <h2>{title}</h2>}{children}</section>;
}
function Fields({rows}) {
  return <dl className="profile-fields">{rows.map(([name,value]) => <div key={name}><dt>{name}</dt><dd>{value ?? 'Unavailable'}</dd></div>)}</dl>;
}
function StatValues({values, bars=null, kind}) {
  if (!values) return <p>Unavailable</p>;
  return <div className={`profile-stat-list ${bars ? 'with-bars' : ''}`}>{statFields.map(([key]) => <div className={`profile-stat-row stat-${key} ${(kind === 'ivs' && values[key] === 31) || (kind === 'evs' && values[key] >= 252) ? 'excellent-value' : ''}`} key={key}>
    <span>{{hp:'HP',attack:'Atk',defense:'Def',spAttack:'SpA',spDefense:'SpD',speed:'Spe'}[key]}</span><strong>{values[key] ?? '—'}</strong>
    {bars && <div className="profile-stat-track" aria-hidden="true"><span style={{width:`${bars[key]}%`}} /></div>}
  </div>)}</div>;
}
const total = values => statFields.reduce((sum,[key]) => sum + (values[key] ?? 0), 0);
export default function PokemonProfile({pokemon:p, role, onAssign, error}) {
  const data = profileData(p);
  const currentStats = p.isEgg ? null : p.calculated?.stats ?? null;
  const nickname = p.nickname && p.nickname.toLocaleLowerCase() !== p.speciesName.toLocaleLowerCase() ? p.nickname : null;
  const generation = p.nationalDexId <= 151 ? 1 : p.nationalDexId <= 251 ? 2 : 3;
  const gender = p.gender ? p.gender[0].toUpperCase() + p.gender.slice(1) : 'Gender unavailable';
  return <article className="pokemon-profile" aria-labelledby="pokemon-profile-title">
    <section className="profile-showcase" aria-label="Pokémon showcase">
      <div className="profile-artwork-wrap"><img className="profile-artwork" src={`/pokemon/artwork/${p.shiny ? 'shiny' : 'normal'}/${p.nationalDexId}.png`} alt={`${p.shiny ? 'Shiny ' : ''}${p.speciesName}`} /></div>
      <div className="profile-identity">
        <p className="profile-kicker">#{String(p.nationalDexId).padStart(3,'0')} · GEN {generation} {p.shiny && <span className="shiny-star" aria-label="Shiny">★</span>}</p>
        <h1 id="pokemon-profile-title" tabIndex="-1">{p.speciesName}{nickname && <> <span className="profile-nickname">“{nickname}”</span></>}</h1>
        <div className="profile-types">{data.types.map(type => <TypeIcon key={type} type={type}/>)}</div>
        <p className="profile-identity-meta">{p.isEgg ? 'Egg' : `Lv. ${p.recorded?.level ?? p.derivedLevel}`} · {gender} · {p.nature}</p>
      </div>
    </section>
    {error && <p role="alert">{error}</p>}
    <div className="profile-content">
      <div className="profile-connected-row profile-primary-row">
        <Card title="Current Stats" area="stats">{currentStats ? <StatValues values={currentStats} bars={speciesBarPercents(p.internalSpeciesId)}/> : <p className="profile-note">Unavailable{p.isEgg ? ' for an egg' : ''}.</p>}</Card>
        <div className="profile-side-stack">
          <Card title="Role" area="role"><div className="collection-segments profile-roles" aria-label="Assign role">{['Frontier','Utility','Collection'].map(name => <button type="button" key={name} aria-pressed={role === name} onClick={() => onAssign(name)}>{name}</button>)}</div></Card>
          <Card title="Ability & Held Item" area="info" heading={false}><Fields rows={[
            ['Ability',p.ability.name ?? `Unknown ability (ID ${p.ability.id})`],
            ['Held Item',<span className="profile-item"><span className="profile-item-name">{data.heldItem}</span>{p.heldItemId > 0 && p.heldItemId <= 376 && <img src={`/items/${p.heldItemId}.png`} alt="" />}</span>],
          ]}/></Card>
        </div>
      </div>
      <div className="profile-connected-row">
        <Card title="Moves" area="moves"><ol>{data.moves.map(move => <li key={move.slot}>{move.id ? <><TypeIcon type={move.type}/><span>{move.name ?? `Unknown move (ID ${move.id})`}</span></> : <span className="profile-note">Empty slot</span>}</li>)}</ol></Card>
        <Card title="IVs" area="ivs"><StatValues values={p.ivs} kind="ivs"/><p className="profile-total"><span>Total</span><strong>{total(p.ivs)}</strong></p></Card>
      </div>
      <div className="profile-connected-row profile-details-row">
        <Card title="EVs" area="evs"><StatValues values={p.evs} kind="evs"/><p className="profile-total"><span>Total</span><strong>{total(p.evs)}</strong></p></Card>
        <div className="profile-side-stack profile-lower-stack">
          <Card title="Hidden Power, Friendship & Pokérus" area="details" heading={false}>
            <div className="profile-detail"><h2>Hidden Power</h2>{data.hiddenPower ? <div className="profile-inline"><TypeIcon type={data.hiddenPower.type}/><span className="profile-capitalize">{data.hiddenPower.type}</span><strong>{data.hiddenPower.power} <span className="profile-note">power</span></strong></div> : <p>Unavailable</p>}</div>
            <div className="profile-detail-pair">
              <div className="profile-detail"><h2>Friendship</h2><p>{p.friendship ?? 'Unavailable for an egg'}</p></div>
              <div className="profile-detail"><h2>Pokérus</h2><p>{data.pokerus}</p></div>
            </div>
          </Card>
          <Card title="Origin" area="origin"><Fields rows={[
            ['Original Trainer',p.ot.name],['Trainer ID',String(p.ot.trainerId).padStart(5,'0')],
            ['Game',originGames[p.origin.gameId] ?? `Unknown (ID ${p.origin.gameId})`],
          ]}/></Card>
        </div>
      </div>
      {p.warnings.length > 0 && <Card title="Record notes" area="warnings"><ul>{p.warnings.map((warning,i)=><li key={i}>{warning}</li>)}</ul></Card>}
      <Card title="Ribbons" area="ribbons"><RibbonCollection earned={data.ribbons}/>{data.invalidRibbonRanks && <p className="profile-note">Unrecognized contest ribbon rank.</p>}</Card>
    </div>
  </article>;
}
