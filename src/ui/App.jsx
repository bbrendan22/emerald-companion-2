import React, {useRef, useState, useEffect} from 'react';
import Header from './components/Header.jsx';
import NavigationDrawer from './components/NavigationDrawer.jsx';
import {sections, settings} from './navigation.js';
import './styles/page.css';
import TrainerPage from './pages/TrainerPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import PokemonPage from './pages/PokemonPage.jsx';
import useImportedSave from './useImportedSave.js';
import useTrainerShowcase from './useTrainerShowcase.js';

export default function App() {
  const importedSave = useImportedSave();
  const showcase = useTrainerShowcase();
  const [pageId, setPageId] = useState('trainer');
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
    <Header onBack={pageId === 'pokemon' ? subpage?.onBack : undefined} backLabel="Back to collection" onMenu={() => setDrawerOpen(true)} onSettings={() => navigate('settings')} drawerOpen={drawerOpen} isSettings={pageId === 'settings'} />
    <NavigationDrawer open={drawerOpen} activeId={pageId} onSelect={navigate} onClose={() => setDrawerOpen(false)} />
    <main id="main" tabIndex="-1" aria-label={page.title} className={`page ${pageId === 'trainer' ? 'trainer-page' : pageId === 'pokemon' ? 'pokemon-page' : ''}`}>
      {pageId !== 'trainer' && pageId !== 'pokemon' && <h1 ref={heading} tabIndex="-1">{page.title}</h1>}
      {pageId === 'trainer' ? <TrainerPage showcase={showcase} {...importedSave} onImport={() => navigate('settings')} />
        : pageId === 'pokemon' ? <PokemonPage snapshot={importedSave.snapshot} onSubpageChange={setSubpage} />
        : pageId === 'settings' ? <SettingsPage showcase={showcase} {...importedSave} />
        : <div className="placeholder"><span className="placeholder-mark" aria-hidden="true" /><p>Your {pageId === 'pokemon' ? 'Pokémon collection' : pageId === 'battle' ? 'battle tools' : 'reference library'} will live here.</p></div>}
    </main>
  </div>;
}
