import React, {useRef, useState, useEffect} from 'react';
import Header from './components/Header.jsx';
import NavigationDrawer from './components/NavigationDrawer.jsx';
import {sections, settings} from './navigation.js';
import './styles/page.css';
import TrainerPage from './pages/TrainerPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import PokemonPage from './pages/PokemonPage.jsx';
import BattlePage from './pages/BattlePage.jsx';
import ResourcesPage from './pages/ResourcesPage.jsx';
import useBattleState from './useBattleState.js';
import useImportedSave from './useImportedSave.js';
import useTrainerShowcase from './useTrainerShowcase.js';

export default function App() {
  const importedSave = useImportedSave();
  const showcase = useTrainerShowcase();
  const [pageId, setPageId] = useState('trainer');
  const battle = useBattleState(importedSave.snapshot, pageId === 'battle');
  const [subpage, setSubpage] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const heading = useRef(null);
  const page = sections.find(section => section.id === pageId) ?? settings;
  useEffect(() => { document.title = 'Emerald'; }, []);
  function navigate(id) {
    if (id === pageId && subpage) { subpage.onBack(); setDrawerOpen(false); return; }
    setSubpage(null);
    setPageId(id);
    setDrawerOpen(false);
    window.scrollTo({top: 0});
    requestAnimationFrame(() => (heading.current ?? document.getElementById('main'))?.focus());
  }
  return <div className="app" style={{'--accent': page.color}}>
    <a className="skip-link" href="#main">Skip to content</a>
    <Header onBack={pageId === 'pokemon' || pageId === 'resources' ? subpage?.onBack : undefined} backLabel={pageId === 'resources' ? (subpage?.backLabel ?? 'Back to Resources') : 'Back to collection'} title={pageId === 'resources' ? subpage?.title : undefined} onMenu={() => setDrawerOpen(true)} onSettings={() => navigate('settings')} drawerOpen={drawerOpen} isSettings={pageId === 'settings'} />
    <NavigationDrawer open={drawerOpen} activeId={pageId} onSelect={navigate} onClose={() => setDrawerOpen(false)} />
    <main id="main" tabIndex="-1" aria-label={page.title} className={`page ${pageId === 'trainer' ? 'trainer-page' : pageId === 'pokemon' ? 'pokemon-page' : pageId === 'battle' ? 'battle-page' : pageId === 'resources' ? 'resources-page' : ''}`}>
      {pageId !== 'trainer' && pageId !== 'pokemon' && pageId !== 'battle' && pageId !== 'resources' && <h1 ref={heading} tabIndex="-1">{page.title}</h1>}
      {pageId === 'trainer' ? <TrainerPage showcase={showcase} {...importedSave} onImport={() => navigate('settings')} />
        : pageId === 'pokemon' ? <PokemonPage snapshot={importedSave.snapshot} onSubpageChange={setSubpage} />
        : pageId === 'battle' ? <BattlePage snapshot={importedSave.snapshot} battle={battle} />
        : pageId === 'settings' ? <SettingsPage showcase={showcase} {...importedSave} />
        : <ResourcesPage onSubpageChange={setSubpage} />}
    </main>
  </div>;
}
