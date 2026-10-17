import React, {useEffect, useRef} from 'react';
import {sections} from '../navigation.js';
import Icon from './Icon.jsx';
import '../styles/drawer.css';

export default function NavigationDrawer({open, activeId, onSelect, onClose}) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    if (!open) { if (element.open) element.close(); return; }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    return () => { document.body.style.overflow = previousOverflow; if (element.open) element.close(); };
  }, [open]);

  return <dialog ref={dialog} id="navigation-drawer" className="drawer" aria-labelledby="drawer-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="drawer-content">
      <div className="drawer-heading"><span id="drawer-title">Explore</span><button className="icon-button" aria-label="Close navigation" onClick={onClose}><Icon name="close" /></button></div>
      <nav aria-label="Main navigation">
        {sections.map(section => <button key={section.id} className="nav-item" style={{'--section-color': section.color, '--section-neon': section.neon, '--section-dark': section.dark}} aria-current={activeId === section.id ? 'page' : undefined} onClick={() => onSelect(section.id)}><span className="nav-dot" />{section.title}<span className="nav-arrow" aria-hidden="true">↗</span></button>)}
      </nav>
    </div>
  </dialog>;
}
