import React, {useCallback, useEffect, useRef, useState} from 'react';
import '../styles/resources.css';
import SpeciesProfile from './SpeciesProfile.jsx';
import MoveDialog from '../../resources/moves/MoveDialog.jsx';
import AbilityDialog from '../../resources/abilities/AbilityDialog.jsx';
import HomeResourceSearch from '../components/HomeResourceSearch.jsx';
import ItemDialog from '../../resources/items/components/ItemDialog.jsx';

import IVCalculator from '../../resources/calculators/IVCalculator.jsx';
import HiddenPowerCalculator from '../../resources/calculators/HiddenPowerCalculator.jsx';
import StatCalculator from '../../resources/calculators/StatCalculator.jsx';
import MoveCoverage from '../../resources/coverage/MoveCoverage.jsx';
import NatureChart from '../../resources/charts/NatureChart.jsx';
import TypeChart from '../../resources/charts/TypeChart.jsx';
import EmeraldPickupTable from '../../resources/charts/EmeraldPickupTable.jsx';
import MoveTutors from '../../resources/charts/MoveTutors.jsx';
import PokemonSets from '../../resources/frontier/PokemonSets.jsx';
import FrontierTrainers from '../../resources/frontier/Trainers.jsx';

const titles = {pokemon: 'Pokédex', moves: 'Moves', abilities: 'Abilities', items: 'Useful Items', berries: 'Berries'};
const additionalSections = [
  {id: 'frontier', title: 'Battle Frontier', entries: ['Pokémon Sets', 'Trainers']},
  {id: 'tools', title: 'Tools', entries: ['IV Calculator', 'Hidden Power Calculator', 'Stat Calculator', 'Move Coverage']},
  {id: 'charts', title: 'Charts', entries: ['Nature Chart', 'Type Chart', 'Emerald Pickup Table', 'Move Tutors']},
];
export default function ResourcesPage({onSubpageChange}) {
  const [frontierTrainers, setFrontierTrainers] = useState(false);
  const closeFrontierTrainers = useCallback(() => setFrontierTrainers(false), []);
  const [frontierSets, setFrontierSets] = useState(false);
  const closeFrontierSets = useCallback(() => setFrontierSets(false), []);
  const [chart, setChart] = useState(null);
  const closeChart = useCallback(() => setChart(null), []);
  const [calculator, setCalculator] = useState(false);
  const closeCalculator = useCallback(() => setCalculator(false), []);
  const [directory, setDirectory] = useState(null);
  const directoryScroll = useRef(0);
  const [activeItem, setActiveItem] = useState(null);
  const closeItem = useCallback(() => setActiveItem(null), []);
  const [activeMove, setActiveMove] = useState(null);
  const [activeAbility, setActiveAbility] = useState(null);
  const closeAbility = useCallback(() => setActiveAbility(null), []);
  const [profileDex, setProfileDex] = useState(null);
  const closeMove = useCallback(() => setActiveMove(null), []);
  const closeProfile = useCallback(() => setProfileDex(null), []);
  useEffect(() => {
    onSubpageChange?.(frontierTrainers ? {title: 'Emerald Companion', onBack: closeFrontierTrainers, backLabel: 'Back to Resources'} : frontierSets ? {title: 'Emerald Companion', onBack: closeFrontierSets, backLabel: 'Back to Resources'} : chart ? {title: 'Emerald Companion', onBack: closeChart, backLabel: 'Back to Resources'} : calculator ? {title: 'Emerald Companion', onBack: closeCalculator, backLabel: 'Back to Resources'} : profileDex ? {title: 'Emerald Companion', onBack: closeProfile, backLabel: directory ? 'Back to Pokédex' : 'Back to Home'} : null);
    return () => onSubpageChange?.(null);
  }, [frontierTrainers, closeFrontierTrainers, frontierSets, closeFrontierSets, chart, closeChart, calculator, closeCalculator, profileDex, closeProfile, directory, onSubpageChange]);
  function openDirectory(event, category) {
    event.preventDefault();
    directoryScroll.current = 0;
    setDirectory({category, query:''});
  }
  if (frontierTrainers) return <FrontierTrainers />;
  if (frontierSets) return <PokemonSets />;
  if (chart === 'tutors') return <MoveTutors />;
  if (chart === 'pickup') return <EmeraldPickupTable />;
  if (chart === 'type') return <TypeChart />;
  if (chart === 'nature') return <NatureChart />;
  if (calculator === 'coverage') return <MoveCoverage />;
  if (calculator === 'stat') return <StatCalculator />;
  if (calculator) return calculator === 'hidden-power' ? <HiddenPowerCalculator /> : <IVCalculator />;
  if (profileDex) return <SpeciesProfile dex={profileDex} onSpecies={setProfileDex} />;
  return <aside className="resources-home home-resources" aria-label="Resources">
    <h2 className="home-resources-title">Resources</h2>
    {activeMove !== null && <MoveDialog moveId={activeMove} onClose={closeMove} />}
    {activeAbility !== null && <AbilityDialog abilityId={activeAbility} onClose={closeAbility} />}
    {activeItem !== null && <ItemDialog itemId={activeItem} onClose={closeItem} />}
    <HomeResourceSearch directory={directory} directoryScroll={directoryScroll} onDirectoryQuery={query => setDirectory(previous => ({...previous,query}))} onDirectoryBack={() => {setDirectory(null); directoryScroll.current = 0;}} onSelect={(category, entry) => {
      if (category === 'pokemon') { setProfileDex(entry.id); window.scrollTo({top:0}); }
      else if (category === 'moves') setActiveMove(entry.id);
      else if (category === 'abilities') setActiveAbility(entry.id);
      else setActiveItem(entry.id);
    }}>
    <section className="resources-section" aria-labelledby="resources-pokemon-heading">
      <h2 id="resources-pokemon-heading">Databases</h2>
      <ul className="resources-destinations">
        {Object.entries(titles).map(([id, title]) => <li key={id}><a id={`resources-link-${id}`} href={`#resources-${id}`} onClick={event => openDirectory(event, id)}>{title}</a></li>)}
      </ul>
    </section>
    {additionalSections.map(section => <section key={section.id} className="resources-section" aria-labelledby={`resources-${section.id}-heading`}>
      <h2 id={`resources-${section.id}-heading`}>{section.title}</h2>
      {section.entries.length > 0 && <ul className="resources-destinations">
        {section.entries.map(name => <li key={name}>{section.id === 'frontier' && name === 'Trainers' ? <a href="#resources-frontier-trainers" onClick={event => {event.preventDefault(); setFrontierTrainers(true);}}>{name}</a> : section.id === 'frontier' && name === 'Pokémon Sets' ? <a href="#resources-frontier-sets" onClick={event => {event.preventDefault(); setFrontierSets(true);}}>{name}</a> : section.id === 'charts' && name === 'Move Tutors' ? <a href="#resources-move-tutors" onClick={event => {event.preventDefault(); setChart('tutors');}}>{name}</a> : section.id === 'charts' && name === 'Emerald Pickup Table' ? <a href="#resources-emerald-pickup" onClick={event => {event.preventDefault(); setChart('pickup');}}>{name}</a> : section.id === 'charts' && name === 'Type Chart' ? <a href="#resources-type-chart" onClick={event => {event.preventDefault(); setChart('type');}}>{name}</a> : section.id === 'charts' && name === 'Nature Chart' ? <a href="#resources-nature-chart" onClick={event => {event.preventDefault(); setChart('nature');}}>{name}</a> : section.id === 'tools' && name === 'IV Calculator' ? <a href="#resources-iv-calculator" onClick={event => {event.preventDefault(); setCalculator(true);}}>{name}</a> : section.id === 'tools' && name === 'Hidden Power Calculator' ? <a href="#resources-hidden-power-calculator" onClick={event => {event.preventDefault(); setCalculator('hidden-power');}}>{name}</a> : section.id === 'tools' && name === 'Stat Calculator' ? <a href="#resources-stat-calculator" onClick={event => {event.preventDefault(); setCalculator('stat');}}>{name}</a> : section.id === 'tools' && name === 'Move Coverage' ? <a href="#resources-move-coverage" onClick={event => {event.preventDefault(); setCalculator('coverage');}}>{name}</a> : <span>{name}</span>}</li>)}
      </ul>}
    </section>)}
    </HomeResourceSearch>
  </aside>;
}
