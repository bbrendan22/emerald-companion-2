import {publicAsset} from '../../assets/publicAsset.js';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {speciesOverview} from '../../resources/speciesOverview.js';
import '../styles/species-profile.css';
import SpeciesStats from '../components/SpeciesStats.jsx';
import SpeciesMore from '../components/SpeciesMore.jsx';
import SpeciesEncounters from '../../resources/locations/components/SpeciesEncounters.jsx';
import {internalIdForDex, pokemonMeta} from '../../resources/locations/data/pokemonMeta.js';
import '../styles/species-locations.css';
import LearnsetSection from '../../resources/learnset/components/LearnsetSection.jsx';
import '../styles/species-learnset.css';

function SpeciesArtwork({dex, name, small = false}) {
  const [source, setSource] = useState('artwork');
  const artwork = dex === 386 ? 'deoxys-speed' : dex;
  if (source === 'unavailable') return <span className={`species-artwork-fallback ${small ? 'species-artwork-small' : ''}`} role="img" aria-label={`${name} image unavailable`}>?</span>;
  return <img className={`species-artwork ${small ? 'species-artwork-small' : ''}`} src={publicAsset(source === 'artwork' ? `/pokemon/artwork/normal/${artwork}.png` : `/pokemon/emerald/normal/${dex}.png`)} width={small ? 64 : 160} height={small ? 64 : 160} alt={small ? '' : `${name} ${source === 'sprite' ? 'sprite' : 'artwork'}`} onError={() => setSource(source === 'artwork' ? 'sprite' : 'unavailable')} />;
}
const tabs = ['Overview', 'Stats & Matchups', 'Locations', 'Learnset', 'More'];
export default function SpeciesProfile({dex, onSpecies}) {
  const species = useMemo(() => speciesOverview(dex), [dex]), title = useRef(null);
  const [tabIndex, setTabIndex] = useState(0);
  const tabRefs = useRef([]);
  function onTabKey(event) {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const enabled = [0, 1, 2, 3, 4];
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 4 : enabled[(enabled.indexOf(tabIndex) + (event.key === 'ArrowRight' ? 1 : enabled.length - 1)) % enabled.length];
    setTabIndex(next); tabRefs.current[next]?.focus({preventScroll: true});
  }
  useEffect(() => {title.current?.focus({preventScroll: true});}, [dex]);
  if (!species) return null;
  const familyMembers = species.family.flat();
  return <article className="species-profile" aria-labelledby="species-profile-title">
    <div className="species-identity">
      <SpeciesArtwork key={dex} dex={dex} name={species.name} />
      <div className="species-identity-text">
        <p className="species-kicker">#{String(dex).padStart(3, '0')} · GEN {species.generation}</p>
        <h1 id="species-profile-title" ref={title} tabIndex="-1">{species.name}</h1>
        <div className="species-types">{species.types.map(type => <img key={type} src={publicAsset(`/types/icons/${type}.png`)} width="20" height="20" alt={`${type[0].toUpperCase()}${type.slice(1)} type`} />)}</div>
        <p className="species-gender">{species.gender}</p>
      </div>
    </div>
    <div className="species-tabs" role="tablist" aria-label="Pokémon information">
      {tabs.map((tab, index) => <button type="button" key={tab} role="tab" ref={element => {tabRefs.current[index] = element;}} id={`species-tab-${index}`} aria-selected={index === tabIndex} aria-controls={index === 0 ? 'species-overview' : index === 1 ? 'species-stats-content' : index === 2 ? 'species-locations-content' : index === 3 ? 'species-learnset-content' : index === 4 ? 'species-more-content' : undefined} tabIndex={index === tabIndex ? 0 : -1} onClick={() => setTabIndex(index)} onKeyDown={onTabKey}><span className="species-tab-label">{tab}</span></button>)}
    </div>
    <div id="species-overview" role="tabpanel" aria-labelledby="species-tab-0" hidden={tabIndex !== 0}>
      <section className="species-section" aria-labelledby="species-abilities-heading">
        <h2 id="species-abilities-heading">Abilities</h2>
        <dl className="species-abilities">{species.abilities.map(ability => <div key={ability.id}><dt>{ability.name}</dt><dd>{ability.description ?? 'Verified Emerald description unavailable.'}</dd></div>)}</dl>
      </section>
      <section className="species-section" aria-labelledby="species-entry-heading">
        <h2 id="species-entry-heading">Pokédex Entry <span>Emerald</span></h2>
        <p>{species.entry ?? 'Verified Emerald entry unavailable.'}</p>
      </section>
      <section className="species-section" aria-labelledby="species-evolution-heading">
        <h2 id="species-evolution-heading">Evolution Chain</h2>
        <div className="species-evolution-grid">
          {familyMembers.map(member => <div key={member.id} className="species-evolution-grid-member">
            <button type="button" className="species-evolution-artwork-link" aria-label={`View ${member.name} profile`} aria-current={member.id === dex ? 'true' : undefined} onClick={() => {if (member.id !== dex) onSpecies(member.id);}}>
              <SpeciesArtwork key={member.id} dex={member.id} name={member.name} small />
            </button>
            <span className="species-evolution-name">{member.name}</span>
            <p className="species-evolution-grid-method">{member.requirement ?? 'Base stage'}</p>
          </div>)}
        </div>
        {species.family.length === 1 && <p className="species-note">No evolutions in Generation III.</p>}
      </section>
    </div>
    {tabIndex === 1 && <div id="species-stats-content" role="tabpanel" aria-labelledby="species-tab-1"><SpeciesStats species={species} /></div>}
    {tabIndex === 2 && <div id="species-locations-content" role="tabpanel" aria-labelledby="species-tab-2"><SpeciesEncounters key={dex} id={internalIdForDex(dex)} embedded onPokemon={([id]) => onSpecies(pokemonMeta[id].dex)} /></div>}
    {tabIndex === 3 && <div id="species-learnset-content" role="tabpanel" aria-labelledby="species-tab-3"><LearnsetSection key={dex} id={internalIdForDex(dex)} embedded /></div>}
    {tabIndex === 4 && <div id="species-more-content" role="tabpanel" aria-labelledby="species-tab-4"><SpeciesMore dex={dex} /></div>}
  </article>;
}
