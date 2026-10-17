import React, {useEffect, useLayoutEffect, useId, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {ribbonCatalog} from '../../pokemon/profile.js';

export default function RibbonCollection({earned}) {
  const [selected, setSelected] = useState(null);
  const [position, setPosition] = useState(null);
  const popup = useRef(null);
  const buttons = useRef(new Map());
  const popupId = useId();
  const earnedFiles = new Set(earned.map(ribbon => ribbon.file));
  const ribbon = ribbonCatalog.find(r => r.file === selected);
  useLayoutEffect(() => {
    if (!selected) return;
    function place() {
      const anchor = buttons.current.get(selected), overlay = popup.current;
      if (!anchor || !overlay) return;
      const a = anchor.getBoundingClientRect(), p = overlay.getBoundingClientRect();
      const left = Math.max(8, Math.min(window.innerWidth - p.width - 8, a.left + a.width/2 - p.width/2));
      const top = Math.max(8, Math.min(window.innerHeight - p.height - 8, a.bottom + p.height + 16 <= window.innerHeight ? a.bottom + 8 : a.top - p.height - 8));
      setPosition(previous => previous?.left === left && previous?.top === top ? previous : {left, top});
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [selected]);
  useEffect(() => {
    if (!selected) return;
    function outside(event) {
      if (!popup.current?.contains(event.target) && !buttons.current.get(selected)?.contains(event.target)) setSelected(null);
    }
    function escape(event) {
      if (event.key === 'Escape') { event.preventDefault(); buttons.current.get(selected)?.focus({preventScroll:true}); setSelected(null); }
    }
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', escape); };
  }, [selected]);
  return <>
    <ul className="ribbon-collection">{ribbonCatalog.map(item => {
      const isEarned = earnedFiles.has(item.file);
      return <li key={item.file}><button type="button" ref={element => { if (element) buttons.current.set(item.file,element); else buttons.current.delete(item.file); }} className={isEarned ? 'ribbon-earned' : 'ribbon-unearned'} aria-label={`${item.name}, ${isEarned ? 'Earned' : 'Not earned'}`} aria-expanded={selected === item.file} aria-describedby={selected === item.file ? popupId : undefined} onClick={() => { setPosition(null); setSelected(previous => previous === item.file ? null : item.file); }}><img src={`/ribbons/${item.file}.png`} alt=""/></button></li>;
    })}</ul>
    {ribbon && createPortal(<div id={popupId} ref={popup} role="tooltip" className="ribbon-popup" style={{left:position?.left ?? 8,top:position?.top ?? 8,visibility:position ? 'visible' : 'hidden'}}><strong>{ribbon.name}</strong><span>{earnedFiles.has(ribbon.file) ? 'Earned' : 'Not earned'}</span></div>, document.body)}
  </>;
}
