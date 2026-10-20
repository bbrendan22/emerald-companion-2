import React, {useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import '../styles/achievements.css';

export default function AchievementTarget({name, status, requirement, className = '', children}) {
  const [popup, setPopup] = useState(null);
  const [position, setPosition] = useState(null);
  const anchor = useRef(null), overlay = useRef(null);
  const popupId = useId();
  useLayoutEffect(() => {
    if (!popup) return;
    function place() {
      const a = anchor.current.getBoundingClientRect(), p = overlay.current.getBoundingClientRect();
      const viewport = window.visualViewport;
      const x = viewport?.offsetLeft ?? 0, y = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? window.innerWidth, height = viewport?.height ?? window.innerHeight;
      const left = Math.max(x + 8, Math.min(x + width - p.width - 8, a.left + a.width / 2 - p.width / 2));
      const top = Math.max(y + 8, Math.min(y + height - p.height - 8, a.bottom + p.height + 16 <= y + height ? a.bottom + 8 : a.top - p.height - 8));
      setPosition(previous => previous?.left === left && previous?.top === top ? previous : {left, top});
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    window.visualViewport?.addEventListener('resize', place);
    window.visualViewport?.addEventListener('scroll', place);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      window.visualViewport?.removeEventListener('resize', place);
      window.visualViewport?.removeEventListener('scroll', place);
    };
  }, [popup]);
  useEffect(() => {
    if (!popup) return;
    let start = null, pendingTap = false;
    const cancel = () => { start = null; pendingTap = false; };
    const down = event => {
      event.stopPropagation();
      pendingTap = false;
      start = event.isPrimary && event.button === 0 ? {id:event.pointerId, x:event.clientX, y:event.clientY} : null;
    };
    const move = event => {
      if (start && (event.pointerId !== start.id || Math.hypot(event.clientX-start.x, event.clientY-start.y) >= 8)) cancel();
    };
    const up = event => { move(event); pendingTap = Boolean(start); start = null; };
    const click = event => {
      // Consume every click while open, including clicks after canceled gestures.
      // Only a validated tap (or keyboard activation) closes the popup.
      event.preventDefault(); event.stopPropagation();
      const dismiss = pendingTap || event.detail === 0 && event.isTrusted;
      pendingTap = false;
      if (dismiss) setPopup(null);
    };
    const escape = event => {
      if (event.key === 'Escape') {
        event.preventDefault(); popup.returnFocus?.focus({preventScroll:true}); setPopup(null);
      }
    };
    // Prevent the compatibility mouse event from focusing inputs before click.
    // Pointer defaults stay enabled so native touch scrolling still works.
    const mousedown = event => { event.preventDefault(); event.stopPropagation(); };
    const listeners = {mousedown, pointerdown:down, pointermove:move, pointerup:up, pointercancel:cancel, scroll:cancel, click, keydown:escape};
    for (const [type, handler] of Object.entries(listeners)) document.addEventListener(type, handler, true);
    return () => { for (const [type, handler] of Object.entries(listeners)) document.removeEventListener(type, handler, true); };
  }, [popup]);
  return <>
    <button ref={anchor} type="button" className={`achievement-target ${className}`} aria-label={`${name}: ${status}`} aria-expanded={Boolean(popup)} aria-describedby={popup ? popupId : undefined}
      onClick={event => { const returnFocus = event.detail === 0 ? event.currentTarget : null; setPosition(null); setPopup(previous => previous ? null : {returnFocus}); }}>{children}</button>
    {popup && createPortal(<><div className="achievement-dismiss-layer" aria-hidden="true" /><div id={popupId} ref={overlay} role="tooltip" className="achievement-popup" style={{left:position?.left ?? 8, top:position?.top ?? 8, visibility:position ? 'visible' : 'hidden'}}><strong>{name}</strong>{requirement && <><span className="achievement-popup-detail">{requirement}</span></>}</div></>, document.body)}
  </>;
}
