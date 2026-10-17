import React from 'react';
import Icon from './Icon.jsx';
import '../styles/header.css';

export default function Header({onMenu, onSettings, drawerOpen, isSettings, onBack, backLabel = 'Back'}) {
  const menu = <button className="icon-button" aria-label="Open navigation" aria-controls="navigation-drawer" aria-expanded={drawerOpen} onClick={onMenu}><Icon name="menu" /></button>;
  return <header className="header">
    <div className={`header-inner ${onBack ? 'header-subpage' : ''}`}>
      {onBack ? <div className="header-subpage-actions">
        <button className="icon-button subpage-back" aria-label={backLabel} onClick={onBack}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m14 5-7 7 7 7M7 12h14" /></svg></button>
        {menu}
      </div> : menu}
      <div className="brand"><img src="/icons/pokeball.png" alt="" className="brand-pokeball" /><span>Emerald Companion</span></div>
      <button className="icon-button" aria-label="Settings" aria-pressed={isSettings} onClick={onSettings}><Icon name="settings" /></button>
    </div>
  </header>;
}
