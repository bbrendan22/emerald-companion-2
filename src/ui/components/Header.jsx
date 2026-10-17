import React from 'react';
import Icon from './Icon.jsx';
import '../styles/header.css';

export default function Header({onMenu, onSettings, drawerOpen, isSettings}) {
  return <header className="header">
    <div className="header-inner">
      <button className="icon-button" aria-label="Open navigation" aria-controls="navigation-drawer" aria-expanded={drawerOpen} onClick={onMenu}><Icon name="menu" /></button>
      <div className="brand"><img src="/icons/pokeball.png" alt="" className="brand-pokeball" /><span>Emerald Companion</span></div>
      <button className="icon-button" aria-label="Settings" aria-pressed={isSettings} onClick={onSettings}><Icon name="settings" /></button>
    </div>
  </header>;
}
