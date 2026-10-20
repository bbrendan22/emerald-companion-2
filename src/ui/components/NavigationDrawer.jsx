import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {sections} from '../navigation.js';
import '../styles/drawer.css';

export default function NavigationDrawer({open, anchorRef, onSelect, onClose}) {
  const menu = useRef(null);
  const [position, setPosition] = useState(null);
  useLayoutEffect(() => {
    if (!open) { setPosition(null); return; }
    function place() {
      const anchor = anchorRef.current, popup = menu.current;
      if (!anchor || !popup) return;
      const rect = anchor.getBoundingClientRect(), viewport = window.visualViewport;
      const x = viewport?.offsetLeft ?? 0, y = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? innerWidth, height = viewport?.height ?? innerHeight;
      const left = Math.max(x + 4, Math.min(rect.left, x + width - popup.offsetWidth - 8));
      const top = Math.max(y + 4, rect.bottom + 4);
      setPosition({left, top, maxHeight:Math.max(0,y + height - top - 8)});
    }
    place();
    window.addEventListener('resize',place);
    window.visualViewport?.addEventListener('resize',place);
    window.visualViewport?.addEventListener('scroll',place);
    return () => {
      window.removeEventListener('resize',place);
      window.visualViewport?.removeEventListener('resize',place);
      window.visualViewport?.removeEventListener('scroll',place);
    };
  }, [open,anchorRef]);
  useEffect(() => {
    if (!open) return;
    const escape = event => {
      if (event.key === 'Escape') {
        event.preventDefault(); onClose(); anchorRef.current?.focus({preventScroll:true});
      }
    };
    const scroll = () => onClose();
    document.addEventListener('keydown',escape);
    window.addEventListener('scroll',scroll,true);
    return () => { document.removeEventListener('keydown',escape); window.removeEventListener('scroll',scroll,true); };
  }, [open,anchorRef,onClose]);
  if (!open) return null;
  return <><div className="drawer-dismiss-layer" aria-hidden="true" onClick={event => {event.preventDefault(); event.stopPropagation(); onClose();}} />
  <nav ref={menu} id="navigation-drawer" className="drawer" aria-label="Main navigation" style={{...position,visibility:position ? 'visible' : 'hidden'}}>
    {sections.map(section => <button type="button" key={section.id} className="nav-item" onClick={() => onSelect(section.id)}>{section.title}</button>)}
  </nav></>;
}
