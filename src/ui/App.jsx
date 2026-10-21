import {blockUpdates} from '../pwa/updateSafety.js';
import React, {useRef, useState, useEffect, useLayoutEffect} from 'react';
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

export default function App() {
  const importedSave = useImportedSave();
  const [pageId, setPageId] = useState('home');
  const battle = useBattleState(importedSave.snapshot, pageId === 'battle');
  const [subpage, setSubpage] = useState(null);
  // Battle and resource subpages contain session-only edits/calculator inputs.
  useLayoutEffect(() => {
    if (pageId === 'battle' || subpage) return blockUpdates();
  }, [pageId, subpage]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const heading = useRef(null);
  const navigationButton = useRef(null);
  const page = sections.find(section => section.id === pageId) ?? settings;
  useEffect(() => { document.title = 'Emerald'; }, []);
  function navigate(id) {
    if (id === pageId && subpage) { subpage.onBack(); setDrawerOpen(false); return; }
    setSubpage(null);
    setPageId(id);
    setDrawerOpen(false);
    window.scrollTo({top: 0});
    // Destination focus must not undo the navigation scroll reset.
    requestAnimationFrame(() => (heading.current ?? document.getElementById('main'))?.focus({preventScroll:true}));
  }
  return <div className="app" style={{'--accent': pageId === 'home' && !subpage ? '#393D44' : page.color}}>
    <a className="skip-link" href="#main">Skip to content</a>
    <Header menuRef={navigationButton} onBack={pageId === 'home' ? subpage?.onBack : undefined} backLabel={subpage?.backLabel ?? 'Back to Resources'} title={pageId === 'home' ? subpage?.title : undefined} onMenu={() => setDrawerOpen(previous => !previous)} drawerOpen={drawerOpen} onSettings={() => navigate('settings')} isSettings={pageId === 'settings'} />
    <NavigationDrawer open={drawerOpen} anchorRef={navigationButton} onSelect={navigate} onClose={() => setDrawerOpen(false)} />
    <main id="main" tabIndex="-1" aria-label={page.title} className={`page ${pageId === 'home' ? (subpage ? 'resources-page' : 'home-page') : pageId === 'pokemon' ? 'pokemon-page' : pageId === 'battle' ? 'battle-page' : ''}`}>
      {pageId !== 'home' && pageId !== 'pokemon' && pageId !== 'battle' && <h1 ref={heading} tabIndex="-1">{page.title}</h1>}
      {pageId === 'home' ? <div className={`home-layout${subpage ? " home-detail" : ""}`}><div className="home-trainer"><TrainerPage {...importedSave} onImport={() => navigate('settings')} /></div><ResourcesPage onSubpageChange={setSubpage} /></div>
        : pageId === 'pokemon' ? <PokemonPage snapshot={importedSave.snapshot} />
        : pageId === 'battle' ? <BattlePage snapshot={importedSave.snapshot} battle={battle} />
        : pageId === 'settings' ? <SettingsPage {...importedSave} />
        : <ResourcesPage onSubpageChange={setSubpage} />}
    </main>
  </div>;
}
